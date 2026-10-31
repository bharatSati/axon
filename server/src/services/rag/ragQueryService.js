import { processRepositoryIntoChunks } from "./documentProcessor.js";
import { buildVectorIndex, searchHybridIndex } from "./vectorEngine.js";
import { saveBrainKnowledgeBase, loadBrainKnowledgeBase, getBrainStatus } from "./brainStore.js";
import { generateGroqBrainAnswer } from "./groqService.js";

/**
 * Indexes a GitHub repository and builds the persistent Project Brain for a workspace
 */
export const indexWorkspaceRepository = async (workspaceId, repoData) => {
  const startTime = Date.now();

  // 1. Process files, docs, manifests, commits into semantic chunks
  const { chunks, overview } = processRepositoryIntoChunks(repoData);

  // 2. Build Inverted Index, IDF weights, and normalized vector embeddings
  const indexData = buildVectorIndex(chunks);

  // 3. Save to persistent per-workspace storage
  const metadata = await saveBrainKnowledgeBase(workspaceId, {
    overview,
    chunks,
    indexData
  });

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    workspaceId,
    durationMs,
    stats: {
      totalChunks: chunks.length,
      totalFiles: overview.totalFiles,
      totalCommits: overview.totalCommits,
      techStack: overview.techStack
    },
    metadata
  };
};

/**
 * Execute a RAG query against a workspace's Project Brain
 */
export const queryWorkspaceBrain = async (workspaceId, query, { topK = 5, filterType = "all" } = {}) => {
  const brainData = await loadBrainKnowledgeBase(workspaceId);

  if (!brainData) {
    return {
      success: false,
      error: "Project Brain is not initialized for this workspace. Please connect a GitHub repository first.",
      results: []
    };
  }

  const { chunks, indexData } = brainData;

  // Perform hybrid BM25 + Vector search
  const rankedMatches = searchHybridIndex(query, indexData, chunks, { topK, filterType });

  const results = rankedMatches.map(({ chunk, score, bm25, cosine }) => ({
    id: chunk.id,
    filePath: chunk.filePath,
    type: chunk.type,
    title: chunk.title,
    score,
    metrics: { bm25, cosine },
    content: chunk.content,
    metadata: chunk.metadata
  }));

  return {
    success: true,
    workspaceId,
    query,
    totalMatches: results.length,
    results
  };
};

/**
 * Synthesizes an engineering answer from retrieved RAG context chunks
 * Uses Groq LLM (openai/gpt-oss-120b) for ultra-fast architectural reasoning,
 * falling back gracefully to structured semantic synthesis.
 */
export const synthesizeBrainAnswer = async (workspaceId, query, { topK = 4 } = {}) => {
  const queryResult = await queryWorkspaceBrain(workspaceId, query, { topK });

  if (!queryResult.success || !queryResult.results.length) {
    return {
      success: false,
      query,
      answer: "No relevant code or documentation found in the Project Brain for this query.",
      sources: []
    };
  }

  const chunks = queryResult.results;
  const sources = chunks.map((c) => ({
    filePath: c.filePath,
    title: c.title,
    type: c.type,
    score: c.score
  }));

  // 1. Try Groq ultra-fast 120B LLM synthesis
  try {
    const groqAnswer = await generateGroqBrainAnswer(query, chunks, {
      workspaceId
    });

    if (groqAnswer) {
      return {
        success: true,
        workspaceId,
        query,
        answer: groqAnswer,
        provider: "groq (openai/gpt-oss-120b)",
        sources
      };
    }
  } catch (err) {
    console.warn("Groq synthesis failed, using local semantic fallback:", err.message);
  }

  // 2. Fallback: High-signal structured semantic synthesis
  const answerSections = [];
  const fileGroups = {};
  for (const c of chunks) {
    if (!fileGroups[c.filePath]) fileGroups[c.filePath] = [];
    fileGroups[c.filePath].push(c);
  }

  for (const [file, items] of Object.entries(fileGroups)) {
    const primary = items[0];
    answerSections.push(`**${primary.title || file}** (Relevance: ${Math.round(primary.score * 100)}%)\n${truncateSnippet(primary.content, 450)}`);
  }

  const synthesizedText = `Based on the Project Brain analysis of your connected repository, here are the most relevant findings for "${query}":\n\n` +
    answerSections.join("\n\n---\n\n") +
    `\n\n*Analyzed across ${chunks.length} high-signal knowledge chunks from ${Object.keys(fileGroups).length} files.*`;

  return {
    success: true,
    workspaceId,
    query,
    answer: synthesizedText,
    provider: "local-rag-vector",
    sources
  };
};

function truncateSnippet(text, maxLen = 400) {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + "\n... [truncated for brevity]";
}
