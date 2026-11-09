import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import * as lessonService from "../services/lesson.service";
import type { AuthRequest } from "../middlewares/auth";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const lessons = await lessonService.listLessons();
  return ok(res, { lessons }, "Leçons");
});

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("Sélectionnez un fichier PDF, TXT ou DOCX.", 400);
  }
  const user = (req as AuthRequest).user;
  if (!user) {
    throw new AppError("Authentification requise.", 401);
  }
  const resourceUrl = typeof req.body.resourceUrl === "string" ? req.body.resourceUrl.trim() || undefined : undefined;
  const lesson = await lessonService.uploadLesson(req.file, user.id, resourceUrl);
  return ok(res, {
    lesson: {
      id: lesson.id,
      originalName: lesson.originalName,
      resourceUrl: lesson.resourceUrl,
      mimeType: lesson.mimeType,
      fileSize: lesson.fileSize,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    },
  }, "Leçon validée et ajoutée à la base de connaissances.", 201);
});

export const analyze = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("Sélectionnez un fichier PDF, TXT ou DOCX.", 400);
  }
  const question = req.body.question as string;
  const answer = await lessonService.askAboutDocument(req.file, question);
  return ok(res, { answer }, "Réponse générée.");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await lessonService.deleteLesson(req.params.lessonId);
  return ok(res, { id: req.params.lessonId }, "Leçon supprimée.");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const resourceUrl = typeof req.body.resourceUrl === "string" ? req.body.resourceUrl.trim() || undefined : undefined;
  if (!req.file && !resourceUrl) {
    throw new AppError("Fournissez un fichier et/ou un lien de ressource à modifier.", 400);
  }
  const lesson = await lessonService.updateLesson(req.params.lessonId, req.file ?? undefined, resourceUrl);
  return ok(res, {
    lesson: {
      id: lesson.id,
      originalName: lesson.originalName,
      resourceUrl: lesson.resourceUrl,
      mimeType: lesson.mimeType,
      fileSize: lesson.fileSize,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    },
  }, "Leçon mise à jour.");
});
