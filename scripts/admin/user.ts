/**
 * Create an admin account or reset a password from the server's terminal
 * (useful if everyone is locked out):
 *
 *   npm run admin:user -- --email you@example.com --name "Your Name" --role admin
 *   npm run admin:user -- --email you@example.com --reset-password
 *   npm run admin:user -- --email you@example.com --reset-2fa
 *
 * A strong temporary password is printed once; change it after signing in.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/admin/db";
import { hashPassword } from "@/lib/admin/password";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email) throw new Error("Give an --email.");
  const password = arg("password") ?? randomBytes(12).toString("base64url");
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    if (flag("reset-password")) {
      await db.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(password), status: "active" } });
      await db.session.updateMany({ where: { userId: existing.id, revokedAt: null }, data: { revokedAt: new Date() } });
      console.log(`Password reset for ${email}.${arg("password") ? "" : `\nTemporary password: ${password}`}`);
    }
    if (flag("reset-2fa")) {
      await db.user.update({ where: { id: existing.id }, data: { totpEnabled: false, totpSecret: null } });
      await db.backupCode.deleteMany({ where: { userId: existing.id } });
      console.log(`Two-step sign-in reset for ${email}. They set it up again at the next sign-in.`);
    }
    if (!flag("reset-password") && !flag("reset-2fa")) console.log(`${email} already exists. Use --reset-password or --reset-2fa.`);
    return;
  }

  const role = arg("role") === "editor" ? "editor" : (await db.user.count()) === 0 ? "owner" : "admin";
  await db.user.create({ data: { email, name: arg("name") ?? email.split("@")[0], role, passwordHash: await hashPassword(password) } });
  console.log(`Created ${role === "editor" ? "an editor" : "a main admin"} account for ${email}.${arg("password") ? "" : `\nTemporary password: ${password}`}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
