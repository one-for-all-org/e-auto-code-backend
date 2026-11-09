import type { Request, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { signToken } from "../utils/jwt";
import { register as registerUser, login as loginUser } from "../services/auth.service";
import { createOtp, sendOtpEmail, consumeOtp } from "../services/otp.service";
import { update, findByEmail, findById } from "../services/user.service";
import { verifyRefreshToken, revokeRefreshToken, revokeAllRefreshTokensForUser } from "../services/refresh.service";
import type { RoadRole } from "../services/user.service";

const ACCESS_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 15 * 60 * 1000,
} as const;

const REFRESH_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
} as const;

function setAuthCookies(res: Response, token: string, refreshToken: string) {
  res.cookie("access_token", token, ACCESS_OPTS);
  res.cookie("refresh_token", refreshToken, REFRESH_OPTS);
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, roadRole } = req.body as { name: string; email: string; password: string; roadRole: RoadRole };
  const result = await registerUser(name, email, password, roadRole);
  setAuthCookies(res, result.token, result.refreshToken);
  return ok(res, { token: result.token, refreshToken: result.refreshToken, user: result.user }, "Compte créé", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await loginUser(email, password);
  setAuthCookies(res, result.token, result.refreshToken);
  return ok(res, { token: result.token, refreshToken: result.refreshToken, user: result.user }, "Connexion réussie");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  return ok(res, null, "Déconnexion réussie");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;
  if (!refreshToken) {
    throw new AppError("Refresh token manquant", 401);
  }
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new AppError("Refresh token invalide ou expiré", 401);
  }
  const user = await findById(payload.userId);
  if (user.isBlocked) {
    throw new AppError("Compte bloqué, contactez l'administrateur", 403);
  }
  const token = signToken({ sub: user.id, role: user.role });
  res.cookie("access_token", token, ACCESS_OPTS);
  return ok(res, {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roadRole: user.roadRole,
      isOk: user.isOk,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    },
  }, "Token renouvelé");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findByEmail(normalizedEmail);
  if (user) {
    const code = await createOtp(normalizedEmail);
    await sendOtpEmail(normalizedEmail, code);
  }
  return ok(res, null, "Si un compte existe avec cet email, un code de réinitialisation a été envoyé.");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, password } = req.body as { email: string; code: string; password: string };
  const normalizedEmail = email.trim().toLowerCase();
  await consumeOtp(normalizedEmail, code);
  const user = await findByEmail(normalizedEmail);
  if (!user) {
    throw new AppError("Utilisateur introuvable", 404);
  }
  await revokeAllRefreshTokensForUser(user.id);
  await update(user.id, { password });
  return ok(res, null, "Mot de passe réinitialisé");
});
