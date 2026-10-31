import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { BrainKnowledge } from "../../models/BrainKnowledge.js";
import { getDBStatus } from "../../db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAINS_DIR = path.resolve(__dirname, "../../../data/brains");

// In-memory cache for lightning-fast sub-millisecond retrieval
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
export const saveBrainKnowledgeBase = async (workspaceId, { overview, chunks, indexData }) => {
  const dir = await getWorkspaceBrainDir(workspaceId);

  const metadata = {
    ...overview,
    workspaceId,
    lastIndexedAt: new Date().toISOString(),
    status: "ready"
  };

  // 1. Write files to local disk
  try {
    await fs.writeFile(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");
    await fs.writeFile(path.join(dir, "chunks.json"), JSON.stringify(chunks, null, 2), "utf-8");
    await fs.writeFile(path.join(dir, "index.json"), JSON.stringify(indexData), "utf-8");
  } catch (err) {
    console.warn("Could not write brain files to disk:", err.message);
  }

  // 2. Cache in memory
  const payload = {
    metadata,
    chunks,
    indexData,
    cachedAt: Date.now()
  };
  memoryCache.set(workspaceId, payload);

  // 3. Persist to MongoDB if connected
  try {
    if (getDBStatus().isConnected) {
      await BrainKnowledge.findOneAndUpdate(
        { workspaceId },
        {
          workspaceId,
          metadata,
          overview,
          chunks,
          indexData,
          lastIndexedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn("MongoDB brain persist notice:", err.message);
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

  // Try MongoDB first if connected
  try {
    if (getDBStatus().isConnected) {
      const doc = await BrainKnowledge.findOne({ workspaceId }).lean();
      if (doc && doc.chunks && doc.indexData) {
        const data = {
          metadata: doc.metadata || doc.overview || {},
          chunks: doc.chunks,
          indexData: doc.indexData,
          cachedAt: Date.now()
        };
        memoryCache.set(workspaceId, data);
        return data;
      }
    }
  } catch (err) {
    console.warn("Could not load brain from MongoDB:", err.message);
  }

  // Fallback to local disk
  const dir = path.join(BRAINS_DIR, workspaceId);
  try {
    const metaRaw = await fs.readFile(path.join(dir, "metadata.json"), "utf-8");
    const chunksRaw = await fs.readFile(path.join(dir, "chunks.json"), "utf-8");
    const indexRaw = await fs.readFile(path.join(dir, "index.json"), "utf-8");

    const metadata = JSON.parse(metaRaw);
    const chunks = JSON.parse(chunksRaw);
    const indexData = JSON.parse(indexRaw);

    const data = { metadata, chunks, indexData, cachedAt: Date.now() };
    memoryCache.set(workspaceId, data);
    return data;
  } catch (err) {
    // Brain doesn't exist yet for this workspace
    return null;
  }
};

/**
 * Get brain status and statistics
 */
export const getBrainStatus = async (workspaceId) => {
  const data = await loadBrainKnowledgeBase(workspaceId);
  if (!data) {
    return {
      status: "uninitialized",
      hasBrain: false,
      message: "No GitHub repository connected yet."
    };
  }

  return {
    status: "ready",
    hasBrain: true,
    lastIndexedAt: data.metadata.lastIndexedAt,
    stats: {
      totalFiles: data.metadata.totalFiles || 0,
      totalChunks: data.chunks?.length || 0,
      totalCommits: data.metadata.totalCommits || 0,
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
    console.warn("MongoDB brain delete notice:", e.message);
  }

  const dir = path.join(BRAINS_DIR, workspaceId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {
    // Ignore if not present
  }
};
