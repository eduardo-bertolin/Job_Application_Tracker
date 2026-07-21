import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.GMAIL_ENCRYPTION_KEY = "a".repeat(64); // 32 bytes hex for test
});

import { encrypt, decrypt } from "../lib/crypto.js";

describe("crypto", () => {
  it("round-trips encrypt/decrypt", () => {
    const original = "ya29.my-google-access-token-here";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // iv:tag:ciphertext format
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertexts for same input (random IV)", () => {
    const text = "same-token";
    const a = encrypt(text);
    const b = encrypt(text);
    expect(a).not.toBe(b); // different IVs
    expect(decrypt(a)).toBe(text);
    expect(decrypt(b)).toBe(text);
  });
});
