import type { Response } from "express";

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string;
};

export function sendJson<T>(
  res: Response,
  status: number,
  success: boolean,
  data: T | null,
  message: string
): Response {
  return res.status(status).json({ success, data, message });
}

export function ok<T>(
  res: Response,
  data: T | null,
  message = "OK",
  status = 200
): Response {
  return sendJson(res, status, true, data, message);
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  data: any = null
): Response {
  return sendJson(res, status, false, data, message);
}
