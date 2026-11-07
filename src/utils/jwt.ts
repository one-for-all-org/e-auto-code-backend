import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

const signOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"],
  algorithm: "HS256",
};

export function signToken(payload: object): string {
  return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, signOptions) as string;
}

export function verifyToken(token: string): any {
  return jwt.verify(token, env.JWT_SECRET as jwt.Secret);
}
