import path from "node:path";
import crypto from "node:crypto";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { generateBatchEmbeddings } from "./embeddingService.js";

/**
 * Document & Repository Processor for Project Brain RAG Pipeline
 * Converts repository code, commits, commit comments, PRs, PR review discussions,
 * GitHub issues, releases, and uploaded documents (PDF, DOCX, TXT, MD) into
 * clean, normalized, structurally rich chunks with dense 384d embeddings.
 */

/**
 * Cleans and normalizes raw text:
 * - Replaces non-breaking spaces with standard space
 * - Normalizes Windows CRLF to standard LF
 * - Strips control characters (except tab, newline, carriage return)
 * - Collapses 3+ consecutive newlines into 2
 */
export const normalizeText = (rawText = "") => {
  if (!rawText) return "";
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u202F\u00A0\u2000-\u200A\u205F]/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/**
 * Extracts plain text from a document buffer based on MIME type and extension
 */
export const extractTextFromBuffer = async (buffer, mimeType = "", filename = "") => {
  if (!buffer || buffer.length === 0) {
    return { text: "", pageCount: 0, mimeType: mimeType || "application/octet-stream" };
  }

  const lowerName = filename.toLowerCase();
  const isPdf = mimeType.includes("pdf") || lowerName.endsWith(".pdf");
  const isDocx =
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("officedocument") ||
    lowerName.endsWith(".docx");

  // 1. PDF Extraction
  if (isPdf) {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      await parser.destroy();
      const cleaned = normalizeText(textResult.text || "");
      return {
        text: cleaned,
        pageCount: textResult.total || 1,
        mimeType: "application/pdf"
      };
    } catch (err) {
      console.warn(`[RAG Ingestion] PDFParse error for ${filename}:`, err.message);
      // Fallback: decode raw text strings from buffer
      const fallbackStr = buffer.toString("utf-8");
      const printable = fallbackStr.replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, " ");
      return {
        text: normalizeText(printable),
        pageCount: 1,
        mimeType: "application/pdf"
      };
    }
  }

  // 2. DOCX Extraction
  if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: normalizeText(result.value || ""),
        pageCount: 1,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      };
    } catch (err) {
      console.warn(`[RAG Ingestion] Mammoth error for ${filename}:`, err.message);
      throw new Error(`Failed to parse Word document (${filename}): ${err.message}`);
    }
  }

  // 3. Plain Text, Markdown, Source Code, Configs
  const text = buffer.toString("utf-8");
  return {
    text: normalizeText(text),
    pageCount: 1,
    mimeType: mimeType || "text/plain"
  };
};

/**
 * Computes SHA-256 hash of a buffer or string for deduplication
 */
export const computeContentHash = (bufferOrString) => {
  return crypto.createHash("sha256").update(bufferOrString).digest("hex");
};

/**
 * Intelligent recursive character chunker
 * Splits hierarchically: [Headings, Double Newlines, Newlines, Sentences, Words]
 */
