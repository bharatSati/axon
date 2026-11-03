import { computeCosineSimilarity } from "./embeddingService.js";
import { BrainKnowledge } from "../../models/BrainKnowledge.js";
import { getDBStatus } from "../../db/connection.js";
import { config } from "../../config/index.js";

/**
 * Hybrid Vector Engine for Project Brain
 * Combines 384-dimensional Dense Vector Cosine Similarity (all-MiniLM-L6-v2),
 * MongoDB Atlas native $vectorSearch (when available), Inverted Index BM25 token matching,
 * and structural metadata filtering.
 */

// Common English + Code stop words
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
  "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
  "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
  "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
  "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
  "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
  "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
]);

/**
 * Splits camelCase and snake_case into component tokens
 */
export const tokenizeCodeAware = (text = "") => {
  if (!text) return [];

  // Split camelCase boundaries (e.g. handleLinkRedirect -> handle Link Redirect) before lowering
  const camelSplit = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  const rawTokens = camelSplit
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/);

  const tokens = [];

  for (const raw of rawTokens) {
    if (!raw || raw.length < 2) continue;
    if (STOP_WORDS.has(raw)) continue;

    tokens.push(raw);

    if (raw.includes("_") || raw.includes("-")) {
      const parts = raw.split(/[-_]+/);
      for (const p of parts) {
        if (p.length > 2 && !STOP_WORDS.has(p)) {
          tokens.push(p);
        }
      }
    }
  }

  return tokens;
};

/**
 * Builds an Inverted Index and computes IDF weights across all chunks
 */
export const buildVectorIndex = (chunks = []) => {
  const N = chunks.length;
  if (N === 0) {
    return { invertedIndex: {}, idf: {}, avgDocLength: 0, chunkVectors: [], totalChunks: 0 };
  }

  const invertedIndex = {};
  const docFrequencies = {};
  const chunkLengths = [];
  const chunkTokenFreqs = [];

  for (let i = 0; i < N; i++) {
    const chunk = chunks[i];
    const combinedText = `${chunk.filePath} ${chunk.title || ""} ${chunk.content}`;
    const tokens = tokenizeCodeAware(combinedText);
    chunkLengths.push(tokens.length);

    const freqMap = {};
    for (const t of tokens) {
      freqMap[t] = (freqMap[t] || 0) + 1;
    }
    chunkTokenFreqs.push(freqMap);

    for (const term of Object.keys(freqMap)) {
      if (!invertedIndex[term]) {
        invertedIndex[term] = [];
        docFrequencies[term] = 0;
      }
      invertedIndex[term].push({ chunkIdx: i, tf: freqMap[term] });
      docFrequencies[term] += 1;
    }
  }

  const avgDocLength = chunkLengths.reduce((a, b) => a + b, 0) / Math.max(1, N);

  const idf = {};
  for (const term of Object.keys(docFrequencies)) {
    const df = docFrequencies[term];
    idf[term] = Math.max(0.1, Math.log(1 + (N - df + 0.5) / (df + 0.5)));
  }

  return {
    invertedIndex,
    idf,
    avgDocLength,
    chunkLengths,
    totalChunks: N
  };
};

/**
 * Executes native MongoDB Atlas $vectorSearch if configured
 * Returns null if Atlas vector search is not configured or unsupported
 */
export const searchAtlasVectorIndex = async (workspaceId, queryEmbedding, { topK = 6, filterType = "all", documentId = null } = {}) => {
  if (!getDBStatus().isConnected || !queryEmbedding || queryEmbedding.length === 0) {
    return null;
  }

  try {
    const indexName = config.rag?.atlasIndexName || "vector_index";

    // Attempt MongoDB Atlas vector search aggregation stage
    const matchFilter = { workspaceId };
    if (filterType !== "all") {
      matchFilter["chunks.type"] = filterType;
    }
    if (documentId) {
      matchFilter["chunks.documentId"] = documentId;
    }

    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: "chunks.embedding",
          queryVector: queryEmbedding,
          numCandidates: Math.max(50, topK * 10),
          limit: topK,
          filter: matchFilter
        }
      },
      {
        $project: {
          chunks: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    const results = await BrainKnowledge.aggregate(pipeline).exec();
    if (Array.isArray(results) && results.length > 0) {
      return results;
    }
  } catch (err) {
    // Expected when running on local MongoDB or before Atlas index creation
    // Graceful fallback to in-memory cosine similarity
  }

  return null;
};

