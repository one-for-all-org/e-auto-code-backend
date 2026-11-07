import { createHash, randomInt } from "node:crypto";
import { db } from "../config/db";
import { env } from "../config/env";
import { otpCodes } from "../config/schema";
import { and, eq, gt } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import nodemailer from "nodemailer";

export type OtpPurpose = "reset";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode(): string {
  return randomInt(100000, 1000000).toString();
}

export async function createOtp(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateOtpCode();
  const now = Date.now();
  const ttlMs = Number.parseInt(env.OTP_EXPIRES_IN, 10) * 60 * 1000;

  await db.transaction(async (tx) => {
    await tx
      .update(otpCodes)
      .set({ used: true })
      .where(and(eq(otpCodes.email, normalizedEmail), eq(otpCodes.used, false)));
    await tx.insert(otpCodes).values({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      code: hashCode(code),
      expiresAt: now + ttlMs,
      used: false,
      createdAt: now,
    });
  });
  return code;
}

export async function consumeOtp(email: string, code: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  const [row] = await db
    .select({ id: otpCodes.id, expiresAt: otpCodes.expiresAt })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, normalizedEmail),
        eq(otpCodes.code, hashCode(code)),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AppError("Code OTP invalide, expiré ou déjà utilisé", 400);
  }

  const [consumed] = await db
    .update(otpCodes)
    .set({ used: true })
    .where(
      and(
        eq(otpCodes.id, row.id),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, Date.now()),
      ),
    )
    .returning({ id: otpCodes.id });
  if (!consumed) {
    throw new AppError("Code OTP invalide, expiré ou déjà utilisé", 400);
  }
}

function mailText(code: string): string {
  return `Bonjour,\n\nVotre code de réinitialisation de mot de passe est : ${code}\nCe code expire dans ${env.OTP_EXPIRES_IN}.\n\n---\nCode de la route - Madagascar`;
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Le service d’envoi d’email n’est pas configuré.", 503);
    }
    console.info(`[OTP] Code de réinitialisation pour ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number.parseInt(env.SMTP_PORT, 10),
    secure: Number.parseInt(env.SMTP_PORT, 10) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: "Code de réinitialisation de mot de passe",
      text: mailText(code),
    });
  } catch (error) {
    console.error("[SMTP] Échec de l’envoi du code de réinitialisation.", error);
    throw new AppError("Impossible d’envoyer l’email de réinitialisation.", 502);
  }
}
