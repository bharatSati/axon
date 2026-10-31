import path from "node:path";

/**
 * Document Processor for Project Brain
 * Converts code files, documentation, configs, commits, and PRs into semantic chunks.
 */

export const processRepositoryIntoChunks = (repoData) => {
  const chunks = [];
  const { files = [], commits = [], pullRequests = [], languages = {}, metadata = {} } = repoData;

  let chunkIdCounter = 1;

  // 1. Process Code and Documentation Files
  for (const file of files) {
    const fileChunks = chunkFile(file, chunkIdCounter, metadata);
    chunks.push(...fileChunks);
    chunkIdCounter += fileChunks.length;
  }

  // 2. Process Commits (Architectural History & Evolution)
  if (commits.length > 0) {
    const commitGroups = groupCommits(commits, 5);
    for (const group of commitGroups) {
      const commitContent = group
        .map((c) => `• [${c.sha}] (${c.date?.split("T")[0] || ""}) ${c.author}: ${c.message}`)
        .join("\n");

      chunks.push({
        id: `chunk_cmt_${chunkIdCounter++}`,
        filePath: "GIT_COMMIT_HISTORY",
        type: "commit",
        title: "Recent Commit Activity & Evolution",
        content: `### Git Commit History & Recent Changes\n${commitContent}`,
        metadata: {
          commitCount: group.length,
          authors: [...new Set(group.map((c) => c.author))]
        }
      });
    }
  }

  // 3. Process Pull Requests (Decisions & Feature Specs)
  if (pullRequests.length > 0) {
    for (const pr of pullRequests) {
      chunks.push({
        id: `chunk_pr_${chunkIdCounter++}`,
        filePath: `PULL_REQUESTS/#${pr.number}`,
        type: "pull_request",
        title: `PR #${pr.number}: ${pr.title}`,
        content: `### Pull Request #${pr.number}: ${pr.title}\nState: ${pr.state} | Author: ${pr.user}\n${pr.body ? `Description:\n${pr.body}` : ""}`,
        metadata: {
          number: pr.number,
          state: pr.state,
          author: pr.user
        }
      });
    }
  }

  // 4. Synthesize Architecture Summary Chunk
  const techStack = detectTechStack(files, languages);
  const entryPoints = findEntryPoints(files);

  chunks.unshift({
    id: `chunk_arch_summary`,
    filePath: "PROJECT_ARCHITECTURE_OVERVIEW",
    type: "architecture",
    title: `Architecture Overview: ${metadata.fullName || metadata.name}`,
    content: `### Project Architecture & Stack Overview\nRepository: ${metadata.fullName || metadata.name}\nDefault Branch: ${metadata.defaultBranch || "main"}\nLanguages: ${Object.keys(languages).join(", ") || "JavaScript"}\nDetected Technologies: ${techStack.join(", ")}\nKey Entry Points: ${entryPoints.join(", ")}\nDescription: ${metadata.description || "Unified software workspace"}`,
    metadata: {
      technologies: techStack,
      entryPoints,
      languages
    }
  });

  return {
    chunks,
    overview: {
      repoName: metadata.name,
      repoFullName: metadata.fullName,
      defaultBranch: metadata.defaultBranch,
      description: metadata.description,
      techStack,
      entryPoints,
      languages,
      totalFiles: files.length,
      totalChunks: chunks.length,
      totalCommits: commits.length
    }
  };
};

/**
 * Splits a single file into logical chunks (by markdown sections or line blocks)
 */
