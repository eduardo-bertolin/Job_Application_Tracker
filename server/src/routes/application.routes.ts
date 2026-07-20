import { Router } from "express";
import { applicationController } from "../controllers/application.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all application routes
router.use(authMiddleware);

router.get("/", applicationController.getApplications);
router.get("/:id", applicationController.getApplicationById);
router.post("/", applicationController.createApplication);
router.patch("/:id", applicationController.updateApplication);
router.delete("/:id", applicationController.deleteApplication);

export default router;
