import { describe, it, expect, vi } from "vitest";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generateAccessToken } from "../lib/jwt.js";
import type { Request, Response, NextFunction } from "express";

describe("Auth Middleware", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("should return 401 if no Authorization header", () => {
    const req = { headers: {} } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if header does not start with Bearer", () => {
    const req = { headers: { authorization: "Basic token" } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if token is invalid", () => {
    const req = { headers: { authorization: "Bearer invalid.token" } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should call next() and set req.user if token is valid", () => {
    const userId = "test-user-id";
    const token = generateAccessToken(userId);
    
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(req.user).toEqual({ userId });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
