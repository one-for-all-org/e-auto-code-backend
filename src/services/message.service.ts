import { db } from "../config/db";
import { messages, conversations, roadLessons } from "../config/schema";
import { eq, asc, desc } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import { getConversation } from "./conversation.service";
import { generateReply, buildParts } from "./gemini.service";
import { findById } from "./user.service";

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  attachmentName: string | null;
  createdAt: number;
};

export async function listMessages(conversationId: string, userId: string): Promise<Message[]> {
  await getConversation(conversationId, userId);
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  content: string,
  attachment?: { buffer: Buffer; mimetype: string; originalname: string },
  language: "fr" | "en" | "mg" = "fr",
) {
  await getConversation(conversationId, userId);
  const user = await findById(userId);

  const now = Date.now();
  const userMessageId = crypto.randomUUID();
  const [userMessage] = await db
    .insert(messages)
    .values({
      id: userMessageId,
      conversationId,
      role: "user",
      content,
      attachmentName: attachment?.originalname ?? null,
      createdAt: now,
    })
    .returning();

  const recent = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(12);
  const lessonRows = await db
    .select({ name: roadLessons.originalName, content: roadLessons.extractedText })
    .from(roadLessons)
    .orderBy(desc(roadLessons.createdAt))
    .limit(10);
  const parts = buildParts(
    recent.reverse(),
    attachment,
    lessonRows.map((lesson) => ({ name: lesson.name, content: lesson.content })),
    user.roadRole,
    language,
  );

  let assistantText: string;
  try {
    assistantText = await generateReply(parts, language);
  } catch (error) {
    await db.delete(messages).where(eq(messages.id, userMessageId));
    throw error;
  }

  const [assistantMessage] = await db
    .insert(messages)
    .values({
      id: crypto.randomUUID(),
      conversationId,
      role: "assistant",
      content: assistantText,
      attachmentName: null,
      createdAt: Date.now(),
    })
    .returning();
  await db.update(conversations).set({ updatedAt: Date.now() }).where(eq(conversations.id, conversationId));

  return { userMessage, assistantMessage };
}
