import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { BrainKnowledge } from "../../models/BrainKnowledge.js";
import { getDBStatus } from "../../db/connection.js";
import { buildVectorIndex } from "./vectorEngine.js";
import { getEmbeddingModelInfo } from "./embeddingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAINS_DIR = path.resolve(__dirname, "../../../data/brains");

// In-memory cache for sub-millisecond retrieval
const memoryCache = new Map();

/**
 * Ensure the directory for a workspace brain exists
 */
const getWorkspaceBrainDir = async (workspaceId) => {
  const dir = path.join(BRAINS_DIR, workspaceId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

/**
 * Save complete brain knowledge base to MongoDB, disk and in-memory cache
 */
export const saveBrainKnowledgeBase = async (workspaceId, { overview, chunks, indexData, documents = [] }) => {
  const dir = await getWorkspaceBrainDir(workspaceId);
  const modelInfo = getEmbeddingModelInfo();

  const metadata = {
    ...overview,
    workspaceId,
    lastIndexedAt: new Date().toISOString(),
    status: "ready",
    embeddingModel: modelInfo.model,
    vectorDimensions: modelInfo.dimensions
  };

  // 1. Write backup files to local disk
  try {
    await fs.writeFile(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
    await fs.writeFile(path.join(dir, "documents.json"), JSON.stringify(documents, null, 2), "utf-8");
    await fs.writeFile(path.join(dir, "chunks.json"), JSON.stringify(chunks, null, 2), "utf-8");
    await fs.writeFile(path.join(dir, "index.json"), JSON.stringify(indexData), "utf-8");
  } catch (err) {
    console.warn("[BrainStore] Disk write notice:", err.message);
  }

  // 2. Cache in memory
  const payload = {
    metadata,
    documents,
    chunks,
    indexData,
    cachedAt: Date.now()
  };
  memoryCache.set(workspaceId, payload);

  // 3. Persist to existing MongoDB collection
  try {
    if (getDBStatus().isConnected) {
      await BrainKnowledge.findOneAndUpdate(
        { workspaceId },
        {
          workspaceId,
          documents,
          metadata,
          overview,
          chunks,
          indexData,
          embeddingModel: modelInfo.model,
          vectorDimensions: modelInfo.dimensions,
          lastIndexedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn("[BrainStore] MongoDB persist notice:", err.message);
  }

  return metadata;
};

/**
 * Load brain knowledge base from memory cache, MongoDB, or disk
 */
export const loadBrainKnowledgeBase = async (workspaceId) => {
  if (memoryCache.has(workspaceId)) {
    return memoryCache.get(workspaceId);
  }

  // Try MongoDB first
  try {
    if (getDBStatus().isConnected) {
      const doc = await BrainKnowledge.findOne({ workspaceId }).lean();
      if (doc && doc.chunks && doc.indexData) {
        const data = {
          metadata: doc.metadata || doc.overview || {},
          documents: doc.documents || [],
          chunks: doc.chunks,
          indexData: doc.indexData,
          cachedAt: Date.now()
        };
        memoryCache.set(workspaceId, data);
        return data;
      }
    }
  } catch (err) {
    console.warn("[BrainStore] Could not load brain from MongoDB:", err.message);
  }

  // Fallback to local disk
  const dir = path.join(BRAINS_DIR, workspaceId);
  try {
    const metaRaw = await fs.readFile(path.join(dir, "metadata.json"), "utf-8");
    const chunksRaw = await fs.readFile(path.join(dir, "chunks.json"), "utf-8");
    const indexRaw = await fs.readFile(path.join(dir, "index.json"), "utf-8");

    let documents = [];
    try {
      const docsRaw = await fs.readFile(path.join(dir, "documents.json"), "utf-8");
      documents = JSON.parse(docsRaw);
    } catch (e) {
      // optional
    }

    const metadata = JSON.parse(metaRaw);
    const chunks = JSON.parse(chunksRaw);
    const indexData = JSON.parse(indexRaw);

    const data = { metadata, documents, chunks, indexData, cachedAt: Date.now() };
    memoryCache.set(workspaceId, data);
    return data;
  } catch (err) {
    // Brain doesn't exist yet for this workspace
    return null;
  }
};

/**
 * Incrementally adds an ingested document and its chunks to workspace Brain
 */
export const addDocumentToBrain = async (workspaceId, documentMeta, newChunks = []) => {
  let brainData = await loadBrainKnowledgeBase(workspaceId);

  // If no brain exists yet, initialize a clean one
  if (!brainData) {
    brainData = {
      metadata: {
        workspaceId,
        status: "ready",
        totalFiles: 0,
        totalCommits: 0,
        totalChunks: 0,
        techStack: []
      },
      documents: [],
      chunks: [],
      indexData: { invertedIndex: {}, idf: {}, avgDocLength: 0, chunkLengths: [], totalChunks: 0 }
    };
  }

  const existingDocs = brainData.documents || [];

  // Check for duplicate document by hash or name
  const duplicateIdx = existingDocs.findIndex((d) => d.hash === documentMeta.hash || d.name === documentMeta.name);
  if (duplicateIdx >= 0) {
    // Remove old chunks of this document before replacing
    const oldDoc = existingDocs[duplicateIdx];
    brainData.chunks = (brainData.chunks || []).filter((c) => c.documentId !== oldDoc.id);
    existingDocs[duplicateIdx] = documentMeta;
  } else {
    existingDocs.push(documentMeta);
  }

  // Append new chunks
  const combinedChunks = [...(brainData.chunks || []), ...newChunks];

  // Rebuild the Inverted Index over all combined chunks
  const updatedIndexData = buildVectorIndex(combinedChunks);

  // Save to MongoDB and disk
  await saveBrainKnowledgeBase(workspaceId, {
    overview: {
      ...brainData.metadata,
      totalChunks: combinedChunks.length,
      totalDocuments: existingDocs.length
    },
    chunks: combinedChunks,
    indexData: updatedIndexData,
    documents: existingDocs
  });

  return {
    document: documentMeta,
    totalChunks: combinedChunks.length,
    totalDocuments: existingDocs.length
  };
};

/**
 * Removes an ingested document and its chunks from workspace Brain
 */
export const removeDocumentFromBrain = async (workspaceId, docId) => {
  const brainData = await loadBrainKnowledgeBase(workspaceId);
  if (!brainData) return false;

  const existingDocs = (brainData.documents || []).filter((d) => d.id !== docId);
  const remainingChunks = (brainData.chunks || []).filter((c) => c.documentId !== docId);

  const updatedIndexData = buildVectorIndex(remainingChunks);

  await saveBrainKnowledgeBase(workspaceId, {
    overview: {
      ...brainData.metadata,
      totalChunks: remainingChunks.length,
      totalDocuments: existingDocs.length
    },
    chunks: remainingChunks,
    indexData: updatedIndexData,
    documents: existingDocs
  });

  return true;
};

/**
 * Get brain status, statistics, and ingested documents
 */
export const getBrainStatus = async (workspaceId) => {
  const data = await loadBrainKnowledgeBase(workspaceId);
  const modelInfo = getEmbeddingModelInfo();

  if (!data) {
    return {
      status: "uninitialized",
      hasBrain: false,
      message: "No GitHub repository or documents connected yet.",
      embeddingEngine: modelInfo
    };
  }

  return {
    status: "ready",
    hasBrain: true,
    lastIndexedAt: data.metadata.lastIndexedAt,
    embeddingEngine: modelInfo,
    documents: data.documents || [],
    stats: {
      totalFiles: data.metadata.totalFiles || 0,
      totalDocuments: (data.documents || []).length,
      totalChunks: data.chunks?.length || 0,
      totalCommits: data.metadata.totalCommits || 0,
      totalPRs: data.metadata.totalPRs || 0,
      totalDiscussions: data.metadata.totalDiscussions || 0,
      techStack: data.metadata.techStack || [],
      languages: data.metadata.languages || {}
    },
    overview: data.metadata
  };
};

/**
 * Delete brain data for a workspace (memory, MongoDB, disk)
 */
export const deleteBrainData = async (workspaceId) => {
  memoryCache.delete(workspaceId);

  try {
    if (getDBStatus().isConnected) {
      await BrainKnowledge.deleteOne({ workspaceId });
    }
  } catch (e) {
    console.warn("[BrainStore] MongoDB delete notice:", e.message);
  }

  const dir = path.join(BRAINS_DIR, workspaceId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {
    // Ignore if not present
  }
};
