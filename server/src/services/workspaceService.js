import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { fetchRepositoryData } from "./githubService.js";
import { indexWorkspaceRepository } from "./rag/ragQueryService.js";
import { deleteBrainData, getBrainStatus } from "./rag/brainStore.js";
import { Workspace } from "../models/Workspace.js";
import { getDBStatus } from "../db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACES_FILE = path.resolve(__dirname, "../../data/workspaces.json");

// In-memory workspaces storage loaded dynamically
let workspaces = [];

// Load persisted workspaces from MongoDB or disk with race-condition guard
let initPromise = null;
export const ensureInitialized = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      // 1. Try loading from MongoDB if connected
      try {
        if (getDBStatus().isConnected) {
          const dbWorkspaces = await Workspace.find().lean();
          if (dbWorkspaces && dbWorkspaces.length > 0) {
            workspaces = dbWorkspaces.map((w) => ({
              ...w,
              id: w.id || w._id.toString()
            }));
            await saveWorkspacesToDisk();
            return;
          }
        }
      } catch (err) {
        console.warn("MongoDB workspace fetch notice:", err.message);
      }

      // 2. Fallback to local disk file
      try {
        const raw = await fs.readFile(WORKSPACES_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          workspaces = parsed;
        }
      } catch (err) {
        // no disk file yet
      }
    })();
  }
  return initPromise;
};

const saveWorkspacesToDisk = async () => {
  try {
    await fs.mkdir(path.dirname(WORKSPACES_FILE), { recursive: true });
    await fs.writeFile(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save workspaces to disk:", err.message);
  }
};

const syncWorkspaceToDB = async (ws) => {
  try {
    if (getDBStatus().isConnected) {
      await Workspace.findOneAndUpdate({ id: ws.id }, ws, { upsert: true, new: true });
    }
  } catch (err) {
    console.warn("MongoDB sync workspace notice:", err.message);
  }
};

/**
 * List all workspaces accessible by a user (owner or invited member)
 */
export const listWorkspaces = async (user) => {
  await ensureInitialized();
  if (!user) return [];

  const userId = user.id || user._id;
  const username = user.username?.toLowerCase();

  const userWorkspaces = workspaces.filter((ws) => {
    // 1. Is workspace owner (matches user id or username)
    if (userId && (ws.ownerId === userId || ws.ownerId === `gh_${userId}`)) return true;
    if (username && ws.ownerId?.toLowerCase() === username) return true;

    // 2. Is an active member of this workspace
    if (Array.isArray(ws.members)) {
      return ws.members.some(
        (m) =>
          (userId && (m.userId === userId || m.userId === `gh_${userId}`)) ||
          (username && m.githubUsername?.toLowerCase() === username)
      );
    }

    return false;
  });

  // If user has zero workspaces, auto-create their personal workspace!
  if (userWorkspaces.length === 0 && (userId || username)) {
    const ownerIdentifier = userId || `gh_${username}`;
    const personalWs = await createWorkspace(ownerIdentifier, {
      name: `${user.name || user.username || "My"}'s Workspace`,
      description: "Personal workspace for intelligent engineering & Project Brain"
    });
    return [
      {
        id: personalWs.id,
        name: personalWs.name,
        description: personalWs.description,
        createdAt: personalWs.createdAt,
        updatedAt: personalWs.updatedAt,
        hasRepository: false,
        repository: null,
        brain: { status: "uninitialized", message: "Connect a GitHub repository to activate the Project Brain." },
        members: []
      }
    ];
  }

  return userWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    description: ws.description,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    hasRepository: !!ws.repository,
    repository: ws.repository || null,
    brain: ws.brain || { status: "uninitialized" },
    members: ws.members || []
  }));
};

/**
 * Get a specific workspace with full details
 */
export const getWorkspaceById = async (workspaceId, user = null) => {
  await ensureInitialized();
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) return null;

  // If user provided, check access permission
  if (user) {
    const userId = user.id || user._id;
    const username = user.username?.toLowerCase();
    const isOwner =
      (userId && (ws.ownerId === userId || ws.ownerId === `gh_${userId}`)) ||
      (username && ws.ownerId?.toLowerCase() === username);
    const isMember = Array.isArray(ws.members) && ws.members.some(
      (m) =>
        (userId && (m.userId === userId || m.userId === `gh_${userId}`)) ||
        (username && m.githubUsername?.toLowerCase() === username)
    );

    if (!isOwner && !isMember) {
      return null;
    }
  }

  // Enhance with live brain status if connected
  const brainStatus = await getBrainStatus(workspaceId);

  return {
    ...ws,
    brain: brainStatus.hasBrain
      ? {
          status: "ready",
          lastIndexedAt: brainStatus.lastIndexedAt,
          stats: brainStatus.stats,
          overview: brainStatus.overview
        }
      : ws.brain || { status: "uninitialized" }
  };
};

/**
 * Create a new workspace
 */
