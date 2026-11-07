import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { validateParams } from "../middlewares/validate";
import * as adminController from "../controllers/admin";
import {
  adminCreateSchema,
  adminUpdateSchema,
  userIdSchema,
} from "../validations/shared";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN"), adminController.listUsers);
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate(adminCreateSchema),
  adminController.createUser
);
router.patch(
  "/:userId",
  authenticate,
  requireRole("ADMIN"),
  validateParams(userIdSchema),
  validate(adminUpdateSchema),
  adminController.updateUser
);
router.delete(
  "/:userId",
  authenticate,
  requireRole("ADMIN"),
  validateParams(userIdSchema),
  adminController.deleteUser
);

export default router;
