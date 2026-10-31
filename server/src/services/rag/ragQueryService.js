import crypto from "node:crypto";
import { processRepositoryIntoChunks, processDocumentIntoChunks } from "./documentProcessor.js";
import { buildVectorIndex, searchHybridIndex, searchAtlasVectorIndex } from "./vectorEngine.js";
import {
  saveBrainKnowledgeBase,
  loadBrainKnowledgeBase,
  addDocumentToBrain,
  removeDocumentFromBrain,
  getBrainStatus
} from "./brainStore.js";
import { generateEmbedding } from "./embeddingService.js";
import { generateGroqBrainAnswer } from "./groqService.js";

/**
 * Indexes a GitHub repository and builds the persistent Project Brain for a workspace
 */
export const indexWorkspaceRepository = async (workspaceId, repoData) => {
  const startTime = Date.now();

  // 1. Process files, docs, manifests, commits, commit comments, PRs, review comments, discussions, releases
  const { chunks, overview } = await processRepositoryIntoChunks(repoData);

  // 2. Build Inverted Index & BM25 weights
  const indexData = buildVectorIndex(chunks);

  // Preserve existing uploaded documents if any were previously ingested
  const existingBrain = await loadBrainKnowledgeBase(workspaceId);
  const existingDocs = existingBrain?.documents || [];

  // 3. Save to persistent MongoDB collection and memory cache
  const metadata = await saveBrainKnowledgeBase(workspaceId, {
    overview,
    chunks,
    indexData,
    documents: existingDocs
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
      totalPRs: overview.totalPRs,
      totalDiscussions: overview.totalDiscussions,
      totalReleases: overview.totalReleases,
      techStack: overview.techStack
    },
    metadata
  };
};

/**
 * Ingests an uploaded document (PDF, DOCX, TXT, MD) into a workspace's Brain
 */
export const ingestDocumentIntoBrain = async (workspaceId, { filename, originalName, buffer, mimeType, options = {} }) => {
  const startTime = Date.now();
  const docId = `doc_${crypto.randomUUID().substring(0, 10)}`;

  // 1. Process document, extract text, chunk, and generate 384d dense embeddings
  const { document, chunks } = await processDocumentIntoChunks({
    filename,
    originalName,
    buffer,
    mimeType,
    docId,
    options
  });

  // 2. Persist document and chunks to MongoDB
  const result = await addDocumentToBrain(workspaceId, document, chunks);
  const durationMs = Date.now() - startTime;

  return {
    success: true,
    workspaceId,
    durationMs,
    document: result.document,
    stats: {
      newChunksCount: chunks.length,
      totalChunks: result.totalChunks,
      totalDocuments: result.totalDocuments
    }
  };
};

/**
 * Lists all documents ingested into workspace Brain
 */
export const listBrainDocuments = async (workspaceId) => {
  const brainData = await loadBrainKnowledgeBase(workspaceId);
  return {
    success: true,
    workspaceId,
    documents: brainData?.documents || []
  };
};

/**
 * Deletes an ingested document from workspace Brain
 */
export const deleteBrainDocument = async (workspaceId, docId) => {
  const success = await removeDocumentFromBrain(workspaceId, docId);
  return {
    success,
    workspaceId,
    docId
  };
};

/**
 * Execute a RAG query against a workspace's Project Brain
 * Combines dense semantic vector search (all-MiniLM-L6-v2) + BM25 keyword matching + metadata filtering
 */
export const queryWorkspaceBrain = async (
  workspaceId,
  query,
  {
    topK = 5,
    filterType = "all",
    documentId = null,
    minSimilarity = 0.1
  } = {}
) => {
  const brainData = await loadBrainKnowledgeBase(workspaceId);

  if (!brainData || !brainData.chunks || brainData.chunks.length === 0) {
    return {
      success: false,
      error: "Project Brain is not initialized for this workspace. Please connect a GitHub repository or ingest a document first.",
      results: []
    };
  }

  const { chunks, indexData } = brainData;

  // 1. Generate query embedding with local all-MiniLM-L6-v2
  const queryEmbedding = await generateEmbedding(query);

  // 2. Check for MongoDB Atlas native $vectorSearch if available
  const atlasMatches = await searchAtlasVectorIndex(workspaceId, queryEmbedding, { topK, filterType, documentId });
  if (atlasMatches && atlasMatches.length > 0) {
    return {
      success: true,
      workspaceId,
      query,
      engine: "mongodb-atlas-vector-search",
      totalMatches: atlasMatches.length,
      results: atlasMatches
    };
  }

  // 3. Native in-memory Hybrid Dense Vector + BM25 search
  const rankedMatches = searchHybridIndex(query, queryEmbedding, indexData, chunks, {
    topK,
    filterType,
    documentId,
    minSimilarity
  });

  const results = rankedMatches.map(({ chunk, score, dense, bm25, boost }) => ({
    id: chunk.id,
    documentId: chunk.documentId,
    filePath: chunk.filePath,
    type: chunk.type,
    title: chunk.title,
    score,
    metrics: { denseSimilarity: dense, bm25Score: bm25, boost },
    content: chunk.content,
    metadata: chunk.metadata
  }));

  return {
    success: true,
    workspaceId,
    query,
    engine: "local-all-MiniLM-L6-v2-dense-hybrid",
    totalMatches: results.length,
    results
  };
};

