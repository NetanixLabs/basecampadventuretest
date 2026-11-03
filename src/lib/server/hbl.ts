import "server-only";
import { randomUUID } from "node:crypto";
import { CompactEncrypt, compactDecrypt, compactVerify, CompactSign, importPKCS8, importSPKI } from "jose";
import { cfg } from "@/lib/admin/config";
import { features } from "@/lib/admin/features";

/**
 * Himalayan Bank (HBL) card payments, through 2C2P's PACO platform.
 *
 * Every request is a JWT signed with our merchant signing key (PS256) and
 * then encrypted for PACO (RSA-OAEP + A128CBC-HS256); every response is
 * decrypted with our merchant decryption key and its signature checked with
 * PACO's signing key. Keys and IDs come from the bank and are entered in
 * Admin → Settings → Keys. Payment status is only ever taken from PACO's
 * own inquiry API, never from the browser's return URL.
 *
 * Test everything in HBL's sandbox (mode "sandbox") with the bank's test
 * keys before switching to production.
 */
const HOST = { sandbox: "https://core.demo-paco.2c2p.com", production: "https://core.paco.2c2p.com" } as const;
const PATHS = { pay: "/api/1.0/Payment/prePaymentUi", inquiry: "/api/1.0/Inquiry/transactionList" } as const;

export async function hblEnabled() {
  const f = (await features()).payments;
  if (!f.hbl) return false;
  const need = await Promise.all([cfg("HBL_OFFICE_ID"), cfg("HBL_API_KEY"), cfg("HBL_MERCHANT_SIGNING_KEY"), cfg("HBL_MERCHANT_DECRYPTION_KEY"), cfg("HBL_PACO_ENCRYPTION_KEY"), cfg("HBL_PACO_SIGNING_KEY")]);
  return need.every(Boolean);
}

async function settings() {
  const [env, officeId, apiKey, signPem, decPem, pacoEncPem, pacoSignPem, encKid, signKid] = await Promise.all([
    cfg("HBL_ENV"), cfg("HBL_OFFICE_ID"), cfg("HBL_API_KEY"), cfg("HBL_MERCHANT_SIGNING_KEY"), cfg("HBL_MERCHANT_DECRYPTION_KEY"), cfg("HBL_PACO_ENCRYPTION_KEY"), cfg("HBL_PACO_SIGNING_KEY"), cfg("HBL_ENCRYPTION_KEY_ID"), cfg("HBL_SIGNING_KEY_ID"),
  ]);
  const pem = (s: string, kind: "PRIVATE KEY" | "PUBLIC KEY") => (s.includes("-----BEGIN") ? s : `-----BEGIN ${kind}-----\n${s.replace(/\s+/g, "").replace(/(.{64})/g, "$1\n")}\n-----END ${kind}-----`);
  return {
    // HBL_TEST_HOST (server environment only) points sandbox mode at a local test double of PACO.
    host: env === "production" ? HOST.production : process.env.HBL_TEST_HOST || HOST.sandbox,
    officeId,
    apiKey,
    signKey: await importPKCS8(pem(signPem, "PRIVATE KEY"), "PS256"),
    decKey: await importPKCS8(pem(decPem, "PRIVATE KEY"), "RSA-OAEP"),
    pacoEnc: await importSPKI(pem(pacoEncPem, "PUBLIC KEY"), "RSA-OAEP"),
    pacoSign: await importSPKI(pem(pacoSignPem, "PUBLIC KEY"), "PS256"),
    encKid: encKid || undefined,
    signKid: signKid || undefined,
  };
}

/** Sign, encrypt, send, then decrypt and verify the answer. */
async function call(path: string, request: Record<string, unknown>) {
  const s = await settings();
  const now = Math.floor(Date.now() / 1000);
  const claims = { request, iss: s.apiKey, aud: "PacoAudience", CompanyApiKey: s.apiKey, iat: now, nbf: now, exp: now + 3600 };
  const jws = await new CompactSign(new TextEncoder().encode(JSON.stringify(claims))).setProtectedHeader({ alg: "PS256", typ: "JWT", ...(s.signKid ? { kid: s.signKid } : {}) }).sign(s.signKey);
  const jwe = await new CompactEncrypt(new TextEncoder().encode(jws)).setProtectedHeader({ alg: "RSA-OAEP", enc: "A128CBC-HS256", typ: "JWT", cty: "JWT", ...(s.encKid ? { kid: s.encKid } : {}) }).encrypt(s.pacoEnc);
  const res = await fetch(`${s.host}${path}`, {
    method: "POST",
    headers: { Accept: "application/jose", "Content-Type": "application/jose; charset=utf-8", CompanyApiKey: s.apiKey },
    body: jwe,
    signal: AbortSignal.timeout(20_000),
  });
  const text = (await res.text()).trim();
  if (!res.ok) throw new Error(`HBL ${res.status}: ${text.slice(0, 200)}`);
  const { plaintext } = await compactDecrypt(text, s.decKey);
  const { payload } = await compactVerify(new TextDecoder().decode(plaintext), s.pacoSign);
  return JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
}

