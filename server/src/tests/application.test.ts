import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import applicationRoutes from '../routes/application.routes.js';

// Mock auth middleware to easily simulate logged-in user
vi.mock('../middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Default to a mock user, can be overridden per test by mutating req in a pre-middleware
    if (!req.user) {
      req.user = { userId: 'mock-user-1' };
    }
    next();
  })
}));

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

const app = express();
app.use(express.json());

// Pre-middleware to allow tests to override the req.user
app.use((req, _res, next) => {
  if (req.headers['x-test-user-id']) {
    req.user = { userId: req.headers['x-test-user-id'] as string };
  }
  next();
});

app.use('/applications', applicationRoutes);

describe('Application Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /applications', () => {
    it('should return applications for the logged-in user', async () => {
      const mockApps = [{ id: '1', companyName: 'Google', userId: 'mock-user-1' }];
      vi.mocked(prisma.application.findMany).mockResolvedValue(mockApps as any);

      const res = await request(app).get('/applications');
      
      expect(res.status).toBe(200);
      expect(res.body.applications).toEqual(mockApps);
      expect(prisma.application.findMany).toHaveBeenCalledWith({
        where: { userId: 'mock-user-1' },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('PATCH /applications/:id', () => {
    it('should update application status if user owns it', async () => {
      const mockApp = { id: 'app-1', companyName: 'Google', userId: 'mock-user-1', status: 'APPLIED' };
      vi.mocked(prisma.application.findFirst).mockResolvedValue(mockApp as any);
      vi.mocked(prisma.application.update).mockResolvedValue({ ...mockApp, status: 'INTERVIEW' } as any);

      const res = await request(app).patch('/applications/app-1').send({ status: 'INTERVIEW' });

      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe('INTERVIEW');
      expect(prisma.application.findFirst).toHaveBeenCalledWith({
        where: { id: 'app-1', userId: 'mock-user-1' }
      });
    });

    it('should return 404 if user tries to update another users application', async () => {
      // simulate findFirst returning null because userId doesn't match
      vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .patch('/applications/app-other')
        .set('x-test-user-id', 'intruder-user')
        .send({ status: 'INTERVIEW' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Application not found');
      expect(prisma.application.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /applications', () => {
    it('should validate input with Zod and return 400 for bad data', async () => {
      const res = await request(app).post('/applications').send({
        // missing companyName, jobTitle
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });
  });
});