/**
 * Synthesizes an accurate, context-grounded response using retrieved RAG chunks
 * Strict anti-hallucination prompt ensures the LLM cites exact sources, commits, and PRs.
 */
export const synthesizeBrainAnswer = async (
  workspaceId,
  query,
  {
    topK = 4,
    filterType = "all",
    documentId = null
  } = {}
) => {
  const queryResult = await queryWorkspaceBrain(workspaceId, query, { topK, filterType, documentId });

  if (!queryResult.success || !queryResult.results.length) {
    return {
      success: false,
      query,
      answer: "No relevant code, commits, pull requests, discussions, or documents found in the Project Brain for this query.",
      sources: []
    };
  }

  const chunks = queryResult.results;

  // Construct structured source citations
  const sources = chunks.map((c) => ({
    filePath: c.filePath,
    title: c.title,
    type: c.type,
    score: c.score,
    documentId: c.documentId,
    snippet: truncateSnippet(c.content, 220)
  }));

  // 1. Synthesize using Groq LLM with smart fallback models
  let groqFailureNotice = null;
  try {
    const brainStatus = await getBrainStatus(workspaceId);
    const groqAnswer = await generateGroqBrainAnswer(query, chunks, {
      workspaceId,
      name: brainStatus?.overview?.repoFullName || brainStatus?.overview?.repoName || "Axon Project Brain"
    });

    if (groqAnswer) {
      return {
        success: true,
        workspaceId,
        query,
        answer: groqAnswer,
        provider: "Groq LLM + all-MiniLM-L6-v2 RAG",
        sources
      };
    }
  } catch (err) {
    groqFailureNotice = err.message;
    console.warn("[RAG Query] Groq synthesis notice:", err.message);
  }

  // 2. Graceful Local Structured Semantic Synthesis Fallback (Clean Natural English)
  const answerSections = [];
  const fileGroups = {};
  for (const c of chunks) {
    if (!fileGroups[c.filePath]) fileGroups[c.filePath] = [];
    fileGroups[c.filePath].push(c);
  }

  for (const [file, items] of Object.entries(fileGroups)) {
    const primary = items[0];
    const cleanTitle = primary.title ? primary.title.replace(/^[#\-_\s*]+/, "").trim() : file;
    const cleanSnippet = truncateSnippet(primary.content, 450);

    answerSections.push(
      `### ${cleanTitle}\n` +
      `Source type: ${primary.type} (${Math.round(primary.score * 100)} percent relevance match)\n\n` +
      cleanSnippet
    );
  }

  const noticePrefix = groqFailureNotice 
    ? `Notice: Groq LLM was unavailable (${groqFailureNotice}). The following response is grounded directly from your workspace RAG vector index:\n\n`
    : "";

  const synthesizedText =
    noticePrefix +
    `Based on the Project Brain verified knowledge base for your workspace, here is the relevant engineering context found for "${query}":\n\n` +
    answerSections.join("\n\n") +
    `\n\nSummary: Verified across ${chunks.length} high-signal knowledge chunks from ${Object.keys(fileGroups).length} repository sources including code files, commits, pull requests, and documentation.`;

  return {
    success: true,
    workspaceId,
    query,
    answer: synthesizedText,
    provider: groqFailureNotice ? "Local RAG Vector (Groq Rate Limited / Unavailable)" : "local-rag-vector (all-MiniLM-L6-v2)",
    notice: groqFailureNotice,
    sources
  };
};

function truncateSnippet(text = "", maxLen = 350) {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + "\n... [truncated for brevity]";
}