function chunkFile(file, startId, repoMeta) {
  const { path: filePath, content = "" } = file;
  if (!content.trim()) return [];

  const chunks = [];
  const lowerPath = filePath.toLowerCase();
  const isDoc = lowerPath.endsWith(".md") || lowerPath.endsWith(".txt") || lowerPath.includes("docs/");
  const isConfig = lowerPath.endsWith(".json") || lowerPath.endsWith(".yaml") || lowerPath.endsWith(".yml") || lowerPath.endsWith(".toml");

  if (isDoc) {
    // Chunk Markdown by headings
    const sections = content.split(/\n(?=#{1,3}\s)/);
    let currentId = startId;

    for (const section of sections) {
      if (!section.trim()) continue;
      const headingMatch = section.match(/^#{1,3}\s+(.+)/);
      const title = headingMatch ? headingMatch[1].trim() : path.basename(filePath);

      chunks.push({
        id: `chunk_doc_${currentId++}`,
        filePath,
        type: "documentation",
        title: `${path.basename(filePath)} > ${title}`,
        content: `[File: ${filePath} | Documentation]\n${section.trim()}`,
        metadata: {
          sectionTitle: title,
          lineCount: section.split("\n").length
        }
      });
    }
  } else if (isConfig) {
    // Config files: keep cohesive or chunk if large
    chunks.push({
      id: `chunk_cfg_${startId}`,
      filePath,
      type: "configuration",
      title: `Config: ${path.basename(filePath)}`,
      content: `[File: ${filePath} | Manifest / Configuration]\n${content.trim().substring(0, 3000)}`,
      metadata: {
        fileType: "configuration"
      }
    });
  } else {
    // Code files: sliding window with overlap and contextual header
    const lines = content.split("\n");
    const CHUNK_SIZE = 60;
    const OVERLAP = 15;
    let currentId = startId;

    for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
      const chunkLines = lines.slice(i, i + CHUNK_SIZE);
      if (chunkLines.length === 0) break;

      const codeBody = chunkLines.join("\n");
      const startLine = i + 1;
      const endLine = i + chunkLines.length;

      chunks.push({
        id: `chunk_code_${currentId++}`,
        filePath,
        type: "code",
        title: `${filePath} (Lines ${startLine}-${endLine})`,
        content: `[File: ${filePath} | Lines ${startLine}-${endLine}]\n${codeBody}`,
        metadata: {
          startLine,
          endLine,
          language: detectLanguageFromExtension(filePath)
        }
      });
    }
  }

  return chunks;
}

function groupCommits(commits, size) {
  const groups = [];
  for (let i = 0; i < commits.length; i += size) {
    groups.push(commits.slice(i, i + size));
  }
  return groups;
}

function detectTechStack(files, languages) {
  const stack = new Set();
  const fileNames = files.map((f) => f.path.toLowerCase());

  // Check language hints
  Object.keys(languages).forEach((lang) => stack.add(lang));

  // Check file manifests
  const pkgFile = files.find((f) => f.path.endsWith("package.json"));
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.react) stack.add("React");
      if (allDeps.vite) stack.add("Vite");
      if (allDeps.express) stack.add("Express");
      if (allDeps.three) stack.add("Three.js");
      if (allDeps.gsap) stack.add("GSAP");
      if (allDeps["motion/react"] || allDeps["framer-motion"]) stack.add("Framer Motion");
      if (allDeps["@rive-app/react-canvas"]) stack.add("Rive Canvas");
      if (allDeps.typescript) stack.add("TypeScript");
      if (allDeps.next) stack.add("Next.js");
      if (allDeps.tailwindcss) stack.add("TailwindCSS");
    } catch (e) {
      // ignore json parse error
    }
  }

  if (fileNames.some((n) => n.includes("dockerfile"))) stack.add("Docker");
  if (fileNames.some((n) => n.includes("docker-compose"))) stack.add("Docker Compose");

  return Array.from(stack);
}

function findEntryPoints(files) {
  const entryPoints = [];
  const candidates = [
    "client/src/main.jsx",
    "client/src/App.jsx",
    "server/src/index.js",
    "src/index.js",
    "src/main.js",
    "src/main.jsx",
    "src/App.jsx",
    "index.js",
    "app.js",
    "main.go",
    "src/main.rs"
  ];

  for (const c of candidates) {
    if (files.some((f) => f.path === c || f.path.endsWith(`/${c}`))) {
      entryPoints.push(c);
    }
  }

  return entryPoints.length ? entryPoints : ["src/index.js"];
}

function detectLanguageFromExtension(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const map = {
    js: "JavaScript",
    jsx: "React JSX",
    ts: "TypeScript",
    tsx: "React TSX",
    py: "Python",
    go: "Go",
    rs: "Rust",
    java: "Java",
    css: "CSS",
    html: "HTML",
    json: "JSON",
    md: "Markdown",
    sh: "Shell Script"
  };
  return map[ext] || "Source Code";
}