/** Finds a value anywhere in PACO's answer, whatever the capitalisation. */
export function pick(obj: unknown, names: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const wanted = names.map((n) => n.toLowerCase());
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) if (wanted.includes(k.toLowerCase()) && v !== null && v !== "") return v;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const hit = pick(v, names);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

const minor = (amount: number, decimals: number) => Math.round(amount * 10 ** decimals);

/** Creates a hosted card payment page for one order; returns the page's address. */
export async function createHblPayment(o: { orderNo: string; amount: number; currency: "USD" | "NPR"; description: string; name: string; email: string; returnBase: string }) {
  const s = await settings();
  const decimals = 2;
  const amountMinor = minor(o.amount, decimals);
  const request = {
    apiRequest: { requestMessageID: randomUUID(), requestDateTime: new Date().toISOString(), language: "en-US" },
    officeId: s.officeId,
    orderNo: o.orderNo,
    productDescription: o.description.slice(0, 50),
    paymentType: "CC",
    paymentCategory: "ECOM",
    request3dsFlag: "Y",
    mcpFlag: "N",
    transactionAmount: { amountText: String(amountMinor).padStart(12, "0"), currencyCode: o.currency, decimalPlaces: decimals, amount: amountMinor / 10 ** decimals },
    notificationURLs: {
      confirmationURL: `${o.returnBase}/pay/return/?o=${encodeURIComponent(o.orderNo)}`,
      failedURL: `${o.returnBase}/pay/return/?o=${encodeURIComponent(o.orderNo)}`,
      cancellationURL: `${o.returnBase}/pay/return/?o=${encodeURIComponent(o.orderNo)}`,
      backendURL: `${o.returnBase}/api/webhooks/hbl/`,
    },
    customFieldList: [{ fieldName: "email", fieldValue: o.email.slice(0, 100) }, { fieldName: "name", fieldValue: o.name.slice(0, 100) }],
  };
  const answer = await call(PATHS.pay, request);
  const url = pick(answer, ["paymentPageURL", "paymentPageUrl", "webPaymentUrl"]);
  if (typeof url !== "string" || !/^https:\/\//.test(url)) throw new Error(`HBL did not return a payment page: ${JSON.stringify(answer).slice(0, 300)}`);
  return url;
}

export type HblStatus = { found: boolean; success: boolean; failed: boolean; amount: number; currency: string; transactionId: string | null; status: string; raw: unknown };

/** Asks PACO what really happened to an order. */
export async function hblInquiry(orderNo: string): Promise<HblStatus> {
  const s = await settings();
  const answer = await call(PATHS.inquiry, {
    apiRequest: { requestMessageID: randomUUID(), requestDateTime: new Date().toISOString(), language: "en-US" },
    advSearchParams: { controllerInternalID: null, officeId: [s.officeId], orderNo: [orderNo], invoiceNo2C2P: null, fromDate: "0001-01-01T00:00:00", toDate: "9999-12-31T00:00:00", amountFrom: null, amountTo: null },
  });
  const status = String(pick(answer, ["transactionStatus", "paymentStatusInfo", "status", "statusCode"]) ?? "");
  const amountText = pick(answer, ["amountText"]);
  const amountRaw = pick(answer, ["amount", "transactionAmount"]);
  const amount = typeof amountText === "string" ? Number(amountText) / 100 : typeof amountRaw === "number" ? amountRaw : Number((amountRaw as Record<string, unknown>)?.amount ?? 0);
  const ok = /^(A|S|AP|APPROVED|SUCCESS|SETTLED|PAID|00|0000)$/i.test(status.trim());
  const bad = /^(F|D|V|C|RJ|REJECTED|FAILED|DECLINED|VOIDED|CANCELLED|EXPIRED)$/i.test(status.trim());
  return { found: Boolean(status), success: ok, failed: bad, amount: Number.isFinite(amount) ? amount : 0, currency: String(pick(answer, ["currencyCode"]) ?? ""), transactionId: (pick(answer, ["invoiceNo2C2P", "transactionId", "controllerInternalID"]) as string) ?? null, status, raw: answer };
}

/** Reads the order number from PACO's server-to-server notification (signed and encrypted). */
export async function hblNotificationOrder(body: string): Promise<string | null> {
  const s = await settings();
  const { plaintext } = await compactDecrypt(body.trim(), s.decKey);
  const { payload } = await compactVerify(new TextDecoder().decode(plaintext), s.pacoSign);
  const order = pick(JSON.parse(new TextDecoder().decode(payload)), ["orderNo"]);
  return typeof order === "string" ? order : null;
}
