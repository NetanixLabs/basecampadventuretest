// A test double of 2C2P PACO: decrypts and verifies our requests exactly as the bank does,
// answers signed + encrypted, and can send the server-to-server notification.
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
const req = createRequire(new URL("../../package.json", import.meta.url));
const { CompactEncrypt, compactDecrypt, compactVerify, CompactSign, importPKCS8, importSPKI } = req("jose");
const K = JSON.parse(fs.readFileSync(new URL("./keys.json", import.meta.url)));
const pacoEncPriv = await importPKCS8(K.pacoEnc.priv, "RSA-OAEP");
const pacoSignPriv = await importPKCS8(K.pacoSign.priv, "PS256");
const merchSignPub = await importSPKI(K.merchSign.pub, "PS256");
const merchEncPub = await importSPKI(K.merchEnc.pub, "RSA-OAEP");
const orders = new Map();
const log = (...a) => console.log("[paco]", ...a);
async function open(body) {
  const { plaintext } = await compactDecrypt(body, pacoEncPriv);
  const { payload } = await compactVerify(new TextDecoder().decode(plaintext), merchSignPub);
  return JSON.parse(new TextDecoder().decode(payload));
}
async function seal(obj) {
  const jws = await new CompactSign(new TextEncoder().encode(JSON.stringify(obj))).setProtectedHeader({ alg: "PS256", typ: "JWT" }).sign(pacoSignPriv);
  return new CompactEncrypt(new TextEncoder().encode(jws)).setProtectedHeader({ alg: "RSA-OAEP", enc: "A128CBC-HS256", typ: "JWT", cty: "JWT" }).encrypt(merchEncPub);
}
const read = (r) => new Promise((ok) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => ok(b)); });
http.createServer(async (r, w) => {
  try {
    const url = new URL(r.url, "http://x");
    if (r.method === "POST" && url.pathname === "/api/1.0/Payment/prePaymentUi") {
      const claims = await open(await read(r));
      if (claims.aud !== "PacoAudience" || claims.iss !== K.apiKey || r.headers.companyapikey !== K.apiKey) throw new Error("bad claims/api key");
      const q = claims.request;
      if (q.officeId !== K.officeId) throw new Error("bad office id");
      orders.set(q.orderNo, { amountText: q.transactionAmount.amountText, currency: q.transactionAmount.currencyCode, status: "PCPS", backend: q.notificationURLs.backendURL });
      log("payment page for", q.orderNo, q.transactionAmount.amountText, q.transactionAmount.currencyCode);
      w.writeHead(200, { "Content-Type": "application/jose" });
      return w.end(await seal({ response: { apiResponse: { responseCode: "PC-B050000", responseDescription: "Success" }, paymentPage: { paymentPageURL: `https://mock-paco.test/pay/${q.orderNo}` } } }));
    }
    if (r.method === "POST" && url.pathname === "/api/1.0/Inquiry/transactionList") {
      const claims = await open(await read(r));
      const no = claims.request.advSearchParams.orderNo[0];
      const o = orders.get(no);
      log("inquiry", no, o?.status);
      w.writeHead(200, { "Content-Type": "application/jose" });
      return w.end(await seal({ response: { apiResponse: { responseCode: "PC-B050000" }, data: o ? [{ orderNo: no, invoiceNo2C2P: "INV" + no, transactionStatus: o.status, transactionAmount: { amountText: o.amountText, currencyCode: o.currency } }] : [] } }));
    }
    // Test controls: /simulate?order=..&result=A|F&amount=override&notify=http://...
    if (url.pathname === "/simulate") {
      const no = url.searchParams.get("order"), o = orders.get(no);
      if (!o) { w.writeHead(404); return w.end("no order"); }
      o.status = url.searchParams.get("result") || "A";
      if (url.searchParams.get("amountText")) o.amountText = url.searchParams.get("amountText");
      const target = url.searchParams.get("notify");
      let code = null;
      if (target) { const res = await fetch(target, { method: "POST", headers: { "Content-Type": "application/jose" }, body: await seal({ orderNo: no, transactionStatus: o.status }) }); code = res.status; }
      log("simulated", no, o.status, "notify ->", code);
      w.writeHead(200, { "Content-Type": "application/json" }); return w.end(JSON.stringify({ ok: true, notify: code }));
    }
    w.writeHead(404); w.end();
  } catch (e) { log("ERROR", e.message); w.writeHead(400); w.end(e.message); }
}).listen(4555, () => log("listening on 4555"));
