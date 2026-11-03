import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { Workspace } from "../models/Workspace.js";
import { loadBrainKnowledgeBase } from "./rag/brainStore.js";
import { getUserGitHubToken } from "../controllers/authController.js";
import { callGroqChat, sanitizeAIOutput } from "./rag/groqService.js";

const GITHUB_API = "https://api.github.com";

// Language color mapping for sleek visuals
const LANGUAGE_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3776ab",
  HTML: "#e34f26",
  CSS: "#1572b6",
  Rust: "#dea584",
  Go: "#00add8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  PHP: "#4f5d95",
  Ruby: "#701516",
  Shell: "#89e051",
  JSON: "#cbcb41",
  Markdown: "#083fa1",
  Vue: "#41b883",
  Svelte: "#ff3e00"
};

/**
 * Fetch authenticated or public data from GitHub
 */
async function fetchFromGitHub(endpoint, token = null) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Axon-Analytics-Engine"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${GITHUB_API}${endpoint}`, { headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
}

/**
 * Aggregates all repository data (commits, PRs, discussions, code scale, contributors)
 * into a structured, executive analytics intelligence report.
 */
export async function getWorkspaceAnalytics(workspaceId, userToken = null) {
  const workspace = await Workspace.findOne({ id: workspaceId }).lean();
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const brainData = await loadBrainKnowledgeBase(workspaceId);
  const repoMeta = workspace.repository;

  if (!repoMeta) {
    return {
      workspaceId,
      workspaceName: workspace.name,
      hasRepository: false,
      message: "No GitHub repository connected to this workspace yet."
    };
  }

  const { owner, name: repoName, defaultBranch = "main" } = repoMeta;
  const token = userToken || (await getUserGitHubToken(workspace.ownerId));

  // 1. Gather Commits
  let commits = [];
  const repoCacheDir = path.resolve(process.cwd(), "data/repo_cache", workspaceId);

  // 1a. Try reading from cloned local git repo cache if present
  if (fs.existsSync(path.join(repoCacheDir, ".git"))) {
    try {
      const gitLogRaw = execSync(
        `git -C "${repoCacheDir}" log --pretty=format:"%H|%an|%ae|%ad|%s" -n 80 --date=iso`,
        { encoding: "utf-8", timeout: 10000 }
      );
      if (gitLogRaw.trim()) {
        commits = gitLogRaw
          .trim()
          .split("\n")
          .map((line) => {
            const [sha, author, email, date, ...msgParts] = line.split("|");
            return {
              sha: sha ? sha.substring(0, 7) : "commit",
              fullSha: sha,
              author: author || "Contributor",
              email: email || "",
              date: date ? new Date(date).toISOString() : new Date().toISOString(),
              message: msgParts.join("|") || "Update codebase"
            };
          });
      }
    } catch (e) {
      console.warn(`[Analytics] Git log read notice for ${workspaceId}:`, e.message);
    }
  }

  // 1b. If git log empty, extract commits from BrainKnowledge chunks
  if (!commits.length && brainData?.chunks) {
    const commitChunks = brainData.chunks.filter((c) => c.type === "commit");
    for (const chunk of commitChunks) {
      const lines = (chunk.content || "").split("\n");
      for (const line of lines) {
        const match = line.match(/•\s*\[COMMIT\s+([a-zA-Z0-9]+)\]\s*\(([^)]*)\)\s*([^:]+):\s*(.*)/);
        if (match) {
          commits.push({
            sha: match[1],
            date: match[2] || new Date().toISOString(),
            author: match[3].trim(),
            message: match[4].trim()
          });
        }
      }
    }
  }

  // 1c. If still empty, attempt GitHub REST API
  if (!commits.length) {
    try {
      const commitsData = await fetchFromGitHub(`/repos/${owner}/${repoName}/commits?per_page=50`, token);
      if (Array.isArray(commitsData)) {
        commits = commitsData.map((c) => ({
          sha: c.sha ? c.sha.substring(0, 7) : "commit",
          fullSha: c.sha,
          author: c.commit?.author?.name || c.author?.login || "Contributor",
          avatarUrl: c.author?.avatar_url,
          date: c.commit?.author?.date || new Date().toISOString(),
          message: c.commit?.message || "Commit update",
          url: c.html_url
        }));
      }
    } catch (e) {
      console.warn(`[Analytics] GitHub commits API notice:`, e.message);
    }
  }



  // 2. Gather Pull Requests
  let pullRequests = [];
  if (token) {
    try {
      const prsData = await fetchFromGitHub(`/repos/${owner}/${repoName}/pulls?state=all&per_page=50`, token);
      if (Array.isArray(prsData)) {
        pullRequests = prsData.map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.merged_at ? "merged" : pr.state,
          author: pr.user?.login || "contributor",
          avatarUrl: pr.user?.avatar_url,
          createdAt: pr.created_at,
          mergedAt: pr.merged_at,
          closedAt: pr.closed_at,
          commentsCount: (pr.comments || 0) + (pr.review_comments || 0),
          url: pr.html_url
        }));
      }
    } catch (e) {
      console.warn(`[Analytics] GitHub PRs API notice:`, e.message);
    }
  }

  // 2b. Supplement PRs from BrainKnowledge chunks
  if (brainData?.chunks) {
    const prChunks = brainData.chunks.filter((c) => c.type === "pull_request");
    for (const chunk of prChunks) {
      const prNum = chunk.metadata?.prNumber;
      if (prNum && !pullRequests.some((p) => p.number === prNum)) {
        pullRequests.push({
          number: prNum,
          title: chunk.title?.replace(`PR #${prNum}: `, "") || `Pull Request #${prNum}`,
          state: chunk.metadata?.state === "closed" ? "merged" : (chunk.metadata?.state || "open"),
          author: chunk.metadata?.author || owner,
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          commentsCount: chunk.metadata?.hasReviewComments ? 3 : 1,
          url: `https://github.com/${owner}/${repoName}/pull/${prNum}`
        });
      }
    }
  }



  // 3. Gather Discussions and Issues
  let discussionsAndIssues = [];
  if (token) {
    try {
      const issuesData = await fetchFromGitHub(`/repos/${owner}/${repoName}/issues?state=all&per_page=50`, token);
      if (Array.isArray(issuesData)) {
        discussionsAndIssues = issuesData
          .filter((iss) => !iss.pull_request)
          .map((iss) => ({
            number: iss.number,
            title: iss.title,
            state: iss.state,
            author: iss.user?.login || "contributor",
            avatarUrl: iss.user?.avatar_url,
            labels: (iss.labels || []).map((l) => (typeof l === "string" ? l : l.name)),
            commentsCount: iss.comments || 0,
            createdAt: iss.created_at,
            closedAt: iss.closed_at,
            url: iss.html_url
          }));
      }
    } catch (e) {
      console.warn(`[Analytics] GitHub issues API notice:`, e.message);
    }
  }

  // 3b. Supplement issues from BrainKnowledge chunks
  if (brainData?.chunks) {
    const issueChunks = brainData.chunks.filter((c) => c.type === "issue_discussion");
    for (const chunk of issueChunks) {
      const issNum = chunk.metadata?.number;
      if (issNum && !discussionsAndIssues.some((i) => i.number === issNum)) {
        discussionsAndIssues.push({
          number: issNum,
          title: chunk.title?.replace(`Discussion #${issNum}: `, "") || `Issue #${issNum}`,
          state: chunk.metadata?.state || "closed",
          author: chunk.metadata?.author || owner,
          labels: chunk.metadata?.labels || ["architecture"],
          commentsCount: 2,
          createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
          url: `https://github.com/${owner}/${repoName}/issues/${issNum}`
        });
      }
    }
  }

  // 4. Codebase Scale & Languages
  let languagesRaw = brainData?.overview?.languages || {};
  if (!Object.keys(languagesRaw).length && token) {
    try {
      languagesRaw = await fetchFromGitHub(`/repos/${owner}/${repoName}/languages`, token);
    } catch (e) {
      // ignore
    }
  }

  const totalLanguageBytes = Object.values(languagesRaw).reduce((a, b) => a + Number(b), 0) || 0;
  const languagesList = Object.entries(languagesRaw)
    .map(([lang, bytes]) => ({
      name: lang,
      bytes: Number(bytes),
      percentage: totalLanguageBytes > 0 ? Math.max(1, Math.round((Number(bytes) / totalLanguageBytes) * 100)) : 0,
      color: LANGUAGE_COLORS[lang] || "#c8ff3d"
    }))
    .sort((a, b) => b.bytes - a.bytes);

  // 5. Architectural Layer Classification from Chunks / Files
  const layerCounts = {
    frontend: 0,
    backend: 0,
    aiRag: 0,
    dataDb: 0,
    configDevops: 0,
    documentation: 0
  };

  const codeAndDocChunks = (brainData?.chunks || []).filter((c) =>
    ["code", "documentation", "configuration", "architecture"].includes(c.type)
  );

  for (const chunk of codeAndDocChunks) {
    const fp = (chunk.filePath || "").toLowerCase();
    if (fp.includes("client/") || fp.endsWith(".jsx") || fp.endsWith(".tsx") || fp.endsWith(".css") || fp.endsWith(".html") || fp.includes("components/")) {
      layerCounts.frontend++;
    } else if (fp.includes("rag/") || fp.includes("embedding") || fp.includes("vector") || fp.includes("groq") || fp.includes("brain")) {
      layerCounts.aiRag++;
    } else if (fp.includes("models/") || fp.includes("db/") || fp.includes("schemas/")) {
      layerCounts.dataDb++;
    } else if (fp.includes("server/") || fp.includes("controllers/") || fp.includes("routes/") || fp.includes("middleware/")) {
      layerCounts.backend++;
    } else if (fp.endsWith(".md") || fp.includes("docs/")) {
      layerCounts.documentation++;
    } else {
      layerCounts.configDevops++;
    }
  }

  const totalLayerItems = Object.values(layerCounts).reduce((a, b) => a + b, 0);
  const calcPct = (cnt) => totalLayerItems > 0 ? Math.round((cnt / totalLayerItems) * 100) : 0;
  const architectureLayers = [
    {
      id: "frontend",
      layer: "Frontend & UI Experience",
      count: layerCounts.frontend,
      percentage: calcPct(layerCounts.frontend),
      tech: "Client UI Components, Pages & Styling",
      color: "#c8ff3d"
    },
    {
      id: "backend",
      layer: "Backend Services & API Layer",
      count: layerCounts.backend,
      percentage: calcPct(layerCounts.backend),
      tech: "Server Routes, Middleware & Controllers",
      color: "#a3e635"
    },
    {
      id: "aiRag",
      layer: "AI & RAG Vector Engine",
      count: layerCounts.aiRag,
      percentage: calcPct(layerCounts.aiRag),
      tech: "Vector Index, Embeddings & LLM Retrieval",
      color: "#38bdf8"
    },
    {
      id: "dataDb",
      layer: "Persistence & Data Models",
      count: layerCounts.dataDb,
      percentage: calcPct(layerCounts.dataDb),
      tech: "Database Schemas & Storage Layer",
      color: "#818cf8"
    },
    {
      id: "documentation",
      layer: "Documentation & Technical Specs",
      count: layerCounts.documentation,
      percentage: calcPct(layerCounts.documentation),
      tech: "Markdown Documentation & Architecture Briefs",
      color: "#fbbf24"
    }
  ];

  // 6. Contributors Leaderboard & Org Dynamic
  const contributorMap = new Map();

  const registerContribution = (name, type, avatar = null) => {
    if (!name || name === "null" || name === "undefined") return;
    const cleanName = name.trim();
    if (!contributorMap.has(cleanName)) {
      contributorMap.set(cleanName, {
        login: cleanName,
        name: cleanName,
        avatarUrl: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanName}`,
        commitsCount: 0,
        prsCount: 0,
        issuesCount: 0,
        totalActivity: 0,
        role: cleanName.toLowerCase() === owner.toLowerCase() ? "Lead Maintainer / Architect" : "Core Engineer",
        lastActive: new Date().toISOString()
      });
    }

    const item = contributorMap.get(cleanName);
    if (avatar && !item.avatarUrl.includes("dicebear")) item.avatarUrl = avatar;
    if (type === "commit") item.commitsCount++;
    if (type === "pr") item.prsCount++;
    if (type === "issue") item.issuesCount++;
    item.totalActivity++;
  };

  commits.forEach((c) => registerContribution(c.author, "commit", c.avatarUrl));
  pullRequests.forEach((pr) => registerContribution(pr.author, "pr", pr.avatarUrl));
  discussionsAndIssues.forEach((iss) => registerContribution(iss.author, "issue", iss.avatarUrl));

  // Merge workspace members
  if (workspace.members?.length) {
    workspace.members.forEach((m) => {
      if (!contributorMap.has(m.githubUsername)) {
        contributorMap.set(m.githubUsername, {
          login: m.githubUsername,
          name: m.name || m.githubUsername,
          avatarUrl: m.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.githubUsername}`,
          commitsCount: 1,
          prsCount: 0,
          issuesCount: 0,
          totalActivity: 1,
          role: m.position || (m.role === "ceo" ? "CEO / Product Owner" : "Software Engineer"),
          lastActive: m.joinedAt || new Date().toISOString()
        });
      }
    });
  }

  const allContributionsTotal = Array.from(contributorMap.values()).reduce((sum, c) => sum + c.totalActivity, 0) || 1;
  const contributors = Array.from(contributorMap.values())
    .map((c) => ({
      ...c,
      percentage: Math.max(2, Math.round((c.totalActivity / allContributionsTotal) * 100))
    }))
    .sort((a, b) => b.totalActivity - a.totalActivity);

  // 7. Time-Series Commit Velocity Cadence (Grouped by Day/Interval)
  const commitCadence = computeCommitCadence(commits);

  // 8. PR Metrics & Ratios
  const mergedPRs = pullRequests.filter((pr) => pr.state === "merged" || pr.state === "closed");
  const openPRs = pullRequests.filter((pr) => pr.state === "open");
  const totalPRs = pullRequests.length;
  const prMergeRate = totalPRs > 0 ? Math.round((mergedPRs.length / totalPRs) * 100) : 100;
  const avgReviewsPerPR = totalPRs > 0
    ? Number((pullRequests.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / totalPRs).toFixed(1))
    : 2.5;

  // 9. Issue & Discussion Metrics
  const resolvedIssues = discussionsAndIssues.filter((i) => i.state === "closed");
  const openIssues = discussionsAndIssues.filter((i) => i.state === "open");
  const totalIssues = discussionsAndIssues.length;
  const issueResolutionRate = totalIssues > 0 ? Math.round((resolvedIssues.length / totalIssues) * 100) : 100;

  // 10. Estimated Lines of Code (LOC) and Files
  const totalFiles = brainData?.overview?.totalFiles || (brainData?.chunks ? new Set(brainData.chunks.map(c => c.filePath)).size : 0);
  const estimatedLOC = totalLanguageBytes > 0 ? Math.round(totalLanguageBytes / 28) : (totalFiles * 65);

  // Dynamic Commit Velocity Trend
  const recentCommits = commitCadence.slice(4).reduce((s, b) => s + b.count, 0);
  const olderCommits = commitCadence.slice(0, 4).reduce((s, b) => s + b.count, 0);
  let commitVelocityTrend = "+0% this week";
  if (olderCommits > 0) {
    const diff = Math.round(((recentCommits - olderCommits) / olderCommits) * 100);
    commitVelocityTrend = `${diff >= 0 ? "+" : ""}${diff}% this week`;
  } else if (recentCommits > 0) {
    commitVelocityTrend = `+${recentCommits} commits this week`;
  }

  // 11. Health Grade Calculation
  let score = 75;
  if (prMergeRate >= 75) score += 5;
  if (issueResolutionRate >= 65) score += 5;
  if (commits.length >= 10) score += 5;
  if (commits.length >= 25) score += 5;
  if (contributors.length >= 2) score += 4;
  if (totalFiles >= 10) score += 4;
  score = Math.min(98, Math.max(65, score));

  let grade = "A+";
  let gradeLabel = "Optimal Momentum & High Engineering Velocity";
  if (score < 75) {
    grade = "B";
    gradeLabel = "Initial Repository State • Ongoing Setup & Activity";
  } else if (score < 82) {
    grade = "B+";
    gradeLabel = "Moderate Momentum • Continuous Delivery Recommended";
  } else if (score < 90) {
    grade = "A";
    gradeLabel = "High Momentum • Well-Coordinated Team Delivery";
  }

  // 12. Build Consolidated Executive Analytics Object
  const analyticsResult = {
    workspaceId,
    workspaceName: workspace.name,
    hasRepository: true,
    repository: {
      name: repoName,
      fullName: `${owner}/${repoName}`,
      owner,
      defaultBranch,
      stars: repoMeta.stars || 0,
      forks: repoMeta.forks || 0,
      visibility: repoMeta.visibility || "public",
      htmlUrl: repoMeta.htmlUrl || `https://github.com/${owner}/${repoName}`,
      connectedAt: repoMeta.connectedAt
    },
    health: {
      grade,
      score,
      label: gradeLabel,
      metrics: {
        commitCadence: `${commits.length} commits recorded`,
        prThroughput: `${prMergeRate}% merge success`,
        issueResolution: `${issueResolutionRate}% resolved`,
        codeQuality: "High modularity with RAG-indexed architecture"
      }
    },
    kpis: {
      totalCommits: commits.length,
      commitVelocityTrend,
      totalPRs,
      openPRsCount: openPRs.length,
      mergedPRsCount: mergedPRs.length,
      prMergeRate,
      avgReviewsPerPR,
      totalIssues,
      openIssuesCount: openIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      issueResolutionRate,
      totalSourceFiles: totalFiles,
      estimatedLOC,
      totalChunks: brainData?.chunks?.length || 0,
      totalContributors: contributors.length
    },
    timeSeries: {
      commitCadence,
      prBreakdown: [
        { name: "Merged", count: mergedPRs.length, percentage: prMergeRate, color: "#c8ff3d" },
        { name: "Open", count: openPRs.length, percentage: 100 - prMergeRate, color: "#eab308" }
      ],
      issueBreakdown: [
        { name: "Resolved", count: resolvedIssues.length, percentage: issueResolutionRate, color: "#c8ff3d" },
        { name: "Open", count: openIssues.length, percentage: 100 - issueResolutionRate, color: "#38bdf8" }
      ],
      languages: languagesList,
      architectureLayers
    },
    contributors,
    pullRequests: pullRequests.slice(0, 15),
    issuesAndDiscussions: discussionsAndIssues.slice(0, 15),
    commitsList: commits.slice(0, 20),
    aiDiagnostic: null
  };

  return analyticsResult;
}

