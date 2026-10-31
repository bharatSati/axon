import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Workspace } from "../models/Workspace.js";
import { callGroqChat, sanitizeAIOutput } from "./rag/groqService.js";
import { queryWorkspaceBrain } from "./rag/ragQueryService.js";
import { getUserGitHubToken } from "../controllers/authController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const REPO_CACHE_DIR = path.resolve(projectRoot, "server/data/repo_cache");

/**
 * Ensure workspace directory is cloned and un-shallowed for deep historical intelligence
 */
export async function ensureWorkspaceRepo(workspaceId, userToken = null) {
  const workspace = await Workspace.findOne({ id: workspaceId }).lean();
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  if (!workspace.repository) {
    return { workspace, hasRepo: false, error: "No GitHub repository connected to this workspace." };
  }

  const { owner, name: repoName, defaultBranch = "main" } = workspace.repository;

  if (!fs.existsSync(REPO_CACHE_DIR)) {
    fs.mkdirSync(REPO_CACHE_DIR, { recursive: true });
  }

  const wsCacheDir = path.join(REPO_CACHE_DIR, workspaceId);

  // Authenticated git URL if token provided
  const token = userToken || (await getUserGitHubToken(workspace.ownerId));
  const gitUrl = token
    ? `https://x-access-token:${token}@github.com/${owner}/${repoName}.git`
    : `https://github.com/${owner}/${repoName}.git`;

  try {
    if (fs.existsSync(path.join(wsCacheDir, ".git"))) {
      // Check if shallow and unshallow if needed
      const isShallow = fs.existsSync(path.join(wsCacheDir, ".git", "shallow"));
      if (isShallow) {
        try {
          execSync(`git -C "${wsCacheDir}" fetch --unshallow`, { stdio: "ignore", timeout: 25000 });
        } catch (e) {
          // If unshallow fails (e.g. already complete or network glitch), proceed
        }
      }
    } else {
      if (fs.existsSync(wsCacheDir)) {
        fs.rmSync(wsCacheDir, { recursive: true, force: true });
      }
      // Clone without shallow filter to preserve complete commit history for Time Machine
      execSync(
        `git clone --filter=blob:none -b ${defaultBranch} "${gitUrl}" "${wsCacheDir}"`,
        { stdio: "ignore", timeout: 35000 }
      );
    }

    return { workspace, hasRepo: true, cacheDir: wsCacheDir, repo: workspace.repository };
  } catch (err) {
    console.warn(`Time Machine git cache error for ${workspaceId}:`, err.message);
    if (fs.existsSync(path.join(wsCacheDir, ".git"))) {
      return { workspace, hasRepo: true, cacheDir: wsCacheDir, repo: workspace.repository };
    }
    throw new Error(`Could not synchronize Git history for repository ${owner}/${repoName}: ${err.message}`);
  }
}

/**
 * Parse standard ISO git dates into relative and formatted timestamps
 */
function formatCommitDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return {
      iso: dateStr,
      formatted: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    };
  } catch (e) {
    return { iso: dateStr, formatted: dateStr, time: "" };
  }
}

/**
 * Categorize a file path into an architectural layer
 */
export function detectArchitectureLayer(filePath = "") {
  const p = filePath.toLowerCase();
  if (p.includes("/models/") || p.includes("schema") || p.includes("prisma") || p.includes("migrations/") || p.includes("/db.") || p.includes("/database.")) {
    return "database";
  }
  if (p.includes("auth") || p.includes("jwt") || p.includes("oauth") || p.includes("security") || p.includes("passport") || p.includes("bcrypt") || p.includes("rbac")) {
    return "auth";
  }
  if (p.includes("/services/") || p.includes("/workers/") || p.includes("/jobs/") || p.includes("/queues/")) {
    return "services";
  }
  if (p.includes("/controllers/") || p.includes("/routes/") || p.includes("/api/") || p.includes("/endpoints/")) {
    return "api";
  }
  if (p.includes("package.json") || p.includes("package-lock") || p.includes("docker") || p.includes("vite.config") || p.includes(".env")) {
    return "config";
  }
  if (p.includes("/components/") || p.includes("/views/") || p.includes("/pages/") || p.includes("frontend/") || p.includes("client/") || p.endsWith(".jsx") || p.endsWith(".tsx") || p.endsWith(".css")) {
    return "frontend";
  }
  if (p.includes("readme") || p.includes("docs/") || p.endsWith(".md")) {
    return "docs";
  }
  return "core";
}

