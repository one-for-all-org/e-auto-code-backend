import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";
import { findById } from "../services/user.service";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    isOk: boolean;
    isBlocked: boolean;
  };
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.access_token;
  if (!token) {
    return next(new AppError("Token manquant", 401));
  }
  let sub: string;
  try {
    const payload = verifyToken(token);
    sub = typeof payload === "object" && payload ? String(payload.sub) : "";
  } catch {
    return next(new AppError("Token invalide", 401));
  }
  if (!sub) {
    return next(new AppError("Token invalide", 401));
  }
  void findById(sub).then((user) => {
    if (user.isBlocked) {
      return next(new AppError("Compte bloqué, contactez l'administrateur", 403));
    }
    req.user = user;
    next();
  }).catch(next);
}

export function requireRole(...roles: ("USER" | "ADMIN")[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Accès réservé aux administrateurs", 403));
    }
    next();
  };
}

export function requireSelfOrAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const targetId = req.params.userId || req.params.id;
  if (req.user?.role === "ADMIN" || req.user?.id === targetId) {
    return next();
  }
  return next(new AppError("Accès non autorisé", 403));
}
