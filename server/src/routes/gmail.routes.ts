import { Router } from "express";
import { gmailController } from "../controllers/gmail.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// OAuth callback is NOT protected (Google redirects here without our JWT)
router.get("/callback", gmailController.callback);

// All other routes require auth
router.use(authMiddleware);
router.get("/connect", gmailController.connect);
router.post("/sync", gmailController.sync);
router.get("/status", gmailController.status);
router.get("/suggestions", gmailController.getSuggestions);
router.post("/apply-suggestion/:id", gmailController.applySuggestion);
router.post("/dismiss-suggestion/:id", gmailController.dismissSuggestion);
router.delete("/disconnect", gmailController.disconnect);

export default router;
