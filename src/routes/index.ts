import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import conversationRoutes from "./conversation.routes";
import adminRoutes from "./admin.routes";
import lessonRoutes from "./lesson.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", userRoutes);
router.use("/conversations", conversationRoutes);
router.use("/admin/users", adminRoutes);
router.use("/admin/lessons", lessonRoutes);

export default router;