/**
 * Categorize commit type from message
 */
function detectCommitType(message = "") {
  const lower = message.toLowerCase().trim();
  if (lower.startsWith("feat")) return "feat";
  if (lower.startsWith("fix")) return "fix";
  if (lower.startsWith("refactor")) return "refactor";
  if (lower.startsWith("perf")) return "perf";
  if (lower.startsWith("docs")) return "docs";
  if (lower.startsWith("style") || lower.startsWith("ui")) return "ui";
  if (lower.startsWith("test")) return "test";
  if (lower.startsWith("chore")) return "chore";
  if (lower.includes("security") || lower.includes("rate limit") || lower.includes("auth")) return "security";
  return "update";
}

/**
 * 1. Fetch complete commit timeline for Time Machine
 */
export async function getWorkspaceCommitTimeline(workspaceId, { limit = 80, branch = "main" } = {}, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error, commits: [] };
  }

  const { cacheDir, repo } = repoInfo;

  try {
    // Delimiter unit separator \x1f
    const logOutput = execSync(
      `git -C "${cacheDir}" log -n ${limit} --format='%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s' --date=iso`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = logOutput.trim().split("\n").filter(Boolean);
    const commits = lines.map((line, index) => {
      const [sha, shortSha, author, email, date, message] = line.split("\x1f");
      const dateInfo = formatCommitDate(date);
      return {
        index,
        sha,
        shortSha: shortSha || sha.substring(0, 7),
        author: author || "Developer",
        email: email || "",
        date: dateInfo.formatted,
        time: dateInfo.time,
        rawDate: date,
        message: message || "Commit",
        type: detectCommitType(message)
      };
    });

    return {
      success: true,
      workspaceId,
      repository: {
        name: repo.name,
        fullName: repo.fullName,
        owner: repo.owner,
        defaultBranch: repo.defaultBranch || branch
      },
      totalCommits: commits.length,
      commits
    };
  } catch (err) {
    console.error("getWorkspaceCommitTimeline error:", err);
    throw new Error(`Failed to retrieve commit timeline: ${err.message}`);
  }
}

/**
 * 2. Fetch complete project snapshot at a specific commit
 */
