import type { Request, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { conversationIdSchema } from "../validations/shared";
import * as conversationService from "../services/conversation.service";
import * as messageService from "../services/message.service";
import { AppError } from "../utils/AppError";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const conversations = await conversationService.listConversations((req as any).user.id);
  return ok(res, { conversations }, "Conversations");
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { title } = req.body as { title?: string };
  const conversation = await conversationService.createConversation((req as any).user.id, title);
  return ok(res, { conversation }, "Conversation créée", 201);
});

export const updateTitle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = conversationIdSchema.parse(req.params);
  const { title } = req.body as { title: string };
  const conversation = await conversationService.updateConversationTitle(id, (req as any).user.id, title);
  return ok(res, conversation, "Titre mis à jour");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = conversationIdSchema.parse(req.params);
  const conversation = await conversationService.deleteConversation(id, (req as any).user.id);
  return ok(res, conversation, "Conversation supprimée");
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const messages = await messageService.listMessages(id, (req as any).user.id);
  return ok(res, { messages }, "Messages");
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body as { content: string };
  const attachment = req.file as { buffer: Buffer; mimetype: string; originalname: string } | undefined;
  if (!content && !attachment) {
    throw new AppError("Écrivez un message ou joignez un fichier.", 400);
  }
  const result = await messageService.sendMessage(id, (req as any).user.id, content, attachment);
  return ok(res, { userMessage: result.userMessage, assistantMessage: result.assistantMessage }, "Message envoyé", 201);
});
