import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  roadRole: z.enum(["DRIVER", "PASSENGER", "PEDESTRIAN", "CITIZEN"]).default("CITIZEN"),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const mePatchSchema = z
  .object({
    name: z.string().min(2).optional(),
    password: z.string().min(8).optional(),
    roadRole: z.enum(["DRIVER", "PASSENGER", "PEDESTRIAN", "CITIZEN"]).optional(),
  })
  .refine((data) => data.name !== undefined || data.password !== undefined || data.roadRole !== undefined, {
    message: "Au moins un champ à modifier",
  });

export const conversationCreateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

export const conversationIdSchema = z.object({
  id: z.string().uuid("ID de conversation invalide"),
});

export const userIdSchema = z.object({
  userId: z.string().uuid("ID utilisateur invalide"),
});

export const lessonIdSchema = z.object({
  lessonId: z.string().uuid("ID de leçon invalide"),
});

export const sourceCreateSchema = z.object({
  url: z.string().trim().url("URL invalide").max(2000, "URL trop longue"),
  title: z.string().trim().min(2, "Le titre doit contenir au moins 2 caractères").max(200, "Titre trop long"),
  description: z.string().trim().max(500, "Description trop longue").optional(),
});

export const sourceUpdateSchema = z
  .object({
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.isActive !== undefined, {
    message: "Au moins un champ à modifier",
  });

export const sourceIdSchema = z.object({
  sourceId: z.string().uuid("ID de source invalide"),
});

export const lessonQuestionSchema = z.object({
  question: z.string().trim().min(1, "Saisissez une question sur le document.").max(2000, "La question ne peut pas dépasser 2000 caractères."),
});

export const messageSendSchema = z.object({
  content: z.string().trim().max(4000, "Message trop long (4000 caractères max)").default(""),
  lang: z.enum(["fr", "en", "mg"]).optional().default("fr"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
  code: z.string().length(6, "Code OTP invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const adminCreateSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const adminUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
    isOk: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ à modifier",
  });
