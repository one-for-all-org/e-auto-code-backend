import { Router } from "express";
import * as lessonController from "../controllers/lesson";
import { authenticate, requireRole } from "../middlewares/auth";
import { lessonAnalyzeUploadOne, lessonUploadOne } from "../middlewares/upload";
import { validate, validateParams } from "../middlewares/validate";
import { lessonIdSchema, lessonQuestionSchema } from "../validations/shared";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", lessonController.list);
router.post("/analyze", lessonAnalyzeUploadOne, validate(lessonQuestionSchema), lessonController.analyze);
router.post("/", lessonUploadOne, lessonController.upload);
router.delete("/:lessonId", validateParams(lessonIdSchema), lessonController.remove);

export default router;
