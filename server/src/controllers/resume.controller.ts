import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { generateEmbedding } from "../services/embeddings.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const resumeController = {
  // POST /resume/upload
  // Accepts: multipart PDF (field "file") OR JSON { text: "..." }
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      let rawText = "";

      // Check for uploaded PDF file (multer puts it on req.file)
      const file = (req as any).file as Express.Multer.File | undefined;
      if (file) {
        if (file.mimetype !== "application/pdf") {
          res.status(400).json({ error: "Only PDF files are supported" });
          return;
        }
        const pdfData = await pdf(file.buffer);
        rawText = pdfData.text.trim();
      } else if (req.body.text && typeof req.body.text === "string") {
        rawText = req.body.text.trim();
      } else {
        res.status(400).json({ error: "Provide a PDF file or { text: '...' }" });
        return;
      }

      if (rawText.length < 50) {
        res.status(400).json({ error: "Resume text too short (min 50 characters)" });
        return;
      }

      // Generate embedding
      const embedding = await generateEmbedding(rawText);

      // Upsert resume
      const resume = await prisma.resume.upsert({
        where: { userId },
        update: {
          rawText,
          embedding: JSON.stringify(embedding),
        },
        create: {
          userId,
          rawText,
          embedding: JSON.stringify(embedding),
        },
      });

      res.json({
        message: "Resume saved",
        id: resume.id,
        textLength: rawText.length,
        embeddingDimensions: embedding.length,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /resume
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const resume = await prisma.resume.findUnique({
        where: { userId },
        select: { id: true, rawText: true, updatedAt: true },
      });

      if (!resume) {
        res.status(404).json({ error: "No resume uploaded" });
        return;
      }

      res.json({ resume });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /resume
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await prisma.resume.deleteMany({ where: { userId } });
      res.json({ message: "Resume deleted" });
    } catch (error) {
      next(error);
    }
  },
};
