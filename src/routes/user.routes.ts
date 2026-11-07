import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import * as userController from "../controllers/user";
import { mePatchSchema } from "../validations/shared";

const router = Router();

router.get("/me", authenticate, userController.getMe);
router.patch("/me", authenticate, validate(mePatchSchema), userController.patchMe);

export default router;
