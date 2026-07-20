import { describe, it, expect } from "vitest";
import { 
  generateAccessToken, 
  verifyAccessToken, 
  generateRefreshToken, 
  hashRefreshToken 
} from "../lib/jwt.js";

describe("JWT & Tokens", () => {
  describe("Access Token", () => {
    it("should generate and verify a valid access token", () => {
      const userId = "123-abc";
      const token = generateAccessToken(userId);
      
      expect(typeof token).toBe("string");
      
      const payload = verifyAccessToken(token);
      expect(payload.userId).toBe(userId);
    });

    it("should throw error for invalid token", () => {
      expect(() => verifyAccessToken("invalid.token.here")).toThrow();
    });
  });

  describe("Refresh Token", () => {
    it("should generate a random hex string", () => {
      const token = generateRefreshToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(32);
    });

    it("should hash a token deterministically", () => {
      const token = "some-random-token-string";
      const hash1 = hashRefreshToken(token);
      const hash2 = hashRefreshToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });
  });
});
