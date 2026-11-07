import type { Request, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { update as updateUser, findById } from "../services/user.service";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  return ok(res, { user }, "Profil");
});

export const patchMe = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = req.body as { name?: string; password?: string };
  const updated = await updateUser(user.id, data);
  return ok(res, { user: updated }, "Profil mis à jour");
});
