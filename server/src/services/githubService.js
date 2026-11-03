import { getUserGitHubToken } from "../controllers/authController.js";

const GITHUB_API = "https://api.github.com";

// Helper to map raw GitHub repo object to clean schema
const mapRepoObject = (r) => ({
  id: r.id,
  name: r.name,
  fullName: r.full_name,
  owner: r.owner?.login || r.owner,
  ownerAvatar: r.owner?.avatar_url,
  description: r.description || "No description provided",
  defaultBranch: r.default_branch || "main",
  visibility: r.private ? "private" : "public",
  stars: r.stargazers_count || 0,
  forks: r.forks_count || 0,
  language: r.language || "Unknown",
  htmlUrl: r.html_url,
  updatedAt: r.updated_at
});

// Helper to make authenticated GitHub requests with automatic fallback on expired/invalid token
const fetchFromGitHub = async (endpoint, token) => {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Axon-Intelligent-Workspace"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${GITHUB_API}${endpoint}`, { headers });
  if (!res.ok) {
    // If token is invalid or expired (401), retry unauthenticated for public repositories
    if (res.status === 401 && token) {
      console.warn(`[GitHub API] Token expired or invalid (401) on ${endpoint}. Retrying unauthenticated...`);
      const unauthHeaders = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Axon-Intelligent-Workspace"
      };
      const retryRes = await fetch(`${GITHUB_API}${endpoint}`, { headers: unauthHeaders });
      if (retryRes.ok) {
        return retryRes.json();
      }
      const retryError = await retryRes.text();
      if (retryRes.status === 403 && retryError.includes("rate limit")) {
        throw new Error(`GitHub API rate limit exceeded (403). Please log in with GitHub again to refresh your personal access token.`);
      }
      throw new Error(`GitHub API Error [${retryRes.status}]: ${retryError}`);
    }

    const errorText = await res.text();
    if (res.status === 403 && errorText.includes("rate limit")) {
      throw new Error(`GitHub API rate limit exceeded (403). Please log in with GitHub again to refresh your personal access token.`);
    }
    throw new Error(`GitHub API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
};

/**
 * Fetch repositories accessible through user's GitHub account
 * Strictly filters to ONLY repositories owned by the authenticated user
 */
export const listUserRepositories = async (userIdOrToken, { search = "", page = 1, perPage = 30, username = "" } = {}) => {
  const token = (typeof userIdOrToken === "string" && (userIdOrToken.startsWith("gh") || userIdOrToken.length > 25))
    ? userIdOrToken
    : await getUserGitHubToken(userIdOrToken);

  const targetUsername = (
    username ||
    (typeof userIdOrToken === "string" && !userIdOrToken.startsWith("gh") && userIdOrToken.length < 25 ? userIdOrToken : "")
  ).trim();

  let repos = [];

  // 1. Try fetching via authenticated GitHub token
  if (token) {
    try {
      const data = await fetchFromGitHub("/user/repos?sort=updated&per_page=100", token);
      if (Array.isArray(data) && data.length > 0) {
        repos = data
          .filter((r) => !targetUsername || r.owner?.login?.toLowerCase() === targetUsername.toLowerCase() || r.permissions?.push)
          .map((r) => mapRepoObject(r));
      }
    } catch (err) {
      console.warn("GitHub authenticated user/repos call notice:", err.message);
    }
  }

  // 2. Fallback: Fetch public repositories owned directly by this GitHub user if token failed
  if ((!repos || repos.length === 0) && targetUsername) {
    try {
      const publicData = await fetchFromGitHub(`/users/${targetUsername}/repos?sort=updated&per_page=100`, null);
      if (Array.isArray(publicData) && publicData.length > 0) {
        repos = publicData
          .filter((r) => r.owner?.login?.toLowerCase() === targetUsername.toLowerCase())
          .map((r) => mapRepoObject(r));
      }
    } catch (e) {
      console.warn("GitHub public user repos fetch notice:", e.message);
    }
  }

  // If user has no repositories, return empty list (NEVER leak another user's repos)
  if (!repos) {
    repos = [];
  }

  // Filter by search query if provided
  if (search) {
    const q = search.toLowerCase();
    repos = repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.language && r.language.toLowerCase().includes(q))
    );
  }

  return {
    total: repos.length,
    repositories: repos
  };
};

/**
 * Fetch extensive repository data for Project Brain ingestion
 */
export const fetchRepositoryData = async (userIdOrToken, owner, repoName, defaultBranch = "main") => {
  const token = userIdOrToken?.startsWith("gh") || userIdOrToken?.length > 25
    ? userIdOrToken
    : await getUserGitHubToken(userIdOrToken);

  const repoContext = {
    metadata: {
      owner,
      name: repoName,
      fullName: `${owner}/${repoName}`,
      defaultBranch,
      fetchedAt: new Date().toISOString()
    },
    languages: {},
    tree: [],
    files: [],
    commits: [],
    commitComments: [],
    pullRequests: [],
    pullRequestComments: [],
    discussions: [],
    releases: []
  };

  try {
    // 1. Fetch Repository Details
    try {
      const details = await fetchFromGitHub(`/repos/${owner}/${repoName}`, token);
      repoContext.metadata = {
        ...repoContext.metadata,
        description: details.description || "",
        topics: details.topics || [],
        stars: details.stargazers_count,
        forks: details.forks_count,
        openIssues: details.open_issues_count,
        defaultBranch: details.default_branch || defaultBranch
      };
    } catch (e) {
      console.warn("Could not fetch repo details:", e.message);
    }

    // 2. Fetch Languages Breakdown
    try {
      repoContext.languages = await fetchFromGitHub(`/repos/${owner}/${repoName}/languages`, token);
    } catch (e) {
      console.warn("Could not fetch repo languages:", e.message);
    }

    // 3. Fetch Git Trees (Recursive)
    let branchToUse = repoContext.metadata.defaultBranch || defaultBranch || "main";
    let treeData = null;
    try {
      treeData = await fetchFromGitHub(`/repos/${owner}/${repoName}/git/trees/${branchToUse}?recursive=1`, token);
    } catch (e) {
      console.warn(`Could not fetch git tree for branch ${branchToUse}:`, e.message);
      // Fallback try alternate common branch name (master <-> main)
      const altBranch = branchToUse === "main" ? "master" : "main";
      try {
        treeData = await fetchFromGitHub(`/repos/${owner}/${repoName}/git/trees/${altBranch}?recursive=1`, token);
        branchToUse = altBranch;
        repoContext.metadata.defaultBranch = altBranch;
      } catch (altErr) {
        console.warn(`Could not fetch alternate branch tree ${altBranch}:`, altErr.message);
      }
    }

    if (treeData && Array.isArray(treeData.tree)) {
      repoContext.tree = treeData.tree
        .filter((item) => item.type === "blob")
        .map((item) => ({ path: item.path, size: item.size, sha: item.sha }));
    }

    // 4. Identify & Fetch High-Signal Engineering Files in Parallel Batches
    const highSignalPaths = selectHighSignalFiles(repoContext.tree);
    const pathsToFetch = highSignalPaths.slice(0, 40);

    const BATCH_SIZE = 6;
    for (let i = 0; i < pathsToFetch.length; i += BATCH_SIZE) {
      const batch = pathsToFetch.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (filePath) => {
          // 1. Try fast raw.githubusercontent.com first (zero API quota consumption)
          try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branchToUse}/${filePath}`;
            const rawRes = await fetch(rawUrl, {
              headers: { "User-Agent": "Axon-Intelligent-Workspace" }
            });
            if (rawRes.ok) {
              const content = await rawRes.text();
              return {
                path: filePath,
                size: content.length,
                content,
                sha: `raw_${filePath.replace(/[^a-zA-Z0-9]/g, "_")}`
              };
            }
          } catch (e) {
            // continue to REST API fallback
          }

          // 2. Fallback to GitHub REST API (handles private repos with token)
          const fileContentData = await fetchFromGitHub(`/repos/${owner}/${repoName}/contents/${filePath}?ref=${branchToUse}`, token);
          if (fileContentData && fileContentData.content) {
            const decodedContent = Buffer.from(fileContentData.content, "base64").toString("utf-8");
            return {
              path: filePath,
              size: fileContentData.size || decodedContent.length,
              content: decodedContent,
              sha: fileContentData.sha
            };
          }
          return null;
        })
      );

      for (const res of results) {
        if (res.status === "fulfilled" && res.value) {
          repoContext.files.push(res.value);
        }
      }
    }

    // 5. Fetch Recent Commits (Architectural History)
    try {
      const commitsData = await fetchFromGitHub(`/repos/${owner}/${repoName}/commits?per_page=30`, token);
      repoContext.commits = commitsData.map((c) => ({
        sha: c.sha?.substring(0, 7),
        fullSha: c.sha,
        message: c.commit?.message,
        author: c.commit?.author?.name || c.author?.login,
        authorAvatar: c.author?.avatar_url,
        date: c.commit?.author?.date,
        url: c.html_url
      }));
    } catch (e) {
      console.warn("Could not fetch commits:", e.message);
    }

    // 5b. Fetch Commit Comments
    try {
      const commitCommentsData = await fetchFromGitHub(`/repos/${owner}/${repoName}/comments?per_page=30`, token);
      if (Array.isArray(commitCommentsData)) {
        repoContext.commitComments = commitCommentsData.map((cc) => ({
          id: cc.id,
          commitId: cc.commit_id?.substring(0, 7),
          body: cc.body,
          path: cc.path,
          line: cc.line,
          author: cc.user?.login,
          createdAt: cc.created_at
        }));
      }
    } catch (e) {
      // Commit comments might be disabled or empty
    }

    // 6. Fetch Recent Pull Requests (Feature Specs & Decisions)
    try {
      const pullsData = await fetchFromGitHub(`/repos/${owner}/${repoName}/pulls?state=all&per_page=20`, token);
      repoContext.pullRequests = pullsData.map((pr) => ({
        number: pr.number,
        title: pr.title,
        body: pr.body || "",
        state: pr.state,
        user: pr.user?.login,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at,
        htmlUrl: pr.html_url,
        diffUrl: pr.diff_url
      }));
    } catch (e) {
      console.warn("Could not fetch pull requests:", e.message);
    }

    // 6b. Fetch PR Review Comments & Discussions
    try {
      const prCommentsData = await fetchFromGitHub(`/repos/${owner}/${repoName}/pulls/comments?per_page=30`, token);
      if (Array.isArray(prCommentsData)) {
        repoContext.pullRequestComments = prCommentsData.map((prc) => ({
          id: prc.id,
          pullRequestUrl: prc.pull_request_url,
          body: prc.body,
          path: prc.path,
          author: prc.user?.login,
          createdAt: prc.created_at
        }));
      }
    } catch (e) {
      // Pull request review comments might be empty
    }

    // 7. Fetch GitHub Discussions & Issues (Technical Decisions & Bug Reports)
    try {
      const issuesData = await fetchFromGitHub(`/repos/${owner}/${repoName}/issues?state=all&per_page=20`, token);
      if (Array.isArray(issuesData)) {
        // Exclude PRs that GitHub treats as issues
        repoContext.discussions = issuesData
          .filter((iss) => !iss.pull_request)
          .map((iss) => ({
            number: iss.number,
            title: iss.title,
            body: iss.body || "",
            state: iss.state,
            author: iss.user?.login,
            labels: (iss.labels || []).map((l) => (typeof l === "string" ? l : l.name)),
            commentsCount: iss.comments || 0,
            createdAt: iss.created_at,
            closedAt: iss.closed_at
          }));
      }
    } catch (e) {
      console.warn("Could not fetch issues/discussions:", e.message);
    }

    // 8. Fetch Releases & Version Milestones
    try {
      const releasesData = await fetchFromGitHub(`/repos/${owner}/${repoName}/releases?per_page=10`, token);
      if (Array.isArray(releasesData)) {
        repoContext.releases = releasesData.map((rel) => ({
          id: rel.id,
          tagName: rel.tag_name,
          name: rel.name || rel.tag_name,
          body: rel.body || "",
          publishedAt: rel.published_at,
          author: rel.author?.login
        }));
      }
    } catch (e) {
      // Releases might be empty
    }

    if (repoContext.files.length === 0 && repoContext.tree.length === 0) {
      throw new Error(`Could not access repository tree or files for ${owner}/${repoName}. Ensure the repository exists, is accessible, and has code.`);
    }

    return repoContext;
  } catch (err) {
    console.error(`Repository ingestion error for ${owner}/${repoName}:`, err.message);
    throw err;
  }
};

