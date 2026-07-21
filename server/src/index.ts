import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import { initEmbeddings } from "./services/embeddings.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS configuration for cookies
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any localhost/127.0.0.1 origin in dev
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // required to send/receive cookies
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

import applicationRoutes from "./routes/application.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import gmailRoutes from "./routes/gmail.routes.js";
import resumeRoutes from "./routes/resume.routes.js";

app.use("/auth", authRoutes);
app.use("/applications", applicationRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/gmail", gmailRoutes);
app.use("/resume", resumeRoutes);

// Load embedding model at boot (avoid cold-start on first request)
initEmbeddings().catch((err) => {
  console.warn("[embeddings] Failed to preload model:", err.message);
  console.warn("[embeddings] Embeddings will load on first use instead.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;

