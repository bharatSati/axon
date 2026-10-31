/**
 * Vector Engine for Project Brain
 * Provides code-aware tokenization, Inverted Index generation, BM25 scoring,
 * and high-dimensional Cosine Similarity vector search.
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
 * Splits camelCase and snake_case into individual component tokens
 * e.g., "getUserById" -> ["get", "user", "by", "id", "getuserbyid"]
 */
export const tokenizeCodeAware = (text = "") => {
  if (!text) return [];

  // Match words, identifiers, and terms
  const rawTokens = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/);

  const tokens = [];

  for (const raw of rawTokens) {
    if (!raw || raw.length < 2) continue;
    if (STOP_WORDS.has(raw)) continue;

    tokens.push(raw);

    // Split snake_case and kebab-case
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
    return { invertedIndex: {}, idf: {}, avgDocLength: 0, chunkVectors: [] };
  }

  const invertedIndex = {}; // term -> { [chunkIdx]: frequency }
  const docFrequencies = {}; // term -> count of docs containing term
  const chunkLengths = [];
  const chunkTokenFreqs = [];

  // 1. Tokenize each chunk and calculate term frequencies
  for (let i = 0; i < N; i++) {
    const chunk = chunks[i];
    // Combine title, path and content for indexing
    const combinedText = `${chunk.filePath} ${chunk.title || ""} ${chunk.content}`;
    const tokens = tokenizeCodeAware(combinedText);
    chunkLengths.push(tokens.length);

    const freqMap = {};
    for (const t of tokens) {
      freqMap[t] = (freqMap[t] || 0) + 1;
    }
    chunkTokenFreqs.push(freqMap);

    // Record inverted index postings
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

  // 2. Compute Smoothed IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
  const idf = {};
  for (const term of Object.keys(docFrequencies)) {
    const df = docFrequencies[term];
    idf[term] = Math.max(0.1, Math.log(1 + (N - df + 0.5) / (df + 0.5)));
  }

  // 3. Compute Normalized Vector Embeddings for every chunk (Sub-linear TF-IDF)
  const chunkVectors = [];
  for (let i = 0; i < N; i++) {
    const freqs = chunkTokenFreqs[i];
    const vector = {};
    let sumSquares = 0;

    for (const [term, tf] of Object.entries(freqs)) {
      const termIdf = idf[term] || 0.1;
      const weight = (1 + Math.log(tf)) * termIdf;
      vector[term] = weight;
      sumSquares += weight * weight;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(sumSquares) || 1;
    for (const term of Object.keys(vector)) {
      vector[term] = vector[term] / magnitude;
    }

    chunkVectors.push(vector);
  }

  return {
    invertedIndex,
    idf,
    avgDocLength,
    chunkVectors,
    chunkLengths,
    totalChunks: N
  };
};

/**
 * Searches the index using a hybrid BM25 + Cosine Similarity ranking
 */
export const searchHybridIndex = (query, indexData, chunks, { topK = 6, filterType = "all" } = {}) => {
  const { invertedIndex, idf, avgDocLength, chunkVectors, chunkLengths, totalChunks } = indexData;
  if (!totalChunks || !query) return [];

  const queryTokens = tokenizeCodeAware(query);
  if (queryTokens.length === 0) return [];

  // 1. Build Query Vector
  const queryFreqs = {};
  for (const t of queryTokens) {
    queryFreqs[t] = (queryFreqs[t] || 0) + 1;
  }

  const queryVector = {};
  let querySumSquares = 0;
  for (const [t, tf] of Object.entries(queryFreqs)) {
    const termIdf = idf[t] || 0.5;
    const weight = (1 + Math.log(tf)) * termIdf;
    queryVector[t] = weight;
    querySumSquares += weight * weight;
  }
  const queryMagnitude = Math.sqrt(querySumSquares) || 1;
  for (const t of Object.keys(queryVector)) {
    queryVector[t] = queryVector[t] / queryMagnitude;
  }

  // 2. Identify candidate chunks using Inverted Index
  const candidateIndices = new Set();
  for (const t of queryTokens) {
    const postings = invertedIndex[t];
    if (postings) {
      for (const p of postings) {
        candidateIndices.add(p.chunkIdx);
      }
    }
  }

  // If few or no candidates found, fallback to checking all chunks
  const candidatesToScore = candidateIndices.size > 0
    ? Array.from(candidateIndices)
    : Array.from({ length: totalChunks }, (_, i) => i);

  // 3. Compute BM25 and Vector Cosine Similarity
  const k1 = 1.5;
  const b = 0.75;
  const scoredResults = [];

  for (const idx of candidatesToScore) {
    const chunk = chunks[idx];
    if (filterType !== "all" && chunk.type !== filterType) {
      continue;
    }

    const docLen = chunkLengths[idx] || 1;
    const docVector = chunkVectors[idx] || {};

    // Calculate BM25 score
    let bm25Score = 0;
    for (const [qTerm, qCount] of Object.entries(queryFreqs)) {
      const termIdf = idf[qTerm] || 0;
      const termWeight = docVector[qTerm]; // Indicates term is present
      if (termWeight) {
        const tf = docLen * termWeight; // Approximate original TF
        const num = tf * (k1 + 1);
        const den = tf + k1 * (1 - b + b * (docLen / avgDocLength));
        bm25Score += termIdf * (num / den) * qCount;
      }
    }

    // Calculate Cosine Similarity: queryVector · docVector
    let cosineSim = 0;
    for (const [qTerm, qWeight] of Object.entries(queryVector)) {
      if (docVector[qTerm]) {
        cosineSim += qWeight * docVector[qTerm];
      }
    }

    // Boost score if file path directly matches query terms
    let pathBoost = 0;
    const lowerPath = chunk.filePath.toLowerCase();
    for (const qTerm of queryTokens) {
      if (lowerPath.includes(qTerm)) {
        pathBoost += 0.2;
      }
    }

    // Normalize BM25 score roughly into [0, 1]
    const normBM25 = Math.min(1, bm25Score / 8);

    // Hybrid Score: 50% BM25 + 50% Cosine Similarity + Path Boost
    const hybridScore = 0.5 * normBM25 + 0.5 * cosineSim + pathBoost;

    if (hybridScore > 0.05) {
      scoredResults.push({
        chunk,
        score: parseFloat(hybridScore.toFixed(4)),
        bm25: parseFloat(normBM25.toFixed(4)),
        cosine: parseFloat(cosineSim.toFixed(4))
      });
    }
  }

  // 4. Sort by highest relevance score
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults.slice(0, topK);
};
