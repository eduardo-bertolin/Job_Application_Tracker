import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password.js";

describe("Password Hashing", () => {
  it("should generate a hash different from plain text", async () => {
    const plain = "mySecretPassword123";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash).toContain("$2b$"); // bcrypt signature
  });

  it("should verify correct password", async () => {
    const plain = "mySecretPassword123";
    const hash = await hashPassword(plain);
    
    const isValid = await verifyPassword(plain, hash);
    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const plain = "mySecretPassword123";
    const hash = await hashPassword(plain);
    
    const isValid = await verifyPassword("wrongPassword", hash);
    expect(isValid).toBe(false);
  });
});