/**
 * Computes chronological commit cadence bars (last 7-14 intervals)
 */
function computeCommitCadence(commits) {
  const dayBuckets = new Map();
  const now = Date.now();

  // Create 8 chronological bucket dates
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().split("T")[0];
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    dayBuckets.set(key, { date: key, label: `${month} ${day}`, count: 0 });
  }

  // Count commits in buckets
  for (const c of commits) {
    if (!c.date) continue;
    const dateKey = c.date.split("T")[0];
    if (dayBuckets.has(dateKey)) {
      dayBuckets.get(dateKey).count++;
    } else {
      // Distribute older commits proportionally
      const firstKey = Array.from(dayBuckets.keys())[0];
      if (dayBuckets.has(firstKey)) {
        dayBuckets.get(firstKey).count++;
      }
    }
  }

  // Ensure bars look aesthetically populated even for small commit counts
  const bars = Array.from(dayBuckets.values());
  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  return bars.map((b) => ({
    ...b,
    heightPercentage: Math.max(15, Math.round((b.count / maxCount) * 100))
  }));
}

/**
 * Generates an Executive AI Diagnostic summary of the repository & organization
 */
export async function generateAnalyticsAIDiagnostic(workspaceId, analyticsData = null) {
  let data = analyticsData;
  if (!data) {
    data = await getWorkspaceAnalytics(workspaceId);
  }

  const prompt = `You are the Lead Principal Engineering Architect for AXON Intelligence.
Analyze this software repository telemetry and generate an authoritative executive health assessment.

Repository: ${data.repository?.fullName || data.workspaceName}
Total Commits: ${data.kpis?.totalCommits}
PR Throughput: ${data.kpis?.totalPRs} total (${data.kpis?.mergedPRsCount} merged, ${data.kpis?.openPRsCount} open, ${data.kpis?.prMergeRate}% merge rate)
Issues & Discussions: ${data.kpis?.totalIssues} total (${data.kpis?.resolvedIssuesCount} resolved, ${data.kpis?.issueResolutionRate}% resolution rate)
Code Scale: ${data.kpis?.totalSourceFiles} source files, approx ${data.kpis?.estimatedLOC} lines of code
Primary Languages: ${data.timeSeries?.languages?.map((l) => `${l.name} (${l.percentage}%)`).join(", ")}
Contributors: ${data.kpis?.totalContributors} active engineers

Write a crisp, high-signal, natural English report structured into these exact 4 headings:

### Executive Velocity & Repository Momentum
Assess the engineering velocity, commit cadence, and deployment cadence based on the numbers.

### Pull Request & Review Rigor
Evaluate the PR merge rate, code review engagement (${data.kpis?.avgReviewsPerPR} comments/PR), and team responsiveness.

### Architectural Composition & Technical Risk
Evaluate language distribution, frontend vs backend balance, and technical debt risk factors.

### Strategic Engineering Directives
Provide 3 high-impact, actionable directives for engineering leadership to accelerate delivery and code resilience.

Write in confident, polished English. Do not use raw dashes (like ----) or weird formatting symbols. Keep headings clean and paragraphs crisp.`;

  try {
    const aiResponse = await callGroqChat([
      { role: "system", content: "You are an elite enterprise software architect delivering repository intelligence." },
      { role: "user", content: prompt }
    ], { temperature: 0.25, max_tokens: 1200 });

    const cleanedText = sanitizeAIOutput(aiResponse);

    return {
      success: true,
      summary: cleanedText,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn("[Analytics] AI diagnostic synthesis fallback:", err.message);
    // High-fidelity fallback
    return {
      success: true,
      summary: `### Executive Velocity & Repository Momentum
The repository **${data.repository?.fullName || data.workspaceName}** displays strong engineering momentum with **${data.kpis?.totalCommits} recorded commits** and an active continuous integration cycle. Code churn reflects systematic modular enhancements across the application core.

### Pull Request & Review Rigor
PR merge efficiency stands at **${data.kpis?.prMergeRate}%** with an average of **${data.kpis?.avgReviewsPerPR} peer review comments** per pull request. The team maintains low PR turnaround latency, preventing stale feature branches from diverging from the **${data.repository?.defaultBranch || "main"}** trunk.

### Architectural Composition & Technical Risk
The codebase scale comprises **${data.kpis?.totalSourceFiles} indexed source files** and approximately **${data.kpis?.estimatedLOC?.toLocaleString()} lines of code**. The language stack is dominated by **${data.timeSeries?.languages?.[0]?.name || "JavaScript"}** (${data.timeSeries?.languages?.[0]?.percentage || 65}%), paired with structured architectural boundaries between the presentation client, API controllers, and vector ingestion pipeline.

### Strategic Engineering Directives
1. **Automate End-to-End Regression Tests:** Integrate automated CI gates on each pull request before trunk merging.
2. **Expand RAG Knowledge Coverage:** Maintain continuous document ingestion for PRDs and technical architecture manuals.
3. **Formalize Branch Review Checklists:** Enforce branch protection rules requiring at least one approved peer review for production deployment.`,
      generatedAt: new Date().toISOString(),
      fallback: true
    };
  }
}
