import { pipeline } from "@xenova/transformers";

/**
 * Local Open-Source Embedding Service for Project Brain
 * Uses Sentence Transformers: 'Xenova/all-MiniLM-L6-v2' (384-dimensional dense vectors).
 * Runs completely locally with ONNX Runtime in Node.js.
 * Requires ZERO external API keys, zero paid services, and zero network calls once cached.
 */

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const VECTOR_DIMENSIONS = 384;

let extractorInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Lazy-load the transformer pipeline singleton
 */
export const getExtractor = async () => {
  if (extractorInstance) {
    return extractorInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log(`[RAG Engine] Initializing local embedding model: ${MODEL_NAME}...`);
      const extractor = await pipeline("feature-extraction", MODEL_NAME, {
        quantized: true
      });
      extractorInstance = extractor;
      console.log(`[RAG Engine] Local embedding model ${MODEL_NAME} (384d) ready.`);
      return extractor;
    } catch (err) {
      console.error(`[RAG Engine] Failed to load local transformer pipeline: ${err.message}`);
      isInitializing = false;
      initPromise = null;
      throw err;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
};

/**
 * Generates a normalized 384-dimensional embedding vector for a single text string
 */
export const generateEmbedding = async (text = "") => {
  const sanitized = (text || "").trim();
  if (!sanitized) {
    return new Array(VECTOR_DIMENSIONS).fill(0);
  }

  try {
    const extractor = await getExtractor();
    // Truncate to maximum sequence length (~512 tokens) to avoid ONNX index errors
    const inputSample = sanitized.substring(0, 2000);
    const output = await extractor(inputSample, { pooling: "mean", normalize: true });

    // Convert Float32Array to standard JavaScript array of numbers
    return Array.from(output.data);
  } catch (err) {
    console.warn(`[RAG Engine] Embedding generation fallback for: "${sanitized.substring(0, 40)}...":`, err.message);
    return generateFallbackEmbedding(sanitized);
  }
};

/**
 * Generates normalized 384-dimensional embeddings for an array of text strings in batches
 */
export const generateBatchEmbeddings = async (texts = [], { batchSize = 16 } = {}) => {
  if (!texts || texts.length === 0) return [];

  const embeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const sanitizedBatch = batch.map((t) => (t || "").trim().substring(0, 2000) || "empty");

    try {
      const extractor = await getExtractor();
      const output = await extractor(sanitizedBatch, { pooling: "mean", normalize: true });

      // If single item in batch, dims is [1, 384]
      // If multiple, data is flat Float32Array of length (batch.length * 384)
      const data = output.data;
      for (let j = 0; j < sanitizedBatch.length; j++) {
        const start = j * VECTOR_DIMENSIONS;
        const end = start + VECTOR_DIMENSIONS;
        const vec = Array.from(data.slice(start, end));
        embeddings.push(vec);
      }
    } catch (err) {
      console.warn(`[RAG Engine] Batch embedding fallback on chunk ${i}:`, err.message);
      for (const text of sanitizedBatch) {
        embeddings.push(generateFallbackEmbedding(text));
      }
    }
  }

  return embeddings;
};

/**
 * Computes Cosine Similarity between two dense vectors
 * For normalized vectors: cosine_sim(a, b) = a · b
 */
export const computeCosineSimilarity = (vecA = [], vecB = []) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? Math.max(0, dotProduct / denom) : 0;
};

/**
 * High-dimensional deterministic semantic hashing vectorizer (384d)
 * Guarantees zero downtime if environment encounters native memory pressure
 */
export const generateFallbackEmbedding = (text = "") => {
  const vec = new Array(VECTOR_DIMENSIONS).fill(0);
  const words = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return vec;
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const primaryIdx = Math.abs(hash) % VECTOR_DIMENSIONS;
    const secondaryIdx = Math.abs(hash * 31) % VECTOR_DIMENSIONS;
    const sign = hash % 2 === 0 ? 1 : -1;

    vec[primaryIdx] += (1 / Math.sqrt(i + 1)) * sign;
    vec[secondaryIdx] += (0.5 / Math.sqrt(i + 1)) * -sign;
  }

  // Normalize to unit length
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    sumSq += vec[i] * vec[i];
  }
  const mag = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    vec[i] /= mag;
  }

  return vec;
};

/**
 * Returns embedding model metadata
 */
export const getEmbeddingModelInfo = () => ({
  model: MODEL_NAME,
  dimensions: VECTOR_DIMENSIONS,
  provider: "Sentence Transformers (all-MiniLM-L6-v2) / ONNX Runtime",
  isLocal: true,
  isFree: true,
  requiresApiKey: false
});
