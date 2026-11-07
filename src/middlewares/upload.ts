import multer from "multer";
import { mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

const ALLOWED = ["image/png", "image/jpeg", "application/pdf", "text/plain"];
const MAX_SIZE = 1 * 1024 * 1024;
const LESSON_TYPES = ["application/pdf", "text/plain"];
const KNOWLEDGE_TYPES = [
  ...LESSON_TYPES,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const LESSON_ANALYSIS_MAX_SIZE = 10 * 1024 * 1024;
const LESSON_KNOWLEDGE_MAX_SIZE = 30 * 1024 * 1024;

const storage = multer.memoryStorage();
const lessonTempDirectory = resolve(env.LESSON_UPLOAD_DIR, ".incoming");
const lessonDiskStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    void mkdir(lessonTempDirectory, { recursive: true }).then(
      () => callback(null, lessonTempDirectory),
      (error: NodeJS.ErrnoException) => callback(error, lessonTempDirectory),
    );
  },
  filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.upload`),
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!ALLOWED.includes(file.mimetype)) {
    return cb(new AppError("Type de fichier non autorisé", 400) as unknown as null, false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

export const uploadOne = upload.single("file");

const createLessonUpload = (fileSize: number) => {
  const uploadFile = multer({
    storage: lessonDiskStorage,
    fileFilter: (_req, file, cb) => {
      if (!KNOWLEDGE_TYPES.includes(file.mimetype)) {
        return cb(new AppError("Seuls les fichiers PDF, TXT et DOCX sont acceptés.", 400));
      }
      cb(null, true);
    },
    limits: { fileSize, files: 1 },
  }).single("file");

  return (req: Request, res: Response, next: NextFunction) => {
    uploadFile(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        const maxSizeMb = fileSize / (1024 * 1024);
        return next(new AppError(`Fichier trop volumineux (limite : ${maxSizeMb} Mo).`, 413));
      }
      if (!error && req.file?.path) {
        const temporaryPath = req.file.path;
        res.on("finish", () => {
          void unlink(temporaryPath).catch((cleanupError: NodeJS.ErrnoException) => {
            if (cleanupError.code !== "ENOENT") {
              console.error("[UPLOAD] Impossible de supprimer le fichier temporaire:", cleanupError);
            }
          });
        });
      }
      next(error);
    });
  };
};

export const lessonUploadOne = createLessonUpload(LESSON_KNOWLEDGE_MAX_SIZE);
export const lessonAnalyzeUploadOne = createLessonUpload(LESSON_ANALYSIS_MAX_SIZE);
