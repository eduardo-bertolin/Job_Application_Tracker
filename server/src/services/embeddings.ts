import { Pipeline } from "@xenova/transformers";

// ─── Cosine similarity ───
// Formula: cos(A,B) = (A·B) / (‖A‖ × ‖B‖)
//   = Σ(ai × bi) / (√Σai² × √Σbi²)
//
// Why cosine? Embeddings encode semantic meaning as direction, not magnitude.
// Two texts about the same topic point roughly the same direction regardless
// of length. Cosine captures this directional alignment (1 = identical
// direction, 0 = orthogonal, -1 = opposite).
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have same length");
  if (a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ─── Embedding pipeline (singleton) ───
// all-MiniLM-L6-v2: 384 dimensions, ~100MB RAM, runs on CPU via ONNX.
// Trade-off vs OpenAI ada-002 (1536-dim):
//   - Smaller vectors (384 vs 1536) = faster similarity, less storage
//   - Lower semantic quality on edge cases, but good enough for job matching
//   - Zero cost, zero latency to external API, zero API key management
//   - Runs offline — no network dependency
// For a job tracker with <1000 applications, quality difference is negligible.

let pipeline: Pipeline | null = null;
let loading: Promise<Pipeline> | null = null;

export async function initEmbeddings(): Promise<void> {
  if (pipeline) return;
  if (loading) {
    await loading;
    return;
  }

  console.log("[embeddings] Loading all-MiniLM-L6-v2 model (~100MB, first run downloads)...");
  const startMs = Date.now();

  // Dynamic import because @xenova/transformers uses ESM internals
  const { pipeline: createPipeline } = await import("@xenova/transformers");
  loading = createPipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as Promise<Pipeline>;
  pipeline = await loading;
  loading = null;

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`[embeddings] Model loaded in ${elapsed}s`);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!pipeline) {
    await initEmbeddings();
  }

  // Truncate to ~512 tokens worth of text (~2000 chars) — model max is 256 tokens
  // but we let the tokenizer handle truncation; pre-trim avoids wasting time on huge docs
  const trimmed = text.slice(0, 8000);

  const output = await pipeline!(trimmed, {
    pooling: "mean",
    normalize: true,
  });

  // output.data is a Float32Array of 384 values
  return Array.from(output.data as Float32Array);
}