export const chunkText = (
  text,
  {
    chunkSize = 800,
    chunkOverlap = 120,
    docId = "doc",
    filename = "document.txt",
    type = "upload",
    metadata = {}
  } = {}
) => {
  if (!text || !text.trim()) return [];

  const chunks = [];
  const separators = ["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""];

  function splitRecursively(content, sepIdx = 0) {
    if (content.length <= chunkSize || sepIdx >= separators.length) {
      return [content];
    }

    const sep = separators[sepIdx];
    const rawParts = content.split(sep);
    const result = [];
    let currentPiece = "";

    for (let i = 0; i < rawParts.length; i++) {
      let part = rawParts[i];
      if (i > 0 && sep.startsWith("\n#")) {
        part = sep.trim() + " " + part;
      }

      if ((currentPiece + (currentPiece ? sep : "") + part).length <= chunkSize) {
        currentPiece += (currentPiece ? sep : "") + part;
      } else {
        if (currentPiece) {
          result.push(currentPiece);
        }
        if (part.length > chunkSize) {
          result.push(...splitRecursively(part, sepIdx + 1));
          currentPiece = "";
        } else {
          currentPiece = part;
        }
      }
    }

    if (currentPiece) {
      result.push(currentPiece);
    }

    return result;
  }

  const rawChunks = splitRecursively(text);

  // Apply overlap and construct structured chunk objects
  let charCursor = 0;
  for (let i = 0; i < rawChunks.length; i++) {
    const rawChunk = rawChunks[i];
    if (!rawChunk.trim()) continue;

    // Grab slight overlap from previous chunk if available
    let chunkBody = rawChunk;
    if (i > 0 && chunkOverlap > 0) {
      const prevChunk = rawChunks[i - 1];
      const overlapText = prevChunk.slice(-chunkOverlap);
      chunkBody = `[... ${overlapText.trim()}]\n${rawChunk}`;
    }

    const headingMatch = rawChunk.match(/^(?:#{1,4}\s+|[A-Z0-9_\s]{4,30}:)(.+)/m);
    const title = headingMatch ? headingMatch[1].trim() : `${path.basename(filename)} (Part ${i + 1}/${rawChunks.length})`;

    const startChar = charCursor;
    const endChar = charCursor + rawChunk.length;
    charCursor = endChar;

    chunks.push({
      id: `chunk_${docId}_${i + 1}`,
      documentId: docId,
      filePath: filename,
      type,
      title,
      content: `[Source: ${filename} | Type: ${type.toUpperCase()}]\n${chunkBody.trim()}`,
      metadata: {
        ...metadata,
        chunkIndex: i + 1,
        totalChunks: rawChunks.length,
        startChar,
        endChar,
        charCount: chunkBody.length,
        approxTokens: Math.ceil(chunkBody.length / 4)
      }
    });
  }

  return chunks;
};

/**
 * Ingest an uploaded document (PDF, DOCX, TXT, MD) and generate dense vector embeddings
 */
export const processDocumentIntoChunks = async ({
  filename,
  originalName,
  buffer,
  mimeType,
  docId,
  options = {}
}) => {
  const { chunkSize = 800, chunkOverlap = 120 } = options;
  const hash = computeContentHash(buffer);

  // 1. Text extraction & cleaning
  const { text, pageCount, mimeType: resolvedMime } = await extractTextFromBuffer(buffer, mimeType, filename);

  if (!text.trim()) {
    throw new Error(`The uploaded file "${filename}" contains no extractable text.`);
  }

  // 2. Intelligent chunking
  const chunks = chunkText(text, {
    chunkSize,
    chunkOverlap,
    docId,
    filename: originalName || filename,
    type: "upload",
    metadata: {
      originalName: originalName || filename,
      pageCount,
      mimeType: resolvedMime,
      hash,
      fileSize: buffer.length
    }
  });

  // 3. Dense Vector Embeddings Generation (384-dimensional via all-MiniLM-L6-v2)
  console.log(`[RAG Engine] Generating dense vector embeddings for ${chunks.length} chunks of "${filename}"...`);
  const chunkTexts = chunks.map((c) => `${c.title}\n${c.content}`);
  const embeddings = await generateBatchEmbeddings(chunkTexts);

  for (let i = 0; i < chunks.length; i++) {
    chunks[i].embedding = embeddings[i] || [];
  }

  const documentMeta = {
    id: docId,
    name: originalName || filename,
    originalName: originalName || filename,
    mimeType: resolvedMime,
    size: buffer.length,
    hash,
    chunkCount: chunks.length,
    uploadedAt: new Date(),
    status: "ready"
  };

  return {
    document: documentMeta,
    chunks
  };
};

/**
 * Ingest a complete GitHub repository (Code, Commits, PRs, Issues, Discussions, Releases)
 * and generate dense vector embeddings for each chunk.
 */
export const processRepositoryIntoChunks = async (repoData, options = {}) => {
  const chunks = [];
  const {
    files = [],
    commits = [],
    commitComments = [],
    pullRequests = [],
    pullRequestComments = [],
    discussions = [],
    releases = [],
    languages = {},
    metadata = {}
  } = repoData;

  let chunkIdCounter = 1;

  // 1. Process Code and Documentation Files
  for (const file of files) {
    const fileChunks = chunkFile(file, chunkIdCounter, metadata);
    chunks.push(...fileChunks);
    chunkIdCounter += fileChunks.length;
  }

  // 2. Process Commits & Commit Comments
  if (commits.length > 0) {
    const commitGroups = groupItems(commits, 4);
    for (const group of commitGroups) {
      const commitContent = group
        .map((c) => {
          let line = `• [COMMIT ${c.sha}] (${c.date?.split("T")[0] || ""}) ${c.author}: ${c.message}`;
          const matchingComments = commitComments.filter((cc) => cc.commitId === c.sha);
          if (matchingComments.length > 0) {
            line += `\n  ↳ Commit Notes: ${matchingComments.map((m) => `"${m.body}" (${m.author})`).join("; ")}`;
          }
          return line;
        })
        .join("\n\n");

      chunks.push({
        id: `chunk_cmt_${chunkIdCounter++}`,
        documentId: "repo_git_history",
        filePath: "GIT_COMMIT_HISTORY",
        type: "commit",
        title: "Git Commit Activity & Architectural Revisions",
        content: `### Git Commit History & Architectural Evolution\n${commitContent}`,
        metadata: {
          commitCount: group.length,
          authors: [...new Set(group.map((c) => c.author))],
          shas: group.map((c) => c.sha)
        }
      });
    }
  }

  // 3. Process Pull Requests & PR Review Comments
  if (pullRequests.length > 0) {
    for (const pr of pullRequests) {
      const matchingReviewComments = pullRequestComments.filter(
        (prc) => prc.pullRequestUrl?.includes(`/${pr.number}`) || prc.pullRequestUrl?.includes(`#${pr.number}`)
      );

      let prText = `### Pull Request #${pr.number}: ${pr.title}\nState: ${pr.state.toUpperCase()} | Author: ${pr.user}\n`;
      if (pr.mergedAt) prText += `Merged At: ${pr.mergedAt}\n`;
      if (pr.body) prText += `Description & Implementation Spec:\n${pr.body}\n`;

      if (matchingReviewComments.length > 0) {
        prText += `\nCode Review Feedback & Discussion:\n`;
        prText += matchingReviewComments
          .map((rc) => `• [${rc.path || "diff"}] ${rc.author}: ${rc.body}`)
          .join("\n");
      }

      chunks.push({
        id: `chunk_pr_${chunkIdCounter++}`,
        documentId: `repo_pr_${pr.number}`,
        filePath: `PULL_REQUESTS/#${pr.number}`,
        type: "pull_request",
        title: `PR #${pr.number}: ${pr.title}`,
        content: prText.trim(),
        metadata: {
          prNumber: pr.number,
          state: pr.state,
          author: pr.user,
          hasReviewComments: matchingReviewComments.length > 0
        }
      });
    }
  }

  // 4. Process GitHub Discussions & Issues (Architectural Decisions & Bug Reports)
  if (discussions.length > 0) {
    for (const item of discussions) {
      let issueText = `### GitHub Issue & Discussion #${item.number}: ${item.title}\nState: ${item.state.toUpperCase()} | Author: ${item.author}\n`;
      if (item.labels?.length) issueText += `Labels: ${item.labels.join(", ")}\n`;
      if (item.body) issueText += `Discussion Topic:\n${item.body}\n`;

      chunks.push({
        id: `chunk_disc_${chunkIdCounter++}`,
        documentId: `repo_discussion_${item.number}`,
        filePath: `DISCUSSIONS_AND_ISSUES/#${item.number}`,
        type: "issue_discussion",
        title: `Discussion #${item.number}: ${item.title}`,
        content: issueText.trim(),
        metadata: {
          number: item.number,
          state: item.state,
          author: item.author,
          labels: item.labels || []
        }
      });
    }
  }

  // 5. Process Releases & Version Milestones
  if (releases.length > 0) {
    for (const rel of releases) {
      chunks.push({
        id: `chunk_rel_${chunkIdCounter++}`,
        documentId: `repo_release_${rel.tagName}`,
        filePath: `RELEASES/${rel.tagName}`,
        type: "release",
        title: `Release ${rel.name || rel.tagName}`,
        content: `### Release Milestone: ${rel.name || rel.tagName}\nTag: ${rel.tagName} | Published: ${rel.publishedAt || "N/A"}\nRelease Notes:\n${rel.body || "No changelog notes provided."}`,
        metadata: {
          tagName: rel.tagName,
          publishedAt: rel.publishedAt
        }
      });
    }
  }

  // 6. Synthesize Architecture Summary Chunk
  const techStack = detectTechStack(files, languages);
  const entryPoints = findEntryPoints(files);

  chunks.unshift({
    id: `chunk_arch_summary`,
    documentId: "repo_overview",
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

  // 7. Dense Vector Embeddings Generation for all Repository Chunks
  console.log(`[RAG Engine] Generating dense embeddings for ${chunks.length} repository chunks with all-MiniLM-L6-v2...`);
  const chunkTexts = chunks.map((c) => `${c.title}\n${c.content}`);
  const embeddings = await generateBatchEmbeddings(chunkTexts);

  for (let i = 0; i < chunks.length; i++) {
    chunks[i].embedding = embeddings[i] || [];
  }

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
      totalCommits: commits.length,
      totalPRs: pullRequests.length,
      totalDiscussions: discussions.length,
      totalReleases: releases.length
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
    const sections = content.split(/\n(?=#{1,3}\s)/);
    let currentId = startId;

    for (const section of sections) {
      if (!section.trim()) continue;
      const headingMatch = section.match(/^#{1,3}\s+(.+)/);
      const title = headingMatch ? headingMatch[1].trim() : path.basename(filePath);

      chunks.push({
        id: `chunk_doc_${currentId++}`,
        documentId: "repo_docs",
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
    chunks.push({
      id: `chunk_cfg_${startId}`,
      documentId: "repo_config",
      filePath,
      type: "configuration",
      title: `Config: ${path.basename(filePath)}`,
      content: `[File: ${filePath} | Manifest / Configuration]\n${content.trim().substring(0, 3000)}`,
      metadata: {
        fileType: "configuration"
      }
    });
  } else {
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
        documentId: "repo_code",
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

function groupItems(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function detectTechStack(files, languages) {
  const stack = new Set();
  const fileNames = files.map((f) => f.path.toLowerCase());

  Object.keys(languages).forEach((lang) => stack.add(lang));

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
      if (allDeps.typescript) stack.add("TypeScript");
      if (allDeps.next) stack.add("Next.js");
      if (allDeps.tailwindcss) stack.add("TailwindCSS");
      if (allDeps.mongoose) stack.add("MongoDB / Mongoose");
      if (allDeps["@xenova/transformers"]) stack.add("Transformers.js");
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
    sh: "Shell Script",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML"
  };
  return map[ext] || "Source Code";
}
