import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { fail } from "../utils/response";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return fail(res, "Données invalides", 400, result.error.flatten());
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return fail(res, "Paramètres invalides", 400, result.error.flatten());
    }
    req.params = result.data;
    next();
  };
}
