import pdfParse from "pdf-parse";
import { db } from "../config/db";
import { env } from "../config/env";
import { roadSources } from "../config/schema";
import { assertRoadLessonRelevance } from "./gemini.service";
import { AppError } from "../utils/AppError";
import { asc, eq } from "drizzle-orm";

const SOURCE_MAX_TEXT = 60000;
const SOURCE_FETCH_TIMEOUT_MS = 20000;
const SOURCE_MAX_BYTES = 30 * 1024 * 1024;

export type RoadSource = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  isActive: boolean;
  addedBy: string | null;
  createdAt: number;
  updatedAt: number;
};

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&laquo;": "«",
    "&raquo;": "»",
    "&eacute;": "é",
    "&egrave;": "è",
    "&agrave;": "à",
    "&ccedil;": "ç",
    "&ecirc;": "ê",
    "&ocirc;": "ô",
    "&ucirc;": "û",
    "&deg;": "°",
  };
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-zA-Z]+;/g, (entity) => entities[entity] ?? " ");
}

export async function extractWebPageText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError("L'URL fournie est invalide.", 400);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError("Seules les URLs http(s) sont acceptées.", 400);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoCodeAssistant/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new AppError("Impossible d'accéder à la page (délai dépassé ou site injoignable).", 502);
  }
  if (!response.ok) {
    throw new AppError(`La page a répondu avec l'erreur HTTP ${response.status}.`, 502);
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("application/pdf")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > SOURCE_MAX_BYTES) {
      throw new AppError("Le fichier PDF distant est trop volumineux.", 413);
    }
    try {
      const parsed = await pdfParse(buffer);
      const text = parsed.text.replace(/\u0000/g, "").trim();
      if (!text) throw new AppError("Le PDF distant ne contient pas de texte exploitable.", 400);
      return text.slice(0, SOURCE_MAX_TEXT);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("[SOURCES] Impossible de lire le PDF distant:", error);
      throw new AppError("Le PDF distant est illisible.", 400);
    }
  }

  if (!contentType.includes("text/html") && !contentType.includes("text/plain") && contentType !== "") {
    throw new AppError(`Type de contenu non pris en charge (${contentType}).`, 415);
  }

  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const cleaned = decodeHtmlEntities(text)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) {
    throw new AppError("La page ne contient pas de texte exploitable.", 400);
  }
  return cleaned.slice(0, SOURCE_MAX_TEXT);
}

export async function addSource(
  url: string,
  title: string,
  description: string | undefined,
  addedBy: string,
): Promise<RoadSource> {
  const [existing] = await db
    .select({ id: roadSources.id })
    .from(roadSources)
    .where(eq(roadSources.url, url))
    .limit(1);
  if (existing) {
    throw new AppError("Cette URL est déjà enregistrée dans les sources.", 409);
  }

  const extractedText = await extractWebPageText(url);
  await assertRoadLessonRelevance(extractedText);

  const now = Date.now();
  const [source] = await db
    .insert(roadSources)
    .values({
      id: crypto.randomUUID(),
      title,
      url,
      description: description ?? null,
      extractedText,
      isActive: true,
      addedBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return source;
}

export async function refreshSource(id: string, addedBy: string): Promise<RoadSource> {
  const [source] = await db.select().from(roadSources).where(eq(roadSources.id, id)).limit(1);
  if (!source) {
    throw new AppError("Source introuvable.", 404);
  }
  const extractedText = await extractWebPageText(source.url);
  await assertRoadLessonRelevance(extractedText);
  const [updated] = await db
    .update(roadSources)
    .set({ extractedText, updatedAt: Date.now(), addedBy })
    .where(eq(roadSources.id, id))
    .returning();
  return updated;
}

export async function listSources(): Promise<RoadSource[]> {
  return db
    .select({
      id: roadSources.id,
      title: roadSources.title,
      url: roadSources.url,
      description: roadSources.description,
      isActive: roadSources.isActive,
      addedBy: roadSources.addedBy,
      createdAt: roadSources.createdAt,
      updatedAt: roadSources.updatedAt,
    })
    .from(roadSources)
    .orderBy(asc(roadSources.createdAt));
}

export async function setActiveSource(id: string, isActive: boolean): Promise<RoadSource> {
  const [updated] = await db
    .update(roadSources)
    .set({ isActive, updatedAt: Date.now() })
    .where(eq(roadSources.id, id))
    .returning({
      id: roadSources.id,
      title: roadSources.title,
      url: roadSources.url,
      description: roadSources.description,
      isActive: roadSources.isActive,
      addedBy: roadSources.addedBy,
      createdAt: roadSources.createdAt,
      updatedAt: roadSources.updatedAt,
    });
  if (!updated) {
    throw new AppError("Source introuvable.", 404);
  }
  return updated;
}

export async function deleteSource(id: string): Promise<void> {
  const [source] = await db
    .select({ id: roadSources.id })
    .from(roadSources)
    .where(eq(roadSources.id, id))
    .limit(1);
  if (!source) {
    throw new AppError("Source introuvable.", 404);
  }
  await db.delete(roadSources).where(eq(roadSources.id, id));
}
