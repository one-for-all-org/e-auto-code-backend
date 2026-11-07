import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { db } from "../config/db";
import { env } from "../config/env";
import { roadLessons } from "../config/schema";
import { assertRoadLessonRelevance } from "./gemini.service";
import { AppError } from "../utils/AppError";
import { desc, eq } from "drizzle-orm";
import pdfParse from "pdf-parse";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 60000;

export type UploadedLesson = {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
  uploadedBy: string;
  createdAt: number;
};

async function extractText(file: Express.Multer.File, extension: string): Promise<string> {
  let text: string;
  if (extension === ".txt") {
    text = file.buffer.toString("utf8");
  } else {
    if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new AppError("Le contenu du fichier n’est pas un PDF valide.", 400);
    }
    try {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } catch (error) {
      console.error("[LESSONS] Impossible de lire le PDF:", error);
      throw new AppError("Le PDF est illisible ou endommagé.", 400);
    }
  }

  const cleaned = text.replace(/\u0000/g, "").trim();
  if (!cleaned) {
    throw new AppError("Le fichier ne contient pas de texte exploitable.", 400);
  }
  return cleaned.slice(0, MAX_EXTRACTED_TEXT);
}

export async function uploadLesson(file: Express.Multer.File, uploadedBy: string) {
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError("La taille maximale d’un fichier est de 10 Mo.", 413);
  }

  const extension = extname(file.originalname).toLowerCase();
  if (
    (extension === ".pdf" && file.mimetype !== "application/pdf") ||
    (extension === ".txt" && file.mimetype !== "text/plain") ||
    ![".pdf", ".txt"].includes(extension)
  ) {
    throw new AppError("Seuls les fichiers PDF et TXT sont acceptés.", 400);
  }

  const extractedText = await extractText(file, extension);
  await assertRoadLessonRelevance(extractedText);

  const id = crypto.randomUUID();
  const storageName = `${id}${extension}`;
  const originalName = basename(file.originalname).slice(0, 255);
  const directory = resolve(env.LESSON_UPLOAD_DIR);
  const filePath = resolve(directory, storageName);
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, file.buffer, { flag: "wx" });

  try {
    const [lesson] = await db
      .insert(roadLessons)
      .values({
        id,
        originalName,
        storageName,
        mimeType: file.mimetype,
        fileSize: file.size,
        extractedText,
        uploadedBy,
        createdAt: Date.now(),
      })
      .returning();
    return lesson;
  } catch (error) {
    await unlink(filePath);
    throw error;
  }
}

export async function listLessons() {
  return db
    .select({
      id: roadLessons.id,
      originalName: roadLessons.originalName,
      mimeType: roadLessons.mimeType,
      fileSize: roadLessons.fileSize,
      createdAt: roadLessons.createdAt,
    })
    .from(roadLessons)
    .orderBy(desc(roadLessons.createdAt));
}

export async function deleteLesson(id: string): Promise<void> {
  const [lesson] = await db
    .select({ storageName: roadLessons.storageName })
    .from(roadLessons)
    .where(eq(roadLessons.id, id))
    .limit(1);
  if (!lesson) {
    throw new AppError("Leçon introuvable.", 404);
  }

  await db.delete(roadLessons).where(eq(roadLessons.id, id));
  const filePath = resolve(env.LESSON_UPLOAD_DIR, basename(lesson.storageName));
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[LESSONS] Impossible de supprimer le fichier:", error);
      throw new AppError("La leçon a été supprimée, mais le fichier doit être nettoyé manuellement.", 500);
    }
  }
}
