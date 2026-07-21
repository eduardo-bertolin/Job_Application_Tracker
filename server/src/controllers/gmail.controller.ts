import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import * as gmailService from "../services/gmail.service.js";

export const gmailController = {
  // GET /gmail/connect — redirect to Google consent
  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const authUrl = gmailService.getAuthUrl(userId);
      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  },

  // GET /gmail/callback — handle OAuth callback
  async callback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      const userId = req.query.state as string;

      if (!code || !userId) {
        res.status(400).json({ error: "Missing code or state" });
        return;
      }

      await gmailService.handleCallback(code, userId);

      // Redirect to frontend Gmail page
      res.redirect("http://localhost:5173/gmail?connected=true");
    } catch (error) {
      res.redirect("http://localhost:5173/gmail?error=oauth_failed");
    }
  },

  // POST /gmail/sync — fetch emails and create suggestions
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // Verify connection exists
      const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
      if (!conn) {
        res.status(400).json({ error: "Gmail not connected" });
        return;
      }

      const suggestions = await gmailService.fetchAndProcessEmails(userId);

      // Also return existing pending suggestions
      const allPending = await prisma.emailSuggestion.findMany({
        where: { userId, status: "PENDING" },
        include: { application: { select: { id: true, companyName: true, jobTitle: true } } },
        orderBy: { emailDate: "desc" },
      });

      res.json({ newSuggestions: suggestions.length, suggestions: allPending });
    } catch (error: any) {
      if (error.message?.includes("invalid_grant") || error.message?.includes("Token has been")) {
        // Token revoked — clean up
        const userId = req.user!.userId;
        await prisma.gmailConnection.deleteMany({ where: { userId } });
        res.status(401).json({ error: "Gmail access revoked. Please reconnect." });
        return;
      }
      next(error);
    }
  },

  // POST /gmail/apply-suggestion/:id
  async applySuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const suggestion = await prisma.emailSuggestion.findFirst({
        where: { id, userId, status: "PENDING" },
      });

      if (!suggestion) {
        res.status(404).json({ error: "Suggestion not found" });
        return;
      }

      if (!suggestion.applicationId) {
        res.status(400).json({ error: "No matched application for this suggestion" });
        return;
      }

      // Apply status change
      await prisma.application.update({
        where: { id: suggestion.applicationId },
        data: { status: suggestion.suggestedStatus },
      });

      // Mark suggestion as accepted
      await prisma.emailSuggestion.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });

      res.json({ message: "Suggestion applied", applicationId: suggestion.applicationId, newStatus: suggestion.suggestedStatus });
    } catch (error) {
      next(error);
    }
  },

  // POST /gmail/dismiss-suggestion/:id
  async dismissSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const suggestion = await prisma.emailSuggestion.findFirst({
        where: { id, userId, status: "PENDING" },
      });

      if (!suggestion) {
        res.status(404).json({ error: "Suggestion not found" });
        return;
      }

      await prisma.emailSuggestion.update({
        where: { id },
        data: { status: "DISMISSED" },
      });

      res.json({ message: "Suggestion dismissed" });
    } catch (error) {
      next(error);
    }
  },

  // GET /gmail/status
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conn = await prisma.gmailConnection.findUnique({ where: { userId } });

      const pendingCount = await prisma.emailSuggestion.count({
        where: { userId, status: "PENDING" },
      });

      res.json({
        connected: !!conn,
        lastSyncAt: conn?.lastSyncAt || null,
        connectedAt: conn?.connectedAt || null,
        pendingSuggestions: pendingCount,
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /gmail/disconnect
  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await prisma.gmailConnection.deleteMany({ where: { userId } });
      res.json({ message: "Gmail disconnected" });
    } catch (error) {
      next(error);
    }
  },

  // GET /gmail/suggestions — list pending
  async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const suggestions = await prisma.emailSuggestion.findMany({
        where: { userId, status: "PENDING" },
        include: { application: { select: { id: true, companyName: true, jobTitle: true } } },
        orderBy: { emailDate: "desc" },
      });
      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  },
};
