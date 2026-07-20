import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service.js";

// Cookie options for refresh token
const COOKIE_NAME = "jat_refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents XSS from reading the cookie
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "strict" as const, // Prevents CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as z.infer<typeof registerSchema>;
    const { user, accessToken, refreshToken } = await authService.registerUser(input);

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ user, accessToken });
  } catch (error) {
    if (error instanceof authService.AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string(),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as z.infer<typeof loginSchema>;
    const { user, accessToken, refreshToken } = await authService.loginUser(input);

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    res.status(200).json({ user, accessToken });
  } catch (error) {
    if (error instanceof authService.AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token provided" });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshSession(refreshToken);

    res.cookie(COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);
    res.status(200).json({ accessToken });
  } catch (error) {
    if (error instanceof authService.AppError) {
      res.clearCookie(COOKIE_NAME); // Clear invalid cookie
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    if (refreshToken) {
      await authService.revokeSession(refreshToken);
    }
    res.clearCookie(COOKIE_NAME);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId; // Assumes authMiddleware has run
    const user = await authService.getUserById(userId);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof authService.AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
}