export async function getWorkspaceCommitSnapshot(workspaceId, sha, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error };
  }

  const { cacheDir } = repoInfo;
  const targetSha = sha?.trim();
  if (!targetSha) throw new Error("Commit SHA is required");

  try {
    // 1. Commit Metadata
    const showHeader = execSync(
      `git -C "${cacheDir}" show -s --format='%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%b' --date=iso ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();

    const [fullSha, shortSha, author, email, date, subject, body] = showHeader.split("\x1f");
    const dateInfo = formatCommitDate(date);

    // 2. Files Changed in this Commit (status & numstat)
    const nameStatus = execSync(
      `git -C "${cacheDir}" show --name-status --format='' ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();

    const numStat = execSync(
      `git -C "${cacheDir}" show --numstat --format='' ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();

    const numStatMap = {};
    numStat.split("\n").filter(Boolean).forEach((line) => {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        numStatMap[parts[2]] = {
          insertions: parseInt(parts[0], 10) || 0,
          deletions: parseInt(parts[1], 10) || 0
        };
      }
    });

    let totalInsertions = 0;
    let totalDeletions = 0;

    const changedFiles = nameStatus.split("\n").filter(Boolean).map((line) => {
      const [statusRaw, ...pathParts] = line.split(/\s+/);
      const filePath = pathParts.join(" ");
      const statusCode = (statusRaw || "M")[0];
      const statusMap = { A: "added", M: "modified", D: "deleted", R: "renamed" };
      const status = statusMap[statusCode] || "modified";

      const stats = numStatMap[filePath] || { insertions: 0, deletions: 0 };
      totalInsertions += stats.insertions;
      totalDeletions += stats.deletions;

      return {
        path: filePath,
        status,
        statusCode,
        insertions: stats.insertions,
        deletions: stats.deletions,
        layer: detectArchitectureLayer(filePath)
      };
    });

    // 3. Complete Tree at this Historical Commit
    const treeRaw = execSync(
      `git -C "${cacheDir}" ls-tree -r --name-only ${targetSha}`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    const treeFiles = treeRaw.split("\n").filter(Boolean).map((filePath) => ({
      path: filePath,
      name: path.basename(filePath),
      layer: detectArchitectureLayer(filePath)
    }));

    // Detect architectural milestone of this commit
    const milestone = detectMilestoneFromCommit({
      sha: fullSha,
      shortSha: shortSha || fullSha.substring(0, 7),
      message: subject,
      author,
      date: dateInfo.formatted,
      changedFiles
    });

    return {
      success: true,
      workspaceId,
      commit: {
        sha: fullSha,
        shortSha: shortSha || fullSha.substring(0, 7),
        author,
        email,
        date: dateInfo.formatted,
        time: dateInfo.time,
        rawDate: date,
        subject,
        body: body?.trim() || "",
        stats: {
          filesCount: changedFiles.length,
          insertions: totalInsertions,
          deletions: totalDeletions
        }
      },
      changedFiles,
      treeFiles,
      totalFilesInProject: treeFiles.length,
      milestone
    };
  } catch (err) {
    console.error("getWorkspaceCommitSnapshot error:", err);
    throw new Error(`Failed to fetch commit snapshot for ${targetSha}: ${err.message}`);
  }
}

/**
 * 3. Fetch exact historical file content at any commit
 */
export async function getHistoricalFileContent(workspaceId, sha, filePath, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error };
  }

  const { cacheDir } = repoInfo;
  const cleanPath = filePath.replace(/^\/+/, "");

  try {
    const content = execSync(`git -C "${cacheDir}" show ${sha}:"${cleanPath}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024
    });

    const ext = path.extname(cleanPath).toLowerCase();

    return {
      success: true,
      sha,
      path: cleanPath,
      name: path.basename(cleanPath),
      extension: ext,
      layer: detectArchitectureLayer(cleanPath),
      size: content.length,
      linesCount: content.split("\n").length,
      content
    };
  } catch (err) {
    throw new Error(`Could not read file "${cleanPath}" at commit ${sha}: ${err.message}`);
  }
}

/**
 * Helper to analyze single commit for architectural milestones
 */
function detectMilestoneFromCommit(commitInfo) {
  const { message = "", changedFiles = [] } = commitInfo;
  const lowerMsg = message.toLowerCase();

  const layersTouched = new Set(changedFiles.map((f) => f.layer));
  const filesAdded = changedFiles.filter((f) => f.status === "added").map((f) => f.path);

  // 1. Authentication & Security
  if (layersTouched.has("auth") || lowerMsg.includes("jwt") || lowerMsg.includes("auth") || lowerMsg.includes("oauth") || lowerMsg.includes("security") || lowerMsg.includes("rate limit")) {
    return {
      category: "AUTH_SECURITY",
      title: "Authentication & Security Architecture Revision",
      description: message,
      badge: "Auth & Security",
      color: "#ef4444",
      icon: "Shield"
    };
  }

  // 2. Database & Schema
  if (layersTouched.has("database") || lowerMsg.includes("schema") || lowerMsg.includes("mongo") || lowerMsg.includes("prisma") || lowerMsg.includes("model")) {
    return {
      category: "DATABASE",
      title: "Database Schema & Entity Model Update",
      description: message,
      badge: "Database",
      color: "#a855f7",
      icon: "Database"
    };
  }

  // 3. New Modules or Services
  const newServices = filesAdded.filter((f) => f.includes("/services/") || f.includes("/controllers/") || f.includes("/routes/") || f.includes("/workers/"));
  if (newServices.length > 0 || lowerMsg.includes("module") || lowerMsg.includes("service") || lowerMsg.includes("controller")) {
    return {
      category: "MODULE",
      title: "Service Module Introduction / Restructure",
      description: message,
      badge: "New Service",
      color: "#38bdf8",
      icon: "Cpu"
    };
  }

  // 4. API & Backend
  if (layersTouched.has("api") || lowerMsg.includes("api") || lowerMsg.includes("endpoint") || lowerMsg.includes("route")) {
    return {
      category: "API",
      title: "API Gateway & Router Evolution",
      description: message,
      badge: "API Architecture",
      color: "#10b981",
      icon: "Zap"
    };
  }

  // 5. Dependency Architecture
  const touchesPkg = changedFiles.some((f) => f.path.includes("package.json"));
  if (touchesPkg || lowerMsg.includes("dependency") || lowerMsg.includes("package") || lowerMsg.includes("npm")) {
    return {
      category: "DEPENDENCY",
      title: "Dependency Ecosystem Modification",
      description: message,
      badge: "Dependencies",
      color: "#f59e0b",
      icon: "Package"
    };
  }

  // 6. Presentation / Frontend Milestone
  if (layersTouched.has("frontend") && changedFiles.length >= 4) {
    return {
      category: "FRONTEND",
      title: "Client Experience & Spatial Architecture",
      description: message,
      badge: "Frontend Core",
      color: "#c8ff3d",
      icon: "Layers"
    };
  }

  return {
    category: "FEATURE",
    title: "Project Evolution Milestone",
    description: message,
    badge: "Evolution",
    color: "#6b7280",
    icon: "GitCommit"
  };
}

