import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError";
import { fail } from "../utils/response";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route introuvable", 404));
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxSize = req.path.startsWith("/api/admin/lessons") ? "10 Mo" : "1 Mo";
      return fail(res, `Fichier trop volumineux (limite : ${maxSize})`, 413);
    }
    return fail(res, "Fichier invalide", 400, err.code);
  }
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Erreur interne du serveur";
  return fail(res, message, statusCode);
}
