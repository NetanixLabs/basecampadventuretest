import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/admin/db";
import { cfg } from "@/lib/admin/config";
import { env } from "@/lib/admin/env";
import { renderHtml, renderText, type EmailBlock, type EmailContent } from "@/lib/admin/email/layout";
import { fill, templateDef } from "@/lib/admin/email/templates";

/**
 * Outgoing email through any SMTP service (Google Workspace, Zoho, Amazon SES,
 * Resend, Brevo…). Without SMTP settings, emails are written to the server
 * log, so development works with no account. Every send is logged in the
 * admin (Emails → Sent).
 */
let transport: { sig: string; t: Transporter } | null = null;
async function mailer() {
  const [host, port, user, pass] = await Promise.all([cfg("SMTP_HOST"), cfg("SMTP_PORT"), cfg("SMTP_USER"), cfg("SMTP_PASS")]);
  if (!host) return null;
  const sig = `${host}|${port}|${user}|${pass}`;
  if (transport?.sig !== sig) {
    const p = Number(port) || 587;
    transport = { sig, t: nodemailer.createTransport({ host, port: p, secure: p === 465, auth: user ? { user, pass } : undefined }) };
  }
  return transport.t;
}

export async function sendRaw(to: string, subject: string, content: EmailContent, template = "custom", replyTo?: string) {
  return sendHtml(to, subject, renderHtml(content), renderText(content), template, { replyTo, unsubscribeUrl: content.unsubscribeUrl });
}

/** Sends finished HTML (used by the newsletter design) and logs it. */
export async function sendHtml(to: string, subject: string, html: string, text: string, template: string, opts: { replyTo?: string; unsubscribeUrl?: string } = {}) {
  let status = "sent";
  let error: string | null = null;
  let providerId: string | null = null;
  const m = await mailer();
  try {
    if (!m) {
      status = "logged";
      console.info(`\n[email] to ${to}\nSubject: ${subject}\n${text}\n`);
    } else {
      const info = await m.sendMail({
        from: (await cfg("EMAIL_FROM")) || env().EMAIL_FROM,
        to,
        subject,
        html,
        text,
        replyTo: opts.replyTo,
        headers: opts.unsubscribeUrl ? { "List-Unsubscribe": `<${opts.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
      });
      providerId = info.messageId ?? null;
    }
  } catch (cause) {
    status = "failed";
    error = cause instanceof Error ? cause.message : String(cause);
    console.error("[email] failed", to, subject, error);
  }
  await db.emailLog.create({ data: { to, template, subject, status, error, providerId } }).catch(() => undefined);
  return { ok: status !== "failed", error };
}

/**
 * Sends one of the automatic emails, using the office's wording if it has
 * been edited, plus any extra blocks (booking summary, button link).
 */
export async function sendTemplate(
  key: string,
  to: string,
  vars: Record<string, string | number | null | undefined>,
  extra: { details?: [string, string][]; buttonHref?: string; note?: string; replyTo?: string; unsubscribeUrl?: string } = {},
) {
  const def = templateDef(key);
  if (!def) throw new Error(`Unknown email template ${key}`);
  const saved = await db.emailTemplate.findUnique({ where: { key } }).catch(() => null);
  if (saved ? !saved.enabled : def.off) return { ok: true, error: null, skipped: true };
  const t = { subject: saved?.subject ?? def.subject, heading: saved?.heading ?? def.heading, body: saved?.body ?? def.body, button: saved?.button ?? def.button };
  const blocks: EmailBlock[] = [{ kind: "text", text: fill(t.body, vars) }];
  if (extra.details?.length) blocks.push({ kind: "details", rows: extra.details });
  if (t.button && extra.buttonHref) blocks.push({ kind: "button", label: fill(t.button, vars), href: extra.buttonHref });
  if (extra.note) blocks.push({ kind: "note", text: extra.note });
  const subject = fill(t.subject, vars);
  return sendRaw(to, subject, { preview: subject, heading: fill(t.heading, vars), blocks, unsubscribeUrl: extra.unsubscribeUrl }, key, extra.replyTo);
}

export const officeEmail = async () => (await cfg("OFFICE_EMAIL")) || env().OFFICE_EMAIL;
