import { findByEmail, create } from "./user.service";
import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { createRefreshToken } from "./refresh.service";

export type AuthResult = {
  token: string;
  refreshToken: string;
  user: import("./user.service").User;
};

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  if (await findByEmail(email)) {
    throw new AppError("Email déjà utilisé", 409);
  }
  const user = await create({
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 12),
    role: "USER",
    isOk: true,
  });
  const token = signToken({ sub: user.id, role: user.role });
  const { token: refreshToken } = await createRefreshToken(user.id);
  return { token, refreshToken, user };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new AppError("Identifiants invalides", 401);
  }
  if (user.isBlocked) {
    throw new AppError("Compte bloqué, contactez l'administrateur", 403);
  }
  const token = signToken({ sub: user.id, role: user.role });
  const { token: refreshToken } = await createRefreshToken(user.id);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { token, refreshToken, user: safeUser };
}