/**
 * 4. Architecture Evolution Timeline: analyzes entire history for milestones
 */
export async function getWorkspaceArchitectureEvolution(workspaceId, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error, milestones: [] };
  }

  const { cacheDir } = repoInfo;

  try {
    const logOutput = execSync(
      `git -C "${cacheDir}" log -n 50 --format='%H%x1f%h%x1f%an%x1f%ad%x1f%s' --date=iso`,
      { encoding: "utf-8" }
    ).trim();

    const commitLines = logOutput.split("\n").filter(Boolean);
    const milestones = [];

    let authCount = 0;
    let dbCount = 0;
    let moduleCount = 0;
    let depCount = 0;

    for (const line of commitLines) {
      const [sha, shortSha, author, date, subject] = line.split("\x1f");
      const dateInfo = formatCommitDate(date);

      // Check files touched for this commit
      let nameStatus = "";
      try {
        nameStatus = execSync(
          `git -C "${cacheDir}" show --name-status --format='' ${sha}`,
          { encoding: "utf-8", timeout: 4000 }
        ).trim();
      } catch (e) {}

      const changedFiles = nameStatus.split("\n").filter(Boolean).map((l) => {
        const [statusCode, ...pathParts] = l.split(/\s+/);
        const p = pathParts.join(" ");
        return {
          path: p,
          status: statusCode === "A" ? "added" : statusCode === "D" ? "deleted" : "modified",
          layer: detectArchitectureLayer(p)
        };
      });

      const milestone = detectMilestoneFromCommit({
        sha,
        shortSha,
        message: subject,
        author,
        date: dateInfo.formatted,
        changedFiles
      });

      if (milestone.category === "AUTH_SECURITY") authCount++;
      if (milestone.category === "DATABASE") dbCount++;
      if (milestone.category === "MODULE") moduleCount++;
      if (milestone.category === "DEPENDENCY") depCount++;

      milestones.push({
        id: `ms_${sha.substring(0, 7)}`,
        sha,
        shortSha,
        author,
        date: dateInfo.formatted,
        time: dateInfo.time,
        message: subject,
        filesTouched: changedFiles.length,
        layers: Array.from(new Set(changedFiles.map((f) => f.layer))),
        ...milestone
      });
    }

    return {
      success: true,
      workspaceId,
      totalCommits: commitLines.length,
      stats: {
        totalMilestones: milestones.length,
        authRevisions: authCount,
        databaseRevisions: dbCount,
        moduleRevisions: moduleCount,
        dependencyRevisions: depCount
      },
      milestones
    };
  } catch (err) {
    console.error("getWorkspaceArchitectureEvolution error:", err);
    throw new Error(`Failed to generate architecture evolution: ${err.message}`);
  }
}

/**
 * 5. Compare two historical commits (Version Comparison Engine)
 */
