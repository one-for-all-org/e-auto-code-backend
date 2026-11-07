import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { extname } from "node:path";
import { AppError } from "../utils/AppError";

const KNOWLEDGE_MAX_FILE_SIZE = 30 * 1024 * 1024;
const ANALYSIS_MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 60000;
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const ANALYSIS_DOCUMENT_MAX_FILE_SIZE = ANALYSIS_MAX_FILE_SIZE;

export async function extractDocumentText(
  file: Express.Multer.File,
  buffer: Buffer,
  maxFileSize = KNOWLEDGE_MAX_FILE_SIZE,
): Promise<string> {
  if (file.size > maxFileSize) {
    const maxSizeMb = maxFileSize / (1024 * 1024);
    throw new AppError(`La taille maximale d’un fichier est de ${maxSizeMb} Mo.`, 413);
  }

  const extension = extname(file.originalname).toLowerCase();
  const validType =
    (extension === ".pdf" && file.mimetype === "application/pdf") ||
    (extension === ".txt" && file.mimetype === "text/plain") ||
    (extension === ".docx" && file.mimetype === DOCX_MIME_TYPE);
  if (!validType) {
    throw new AppError("Seuls les fichiers PDF, TXT et DOCX sont acceptés.", 400);
  }

  let text: string;
  if (extension === ".txt") {
    text = buffer.toString("utf8");
  } else if (extension === ".pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new AppError("Le contenu du fichier n’est pas un PDF valide.", 400);
    }
    try {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } catch (error) {
      console.error("[DOCUMENTS] Impossible de lire le PDF:", error);
      throw new AppError("Le PDF est illisible ou endommagé.", 400);
    }
  } else {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    } catch (error) {
      console.error("[DOCUMENTS] Impossible de lire le DOCX:", error);
      throw new AppError("Le document DOCX est illisible ou endommagé.", 400);
    }
  }

  const cleaned = text.replace(/\u0000/g, "").trim();
  if (!cleaned) {
    throw new AppError("Le fichier ne contient pas de texte exploitable.", 400);
  }
  return cleaned.slice(0, MAX_EXTRACTED_TEXT);
}
