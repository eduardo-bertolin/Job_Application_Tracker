import { Router } from "express";
import multer from "multer";
import { resumeController } from "../controllers/resume.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(authMiddleware);
router.post("/upload", upload.single("file"), resumeController.upload);
router.get("/", resumeController.get);
router.delete("/", resumeController.remove);

export default router;
