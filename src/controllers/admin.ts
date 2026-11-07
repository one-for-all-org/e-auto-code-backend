import type { Request, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import * as userService from "../services/user.service";
import bcrypt from "bcryptjs";

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.list();
  return ok(res, { users }, "Utilisateurs");
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: "USER" | "ADMIN";
  };
  const passwordHash = bcrypt.hashSync(password, 12);
  const user = await userService.create({ name, email, passwordHash, role, isOk: true });
  return ok(res, { user }, "Utilisateur créé", 201);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const data = req.body as {
    name?: string;
    password?: string;
    role?: "USER" | "ADMIN";
    isOk?: boolean;
    isBlocked?: boolean;
  };
  const updated = await userService.update(userId, data);
  return ok(res, { user: updated }, "Utilisateur mis à jour");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  await userService.remove(userId);
  return ok(res, { id: userId }, "Utilisateur supprimé");
});
