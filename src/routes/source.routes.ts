import { Router } from "express";
import * as sourceController from "../controllers/source";
import { authenticate, requireRole } from "../middlewares/auth";
import { validate, validateParams } from "../middlewares/validate";
import {
  sourceCreateSchema,
  sourceIdSchema,
  sourceUpdateSchema,
} from "../validations/shared";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", sourceController.listSources);
router.post("/", validate(sourceCreateSchema), sourceController.createSource);
router.post("/:sourceId/refresh", validateParams(sourceIdSchema), sourceController.refreshSource);
router.patch("/:sourceId", validateParams(sourceIdSchema), validate(sourceUpdateSchema), sourceController.updateSource);
router.delete("/:sourceId", validateParams(sourceIdSchema), sourceController.deleteSource);

export default router;