/**
 * Filter and prioritize files that contain core architectural knowledge
 */
function selectHighSignalFiles(treeList = []) {
  if (!treeList.length) return [];

  const priorityScore = (filePath) => {
    const lower = filePath.toLowerCase();

    // Documentation is top priority
    if (lower === "readme.md" || lower.endsWith("/readme.md")) return 100;
    if (lower.includes("architecture.md") || lower.includes("overview.md")) return 95;
    if (lower.startsWith("docs/") && lower.endsWith(".md")) return 90;

    // Config & dependencies define the stack
    if (lower === "package.json") return 85;
    if (lower === "dockerfile" || lower === "docker-compose.yml") return 80;
    if (lower === "tsconfig.json" || lower === "vite.config.js") return 75;
    if (lower === "requirements.txt" || lower === "cargo.toml" || lower === "go.mod") return 80;

    // Entry points and routes
    if (lower.includes("main.jsx") || lower.includes("index.js") || lower.includes("app.jsx")) return 70;
    if (lower.includes("/routes/") || lower.includes("/controllers/")) return 65;
    if (lower.includes("/services/") || lower.includes("/models/")) return 60;
    if (lower.includes("/components/")) return 50;

    // Exclude noise
    if (lower.includes("node_modules/") || lower.includes(".lock") || lower.endsWith(".svg") || lower.endsWith(".png")) return -1;
    if (lower.includes("dist/") || lower.includes("build/")) return -1;

    return 20;
  };

  return treeList
    .map((item) => ({ path: item.path, score: priorityScore(item.path) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.path);
}
