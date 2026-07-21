import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { cosineSimilarity } from "../services/embeddings.js";

export const matchingController = {
  // GET /applications/:id/match-score
  async getMatchScore(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const applicationId = req.params.id as string;

      // Get resume embedding
      const resume = await prisma.resume.findUnique({
        where: { userId },
        select: { embedding: true },
      });

      if (!resume) {
        res.json({ score: null, hasResume: false, hasJobDescription: false });
        return;
      }

      // Get application with embedding
      const application = await prisma.application.findFirst({
        where: { id: applicationId, userId },
        select: { jobDescriptionEmbedding: true, jobDescription: true },
      });

      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      if (!application.jobDescriptionEmbedding) {
        res.json({ score: null, hasResume: true, hasJobDescription: false });
        return;
      }

      const resumeEmbedding: number[] = JSON.parse(resume.embedding);
      const jobEmbedding: number[] = JSON.parse(application.jobDescriptionEmbedding);

      // Cosine similarity: -1 to 1 → map to 0-100%
      const raw = cosineSimilarity(resumeEmbedding, jobEmbedding);
      const score = Math.round(Math.max(0, raw) * 100);

      res.json({ score, hasResume: true, hasJobDescription: true });
    } catch (error) {
      next(error);
    }
  },
};
