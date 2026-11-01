import "server-only";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/admin/db";
import { backupCode, decrypt, encrypt, hashToken, normalizeCode } from "@/lib/admin/crypto";

/** TOTP (Google Authenticator, Microsoft Authenticator, 1Password, Authy). */
export async function newEnrollment(email: string) {
  const secret = generateSecret();
  const uri = generateURI({ issuer: "Base Camp Adventure", label: email, secret });
  return { secret, qr: await QRCode.toDataURL(uri, { width: 220, margin: 1 }) };
}

export function checkCode(code: string, secret: string) {
  try {
    return verifySync({ secret, token: code.replace(/\s/g, ""), epochTolerance: 30 }).valid;
  } catch {
    return false;
  }
}

export async function checkUserCode(userId: string, code: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabled: true } });
  if (!u?.totpEnabled || !u.totpSecret) return false;
  try {
    return checkCode(code, decrypt(u.totpSecret));
  } catch {
    return false;
  }
}

/** Turns 2FA on and returns ten one-time backup codes (shown once). */
export async function enableTotp(userId: string, secret: string) {
  const codes = Array.from({ length: 10 }, backupCode);
  await db.$transaction([
    db.backupCode.deleteMany({ where: { userId } }),
    db.backupCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashToken(normalizeCode(c)) })) }),
    db.user.update({ where: { id: userId }, data: { totpSecret: encrypt(secret), totpEnabled: true } }),
  ]);
  return codes;
}

export async function consumeBackupCode(userId: string, code: string) {
  const row = await db.backupCode.findFirst({ where: { userId, codeHash: hashToken(normalizeCode(code)), usedAt: null } });
  if (!row) return false;
  const r = await db.backupCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1;
}
