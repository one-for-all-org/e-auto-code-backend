import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { closeDb, db } from "../config/db";
import { env } from "../config/env";
import { conversations, messages, otpCodes, refreshTokens, users } from "../config/schema";

const BATCH_SIZE = 500;

function batches<T>(rows: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    result.push(rows.slice(i, i + BATCH_SIZE));
  }
  return result;
}

async function importSqlite() {
  const sqlite = new Database(resolve(env.SQLITE_IMPORT_PATH), { readonly: true, fileMustExist: true });
  try {
    await db.transaction(async (tx) => {
      const oldUsers = sqlite.prepare("SELECT * FROM users").all().map((row: any) => ({
        id: row.id,
        name: row.name,
        email: String(row.email).trim().toLowerCase(),
        passwordHash: row.password_hash,
        role: row.role === "ADMIN" ? "ADMIN" as const : "USER" as const,
        isOk: Boolean(row.is_ok),
        isBlocked: Boolean(row.is_blocked),
        createdAt: Number(row.created_at),
      }));
      for (const batch of batches(oldUsers)) {
        await tx.insert(users).values(batch).onConflictDoNothing();
      }

      const oldConversations = sqlite.prepare("SELECT * FROM conversations").all().map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }));
      for (const batch of batches(oldConversations)) {
        await tx.insert(conversations).values(batch).onConflictDoNothing();
      }

      const oldMessages = sqlite.prepare("SELECT * FROM messages").all().map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role === "assistant" ? "assistant" as const : "user" as const,
        content: row.content,
        attachmentName: row.attachment_name,
        createdAt: Number(row.created_at),
      }));
      for (const batch of batches(oldMessages)) {
        await tx.insert(messages).values(batch).onConflictDoNothing();
      }

      const oldOtps = sqlite.prepare("SELECT * FROM otp_codes").all().map((row: any) => ({
        id: row.id,
        email: String(row.email).trim().toLowerCase(),
        code: createHash("sha256").update(String(row.code)).digest("hex"),
        expiresAt: Number(row.expires_at),
        used: Boolean(row.used),
        createdAt: Number(row.created_at),
      }));
      for (const batch of batches(oldOtps)) {
        await tx.insert(otpCodes).values(batch).onConflictDoNothing();
      }

      const oldTokens = sqlite.prepare("SELECT * FROM refresh_tokens").all().map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: Number(row.expires_at),
        createdAt: Number(row.created_at),
      }));
      for (const batch of batches(oldTokens)) {
        await tx.insert(refreshTokens).values(batch).onConflictDoNothing();
      }
    });
    console.log("Import SQLite terminé. Les données existantes dans PostgreSQL ont été conservées.");
  } finally {
    sqlite.close();
  }
}

void importSqlite()
  .catch((error) => {
    console.error("Échec de l’import SQLite:", error);
    process.exitCode = 1;
  })
  .finally(closeDb);
