import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { validateParams } from "../middlewares/validate";
import { uploadOne } from "../middlewares/upload";
import { messageLimiter } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { conversationIdSchema, conversationCreateSchema, messageSendSchema } from "../validations/shared";
import * as conversationController from "../controllers/conversation";

const router = Router();

router.get("/", authenticate, conversationController.list);
router.post("/", authenticate, validate(conversationCreateSchema), conversationController.create);
router.patch("/:id", authenticate, validateParams(conversationIdSchema), conversationController.updateTitle);
router.delete("/:id", authenticate, validateParams(conversationIdSchema), conversationController.remove);
router.get("/:id/messages", authenticate, validateParams(conversationIdSchema), conversationController.getMessages);
router.post(
  "/:id/messages",
  authenticate,
  validateParams(conversationIdSchema),
  messageLimiter,
  uploadOne,
  validate(messageSendSchema),
  conversationController.sendMessage
);

export default router;
