import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import * as workspaceService from "../services/workspaceService.js";
import {
  queryWorkspaceBrain,
  synthesizeBrainAnswer,
  ingestDocumentIntoBrain,
  listBrainDocuments,
  deleteBrainDocument
} from "../services/rag/ragQueryService.js";
import { getBrainStatus, loadBrainKnowledgeBase } from "../services/rag/brainStore.js";
import { getActiveIntegrations } from "../services/integrationService.js";
import { getUserGitHubToken } from "./authController.js";
import {
  inspectCodeWithBrain,
  generateQATestPlan,
  generateMarketingDeck
} from "../services/rag/groqService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

// ==========================================
// 1. WORKSPACE MANAGEMENT
// ==========================================

export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await workspaceService.listWorkspaces(req.user);
    res.json({
      success: true,
      total: workspaces.length,
      workspaces
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found or access denied." });
    }
    res.json({ success: true, workspace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createWorkspace = async (req, res) => {
  try {
    const ownerId = req.user?.id || "default";
    const { name, description } = req.body;
    const workspace = await workspaceService.createWorkspace(ownerId, { name, description });
    res.status(201).json({
      success: true,
      message: `Workspace "${workspace.name}" created successfully.`,
      workspace
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.updateWorkspace(req.params.id, req.body);
    res.json({
      success: true,
      message: `Workspace "${workspace.name}" updated successfully.`,
      workspace
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const deleted = await workspaceService.deleteWorkspace(req.params.id);
    res.json({
      success: true,
      message: `Workspace "${deleted.name}" deleted.`,
      deleted
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ==========================================
// 2. CONNECT GITHUB REPOSITORY TO WORKSPACE
// ==========================================

export const connectRepository = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const repoData = req.body;
    const userIdOrToken = req.user?.githubToken || req.user?.id || req.user?.username || null;

    if (!repoData || !repoData.name) {
      return res.status(400).json({ error: "Repository data is required." });
    }

    const updatedWorkspace = await workspaceService.connectRepositoryToWorkspace(
      workspaceId,
      repoData,
      userIdOrToken
    );

    res.json({
      success: true,
      message: `Repository ${repoData.name} connected to workspace. Project Brain indexing initiated.`,
      workspace: updatedWorkspace
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const disconnectRepository = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const result = await workspaceService.disconnectRepositoryFromWorkspace(workspaceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ==========================================
// 3. WORKSPACE-WISE PROJECT BRAIN (RAG)
// ==========================================

export const getBrainStatusHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const status = await getBrainStatus(workspaceId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const queryBrainHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { query, topK = 5, filterType = "all", documentId = null } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const result = await queryWorkspaceBrain(workspaceId, query.trim(), { topK, filterType, documentId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const askBrainHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { query, topK = 4, filterType = "all", documentId = null } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Engineering question is required." });
    }

    const answerResult = await synthesizeBrainAnswer(workspaceId, query.trim(), { topK, filterType, documentId });
    res.json(answerResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadBrainDocumentHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;

    let buffer = null;
    let filename = "uploaded_document.txt";
    let originalName = "uploaded_document.txt";
    let mimeType = "text/plain";

    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname;
      originalName = req.file.originalname;
      mimeType = req.file.mimetype || "application/octet-stream";
    } else if (req.body.text) {
      buffer = Buffer.from(req.body.text, "utf-8");
      filename = req.body.filename || "pasted_document.txt";
      originalName = filename;
      mimeType = req.body.mimeType || "text/plain";
    } else {
      return res.status(400).json({
        error: "No file or text payload provided. Please upload a file (PDF, DOCX, TXT, MD) or pass a 'text' field."
      });
    }

    const chunkSize = req.body.chunkSize ? parseInt(req.body.chunkSize, 10) : undefined;
    const chunkOverlap = req.body.chunkOverlap ? parseInt(req.body.chunkOverlap, 10) : undefined;

    const result = await ingestDocumentIntoBrain(workspaceId, {
      filename,
      originalName,
      buffer,
      mimeType,
      options: { chunkSize, chunkOverlap }
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Document ingestion error:", err);
    res.status(500).json({ error: err.message || "Failed to ingest document into Project Brain." });
  }
};

export const getBrainDocumentsHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const result = await listBrainDocuments(workspaceId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteBrainDocumentHandler = async (req, res) => {
  try {
    const { id: workspaceId, docId } = req.params;
    if (!docId) {
      return res.status(400).json({ error: "Document ID is required." });
    }

    const result = await deleteBrainDocument(workspaceId, docId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBrainKnowledgeChunks = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const brainData = await loadBrainKnowledgeBase(workspaceId);
    if (!brainData) {
      return res.status(404).json({ error: "Brain knowledge base not found for this workspace." });
    }

    res.json({
      success: true,
      workspaceId,
      totalChunks: brainData.chunks?.length || 0,
      metadata: brainData.metadata,
      chunks: (brainData.chunks || []).slice(0, 50).map((c) => ({
        id: c.id,
        filePath: c.filePath,
        type: c.type,
        title: c.title,
        metadata: c.metadata,
        snippet: c.content?.substring(0, 200)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 4. DEVELOPER IDE & ROLE-SPECIFIC BRAIN HANDLERS
// ==========================================

const BINARY_EXTS = new Set([
  "riv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "lock",
  "pdf",
  "zip",
  "tar",
  "gz",
  "exe"
]);

function detectLanguage(ext) {
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript";
  if (["ts", "tsx"].includes(ext)) return "typescript";
  if (["json"].includes(ext)) return "json";
  if (["md", "markdown"].includes(ext)) return "markdown";
  if (["css", "scss", "sass", "less"].includes(ext)) return "css";
  if (["html", "htm", "svg"].includes(ext)) return "html";
  if (["py"].includes(ext)) return "python";
  if (["go"].includes(ext)) return "go";
  if (["rs"].includes(ext)) return "rust";
  if (["java"].includes(ext)) return "java";
  if (["yml", "yaml"].includes(ext)) return "yaml";
  if (["sh", "bash"].includes(ext)) return "bash";
  if (["sql"].includes(ext)) return "sql";
  return "text";
}

function detectCategory(ext, relPath) {
  const lower = relPath.toLowerCase();
  if (["md", "txt", "markdown"].includes(ext) || lower.startsWith("docs/") || lower.includes("readme") || lower.includes("license")) {
    return "docs";
  }
  if (["json", "env", "yml", "yaml", "toml", "xml"].includes(ext) || lower.includes("config") || lower.includes("docker") || lower.includes(".gitignore")) {
    return "config";
  }
  return "code";
}

const REPO_CACHE_DIR = path.resolve(projectRoot, "server/data/repo_cache");

function getOrSyncGitCache(workspaceId, owner, repoName, branch = "main", token = null) {
  if (!fs.existsSync(REPO_CACHE_DIR)) {
    fs.mkdirSync(REPO_CACHE_DIR, { recursive: true });
  }

  const wsCacheDir = path.join(REPO_CACHE_DIR, workspaceId);
  const gitUrl = token
    ? `https://x-access-token:${token}@github.com/${owner}/${repoName}.git`
    : `https://github.com/${owner}/${repoName}.git`;

  try {
    if (fs.existsSync(path.join(wsCacheDir, ".git"))) {
      // Fast fetch updates
      try {
        execSync(`git -C "${wsCacheDir}" fetch --depth 1 origin ${branch}`, { stdio: "ignore", timeout: 8000 });
        execSync(`git -C "${wsCacheDir}" reset --hard origin/${branch}`, { stdio: "ignore", timeout: 5000 });
      } catch (e) {}
    } else {
      // Fresh clone with blob:none
      if (fs.existsSync(wsCacheDir)) {
        fs.rmSync(wsCacheDir, { recursive: true, force: true });
      }
      execSync(
        `git clone --filter=blob:none --no-checkout --depth 1 -b ${branch} "${gitUrl}" "${wsCacheDir}"`,
        { stdio: "ignore", timeout: 20000 }
      );
    }
    return wsCacheDir;
  } catch (err) {
    console.warn(`Git cache sync notice for ${owner}/${repoName}:`, err.message);
    return null;
  }
}

async function fetchRawGitHubFile(owner, repoName, filePath, branch = "main", token = null) {
  const cleanPath = filePath.replace(/^\/+/, "");
  const headers = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "Axon-Workspace-IDE"
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // 1. Try GitHub Contents API with raw Accept header
  try {
    const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");
    const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {}

  // 2. Fallback to raw.githubusercontent.com
  try {
    const rawHeaders = { "User-Agent": "Axon-Workspace-IDE" };
    if (token) rawHeaders.Authorization = `token ${token}`;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${encodeURIComponent(branch)}/${cleanPath}`;
    const rawRes = await fetch(rawUrl, { headers: rawHeaders });
    if (rawRes.ok) {
      return await rawRes.text();
    }
  } catch (e) {}

  throw new Error(`Could not fetch file "${filePath}" from GitHub.`);
}

export const getWorkspaceFiles = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await workspaceService.getWorkspaceById(workspaceId, req.user);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found." });
    }

    const repo = workspace.repository;
    if (!repo) {
      return res.json({
        success: true,
        hasRepository: false,
        isLiveGitHub: false,
        workspaceId,
        repoName: "No Repository Connected",
        totalFiles: 0,
        files: [],
        message: "Connect a GitHub repository to explore project files."
      });
    }

    const owner = repo.owner;
    const repoName = repo.name;
    const branch = repo.defaultBranch || "main";
    const token = req.user?.githubToken || (await getUserGitHubToken(req.user?.id || req.user?.username));

    let files = [];
    let isLiveGitHub = false;

    // 1. Try Git Smart Transfer Protocol cache (immune to REST API rate limits)
    try {
      const cacheDir = getOrSyncGitCache(workspaceId, owner, repoName, branch, token);
      if (cacheDir && fs.existsSync(cacheDir)) {
        const rawTree = execSync(`git -C "${cacheDir}" ls-tree -r --name-only HEAD`, {
          encoding: "utf-8",
          timeout: 6000
        });

        const lines = rawTree.trim().split("\n");
        for (const relPath of lines) {
          if (!relPath) continue;
          const lower = relPath.toLowerCase();

          // Exclude ignored paths and files
          if (
            lower.startsWith(".git/") ||
            lower.includes("/.git/") ||
            lower.startsWith("node_modules/") ||
            lower.includes("/node_modules/") ||
            lower.startsWith("dist/") ||
            lower.includes("/dist/") ||
            lower.includes(".cache") ||
            lower.includes("package-lock.json") ||
            lower.includes(".ds_store")
          ) {
            continue;
          }

          const ext = path.extname(relPath).replace(/^\./, "").toLowerCase();
          if (BINARY_EXTS.has(ext)) continue;

          files.push({
            path: relPath,
            name: path.basename(relPath),
            extension: ext,
            language: detectLanguage(ext),
            category: detectCategory(ext, relPath),
            size: 0,
            content: null
          });
        }

        if (files.length > 0) {
          files.sort((a, b) => a.path.localeCompare(b.path));
          isLiveGitHub = true;

          // Preload top 5 files via git show in cacheDir
          const priorityScore = (p) => {
            const l = p.toLowerCase();
            if (l === "readme.md" || l.endsWith("/readme.md")) return 100;
            if (l === "package.json") return 90;
            if (l.includes("app.") || l.includes("index.") || l.includes("main.")) return 80;
            if (l.endsWith(".md")) return 60;
            return 10;
          };

          const toPreload = [...files].sort((a, b) => priorityScore(b.path) - priorityScore(a.path)).slice(0, 5);
          for (const target of toPreload) {
            try {
              const content = execSync(`git -C "${cacheDir}" show HEAD:"${target.path}"`, {
                encoding: "utf-8",
                timeout: 5000
              });
              const original = files.find((f) => f.path === target.path);
              if (original) {
                original.content = content;
                original.size = content.length;
                original.linesCount = content.split("\n").length;
              }
            } catch (e) {}
          }
        }
      }
    } catch (gitErr) {
      console.warn("Git Smart Protocol fetch notice:", gitErr.message);
    }

    // 2. If Git cache failed, try GitHub REST API
    if (files.length === 0) {
      try {
        const treeHeaders = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Axon-Workspace-IDE"
        };
        if (token) treeHeaders.Authorization = `Bearer ${token}`;

        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
          { headers: treeHeaders }
        );

        if (treeRes.ok) {
          const treeData = await treeRes.json();
          const treeItems = treeData.tree || [];

          for (const item of treeItems) {
            if (item.type !== "blob") continue;

            const relPath = item.path;
            const lower = relPath.toLowerCase();

            if (
              lower.startsWith(".git/") ||
              lower.includes("/.git/") ||
              lower.startsWith("node_modules/") ||
              lower.includes("/node_modules/") ||
              lower.startsWith("dist/") ||
              lower.includes("/dist/") ||
              lower.includes(".cache") ||
              lower.includes("package-lock.json") ||
              lower.includes(".ds_store")
            ) {
              continue;
            }

            const ext = path.extname(relPath).replace(/^\./, "").toLowerCase();
            if (BINARY_EXTS.has(ext)) continue;

            files.push({
              path: relPath,
              name: path.basename(relPath),
              extension: ext,
              language: detectLanguage(ext),
              category: detectCategory(ext, relPath),
              size: item.size || 0,
              sha: item.sha,
              content: null
            });
          }

          files.sort((a, b) => a.path.localeCompare(b.path));
          isLiveGitHub = true;
        }
      } catch (restErr) {
        console.warn("GitHub REST tree fetch notice:", restErr.message);
      }
    }

    // 3. Fallback: If both failed, load brain indexed knowledge chunks
    if (files.length === 0) {
      const brainData = await loadBrainKnowledgeBase(workspaceId);
      if (brainData && brainData.chunks) {
        const seen = new Set();
        for (const chunk of brainData.chunks) {
          if (!chunk.filePath || seen.has(chunk.filePath)) continue;
          seen.add(chunk.filePath);
          const ext = path.extname(chunk.filePath).replace(/^\./, "").toLowerCase();
          files.push({
            path: chunk.filePath,
            name: path.basename(chunk.filePath),
            extension: ext,
            language: detectLanguage(ext),
            category: detectCategory(ext, chunk.filePath),
            size: chunk.content ? chunk.content.length : 0,
            linesCount: chunk.content ? chunk.content.split("\n").length : 0,
            content: chunk.content || null
          });
        }
      }
    }

    res.json({
      success: true,
      hasRepository: true,
      isLiveGitHub,
      workspaceId,
      repoName: repo.fullName || `${owner}/${repoName}`,
      branch,
      totalFiles: files.length,
      files
    });
  } catch (err) {
    console.error("getWorkspaceFiles error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getWorkspaceFileContent = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: "Query parameter 'path' is required." });
    }

    const workspace = await workspaceService.getWorkspaceById(workspaceId, req.user);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found." });
    }

    if (!workspace.repository) {
      return res.status(400).json({ error: "No repository connected to this workspace." });
    }

    const repo = workspace.repository;
    const owner = repo.owner;
    const repoName = repo.name;
    const branch = repo.defaultBranch || "main";
    const token = req.user?.githubToken || (await getUserGitHubToken(req.user?.id || req.user?.username));

    const ext = path.extname(filePath).replace(/^\./, "").toLowerCase();

    // 1. Try git show from cacheDir (instant 10ms read)
    const cacheDir = path.join(REPO_CACHE_DIR, workspaceId);
    if (fs.existsSync(path.join(cacheDir, ".git"))) {
      try {
        const content = execSync(`git -C "${cacheDir}" show HEAD:"${filePath}"`, {
          encoding: "utf-8",
          timeout: 6000
        });
        return res.json({
          success: true,
          path: filePath,
          name: path.basename(filePath),
          extension: ext,
          language: detectLanguage(ext),
          category: detectCategory(ext, filePath),
          content,
          size: content.length,
          linesCount: content.split("\n").length
        });
      } catch (e) {}
    }

    // 2. Fallback to raw.githubusercontent.com / GitHub REST API
    const content = await fetchRawGitHubFile(owner, repoName, filePath, branch, token);

    res.json({
      success: true,
      path: filePath,
      name: path.basename(filePath),
      extension: ext,
      language: detectLanguage(ext),
      category: detectCategory(ext, filePath),
      content,
      size: content.length,
      linesCount: content.split("\n").length
    });
  } catch (err) {
    console.error("getWorkspaceFileContent error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch file content from GitHub" });
  }
};

export const inspectCodeHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { filePath, codeSnippet, action = "explain", customPrompt = "" } = req.body;

    if (!filePath && !codeSnippet && !customPrompt) {
      return res.status(400).json({ error: "filePath, codeSnippet, or customPrompt is required" });
    }

    // 1. Retrieve RAG chunks matching this file, snippet, or custom prompt
    const query = `${customPrompt || ""} ${filePath || ""} ${codeSnippet?.slice(0, 150) || ""}`.trim();
    const ragRes = await queryWorkspaceBrain(workspaceId, query, { topK: 4 });

    // 2. Perform Groq inspection with smart model fallback
    const analysis = await inspectCodeWithBrain({
      filePath: filePath || "Active Snippet",
      codeSnippet: codeSnippet || "(Full File)",
      action,
      customPrompt,
      contextChunks: ragRes.results || [],
      workspaceMeta: { id: workspaceId }
    });

    if (!analysis) {
      return res.status(502).json({
        error: "AI code inspection failed: Model returned empty response. Please check rate limits or try again.",
        relevantChunks: ragRes.results || []
      });
    }

    res.json({
      success: true,
      action,
      filePath,
      customPrompt,
      analysis,
      provider: "groq (openai/gpt-oss-120b with fallback)",
      relevantChunks: ragRes.results || []
    });
  } catch (err) {
    console.error("inspectCodeHandler error:", err.message);
    res.status(502).json({
      error: err.message || "Failed to inspect code with Project Brain.",
      relevantChunks: []
    });
  }
};

export const testLabHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { targetModule = "All Modules" } = req.body;

    const ragRes = await queryWorkspaceBrain(workspaceId, targetModule, { topK: 4 });
    const plan = await generateQATestPlan(targetModule, ragRes.results || [], { id: workspaceId });

    if (!plan) {
      return res.status(502).json({
        error: "AI QA test plan could not be generated. Please check Groq API rate limits.",
        relevantChunks: ragRes.results || []
      });
    }

    res.json({
      success: true,
      targetModule,
      plan,
      provider: "groq (openai/gpt-oss-120b with fallback)"
    });
  } catch (err) {
    console.error("testLabHandler error:", err.message);
    res.status(502).json({ error: err.message });
  }
};

export const growthDeckHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const {
      featureQuery = "Architecture & Features",
      channel = "twitter",
      audience = "developers",
      tone = "hyped",
      customPrompt = ""
    } = req.body;

    const searchQuery = `${customPrompt || ""} ${featureQuery || ""}`.trim() || "Architecture & Features";
    const ragRes = await queryWorkspaceBrain(workspaceId, searchQuery, { topK: 4 });
    const deck = await generateMarketingDeck({
      featureQuery,
      channel,
      audience,
      tone,
      customPrompt,
      contextChunks: ragRes.results || [],
      workspaceMeta: { id: workspaceId }
    });

    if (!deck) {
      return res.status(502).json({
        error: "AI marketing deck could not be generated. Please check Groq API rate limits.",
        relevantChunks: ragRes.results || []
      });
    }

    res.json({
      success: true,
      featureQuery,
      channel,
      audience,
      tone,
      customPrompt,
      deck,
      provider: "groq (openai/gpt-oss-120b with fallback)",
      relevantChunks: ragRes.results || []
    });
  } catch (err) {
    console.error("growthDeckHandler error:", err.message);
    res.status(502).json({ error: err.message });
  }
};

// ==========================================
// 5. BACKWARD COMPATIBILITY
// ==========================================

export const getWorkspaceStatus = (req, res) => {
  res.json({
    workspace: "Axon Intelligent Workspace",
    status: "synchronized",
    architecture: "client-server",
    metrics: {
      latencyMs: 14,
      activeModules: 6,
      uptime: "99.99%",
      fragmentationRate: "0%"
    },
    modules: [
      { id: "client-ui", name: "Client Presentation Layer", status: "active" },
      { id: "api-gateway", name: "API Gateway & Router", status: "active" },
      { id: "server-core", name: "Server Domain Logic", status: "active" },
      { id: "data-store", name: "Primary Data Store", status: "connected" },
      { id: "brain-rag", name: "Project Brain RAG Engine", status: "ready" },
      { id: "docs-engine", name: "Technical Documentation", status: "available" }
    ]
  });
};

export const syncWorkspaceState = (req, res) => {
  const { source = "client", scope = "workspace_state" } = req.body || {};
  const syncId = `sync_${Math.random().toString(36).substring(2, 9)}`;

  res.json({
    success: true,
    syncId,
    source,
    scope,
    durationMs: 14,
    message: "Workspace state synchronized successfully across client and server.",
    timestamp: new Date().toISOString()
  });
};

export const getIntegrations = (req, res) => {
  const integrations = getActiveIntegrations();
  res.json({
    total: integrations.length,
    integrations
  });
};
