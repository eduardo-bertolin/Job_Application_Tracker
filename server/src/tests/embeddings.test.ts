import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "../services/embeddings.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("handles known hand-calculable case", () => {
    // cos([1,0], [1,1]) = 1 / (1 * √2) = 1/√2 ≈ 0.7071
    const a = [1, 0];
    const b = [1, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2), 5);
  });

  it("returns 0 for zero vector", () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("throws for different length vectors", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow("same length");
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("is insensitive to magnitude", () => {
    const a = [1, 2, 3];
    const b = [10, 20, 30];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});

// Note: generateEmbedding test requires model download (~100MB), skip in CI
// Run manually: npx vitest run src/tests/embeddings.test.ts --timeout 60000
describe("generateEmbedding", () => {
  it.skip("returns 384-dim vector for text input", async () => {
    const { generateEmbedding } = await import("../services/embeddings.js");
    const embedding = await generateEmbedding("I am a software engineer with 5 years of experience");
    expect(embedding).toHaveLength(384);
    expect(embedding.every((v: number) => typeof v === "number" && !isNaN(v))).toBe(true);
  }, 60000);
});
