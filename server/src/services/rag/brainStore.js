import { BrainKnowledge } from "../../models/BrainKnowledge.js";
import { Workspace } from "../../models/Workspace.js";
import { getDBStatus } from "../../db/connection.js";
import { buildVectorIndex } from "./vectorEngine.js";
import { getEmbeddingModelInfo } from "./embeddingService.js";

// Bounded in-memory cache (max 2 active workspaces) to protect Render 512MB RAM limit
const MAX_CACHED_WORKSPACES = 2;
const memoryCache = new Map();

function setBoundedCache(key, value) {
  if (memoryCache.size >= MAX_CACHED_WORKSPACES && !memoryCache.has(key)) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, value);
}

/**
 * Save complete brain knowledge base to MongoDB and in-memory cache
 */
export const saveBrainKnowledgeBase = async (workspaceId, { overview, chunks, indexData, documents = [] }) => {
  const modelInfo = getEmbeddingModelInfo();

  const metadata = {
    ...overview,
    workspaceId,
    lastIndexedAt: new Date().toISOString(),
    status: "ready",
    embeddingModel: modelInfo.model,
    vectorDimensions: modelInfo.dimensions
  };

  // 1. Cache in memory (bounded to 2 workspaces) for ultra-fast vector / BM25 queries
  const payload = {
    metadata,
    documents,
    chunks,
    indexData,
    cachedAt: Date.now()
  };
  setBoundedCache(workspaceId, payload);

  // 2. Persist directly to MongoDB BrainKnowledge collection
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
 * Load brain knowledge base from memory cache or MongoDB
 */
export const loadBrainKnowledgeBase = async (workspaceId) => {
  if (memoryCache.has(workspaceId)) {
    return memoryCache.get(workspaceId);
  }

  // Load from MongoDB
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
        setBoundedCache(workspaceId, data);
        return data;
      }
    }
  } catch (err) {
    console.warn("[BrainStore] Could not load brain from MongoDB:", err.message);
  }

  return null;
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

  // Save to MongoDB and in-memory cache
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
    try {
      if (getDBStatus().isConnected) {
        const ws = await Workspace.findOne({ id: workspaceId }).lean();
        if (ws?.brain?.status === "indexing" || ws?.brain?.status === "error") {
          return {
            status: ws.brain.status,
            hasBrain: false,
            message: ws.brain.message || ws.brain.error || "Project Brain indexing in progress...",
            stats: ws.brain.stats || { totalFiles: 0, totalChunks: 0, totalCommits: 0, techStack: [] },
            embeddingEngine: modelInfo
          };
        }
      }
    } catch (e) {
      // fallback
    }

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
    lastIndexedAt: data.metadata?.lastIndexedAt,
    embeddingEngine: modelInfo,
    documents: data.documents || [],
    stats: {
      totalFiles: data.metadata?.totalFiles || 0,
      totalDocuments: (data.documents || []).length,
      totalChunks: data.chunks?.length || 0,
      totalCommits: data.metadata?.totalCommits || 0,
      totalPRs: data.metadata?.totalPRs || 0,
      totalDiscussions: data.metadata?.totalDiscussions || 0,
      techStack: data.metadata?.techStack || [],
      languages: data.metadata?.languages || {}
    },
    overview: data.metadata
  };
};

/**
 * Delete brain data for a workspace (memory & MongoDB)
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
};