export async function compareWorkspaceVersions(workspaceId, baseSha, targetSha, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error };
  }

  const { cacheDir } = repoInfo;
  if (!baseSha || !targetSha) {
    throw new Error("Both baseSha and targetSha are required for comparison");
  }

  try {
    // 1. Commit metadata for both versions
    const baseInfo = execSync(
      `git -C "${cacheDir}" show -s --format='%H%x1f%h%x1f%an%x1f%ad%x1f%s' --date=iso ${baseSha}`,
      { encoding: "utf-8" }
    ).trim();
    const targetInfo = execSync(
      `git -C "${cacheDir}" show -s --format='%H%x1f%h%x1f%an%x1f%ad%x1f%s' --date=iso ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();

    const [bSha, bShort, bAuthor, bDate, bSubject] = baseInfo.split("\x1f");
    const [tSha, tShort, tAuthor, tDate, tSubject] = targetInfo.split("\x1f");

    // 2. Diff Name Status & NumStat
    const nameStatus = execSync(
      `git -C "${cacheDir}" diff --name-status ${baseSha} ${targetSha}`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    const numStat = execSync(
      `git -C "${cacheDir}" diff --numstat ${baseSha} ${targetSha}`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    const numStatMap = {};
    numStat.split("\n").filter(Boolean).forEach((line) => {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        numStatMap[parts[2]] = {
          insertions: parseInt(parts[0], 10) || 0,
          deletions: parseInt(parts[1], 10) || 0
        };
      }
    });

    let totalInsertions = 0;
    let totalDeletions = 0;
    const addedFiles = [];
    const modifiedFiles = [];
    const deletedFiles = [];
    const allFiles = [];

    nameStatus.split("\n").filter(Boolean).forEach((line) => {
      const [statusCode, ...pathParts] = line.split(/\s+/);
      const filePath = pathParts.join(" ");
      const statusChar = (statusCode || "M")[0];
      const stats = numStatMap[filePath] || { insertions: 0, deletions: 0 };

      totalInsertions += stats.insertions;
      totalDeletions += stats.deletions;

      const fileObj = {
        path: filePath,
        name: path.basename(filePath),
        layer: detectArchitectureLayer(filePath),
        insertions: stats.insertions,
        deletions: stats.deletions
      };

      if (statusChar === "A") {
        fileObj.status = "added";
        addedFiles.push(fileObj);
      } else if (statusChar === "D") {
        fileObj.status = "deleted";
        deletedFiles.push(fileObj);
      } else {
        fileObj.status = "modified";
        modifiedFiles.push(fileObj);
      }
      allFiles.push(fileObj);
    });

    // 3. Dependency Evolution Diffs (parse package.json at both commits)
    const dependencyDiff = await extractDependencyDiff(cacheDir, baseSha, targetSha);

    // 4. Generate AI Architectural Comparison with Groq 120B
    const aiSummary = await generateAIComparisonSummary({
      baseCommit: { sha: bShort, message: bSubject, author: bAuthor, date: formatCommitDate(bDate).formatted },
      targetCommit: { sha: tShort, message: tSubject, author: tAuthor, date: formatCommitDate(tDate).formatted },
      stats: { totalFiles: allFiles.length, insertions: totalInsertions, deletions: totalDeletions },
      addedFiles: addedFiles.map((f) => f.path),
      modifiedFiles: modifiedFiles.map((f) => f.path),
      deletedFiles: deletedFiles.map((f) => f.path),
      dependencyDiff
    });

    return {
      success: true,
      workspaceId,
      base: {
        sha: bSha,
        shortSha: bShort,
        author: bAuthor,
        date: formatCommitDate(bDate).formatted,
        message: bSubject
      },
      target: {
        sha: tSha,
        shortSha: tShort,
        author: tAuthor,
        date: formatCommitDate(tDate).formatted,
        message: tSubject
      },
      stats: {
        filesChanged: allFiles.length,
        addedCount: addedFiles.length,
        modifiedCount: modifiedFiles.length,
        deletedCount: deletedFiles.length,
        insertions: totalInsertions,
        deletions: totalDeletions
      },
      addedFiles,
      modifiedFiles,
      deletedFiles,
      allFiles,
      dependencyDiff,
      aiSummary
    };
  } catch (err) {
    console.error("compareWorkspaceVersions error:", err);
    throw new Error(`Comparison failed between ${baseSha} and ${targetSha}: ${err.message}`);
  }
}

/**
 * Extract dependency additions/removals between two commits by checking package.json
 */
async function extractDependencyDiff(cacheDir, baseSha, targetSha) {
  const result = { added: [], removed: [], changed: [] };

  const packagePaths = ["package.json", "backend/package.json", "server/package.json", "frontend/package.json", "client/package.json"];

  for (const pkgPath of packagePaths) {
    let basePkg = null;
    let targetPkg = null;

    try {
      const rawBase = execSync(`git -C "${cacheDir}" show ${baseSha}:"${pkgPath}"`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
      basePkg = JSON.parse(rawBase);
    } catch (e) {}

    try {
      const rawTarget = execSync(`git -C "${cacheDir}" show ${targetSha}:"${pkgPath}"`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
      targetPkg = JSON.parse(rawTarget);
    } catch (e) {}

    if (basePkg || targetPkg) {
      const baseDeps = { ...(basePkg?.dependencies || {}), ...(basePkg?.devDependencies || {}) };
      const targetDeps = { ...(targetPkg?.dependencies || {}), ...(targetPkg?.devDependencies || {}) };

      // Added in target
      for (const [dep, ver] of Object.entries(targetDeps)) {
        if (!baseDeps[dep]) {
          result.added.push({ name: dep, version: ver, location: pkgPath });
        } else if (baseDeps[dep] !== ver) {
          result.changed.push({ name: dep, from: baseDeps[dep], to: ver, location: pkgPath });
        }
      }

      // Removed in target
      for (const [dep, ver] of Object.entries(baseDeps)) {
        if (!targetDeps[dep]) {
          result.removed.push({ name: dep, version: ver, location: pkgPath });
        }
      }
    }
  }

  return result;
}

/**
 * Groq 120B AI Architectural Comparison Explainer
 */
async function generateAIComparisonSummary({ baseCommit, targetCommit, stats, addedFiles, modifiedFiles, deletedFiles, dependencyDiff }) {
  const systemPrompt = `You are the Axon Time Machine Architectural Intelligence Brain.
Analyze the differences between two repository versions.
Communicate in clean, natural, professional English without raw backslashes, escape symbols, or weird characters.
Focus on architectural impact:
1. Architectural Evolution Summary (what major engineering capability changed)
2. Modules, APIs, or Services Introduced or Restructured
3. Database & Authentication Impact
4. Dependency & Library Evolutions
Be factual, grounded, and concise.`;

  const userPrompt = `BASE VERSION: ${baseCommit.sha} (${baseCommit.date}) by ${baseCommit.author}
Commit: "${baseCommit.message}"

TARGET VERSION: ${targetCommit.sha} (${targetCommit.date}) by ${targetCommit.author}
Commit: "${targetCommit.message}"

CHANGE METRICS:
- Files Changed: ${stats.totalFiles} (+${stats.insertions} / -${stats.deletions})
- Added Files (${addedFiles.length}): ${addedFiles.slice(0, 15).join(", ") || "None"}
- Modified Files (${modifiedFiles.length}): ${modifiedFiles.slice(0, 15).join(", ") || "None"}
- Deleted Files (${deletedFiles.length}): ${deletedFiles.slice(0, 15).join(", ") || "None"}
- Dependency Changes: Added: ${dependencyDiff.added.map((d) => d.name).join(", ") || "None"}, Removed: ${dependencyDiff.removed.map((d) => d.name).join(", ") || "None"}

Please provide a clear architectural comparison breakdown explaining how the project evolved between these two versions.`;

  try {
    const answer = await callGroqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.2, max_tokens: 1100 }
    );
    return answer || "Architectural comparison synthesized from repository diff.";
  } catch (e) {
    return "Architectural comparison generated based on file and dependency modifications.";
  }
}

/**
 * 6. AI-Powered Historical Analysis: Ask questions about project evolution
 */
export async function askHistoricalIntelligence(workspaceId, question, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error };
  }

  const { cacheDir } = repoInfo;

  try {
    // 1. Fetch extensive git log (recent 45 commits)
    const logOutput = execSync(
      `git -C "${cacheDir}" log -n 45 --format='%h | %ad | %an | %s' --date=short`,
      { encoding: "utf-8" }
    ).trim();

    // 2. Search commit messages and diffs for keywords in question
    const keywords = question
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);

    let specificMatches = "";
    if (keywords.length > 0) {
      for (const kw of keywords) {
        try {
          const matchLog = execSync(
            `git -C "${cacheDir}" log --grep="${kw}" -i -n 5 --oneline`,
            { encoding: "utf-8", timeout: 3000 }
          ).trim();
          if (matchLog) {
            specificMatches += `\n[COMMITS MATCHING KEYWORD "${kw}"]:\n${matchLog}\n`;
          }
        } catch (e) {}
      }
    }

    const systemPrompt = `You are the Axon Time Machine Historical Intelligence Copilot.
You answer developer questions about the repository's history, architecture evolution, and code modifications.
COMMUNICATION RULES:
- Write in clean, professional English without raw backslashes or strange symbol clutter.
- GROUND EVERY REASONING STRICTLY IN COMMITS, DATES, AUTHORS, AND CODE EVIDENCE.
- NEVER INVENT REASONS WHEN SUPPORTING EVIDENCE IS UNAVAILABLE. If a commit message is short or does not state "why", explicitly state that the exact reason was not documented in the commit log.
- Cite specific commit hashes (e.g., 202e756), author names, and dates whenever answering.`;

    const userPrompt = `DEVELOPER'S HISTORICAL QUESTION:
"${question}"

REPOSITORY COMMIT TIMELINE & EVIDENCE:
${logOutput}

${specificMatches ? `RELEVANT KEYWORD SEARCH RESULTS:\n${specificMatches}` : ""}

Please provide an accurate, grounded historical explanation answering the developer's question.`;

    const answer = await callGroqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.2, max_tokens: 1200 }
    );

    return {
      success: true,
      question,
      answer: answer || "Historical intelligence synthesized from repository commit logs.",
      provider: "groq (openai/gpt-oss-120b)"
    };
  } catch (err) {
    console.error("askHistoricalIntelligence error:", err);
    throw new Error(`Failed to query historical intelligence: ${err.message}`);
  }
}

