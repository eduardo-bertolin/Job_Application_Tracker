import { Router } from "express";
import { metricsController } from "../controllers/metrics.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(authMiddleware);
router.get("/metrics", metricsController.getMetrics);

export default router;
