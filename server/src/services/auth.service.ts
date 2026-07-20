import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { generateAccessToken, generateRefreshToken, hashRefreshToken } from "../lib/jwt.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResult {
  user: { id: string; email: string; name: string | null };
  accessToken: string;
  refreshToken: string; // Raw token — will be sent as httpOnly cookie
}

/**
 * Register a new user.
 * Throws if email already exists.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name || null,
    },
  });

  const { accessToken, refreshToken } = await createTokenPair(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

/**
 * Authenticate an existing user.
 * Returns generic error to prevent user enumeration attacks.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  const { accessToken, refreshToken } = await createTokenPair(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 * The old refresh token is consumed (rotated) — prevents replay attacks.
 */
export async function refreshSession(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    // Delete expired token if it exists
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    throw new AppError("Invalid or expired refresh token", 401);
  }

  // Rotate: delete old token, create new pair
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const { accessToken, refreshToken } = await createTokenPair(stored.userId);

  return { accessToken, refreshToken };
}

/**
 * Revoke a refresh token (logout).
 */
export async function revokeSession(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  // deleteMany won't throw if token doesn't exist
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

/**
 * Get user by ID (for /auth/me).
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
}

// --- Internal helpers ---

async function createTokenPair(userId: string) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return { accessToken, refreshToken };
}

/**
 * Custom error class with HTTP status code.
 * Keeps business logic errors separate from unexpected errors.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}
