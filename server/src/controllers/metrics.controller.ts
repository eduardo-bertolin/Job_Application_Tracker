import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export const metricsController = {
  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // 1. Count by status (DB-level groupBy)
      const statusCounts = await prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      });

      const total = statusCounts.reduce((sum, s) => sum + s._count._all, 0);
      const countMap: Record<string, number> = {};
      for (const s of statusCounts) {
        countMap[s.status] = s._count._all;
      }

      // 2. Response rate: % that left APPLIED
      const appliedCount = countMap["APPLIED"] || 0;
      const respondedCount = total - appliedCount;
      const responseRate = total > 0 ? (respondedCount / total) * 100 : 0;

      // 3. Interview conversion: % that reached INTERVIEW, OFFER
      const interviewPlus = (countMap["INTERVIEW"] || 0) + (countMap["OFFER"] || 0);
      const interviewConversionRate = total > 0 ? (interviewPlus / total) * 100 : 0;

      // 4. Average time to response (days): updatedAt - appliedAt for non-APPLIED
      //    Using raw query for DB-level AVG aggregation
      const avgTimeResult = await prisma.$queryRawUnsafe<
        { avg_days: number | null }[]
      >(
        `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - applied_at)) / 86400) as avg_days
         FROM applications
         WHERE user_id = $1 AND status != 'APPLIED'`,
        userId
      );
      const avgDaysToResponse = avgTimeResult[0]?.avg_days
        ? parseFloat(Number(avgTimeResult[0].avg_days).toFixed(1))
        : null;

      // 5. Top 5 companies by application count (DB-level groupBy)
      const topCompanies = await prisma.application.groupBy({
        by: ["companyName"],
        where: { userId },
        _count: { _all: true },
        orderBy: { _count: { companyName: "desc" } },
        take: 5,
      });

      // 6. Applications over time — group by week (raw SQL for date_trunc)
      const timeline = await prisma.$queryRawUnsafe<
        { week: string; count: string }[]
      >(
        `SELECT date_trunc('week', applied_at)::date as week, COUNT(*)::text as count
         FROM applications
         WHERE user_id = $1
         GROUP BY week
         ORDER BY week ASC`,
        userId
      );

      res.status(200).json({
        metrics: {
          total,
          statusCounts: countMap,
          responseRate: parseFloat(responseRate.toFixed(1)),
          interviewConversionRate: parseFloat(interviewConversionRate.toFixed(1)),
          avgDaysToResponse,
          topCompanies: topCompanies.map((c) => ({
            company: c.companyName,
            count: c._count._all,
          })),
          timeline: timeline.map((t) => ({
            week: t.week,
            count: parseInt(t.count, 10),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