/**
 * 7. Plain-Language Commit Explanation with RAG Project Brain Context
 */
export async function explainCommitWithBrain(workspaceId, sha, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error };
  }

  const { cacheDir } = repoInfo;
  const targetSha = sha?.trim();
  if (!targetSha) throw new Error("Commit SHA is required");

  try {
    // 1. Commit metadata
    const showHeader = execSync(
      `git -C "${cacheDir}" show -s --format='%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%b' --date=iso ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();
    const [fullSha, shortSha, author, date, subject, body] = showHeader.split("\x1f");

    // 2. Diff and changed files
    const patchRaw = execSync(
      `git -C "${cacheDir}" show -p --stat ${targetSha}`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
    // Limit diff patch to 12,000 characters so it fits LLM context comfortably
    const truncatedPatch = patchRaw.slice(0, 12000);

    const nameStatus = execSync(
      `git -C "${cacheDir}" show --name-status --format='' ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();
    const changedFiles = nameStatus.split("\n").filter(Boolean).map((l) => {
      const [statusCode, ...pathParts] = l.split(/\s+/);
      const p = pathParts.join(" ");
      return {
        path: p,
        status: statusCode === "A" ? "added" : statusCode === "D" ? "deleted" : "modified",
        layer: detectArchitectureLayer(p)
      };
    });

    // 3. Query RAG Project Brain for context on the changed files and subject
    const ragQuery = `${subject} ${changedFiles.map((f) => path.basename(f.path)).join(" ")}`.trim();
    let ragChunks = [];
    try {
      const ragRes = await queryWorkspaceBrain(workspaceId, ragQuery, { topK: 4 });
      if (ragRes?.results) ragChunks = ragRes.results;
    } catch (e) {
      console.warn("RAG query notice during commit explanation:", e.message);
    }

    const formattedRAG = ragChunks
      .slice(0, 4)
      .map((c, i) => `--- [PROJECT BRAIN CONTEXT ${i + 1}: ${c.filePath}] ---\n${c.content}`)
      .join("\n\n");

    const systemPrompt = `You are the Axon Commit Evolution Explainer.
Your job is to translate complex code diffs, git patches, and repository commits into clear, natural, plain English that any developer or architect can instantly understand.
COMMUNICATION RULES:
- Write in clean, professional English without raw backslashes, escape symbols, or weird symbol clutter.
- Never output raw backslashes (\\) or escaped markdown like \\_ or \\*.
- Format clearly with clean headings, concise bullet points, and code references.

STRUCTURE YOUR BREAKDOWN:
1. Summary in Plain English (What this commit actually does in simple terms)
2. Detailed File & Code Changes (Explain what was added, removed, or refactored in each file)
3. Architectural & System Impact (How this change impacts routes, database, security, UI, or performance based on Project Brain context)
4. Developer Intent / Why this Change Matters (Inferred from commit message and code patterns; do not make up ungrounded facts)`;

    const userPrompt = `COMMIT METADATA:
- Hash: ${shortSha} (${fullSha})
- Author: ${author}
- Date: ${formatCommitDate(date).formatted}
- Message: "${subject}"
${body ? `- Body: "${body.trim()}"` : ""}

FILES TOUCHED (${changedFiles.length}):
${changedFiles.map((f) => `- [${f.status.toUpperCase()}] ${f.path} (${f.layer})`).join("\n")}

PROJECT BRAIN ARCHITECTURAL CONTEXT:
${formattedRAG || "Standard workspace architecture."}

GIT DIFF PATCH:
\`\`\`diff
${truncatedPatch}
\`\`\`

Explain what was changed in this commit in plain English:`;

    const explanation = await callGroqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.25, max_tokens: 1300 }
    );

    return {
      success: true,
      sha: fullSha,
      shortSha,
      author,
      date: formatCommitDate(date).formatted,
      message: subject,
      explanation: explanation || "Commit changes explained based on code diff and Project Brain context.",
      relevantChunks: ragChunks
    };
  } catch (err) {
    console.error("explainCommitWithBrain error:", err);
    throw new Error(`Failed to explain commit ${sha}: ${err.message}`);
  }
}

