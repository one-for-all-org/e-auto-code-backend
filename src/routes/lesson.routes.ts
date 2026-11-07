import { Router } from "express";
import * as lessonController from "../controllers/lesson";
import { authenticate, requireRole } from "../middlewares/auth";
import { lessonUploadOne } from "../middlewares/upload";
import { validateParams } from "../middlewares/validate";
import { lessonIdSchema } from "../validations/shared";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", lessonController.list);
router.post("/", lessonUploadOne, lessonController.upload);
router.delete("/:lessonId", validateParams(lessonIdSchema), lessonController.remove);

export default router;
