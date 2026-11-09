import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET doit faire au moins 32 caractères"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  OTP_EXPIRES_IN: z.string().default("10m"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY requis"),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-1.5-flash-8b"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("qwen/qwen3.8-27b"),
  OPENROUTER_API_KEY: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_MODEL: z.string().default("mistral-small-3.1-24b-instruct"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN requis"),
  DATABASE_URL: z.string().url("DATABASE_URL doit être une URL PostgreSQL"),
  SQLITE_IMPORT_PATH: z.string().default("./data/app.sqlite"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_NAME: z.string().min(2).default("Administrateur"),
  LESSON_UPLOAD_DIR: z.string().default("./uploads/lessons"),

  // SMTP (optionnel : si non configuré, l'OTP est logué en console)
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.string().default("587"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@example.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables d'environnement invalides:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
