import type { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import * as sourceService from "../services/source.service";

export const listSources = asyncHandler(async (_req: Request, res: Response) => {
  const sources = await sourceService.listSources();
  return ok(res, { sources }, "Sources");
});

export const createSource = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { url, title, description } = req.body as {
    url: string;
    title: string;
    description?: string;
  };
  const source = await sourceService.addSource(url, title, description, userId);
  return ok(res, { source }, "Source ajoutée", 201);
});

export const refreshSource = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { sourceId } = req.params as { sourceId: string };
  const source = await sourceService.refreshSource(sourceId, userId);
  return ok(res, { source }, "Source actualisée");
});

export const updateSource = asyncHandler(async (req: Request, res: Response) => {
  const { sourceId } = req.params as { sourceId: string };
  const { isActive } = req.body as { isActive: boolean };
  const source = await sourceService.setActiveSource(sourceId, isActive);
  return ok(res, { source }, "Source mise à jour");
});

export const deleteSource = asyncHandler(async (req: Request, res: Response) => {
  const { sourceId } = req.params as { sourceId: string };
  await sourceService.deleteSource(sourceId);
  return ok(res, { id: sourceId }, "Source supprimée");
});