/**
 * Searches the RAG knowledge base using Hybrid Dense Vector + BM25 + Metadata Reranking
 */
export const searchHybridIndex = (
  query,
  queryEmbedding,
  indexData = {},
  chunks = [],
  {
    topK = 6,
    filterType = "all",
    documentId = null,
    minSimilarity = 0.1
  } = {}
) => {
  const totalChunks = chunks.length;
  if (totalChunks === 0 || !query) return [];

  const { invertedIndex = {}, idf = {}, avgDocLength = 100, chunkLengths = [] } = indexData;
  const queryTokens = tokenizeCodeAware(query);

  const queryFreqs = {};
  for (const t of queryTokens) {
    queryFreqs[t] = (queryFreqs[t] || 0) + 1;
  }

  const k1 = 1.4;
  const b = 0.75;
  const scoredResults = [];

  for (let idx = 0; idx < totalChunks; idx++) {
    const chunk = chunks[idx];

    // Metadata Filters
    if (filterType !== "all" && chunk.type !== filterType) {
      continue;
    }
    if (documentId && chunk.documentId !== documentId) {
      continue;
    }

    // 1. Dense Semantic Vector Cosine Similarity (all-MiniLM-L6-v2)
    let denseSim = 0;
    if (queryEmbedding && chunk.embedding && chunk.embedding.length > 0) {
      denseSim = computeCosineSimilarity(queryEmbedding, chunk.embedding);
    }

    // 2. BM25 Keyword Search Score
    let bm25Score = 0;
    const docLen = chunkLengths[idx] || 100;
    const lowerContent = chunk.content.toLowerCase();
    const lowerPath = chunk.filePath.toLowerCase();
    const lowerTitle = (chunk.title || "").toLowerCase();

    for (const [qTerm, qCount] of Object.entries(queryFreqs)) {
      const termIdf = idf[qTerm] || 0.2;
      // Match count in chunk
      const occurrences = (lowerContent.match(new RegExp(`\\b${qTerm}\\b`, "g")) || []).length;
      if (occurrences > 0) {
        const num = occurrences * (k1 + 1);
        const den = occurrences + k1 * (1 - b + b * (docLen / (avgDocLength || 100)));
        bm25Score += termIdf * (num / den) * qCount;
      }
    }

    const normBM25 = Math.min(1, bm25Score / 7);

    // 3. Keyword / Path Relevance Boost
    let pathBoost = 0;
    for (const qTerm of queryTokens) {
      if (lowerPath.includes(qTerm) || lowerTitle.includes(qTerm)) {
        pathBoost += 0.15;
      }
    }

    // 4. Hybrid Score Fusion: 65% Dense Semantic Vector + 35% Exact BM25 + Path Boost
    const hybridScore = denseSim > 0
      ? 0.65 * denseSim + 0.35 * normBM25 + pathBoost
      : 0.85 * normBM25 + pathBoost;

    if (hybridScore >= minSimilarity) {
      scoredResults.push({
        chunk,
        score: parseFloat(hybridScore.toFixed(4)),
        dense: parseFloat(denseSim.toFixed(4)),
        bm25: parseFloat(normBM25.toFixed(4)),
        boost: parseFloat(pathBoost.toFixed(4))
      });
    }
  }

  // 5. Rank by highest relevance score
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults.slice(0, topK);
};
