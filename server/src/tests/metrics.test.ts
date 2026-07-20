import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import dashboardRoutes from "../routes/dashboard.routes.js";

vi.mock("../middlewares/auth.middleware.js", () => ({
  authMiddleware: vi.fn((req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: "test-user-1" };
    next();
  }),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    application: {
      groupBy: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use("/dashboard", dashboardRoutes);

describe("GET /dashboard/metrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zeroes when user has no applications", async () => {
    vi.mocked(prisma.application.groupBy).mockResolvedValue([] as any);
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([{ avg_days: null }]) // avg time
      .mockResolvedValueOnce([]); // timeline

    const res = await request(app).get("/dashboard/metrics");
    expect(res.status).toBe(200);
    expect(res.body.metrics.total).toBe(0);
    expect(res.body.metrics.responseRate).toBe(0);
    expect(res.body.metrics.interviewConversionRate).toBe(0);
    expect(res.body.metrics.avgDaysToResponse).toBeNull();
    expect(res.body.metrics.topCompanies).toEqual([]);
    expect(res.body.metrics.timeline).toEqual([]);
  });

  it("calculates correct rates with mixed statuses", async () => {
    // groupBy status
    vi.mocked(prisma.application.groupBy)
      .mockResolvedValueOnce([
        { status: "APPLIED", _count: { _all: 5 } },
        { status: "INTERVIEW", _count: { _all: 3 } },
        { status: "OFFER", _count: { _all: 1 } },
        { status: "REJECTED", _count: { _all: 1 } },
      ] as any)
      // groupBy company (top5)
      .mockResolvedValueOnce([
        { companyName: "Google", _count: { _all: 4 } },
        { companyName: "Meta", _count: { _all: 3 } },
      ] as any);

    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([{ avg_days: 7.5 }])
      .mockResolvedValueOnce([
        { week: "2025-01-06", count: "3" },
        { week: "2025-01-13", count: "7" },
      ]);

    const res = await request(app).get("/dashboard/metrics");
    const m = res.body.metrics;

    expect(m.total).toBe(10);
    // responseRate: (10-5)/10 = 50%
    expect(m.responseRate).toBe(50);
    // interviewConversion: (3+1)/10 = 40%
    expect(m.interviewConversionRate).toBe(40);
    expect(m.avgDaysToResponse).toBe(7.5);
    expect(m.topCompanies).toEqual([
      { company: "Google", count: 4 },
      { company: "Meta", count: 3 },
    ]);
    expect(m.timeline).toEqual([
      { week: "2025-01-06", count: 3 },
      { week: "2025-01-13", count: 7 },
    ]);
  });

  it("handles single-status case (all APPLIED)", async () => {
    vi.mocked(prisma.application.groupBy)
      .mockResolvedValueOnce([
        { status: "APPLIED", _count: { _all: 8 } },
      ] as any)
      .mockResolvedValueOnce([
        { companyName: "Startup", _count: { _all: 8 } },
      ] as any);

    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([{ week: "2025-03-01", count: "8" }]);

    const res = await request(app).get("/dashboard/metrics");
    const m = res.body.metrics;

    expect(m.total).toBe(8);
    expect(m.responseRate).toBe(0); // none left APPLIED
    expect(m.interviewConversionRate).toBe(0);
    expect(m.avgDaysToResponse).toBeNull();
  });
});
