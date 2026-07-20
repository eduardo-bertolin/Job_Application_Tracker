import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const ACCESS_SECRET = process.env.JWT_SECRET || "dev-access-secret";
const ACCESS_EXPIRY = "15m"; // Short-lived — limits attack window if token leaks

export interface AccessTokenPayload {
  userId: string;
}

/**
 * Generate a short-lived JWT access token.
 * Contains only userId — never include sensitive data in JWTs (they're base64, not encrypted).
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

/**
 * Verify and decode an access token.
 * Throws if expired or invalid signature.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Generate a cryptographically random refresh token (not a JWT).
 * This will be hashed before storing in DB — if DB leaks, tokens are still safe.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * Hash a refresh token before storing in DB.
 * Uses SHA-256 — fast enough for tokens (unlike passwords, tokens have high entropy).
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