/**
 * 8. Ask specific questions about a single historical commit with RAG context
 */
export async function askQuestionAboutCommit(workspaceId, sha, question, token = null) {
  const repoInfo = await ensureWorkspaceRepo(workspaceId, token);
  if (!repoInfo.hasRepo) {
    return { success: false, error: repoInfo.error };
  }

  const { cacheDir } = repoInfo;
  const targetSha = sha?.trim();
  if (!targetSha) throw new Error("Commit SHA is required");
  if (!question || !question.trim()) throw new Error("Question is required");

  try {
    // 1. Commit metadata
    const showHeader = execSync(
      `git -C "${cacheDir}" show -s --format='%H%x1f%h%x1f%an%x1f%ad%x1f%s' --date=iso ${targetSha}`,
      { encoding: "utf-8" }
    ).trim();
    const [fullSha, shortSha, author, date, subject] = showHeader.split("\x1f");

    // 2. Git diff
    const patchRaw = execSync(
      `git -C "${cacheDir}" show -p --stat ${targetSha}`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
    const truncatedPatch = patchRaw.slice(0, 10000);

    // 3. RAG context for question + commit
    let ragChunks = [];
    try {
      const ragRes = await queryWorkspaceBrain(workspaceId, `${question} ${subject}`, { topK: 3 });
      if (ragRes?.results) ragChunks = ragRes.results;
    } catch (e) {}

    const formattedRAG = ragChunks
      .slice(0, 3)
      .map((c, i) => `--- [PROJECT BRAIN CONTEXT ${i + 1}: ${c.filePath}] ---\n${c.content}`)
      .join("\n\n");

    const systemPrompt = `You are the Axon Commit Intelligence Assistant.
You answer specific developer questions about a single historical commit.
COMMUNICATION RULES:
- Write in clean, professional English without raw backslashes or strange symbol clutter.
- GROUND EVERY REASONING STRICTLY IN THIS COMMIT'S DIFF, MESSAGE, AUTHOR, AND PROJECT BRAIN CONTEXT.
- If the diff or commit does not contain enough information to answer definitively, state what can be confirmed from the code and what remains unknown.`;

    const userPrompt = `TARGET COMMIT:
Hash: ${shortSha} (${fullSha})
Author: ${author} | Date: ${formatCommitDate(date).formatted}
Message: "${subject}"

DEVELOPER'S QUESTION ABOUT THIS COMMIT:
"${question.trim()}"

GIT DIFF PATCH FOR THIS COMMIT:
\`\`\`diff
${truncatedPatch}
\`\`\`

PROJECT BRAIN REPOSITORY CONTEXT:
${formattedRAG || "Standard repository context."}

Please answer the developer's question about this commit accurately:`;

    const answer = await callGroqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.2, max_tokens: 1100 }
    );

    return {
      success: true,
      sha: fullSha,
      shortSha,
      question: question.trim(),
      answer: answer || "Answer synthesized from commit diff and Project Brain.",
      relevantChunks: ragChunks
    };
  } catch (err) {
    console.error("askQuestionAboutCommit error:", err);
    throw new Error(`Failed to answer question about commit ${sha}: ${err.message}`);
  }
}
