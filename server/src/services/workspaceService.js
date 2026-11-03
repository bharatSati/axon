import { fetchRepositoryData } from "./githubService.js";
import { indexWorkspaceRepository } from "./rag/ragQueryService.js";
import { deleteBrainData, getBrainStatus } from "./rag/brainStore.js";
import { Workspace } from "../models/Workspace.js";
import { getDBStatus } from "../db/connection.js";

// In-memory fallback cache only if MongoDB is offline / disconnected
let memoryWorkspaces = [];

/**
 * Initialize / fetch workspaces from MongoDB
 */
export const ensureInitialized = async () => {
  try {
    if (getDBStatus().isConnected) {
      const dbWorkspaces = await Workspace.find().lean();
      if (dbWorkspaces && dbWorkspaces.length > 0) {
        memoryWorkspaces = dbWorkspaces.map((w) => ({
          ...w,
          id: w.id || w._id.toString()
        }));
      }
    }
  } catch (err) {
    console.warn("MongoDB workspace fetch notice:", err.message);
  }
};

/**
 * List all workspaces accessible by a user (owner or invited member)
 */
export const listWorkspaces = async (user) => {
  if (!user) return [];

  const userId = user.id || user._id;
  const username = user.username?.toLowerCase();

  let allWorkspaces = [];
  try {
    if (getDBStatus().isConnected) {
      const dbList = await Workspace.find().sort({ updatedAt: -1 }).lean();
      if (dbList && dbList.length > 0) {
        allWorkspaces = dbList.map((w) => ({
          ...w,
          id: w.id || w._id.toString()
        }));
        memoryWorkspaces = allWorkspaces;
      }
    } else {
      allWorkspaces = memoryWorkspaces;
    }
  } catch (err) {
    console.warn("MongoDB listWorkspaces error:", err.message);
    allWorkspaces = memoryWorkspaces;
  }

  const userWorkspaces = allWorkspaces.filter((ws) => {
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

  // If user has zero workspaces, auto-create their personal workspace in MongoDB!
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
  let ws = null;
  try {
    if (getDBStatus().isConnected) {
      ws = await Workspace.findOne({ id: workspaceId }).lean();
    }
  } catch (err) {
    console.warn("MongoDB getWorkspaceById error:", err.message);
  }

  if (!ws) {
    ws = memoryWorkspaces.find((w) => w.id === workspaceId);
  }

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
 * Create a new workspace in MongoDB
 */
export const createWorkspace = async (ownerId, { name, description = "" }) => {
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
    },
    members: []
  };

  try {
    if (getDBStatus().isConnected) {
      await Workspace.create(newWorkspace);
    }
  } catch (err) {
    console.warn("MongoDB createWorkspace notice:", err.message);
  }

  memoryWorkspaces.unshift(newWorkspace);
  return newWorkspace;
};

/**
 * Update a workspace (rename, edit description) in MongoDB
 */
export const updateWorkspace = async (workspaceId, { name, description }) => {
  const updateData = {
    updatedAt: new Date().toISOString()
  };

  if (name && name.trim()) {
    updateData.name = name.trim();
  }
  if (description !== undefined) {
    updateData.description = description.trim();
  }

  let updated = null;
  try {
    if (getDBStatus().isConnected) {
      updated = await Workspace.findOneAndUpdate(
        { id: workspaceId },
        { $set: updateData },
        { new: true }
      ).lean();
    }
  } catch (err) {
    console.warn("MongoDB updateWorkspace notice:", err.message);
  }

  // Update in memory cache
  const idx = memoryWorkspaces.findIndex((w) => w.id === workspaceId);
  if (idx !== -1) {
    memoryWorkspaces[idx] = { ...memoryWorkspaces[idx], ...updateData };
    if (!updated) updated = memoryWorkspaces[idx];
  }

  if (!updated) {
    throw new Error("Workspace not found.");
  }

  return updated;
};

/**
 * Delete a workspace and remove its Project Brain data
 */
export const deleteWorkspace = async (workspaceId) => {
  let deleted = null;
  try {
    if (getDBStatus().isConnected) {
      deleted = await Workspace.findOneAndDelete({ id: workspaceId }).lean();
    }
  } catch (err) {
    console.warn("MongoDB workspace delete notice:", err.message);
  }

  const index = memoryWorkspaces.findIndex((w) => w.id === workspaceId);
  if (index !== -1) {
    const memoryDeleted = memoryWorkspaces.splice(index, 1)[0];
    if (!deleted) deleted = memoryDeleted;
  }

  if (!deleted) {
    throw new Error("Workspace not found.");
  }

  // Delete persistent brain data
  await deleteBrainData(workspaceId);

  return deleted;
};

/**
 * Connect a GitHub repository to a workspace and initialize its Project Brain
 */
export const connectRepositoryToWorkspace = async (workspaceId, repoData, userIdOrToken) => {
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

  const updateFields = {
    repository: connectedRepo,
    updatedAt: new Date().toISOString(),
    brain: {
      status: "indexing",
      message: "Initializing Project Brain: Extracting code, documentation, and commits..."
    }
  };

  let ws = null;
  try {
    if (getDBStatus().isConnected) {
      ws = await Workspace.findOneAndUpdate(
        { id: workspaceId },
        { $set: updateFields },
        { new: true }
      ).lean();
    }
  } catch (err) {
    console.warn("MongoDB connectRepository notice:", err.message);
  }

  const memWs = memoryWorkspaces.find((w) => w.id === workspaceId);
  if (memWs) {
    Object.assign(memWs, updateFields);
    if (!ws) ws = memWs;
  }

  if (!ws) {
    throw new Error("Workspace not found.");
  }

  // Trigger Asynchronous Project Brain indexing via RAG
  triggerBrainIndexingAsync(workspaceId, connectedRepo, userIdOrToken);

  return ws;
};

/**
 * Disconnect repository from a workspace
 */
export const disconnectRepositoryFromWorkspace = async (workspaceId) => {
  const updateFields = {
    repository: null,
    updatedAt: new Date().toISOString(),
    brain: {
      status: "uninitialized",
      message: "Repository disconnected. Project Brain is inactive."
    }
  };

  let ws = null;
  try {
    if (getDBStatus().isConnected) {
      ws = await Workspace.findOneAndUpdate(
        { id: workspaceId },
        { $set: updateFields },
        { new: true }
      ).lean();
    }
  } catch (err) {
    console.warn("MongoDB disconnectRepository notice:", err.message);
  }

  const memWs = memoryWorkspaces.find((w) => w.id === workspaceId);
  if (memWs) {
    Object.assign(memWs, updateFields);
    if (!ws) ws = memWs;
  }

  if (!ws) {
    throw new Error("Workspace not found.");
  }

  await deleteBrainData(workspaceId);

  return {
    success: true,
    message: "Disconnected repository from workspace.",
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

    // Update workspace state in MongoDB
    const brainData = {
      status: "ready",
      lastIndexedAt: new Date().toISOString(),
      durationMs: indexResult.durationMs,
      stats: indexResult.stats,
      overview: indexResult.metadata
    };

    try {
      if (getDBStatus().isConnected) {
        await Workspace.findOneAndUpdate(
          { id: workspaceId },
          { $set: { brain: brainData, updatedAt: new Date().toISOString() } }
        );
      }
    } catch (dbErr) {
      console.warn("MongoDB indexing status sync notice:", dbErr.message);
    }

    const memWs = memoryWorkspaces.find((w) => w.id === workspaceId);
    if (memWs) {
      memWs.brain = brainData;
    }
  } catch (err) {
    console.error(`Failed to index brain for workspace ${workspaceId}:`, err);
    const errorBrain = {
      status: "error",
      error: err.message || "Failed to index repository into Project Brain"
    };

    try {
      if (getDBStatus().isConnected) {
        await Workspace.findOneAndUpdate(
          { id: workspaceId },
          { $set: { brain: errorBrain, updatedAt: new Date().toISOString() } }
        );
      }
    } catch (dbErr) {
      console.warn("MongoDB error status sync notice:", dbErr.message);
    }

    const memWs = memoryWorkspaces.find((w) => w.id === workspaceId);
    if (memWs) {
      memWs.brain = errorBrain;
    }
  }
}
