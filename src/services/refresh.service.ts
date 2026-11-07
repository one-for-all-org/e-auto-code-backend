import { db } from "../config/db";
import { refreshTokens } from "../config/schema";
import { and, eq, gt } from "drizzle-orm";

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

export async function createRefreshToken(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + REFRESH_TOKEN_TTL;
  await db.insert(refreshTokens).values({ id: crypto.randomUUID(), userId, token, expiresAt, createdAt: now });
  return { token, expiresAt };
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string; expiresAt: number } | null> {
  const [row] = await db
    .select({ id: refreshTokens.id, userId: refreshTokens.userId, expiresAt: refreshTokens.expiresAt })
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, Date.now())))
    .limit(1);
  if (!row) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    return null;
  }
  return { userId: row.userId, expiresAt: row.expiresAt };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