export const createWorkspace = async (ownerId, { name, description = "" }) => {
  await ensureInitialized();
  if (!name || !name.trim()) {
    throw new Error("Workspace name is required.");
  }

  const newWorkspace = {
    id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId: ownerId || "default",
    name: name.trim(),
    description: description?.trim() || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    repository: null,
    brain: {
      status: "uninitialized",
      message: "Connect a GitHub repository to activate the Project Brain."
    }
  };

  workspaces.unshift(newWorkspace);
  await saveWorkspacesToDisk();
  await syncWorkspaceToDB(newWorkspace);

  return newWorkspace;
};

/**
 * Update a workspace (rename, edit description)
 */
export const updateWorkspace = async (workspaceId, { name, description }) => {
  await ensureInitialized();
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) {
    throw new Error("Workspace not found.");
  }

  if (name && name.trim()) {
    ws.name = name.trim();
  }
  if (description !== undefined) {
    ws.description = description.trim();
  }

  ws.updatedAt = new Date().toISOString();
  await saveWorkspacesToDisk();
  await syncWorkspaceToDB(ws);

  return ws;
};

/**
 * Delete a workspace and remove its Project Brain data
 */
export const deleteWorkspace = async (workspaceId) => {
  await ensureInitialized();
  const index = workspaces.findIndex((w) => w.id === workspaceId);
  if (index === -1) {
    throw new Error("Workspace not found.");
  }

  const deleted = workspaces.splice(index, 1)[0];
  await saveWorkspacesToDisk();

  try {
    if (getDBStatus().isConnected) {
      await Workspace.deleteOne({ id: workspaceId });
    }
  } catch (err) {
    console.warn("MongoDB workspace delete notice:", err.message);
  }

  // Delete persistent brain data
  await deleteBrainData(workspaceId);

  return deleted;
};

/**
 * Connect a GitHub repository to a workspace and initialize its Project Brain
 */
export const connectRepositoryToWorkspace = async (workspaceId, repoData, userIdOrToken) => {
  await ensureInitialized();
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) {
    throw new Error("Workspace not found.");
  }

  const { name, owner, defaultBranch = "main", fullName, description, visibility, htmlUrl, stars, language } = repoData;

  const connectedRepo = {
    id: repoData.id || Date.now(),
    name: name || repoData.name,
    fullName: fullName || `${owner}/${name}`,
    owner: typeof owner === "object" ? owner.login : owner,
    description: description || "Software repository connected to Axon workspace",
    defaultBranch: defaultBranch || "main",
    visibility: visibility || (repoData.private ? "private" : "public"),
    stars: stars || repoData.stargazers_count || 0,
    language: language || "JavaScript",
    htmlUrl: htmlUrl || repoData.html_url || `https://github.com/${owner}/${name}`,
    connectedAt: new Date().toISOString()
  };

  // Associate repository with workspace
  ws.repository = connectedRepo;
  ws.updatedAt = new Date().toISOString();
  ws.brain = {
    status: "indexing",
    message: "Initializing Project Brain: Extracting code, documentation, and commits..."
  };

  await saveWorkspacesToDisk();
  await syncWorkspaceToDB(ws);

  // Trigger Asynchronous Project Brain indexing via RAG
  triggerBrainIndexingAsync(workspaceId, connectedRepo, userIdOrToken);

  return ws;
};

/**
 * Disconnect repository from a workspace
 */
export const disconnectRepositoryFromWorkspace = async (workspaceId) => {
  await ensureInitialized();
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) {
    throw new Error("Workspace not found.");
  }

  const previousRepo = ws.repository;
  ws.repository = null;
  ws.brain = {
    status: "uninitialized",
    message: "Repository disconnected. Project Brain is inactive."
  };
  ws.updatedAt = new Date().toISOString();

  await saveWorkspacesToDisk();
  await syncWorkspaceToDB(ws);
  await deleteBrainData(workspaceId);

  return {
    success: true,
    message: `Disconnected ${previousRepo?.name || "repository"} from workspace.`,
    workspace: ws
  };
};

/**
 * Asynchronously fetch GitHub data and build the RAG Project Brain
 */
async function triggerBrainIndexingAsync(workspaceId, repo, userIdOrToken) {
  try {
    const repoContext = await fetchRepositoryData(
      userIdOrToken,
      repo.owner,
      repo.name,
      repo.defaultBranch
    );

    const indexResult = await indexWorkspaceRepository(workspaceId, repoContext);

    // Update workspace state
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      ws.brain = {
        status: "ready",
        lastIndexedAt: new Date().toISOString(),
        durationMs: indexResult.durationMs,
        stats: indexResult.stats,
        overview: indexResult.metadata
      };
      await saveWorkspacesToDisk();
      await syncWorkspaceToDB(ws);
    }
  } catch (err) {
    console.error(`Failed to index brain for workspace ${workspaceId}:`, err);
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      ws.brain = {
        status: "error",
        error: err.message || "Failed to index repository into Project Brain"
      };
      await saveWorkspacesToDisk();
      await syncWorkspaceToDB(ws);
    }
  }
}
