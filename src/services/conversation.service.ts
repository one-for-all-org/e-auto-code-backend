import { db } from "../config/db";
import { conversations } from "../config/schema";
import { eq, desc, and } from "drizzle-orm";
import { AppError } from "../utils/AppError";

export type Conversation = {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export async function listConversations(userId: string): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(conversationId: string, userId: string): Promise<Conversation> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (!conversation) {
    throw new AppError("Conversation introuvable", 404);
  }
  return conversation;
}

export async function createConversation(userId: string, title?: string): Promise<Conversation> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const [conversation] = await db
    .insert(conversations)
    .values({
      id,
      userId,
      title: title?.trim() || "Nouvelle conversation",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return conversation;
}

export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string,
): Promise<{ id: string; title: string }> {
  const [conversation] = await db
    .update(conversations)
    .set({ title: title.trim(), updatedAt: Date.now() })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id, title: conversations.title });
  if (!conversation) {
    throw new AppError("Conversation introuvable", 404);
  }
  return conversation;
}

export async function deleteConversation(conversationId: string, userId: string): Promise<{ id: string }> {
  const [conversation] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });
  if (!conversation) {
    throw new AppError("Conversation introuvable", 404);
  }
  return conversation;
}
