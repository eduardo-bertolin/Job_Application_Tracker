import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// Zod schemas for input validation
const applicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(100),
  jobTitle: z.string().min(1, "Job title is required").max(100),
  jobUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"]).default("APPLIED"),
  notes: z.string().optional().or(z.literal("")),
});

const updateApplicationSchema = applicationSchema.partial();

export const applicationController = {
  // GET /applications
  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string | undefined;

      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      const applications = await prisma.application.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' }
      });

      res.status(200).json({ applications });
    } catch (error) {
      next(error);
    }
  },

  // GET /applications/:id
  async getApplicationById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;

      const application = await prisma.application.findFirst({
        where: { id, userId },
      });

      if (!application) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      res.status(200).json({ application });
    } catch (error) {
      next(error);
    }
  },

  // POST /applications
  async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validatedData = applicationSchema.parse(req.body);

      const application = await prisma.application.create({
        data: {
          ...validatedData,
          userId,
        },
      });

      res.status(201).json({ application });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: (error as any).errors });
        return;
      }
      next(error);
    }
  },

  // PATCH /applications/:id
  async updateApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const validatedData = updateApplicationSchema.parse(req.body);

      // Verify ownership
      const existing = await prisma.application.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      const application = await prisma.application.update({
        where: { id },
        data: validatedData,
      });

      res.status(200).json({ application });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: (error as any).errors });
        return;
      }
      next(error);
    }
  },

  // DELETE /applications/:id
  async deleteApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;

      // Verify ownership
      const existing = await prisma.application.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      await prisma.application.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
