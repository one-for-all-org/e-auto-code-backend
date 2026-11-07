import { Router } from "express";
import { authLimiter } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import * as authController from "../controllers/auth";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validations/shared";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post("/refresh", authController.refresh);

export default router;
