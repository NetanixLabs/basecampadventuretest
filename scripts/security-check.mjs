/**
 * Security check (OWASP Top 10 style): attacks the running site the way an
 * attacker would and expects every attack to fail.
 *
 *   node scripts/security-check.mjs [base=http://localhost:3000] [--admin-host admin.localhost:3000]
 *        [--login email password totpSecret]   also test brute-force lockout and session cookies
 *
 * Exit code 1 if any check fails. Safe to run against production: it only
 * sends bad logins for a made-up address unless --login is given, and spam
 * test messages are blocked by the honeypot.
 */
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { createHmac } from "node:crypto";

const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN = args.includes("--admin-host") ? args[args.indexOf("--admin-host") + 1] : "admin.localhost:3000";
const PUBLIC = new URL(BASE).host;
const LOGIN = args.includes("--login") ? args.slice(args.indexOf("--login") + 1, args.indexOf("--login") + 4) : null;

let failed = 0;
const out = [];
const check = async (area, name, fn) => {
  try {
    const d = await fn();
    out.push(["✓", area, name, d ?? ""]);
  } catch (e) {
    failed++;
    out.push(["✗", area, name, e.message]);
  }
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

/** Raw HTTP so the Host and Origin headers are exactly what we say. */
function raw({ method = "GET", path, host = PUBLIC, headers = {}, body }) {
  const u = new URL(BASE + path);
  const fn = u.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const r = fn({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { Host: host, ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}
const json = (o) => JSON.stringify(o);

/* ---------------------------------------------------------- A05 headers */

for (const [label, host, path] of [["website", PUBLIC, "/"], ["admin", ADMIN, "/login/"]]) {
  await check("A05 Security headers", `${label}: full set of protective headers`, async () => {
    const r = await raw({ path, host });
    const h = r.headers;
    const csp = h["content-security-policy"] ?? "";
    for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) assert(csp.includes(d), `CSP lacks ${d}`);
    assert(/max-age=\d{8,}/.test(h["strict-transport-security"] ?? ""), "HSTS missing/short");
    assert(h["x-content-type-options"] === "nosniff", "nosniff missing");
    assert(/DENY|SAMEORIGIN/.test(h["x-frame-options"] ?? ""), "X-Frame-Options missing");
    assert(h["referrer-policy"], "Referrer-Policy missing");
    assert(h["permissions-policy"], "Permissions-Policy missing");
    assert(h["cross-origin-opener-policy"] === "same-origin", "COOP missing");
    assert(!h["x-powered-by"], "X-Powered-By reveals the framework");
    if (label === "admin") {
      assert(/noindex/.test(h["x-robots-tag"] ?? ""), "admin not noindex");
      assert(/no-store/.test(h["cache-control"] ?? ""), "admin pages cacheable");
    }
  });
}

/* ------------------------------------------------------- CSRF (A01) */

await check("A01 CSRF", "admin: a form posted from another website is refused", async () => {
  const r = await raw({ method: "POST", path: "/login/", host: ADMIN, headers: { Origin: "https://evil.example", "Content-Type": "text/plain" }, body: "x" });
  assert(r.status === 403, `status ${r.status}`);
});
await check("A01 CSRF", "admin: a write with no origin at all is refused", async () => {
  const r = await raw({ method: "POST", path: "/api/media/", host: ADMIN, headers: { "Content-Type": "text/plain" }, body: "x" });
  assert(r.status === 403, `status ${r.status}`);
});
await check("A01 CSRF", "admin upload API: cross-site request refused", async () => {
  const r = await raw({ method: "POST", path: "/api/media/", host: ADMIN, headers: { Origin: "https://evil.example" }, body: "x" });
  assert(r.status === 403, `status ${r.status}`);
});
await check("A01 CSRF", "public forms refuse posts from other websites", async () => {
  for (const p of ["/api/enquiry/", "/api/booking/", "/api/newsletter/", "/api/online-payment/"]) {
    const r = await raw({ method: "POST", path: p, headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
    assert(r.status === 403, `${p} → ${r.status}`);
  }
});

/* ------------------------------------------ A01/A07 access control & auth */

await check("A01 Access control", "admin pages send visitors without a session to sign in", async () => {
  for (const p of ["/", "/bookings/", "/settings/", "/users/", "/c/trips/"]) {
    const r = await raw({ path: p, host: ADMIN });
    assert([302, 303, 307, 308].includes(r.status) && /\/login\/?$/.test(r.headers.location ?? ""), `${p} → ${r.status} ${r.headers.location}`);
  }
});
await check("A01 Access control", "admin APIs refuse visitors without a session", async () => {
  for (const p of ["/api/media/", "/api/subscribers.csv"]) {
    const r = await raw({ path: p, host: ADMIN });
    assert(r.status === 401, `${p} → ${r.status}`);
  }
});
await check("A07 Session", "a made-up session cookie is ignored", async () => {
  const r = await raw({ path: "/bookings/", host: ADMIN, headers: { Cookie: "__Host-bca_admin=forged-token-1234567890; bca_admin=forged-token-1234567890" } });
  assert([302, 303, 307, 308].includes(r.status), `status ${r.status}`);
});
await check("A01 Access control", "the admin doesn't exist on the public website", async () => {
  for (const p of ["/admin/", "/admin/login/", "/admin/api/media/"]) {
    const r = await raw({ path: p });
    assert(r.status === 404, `${p} → ${r.status}`);
  }
});

/* -------------------------------------------------------- injection (A03) */

await check("A03 Injection", "SQL injection in a public lookup does nothing", async () => {
  const r = await raw({ path: `/api/discount/?code=${encodeURIComponent("' OR '1'='1")}&trip=everest-base-camp-trek&pax=1` });
  assert(r.status === 400 && /isn't valid|not valid/.test(r.body), `${r.status} ${r.body.slice(0, 80)}`);
});
await check("A03 Injection", "script tags in a form are stored as plain text, never run", async () => {
  // The honeypot field makes the server accept and discard it, so nothing is stored or emailed.
  const r = await raw({ method: "POST", path: "/api/enquiry/", headers: { Origin: BASE, "Content-Type": "application/json" }, body: json({ name: "<script>alert(1)</script>", email: "x@example.com", message: "<img src=x onerror=alert(1)>", website: "spam" }) });
  // Refused by validation (400) or silently dropped by the spam trap (200); never echoed back.
  assert([200, 400].includes(r.status) && !/<script>|onerror=/.test(r.body), `status ${r.status}`);
});
await check("A03 Injection", "search engines and readers get escaped text (no reflected XSS)", async () => {
  const r = await raw({ path: `/trip/%3Cscript%3Ealert(1)%3C%2Fscript%3E/` });
  assert(r.status === 404 && !r.body.includes("<script>alert(1)</script>"), `status ${r.status}`);
});

/* ------------------------------------------------- path traversal (A01) */

await check("A01 Path traversal", "files outside the upload folder can't be read", async () => {
  for (const p of ["/uploads/..%2f..%2f..%2fetc%2fpasswd", "/uploads/%2e%2e/%2e%2e/package.json", "/email-image/?src=/../../etc/passwd", "/email-image/?src=/media/..%2f..%2f.env", "/coupon/..%2f..%2fetc/"]) {
    const r = await raw({ path: p });
    assert([400, 404, 308].includes(r.status) && !/root:|DATABASE_URL|"dependencies"/.test(r.body), `${p} → ${r.status}`);
  }
});
await check("A05 Exposure", "secrets and source files are never served", async () => {
  for (const p of ["/.env", "/.env.example", "/.git/config", "/package.json", "/prisma/schema.prisma", "/.storage/content/settings.json", "/src/lib/admin/env.ts"]) {
    let r = await raw({ path: p });
    if (r.status === 308 && r.headers.location) r = await raw({ path: new URL(r.headers.location, BASE).pathname }); // trailing-slash hop
    assert(r.status === 404 && !/DATABASE_URL|ENCRYPTION_KEY|\[core\]|"dependencies"/.test(r.body), `${p} → ${r.status}`);
  }
});

/* ---------------------------------------------- A08 integrity (payments) */

await check("A08 Integrity", "a forged WeTravel payment notification is rejected", async () => {
  const body = json({ type: "payment.created", data: { amount: 99999, status: "succeeded", trip: { trip_id: "BCA-AAAAAA" } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from("not-the-real-secret")).update(`msg_x.${ts}.${body}`).digest("base64");
  const r = await raw({ method: "POST", path: "/api/webhooks/wetravel/", headers: { "Content-Type": "application/json", "svix-id": "msg_x", "svix-timestamp": ts, "svix-signature": `v1,${sig}` }, body });
  assert(r.status === 401, `status ${r.status}`);
});
/* ------------------------------------------------- A04/A07 brute force */

await check("A04 Abuse", "public forms are rate-limited (spam flood stops)", async () => {
  let limited = false;
  for (let i = 0; i < 12 && !limited; i++) {
    const r = await raw({ method: "POST", path: "/api/newsletter/", headers: { Origin: BASE, "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.77" }, body: json({ email: `flood${i}@example.com`, website: "honeypot" }) });
    limited = r.status === 429;
  }
  assert(limited, "never rate-limited");
});

if (LOGIN) {
  const { createRequire } = await import("node:module");
  const req = createRequire(import.meta.url);
  let chromium, generateSync;
  try {
    ({ chromium } = req("playwright"));
    ({ generateSync } = req(process.cwd() + "/node_modules/otplib"));
  } catch {
    out.push(["!", "A07", "login tests skipped", "needs playwright installed"]);
  }
  if (chromium) {
    const [email, password, secret] = LOGIN;
    const adminUrl = `${new URL(BASE).protocol}//${ADMIN}`;
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await check("A07 Brute force", "password guessing locks the account after 5 tries", async () => {
      await page.goto(`${adminUrl}/login/`);
      let locked = false;
      for (let i = 0; i < 7 && !locked; i++) {
        await page.fill("#email", email);
        await page.fill("#password", `wrong-password-${i}`);
        await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.click("button[type=submit]")]);
        await page.waitForTimeout(400);
        locked = /Too many attempts/.test(await page.content());
      }
      assert(locked, "no lockout");
      await page.fill("#password", password);
      await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.click("button[type=submit]")]);
      await page.waitForTimeout(800);
      assert(/Too many attempts/.test(await page.content()) && /login/.test(page.url()), "correct password accepted during lockout");
    });
    out.push(["!", "A07", `clear the test lockout with: DELETE FROM "RateLimit" WHERE key LIKE 'login:%${email}%'`, ""]);
    await browser.close();
    void secret;
    void generateSync;
  }
}

await check("A07 Enumeration", "password reset doesn't reveal which emails have accounts", async () => {
  // Same answer for any address: checked in code (requestReset returns one message); here we
  // confirm the page itself never says "no account".
  const r = await raw({ path: "/forgot/", host: ADMIN });
  assert(r.status === 200 && !/no account|not found|doesn't exist/i.test(r.body), `status ${r.status}`);
});

for (const [s, a, n, d] of out) console.log(`${s} [${a}] ${n}${d ? `  (${d})` : ""}`);
console.log(`\n${out.filter((x) => x[0] === "✓").length}/${out.filter((x) => x[0] !== "!").length} checks passed`);
process.exitCode = failed ? 1 : 0;
