import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Code2,
  FileCode,
  FileText,
  FolderGit2,
  Terminal,
  Cpu,
  Sparkles,
  Send,
  Check,
  Copy,
  Search,
  RefreshCw,
  Play,
  ShieldAlert,
  Zap,
  TestTube,
  Layers,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  BookOpen,
  Filter,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  Github,
  Globe,
  Radio,
  ExternalLink,
  Sliders,
  AlignLeft,
  History,
  Palette,
  GitPullRequest,
  AlertCircle
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import TimeMachine from "./TimeMachine";
import FlowchartStudio from "./FlowchartStudio";
import PRIntelligenceStudio from "./PRIntelligenceStudio";
import { API_BASE } from "../config/api.js";

const BRAIN_ACTIONS = [
  { id: "explain", label: "🧠 Architecture & Data Flow", icon: Sparkles, desc: "Deep architectural role, inputs, outputs, and design pattern analysis" },
  { id: "dependencies", label: "🔍 Dependencies & Callers", icon: Layers, desc: "Inspect internal modules, downstream callers, and external packages" },
  { id: "security", label: "🛡️ Security & Edge Cases", icon: ShieldAlert, desc: "Identify vulnerability risks, sanitization gaps, and failure modes" },
  { id: "optimize", label: "⚡ Performance & Latency", icon: Zap, desc: "Algorithmic complexity, memory footprint, and optimization tips" },
  { id: "tests", label: "🧪 Unit Tests & Mocks", icon: TestTube, desc: "Comprehensive Jest/Vitest unit tests with realistic edge cases" }
];

const getLanguageColor = (lang) => {
  switch (lang) {
    case "javascript":
      return "#f7df1e";
    case "typescript":
      return "#3178c6";
    case "html":
      return "#e34f26";
    case "css":
      return "#1572b6";
    case "json":
      return "#f59e0b";
    case "markdown":
      return "#979b91";
    case "python":
      return "#3776ab";
    case "go":
      return "#00add8";
    case "rust":
      return "#dea584";
    default:
      return "#61dafb";
  }
};

export default function DeveloperStudio({ workspace, token, onSwitchPerspective, onOpenConnectRepo }) {
  const [studioMode, setStudioMode] = useState("editor"); // "editor" | "timemachine"
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [isLiveGitHub, setIsLiveGitHub] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [activeTabFiles, setActiveTabFiles] = useState([]);
  const [fileSearch, setFileSearch] = useState("");
  const [fileCategory, setFileCategory] = useState("all"); // "all" | "code" | "docs" | "config"

  // Editor Viewport & Appearance Customization
  const [fontSize, setFontSize] = useState(14); // 12px to 20px
  const [wordWrap, setWordWrap] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false); // Focus / Fullscreen Mode

  // Brain Code Context & Selection State
  const [selectedAction, setSelectedAction] = useState("explain");
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [brainAnalysis, setBrainAnalysis] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);

  const codePreRef = useRef(null);

  // Fetch individual file content live from GitHub
  const fetchFileContent = async (filePath) => {
    if (!filePath || !workspace?.id) return;
    try {
      setLoadingFileContent(true);
      const res = await fetch(
        `${API_BASE}/workspaces/${workspace.id}/file-content?path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) =>
          prev.map((f) =>
            f.path === filePath ? { ...f, content: data.content, linesCount: data.linesCount } : f
          )
        );
      }
    } catch (e) {
      console.warn("Could not fetch file content live from GitHub:", e.message);
    } finally {
      setLoadingFileContent(false);
    }
  };

  // Fetch workspace files live from GitHub
  const fetchFiles = async () => {
    if (!workspace?.id) return;
    try {
      setLoadingFiles(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const fileList = data.files || [];
        setFiles(fileList);
        setIsLiveGitHub(!!data.isLiveGitHub);

        if (fileList.length > 0) {
          const currentExists = fileList.find((f) => f.path === selectedFilePath);
          if (!currentExists) {
            const defaultFile =
              fileList.find((f) => f.path.toLowerCase() === "readme.md") ||
              fileList.find((f) => f.path.toLowerCase() === "package.json") ||
              fileList.find((f) => f.path.includes("app.") || f.path.includes("index.") || f.path.includes("main.")) ||
              fileList[0];
            setSelectedFilePath(defaultFile.path);
            setActiveTabFiles([defaultFile.path]);
            if (defaultFile.content === null || defaultFile.content === undefined) {
              fetchFileContent(defaultFile.path);
            }
          }
        } else {
          setSelectedFilePath("");
          setActiveTabFiles([]);
        }
      }
    } catch (err) {
      console.error("Error fetching workspace files from GitHub:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [workspace?.id, workspace?.repository?.name]);

  const activeFile = files.find((f) => f.path === selectedFilePath) || files[0];

  // Auto-fetch file content if currently active file has no content loaded
  useEffect(() => {
    if (activeFile && (activeFile.content === null || activeFile.content === undefined)) {
      fetchFileContent(activeFile.path);
    }
  }, [selectedFilePath, activeFile?.content]);

  // Run Brain inspection when triggered (with custom prompt or preset action)
  const handleInspectCode = async (overrideAction, overrideSnippet, overridePrompt) => {
    if (!activeFile && !overrideSnippet) return;
    const actionToRun = overrideAction || selectedAction;
    const promptToUse = overridePrompt !== undefined ? overridePrompt : customPrompt;
    const codeToAnalyze = overrideSnippet !== undefined ? overrideSnippet : (selectedSnippet || activeFile?.content);

    try {
      setIsInspecting(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/brain/inspect-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          filePath: activeFile?.path,
          codeSnippet: codeToAnalyze?.slice(0, 5000),
          action: actionToRun,
          customPrompt: promptToUse || ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBrainAnalysis(data);
      } else {
        const err = await res.json();
        setBrainAnalysis({
          error: err.error || "Failed to inspect code with Project Brain."
        });
      }
    } catch (err) {
      console.error("Inspect code error:", err);
      setBrainAnalysis({ error: "Network error connecting to Project Brain." });
    } finally {
      setIsInspecting(false);
    }
  };

  // Inspect on initial file load
  useEffect(() => {
    if (activeFile && activeFile.content && !brainAnalysis) {
      handleInspectCode("explain", activeFile.content.slice(0, 2000));
    }
  }, [activeFile?.content]);

  // Handle open tab
  const handleOpenFile = (path) => {
    setSelectedFilePath(path);
    setSelectedSnippet("");
    if (!activeTabFiles.includes(path)) {
      setActiveTabFiles((prev) => [...prev, path]);
    }
    const target = files.find((f) => f.path === path);
    if (target && (target.content === null || target.content === undefined)) {
      fetchFileContent(path);
    }
  };

  const handleCloseTab = (path, e) => {
    e.stopPropagation();
    const nextTabs = activeTabFiles.filter((p) => p !== path);
    setActiveTabFiles(nextTabs);
    if (selectedFilePath === path && nextTabs.length > 0) {
      const nextPath = nextTabs[nextTabs.length - 1];
      setSelectedFilePath(nextPath);
      const target = files.find((f) => f.path === nextPath);
      if (target && (target.content === null || target.content === undefined)) {
        fetchFileContent(nextPath);
      }
    }
  };

  // Category counts
  const codeCount = files.filter(
    (f) =>
      f.category === "code" ||
      ["javascript", "typescript", "python", "go", "rust", "html", "css", "java", "sql"].includes(f.language)
  ).length;
  const docsCount = files.filter(
    (f) => f.category === "docs" || f.language === "markdown" || f.path.toLowerCase().includes("readme")
  ).length;
  const configCount = files.filter(
    (f) => f.category === "config" || f.language === "json" || f.path.includes("config")
  ).length;

  // Filter files by category & search
  const filteredFiles = files.filter((f) => {
    const q = fileSearch.toLowerCase();
    const matchesSearch = !fileSearch || f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (fileCategory === "code") {
      return (
        f.category === "code" ||
        ["javascript", "typescript", "python", "go", "rust", "html", "css", "java", "sql"].includes(f.language)
      );
    }
    if (fileCategory === "docs") {
      return f.category === "docs" || f.language === "markdown" || f.path.toLowerCase().includes("readme");
    }
    if (fileCategory === "config") {
      return f.category === "config" || f.language === "json" || f.path.includes("config");
    }
    return true;
  });

  // Handle user selecting text in the code viewer
  const handleCodeMouseUp = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (text && text.length > 5) {
      setSelectedSnippet(text);
    }
  };

  const handleCopyCode = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(selectedSnippet || activeFile.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyAnalysis = () => {
    if (brainAnalysis?.analysis) {
      navigator.clipboard.writeText(brainAnalysis.analysis);
      setCopiedAnalysis(true);
      setTimeout(() => setCopiedAnalysis(false), 2000);
    }
  };

  const currentActionObj = BRAIN_ACTIONS.find((a) => a.id === selectedAction) || BRAIN_ACTIONS[0];
  const hasRepo = !!workspace?.repository;

  // Empty State: No Repository Connected
  if (!hasRepo) {
    return (
      <div className="developer-studio-container" style={{ padding: "40px 20px", display: "grid", placeItems: "center" }}>
        <div style={{ maxWidth: "560px", textAlign: "center", background: "#0a0c0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "48px 32px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(200, 255, 61, 0.1)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <FolderGit2 size={32} color="#c8ff3d" />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", marginBottom: "10px" }}>
            No GitHub Repository Connected
          </h2>
          <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
            Developer Studio streams real repository source code directly from GitHub. Connect your GitHub repository to browse files, inspect functions, and unleash Project Brain.
          </p>
          <button
            type="button"
            className="button button--lime"
            onClick={onOpenConnectRepo}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", margin: "0 auto" }}
          >
            <Github size={16} />
            <span>Connect GitHub Repository</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="developer-studio-container">
      {/* Studio Top Control Strip */}
      <div className="studio-topbar">
        <div className="studio-topbar-left">
          <div className="studio-badge">
            <Code2 size={16} color="#61dafb" />
            <span style={{ color: "#fff", fontWeight: 700, letterSpacing: "0.02em" }}>DEVELOPER STUDIO</span>
            <span className="studio-role-pill">IDE WORKBENCH</span>
          </div>

          <div className="studio-repo-info mono-label">
            <Github size={13} color="#fff" />
            <span style={{ color: "#fff", fontWeight: 500 }}>{workspace.repository.fullName || workspace.repository.name}</span>
            <span className="studio-branch-tag">
              <GitBranch size={10} style={{ marginRight: "3px" }} />
              {workspace.repository.defaultBranch || "main"}
            </span>
            {isLiveGitHub && (
              <span className="live-github-pill" title="Live stream from GitHub API">
                <span className="live-dot" /> LIVE GITHUB
              </span>
            )}
          </div>

          <div className="studio-mode-switcher">
            <button
              type="button"
              className={`studio-mode-tab ${studioMode === "editor" ? "is-active" : ""}`}
              onClick={() => setStudioMode("editor")}
            >
              <Code2 size={13} />
              <span>Code Editor</span>
            </button>
            <button
              type="button"
              className={`studio-mode-tab studio-mode-tab--tm ${studioMode === "timemachine" ? "is-active" : ""}`}
              onClick={() => setStudioMode("timemachine")}
            >
              <History size={13} color={studioMode === "timemachine" ? "#c8ff3d" : "#888"} />
              <span>Time Machine</span>
            </button>
            <button
              type="button"
              className={`studio-mode-tab studio-mode-tab--flow ${studioMode === "flowchart" ? "is-active" : ""}`}
              onClick={() => setStudioMode("flowchart")}
            >
              <Palette size={13} color={studioMode === "flowchart" ? "#c8ff3d" : "#888"} />
              <span>Flowcharts</span>
            </button>
            <button
              type="button"
              className={`studio-mode-tab studio-mode-tab--pr ${studioMode === "pr-review" ? "is-active" : ""}`}
              onClick={() => setStudioMode("pr-review")}
            >
              <GitPullRequest size={13} color={studioMode === "pr-review" ? "#c8ff3d" : "#888"} />
              <span>PR Reviewer</span>
            </button>
          </div>
        </div>

        <div className="studio-topbar-right">
          <div className="studio-stats-pill mono-label">
            <span>{files.length} REPO FILES</span>
            <span>•</span>
            <span style={{ color: "#c8ff3d" }}>RAG BRAIN READY</span>
          </div>

          {/* Quick Focus Mode toggle in topbar */}
          <button
            type="button"
            className={`button button--small ${isMaximized ? "button--lime" : "button--ghost"}`}
            onClick={() => setIsMaximized((m) => !m)}
            title={isMaximized ? "Exit Focus Mode" : "Focus / Fullscreen Editor"}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isMaximized ? "Exit Focus" : "Focus View"}</span>
          </button>

          <button
            type="button"
            className="button button--small button--ghost"
            onClick={fetchFiles}
            title="Refresh repository files live from GitHub"
          >
            <RefreshCw size={13} className={loadingFiles ? "spin" : ""} />
            <span>Sync GitHub</span>
          </button>
        </div>
      </div>

      {/* Main Studio Work Area / Time Machine / Flowchart / PR Review Switcher */}
      {studioMode === "timemachine" ? (
        <TimeMachine
          workspace={workspace}
          token={token}
          onSwitchPerspective={onSwitchPerspective}
        />
      ) : studioMode === "flowchart" ? (
        <FlowchartStudio
          workspace={workspace}
          token={token}
        />
      ) : studioMode === "pr-review" ? (
        <PRIntelligenceStudio
          workspace={workspace}
          token={token}
        />
      ) : (
        <div className={`studio-workarea ${isMaximized ? "is-maximized" : ""}`}>
        {/* ============================================================
            PANE 1: FILE EXPLORER / TREE (Hidden in Focus Mode)
            ============================================================ */}
        <div className="studio-pane studio-filetree-pane">
          <div className="pane-header">
            <div className="pane-title">
              <FolderGit2 size={14} color="#61dafb" />
              <span>EXPLORER</span>
            </div>
            <span className="mono-label file-count-badge">{filteredFiles.length}</span>
          </div>

          {/* Search files */}
          <div className="filetree-search-wrap">
            <Search size={13} />
            <input
              type="text"
              placeholder="Search repo files..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="filetree-category-tabs">
            {[
              { id: "all", label: `All (${files.length})` },
              { id: "code", label: `Code (${codeCount})` },
              { id: "docs", label: `Docs (${docsCount})` },
              { id: "config", label: `Config (${configCount})` }
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`cat-pill ${fileCategory === cat.id ? "is-active" : ""}`}
                onClick={() => setFileCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Files List */}
          <div className="filetree-list">
            {loadingFiles ? (
              <div className="filetree-loading">
                <RefreshCw size={18} className="spin" />
                <span>Fetching live GitHub tree...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="filetree-empty">No matching files found.</div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = file.path === selectedFilePath;
                const isDoc = file.language === "markdown";
                const isJs = file.language === "javascript" || file.language === "typescript";

                return (
                  <button
                    type="button"
                    key={file.path}
                    className={`filetree-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleOpenFile(file.path)}
                    title={file.path}
                  >
                    <span className="file-icon">
                      {isDoc ? (
                        <FileText size={14} color="#979b91" />
                      ) : isJs ? (
                        <FileCode size={14} color="#61dafb" />
                      ) : (
                        <Code2 size={14} color="#f59e0b" />
                      )}
                    </span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-path-sub mono-label">{file.path}</span>
                    {file.size > 0 && (
                      <span className="file-size mono-label">
                        {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}k` : `${file.size}b`}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================
            PANE 2: EXPANDED CODE EDITOR & INTERACTIVE BRAIN PROMPT BAR
            ============================================================ */}
        <div className="studio-pane studio-editor-pane">
          {/* Tab Bar */}
          <div className="editor-tab-bar">
            {activeTabFiles.map((path) => {
              const fileObj = files.find((f) => f.path === path);
              const isActive = path === selectedFilePath;

              return (
                <div
                  key={path}
                  className={`editor-tab ${isActive ? "is-active" : ""}`}
                  onClick={() => handleOpenFile(path)}
                >
                  <FileCode size={13} color={isActive ? "#61dafb" : "#888"} />
                  <span className="tab-title">{fileObj ? fileObj.name : path}</span>
                  {activeTabFiles.length > 1 && (
                    <button
                      type="button"
                      className="tab-close-btn"
                      onClick={(e) => handleCloseTab(path, e)}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Breadcrumb & Action Strip */}
          <div className="editor-subbar">
            <div className="editor-breadcrumbs mono-label">
              <span>{workspace?.name || "Workspace"}</span>
              <ChevronRight size={11} />
              <span style={{ color: "#61dafb", fontWeight: 600 }}>{activeFile ? activeFile.path : "Select File"}</span>
              {activeFile && (
                <span className="editor-meta-pill">
                  {activeFile.linesCount || (activeFile.content ? activeFile.content.split("\n").length : 0)} LINES • {activeFile.language}
                </span>
              )}
            </div>

            <div className="editor-actions-strip">
              <button
                type="button"
                className="subbar-btn"
                onClick={handleCopyCode}
                title="Copy code or selected snippet"
              >
                {copiedCode ? <Check size={13} color="#c8ff3d" /> : <Copy size={13} />}
                <span>{copiedCode ? "Copied" : selectedSnippet ? "Copy Snippet" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* ============================================================
              INTERACTIVE BRAIN PROMPT & SELECTION COMMAND BAR
              ============================================================ */}
          <div className="brain-selection-bar">
            {/* Action Mode Preset Selector */}
            <div className="brain-action-select-group">
              <Sparkles size={14} color="#c8ff3d" />
              <span className="mono-label brain-action-label">MODE:</span>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  handleInspectCode(e.target.value);
                }}
                className="brain-action-dropdown"
              >
                {BRAIN_ACTIONS.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Custom Prompt Input for Project Brain */}
            <div className="brain-custom-prompt-wrap">
              <input
                type="text"
                className="brain-prompt-input"
                placeholder={
                  selectedSnippet
                    ? `Ask Brain about highlighted snippet (${selectedSnippet.length} chars, e.g. "Optimize this", "Find bugs")...`
                    : `Ask Brain custom prompt for ${activeFile ? activeFile.name : "code"}... (or press Enter)`
                }
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isInspecting) {
                    handleInspectCode();
                  }
                }}
              />

              {/* Selected Snippet Indicator with Quick Clear */}
              {selectedSnippet && (
                <div className="snippet-indicator-badge mono-label">
                  <Check size={11} color="#61dafb" />
                  <span>Snippet ({selectedSnippet.length}c)</span>
                  <button
                    type="button"
                    className="clear-snippet-btn"
                    onClick={() => setSelectedSnippet("")}
                    title="Clear selected snippet to inspect full file"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Run Action / Custom Prompt Button */}
              <button
                type="button"
                className="button button--lime button--small studio-run-btn"
                onClick={() => handleInspectCode()}
                disabled={isInspecting || loadingFileContent}
              >
                {isInspecting ? (
                  <RefreshCw size={13} className="spin" />
                ) : (
                  <Zap size={13} />
                )}
                <span>{customPrompt.trim() ? "Ask Brain" : "Ask Brain"}</span>
              </button>
            </div>
          </div>

          {/* ============================================================
              EXPANDED CODE VIEWER VIEWPORT (BIG AREA & CRISP TEXT)
              ============================================================ */}
          <div className="code-viewer-container" onMouseUp={handleCodeMouseUp}>
            {loadingFileContent ? (
              <div className="code-editor-empty" style={{ padding: "100px 20px" }}>
                <RefreshCw size={32} className="spin" color="#61dafb" />
                <p style={{ color: "#fff", fontWeight: 600, marginTop: "12px", fontSize: "15px" }}>
                  Streaming live from GitHub...
                </p>
                <span className="mono-label" style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "12px" }}>
                  {activeFile?.path}
                </span>
              </div>
            ) : activeFile ? (
              <div className="code-editor-viewport">
                {/* Line Numbers Gutter */}
                <div
                  className="line-numbers-gutter"
                  aria-hidden="true"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                >
                  {(activeFile.content || "")
                    .split("\n")
                    .map((_, idx) => (
                      <span key={idx} className="line-num">
                        {idx + 1}
                      </span>
                    ))}
                </div>

                {/* Preformatted Code Content with Dynamic Font Size & Wrap */}
                <pre
                  className="code-content-pre"
                  ref={codePreRef}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.7,
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    wordBreak: wordWrap ? "break-word" : "normal"
                  }}
                >
                  <code>{activeFile.content || "// File content empty or loading..."}</code>
                </pre>
              </div>
            ) : (
              <div className="code-editor-empty">
                <Code2 size={40} color="#61dafb" />
                <p style={{ fontSize: "15px" }}>Select any repository file from the Explorer on the left</p>
              </div>
            )}
          </div>

          {/* ============================================================
              EDITOR STATUS BAR (VS Code / IDE Bottom Bar)
              ============================================================ */}
          <div className="editor-status-bar mono-label">
            <div className="editor-status-left">
              <span className="status-item lang-badge">
                <span
                  className="lang-indicator-dot"
                  style={{ background: getLanguageColor(activeFile?.language) }}
                />
                {activeFile?.language ? activeFile.language.toUpperCase() : "TEXT"}
              </span>
              <span className="status-separator">•</span>
              <span className="status-item">UTF-8</span>
              <span className="status-separator">•</span>
              <span className="status-item">
                {activeFile?.linesCount || (activeFile?.content ? activeFile.content.split("\n").length : 0)} lines
              </span>
              <span className="status-separator">•</span>
              <span className="status-item">
                {activeFile?.content ? `${(activeFile.content.length / 1024).toFixed(1)} KB` : "0 KB"}
              </span>
              {selectedSnippet && (
                <>
                  <span className="status-separator">•</span>
                  <span className="status-item highlighted-status">
                    {selectedSnippet.length} chars selected
                  </span>
                </>
              )}
            </div>

            <div className="editor-status-right">
              {/* Font Size Adjuster Controls */}
              <div className="font-size-controls" title="Adjust Code Font Size">
                <span style={{ fontSize: "10px", color: "#666" }}>FONT:</span>
                <button
                  type="button"
                  className="font-btn"
                  onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                  title="Decrease font size"
                >
                  A-
                </button>
                <span className="font-val">{fontSize}px</span>
                <button
                  type="button"
                  className="font-btn"
                  onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                  title="Increase font size"
                >
                  A+
                </button>
              </div>

              {/* Word wrap toggle */}
              <button
                type="button"
                className={`status-btn ${wordWrap ? "is-active" : ""}`}
                onClick={() => setWordWrap((w) => !w)}
                title="Toggle Word Wrap"
              >
                Wrap: {wordWrap ? "ON" : "OFF"}
              </button>

              {/* Focus / Fullscreen Mode toggle */}
              <button
                type="button"
                className={`status-btn focus-btn ${isMaximized ? "is-active" : ""}`}
                onClick={() => setIsMaximized((m) => !m)}
                title={isMaximized ? "Restore sidebars" : "Focus / Fullscreen Mode (collapse sidebars)"}
              >
                {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isMaximized ? "Exit Focus" : "Focus View"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            PANE 3: LIVE PROJECT BRAIN CODE INSPECTOR (Hidden in Focus Mode)
            ============================================================ */}
        <div className="studio-pane studio-brain-pane">
          <div className="pane-header">
            <div className="pane-title">
              <Sparkles size={14} color="#c8ff3d" />
              <span>PROJECT BRAIN INTELLIGENCE</span>
            </div>
            <span className="mono-label provider-pill">Groq 120B</span>
          </div>

          <div className="brain-pane-body">
            {/* Active Mode Info Card */}
            <div className="brain-mode-card">
              <div className="brain-mode-header">
                <currentActionObj.icon size={15} color="#c8ff3d" />
                <strong>{currentActionObj.label}</strong>
              </div>
              <p>{currentActionObj.desc}</p>
            </div>

            {/* Analysis Output Container */}
            <div className="brain-analysis-output">
              {isInspecting ? (
                <div className="brain-inspecting-state">
                  <RefreshCw size={24} className="spin" color="#c8ff3d" />
                  <h4>Project Brain is Analyzing...</h4>
                  <p>Synthesizing code architecture with Groq 120B &amp; RAG vector chunks.</p>
                </div>
              ) : brainAnalysis ? (
                <>
                  <div className="analysis-header-row">
                    <span className="mono-label" style={{ color: "#c8ff3d", fontSize: "11px" }}>
                      AI CODE ANALYSIS {brainAnalysis.customPrompt ? `• "${brainAnalysis.customPrompt.slice(0, 30)}..."` : ""}
                    </span>
                    <button
                      type="button"
                      className="copy-analysis-btn"
                      onClick={handleCopyAnalysis}
                    >
                      {copiedAnalysis ? <Check size={12} color="#c8ff3d" /> : <Copy size={12} />}
                      <span>{copiedAnalysis ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {brainAnalysis.error ? (
                    <div className="analysis-error-box">
                      <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <strong style={{ display: "block", marginBottom: "4px", color: "#fca5a5" }}>
                          AI Service Notice:
                        </strong>
                        <span>{brainAnalysis.error}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="analysis-content-markdown">
                      <FormattedAIResponse content={brainAnalysis.analysis} />
                    </div>
                  )}

                  {/* Related RAG Knowledge Chunks */}
                  {brainAnalysis.relevantChunks && brainAnalysis.relevantChunks.length > 0 && (
                    <div className="related-chunks-section">
                      <span className="mono-label related-chunks-title">
                        RELATED REPOSITORY CONTEXT:
                      </span>
                      {brainAnalysis.relevantChunks.map((chunk, i) => (
                        <div key={i} className="related-chunk-card">
                          <div className="chunk-card-top">
                            <span className="chunk-file">📄 {chunk.filePath}</span>
                            <span className="chunk-score mono-label">
                              {Math.round(chunk.score * 100)}% match
                            </span>
                          </div>
                          {chunk.title && <div className="chunk-title">{chunk.title}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="brain-empty-state">
                  <Sparkles size={24} color="#666" />
                  <p>Click "Ask Project Brain" or type a custom prompt to inspect this file's architecture or highlight any code snippet.</p>
                </div>
              )}
            </div>

            {/* Interactive Ask Follow-up Bar */}
            <div className="brain-followup-bar">
              <div className="followup-input-wrap">
                <input
                  type="text"
                  placeholder="Ask follow-up question to Brain..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customPrompt.trim()) {
                      handleInspectCode("explain", undefined, customPrompt.trim());
                      setCustomPrompt("");
                    }
                  }}
                />
                <button
                  type="button"
                  className="followup-send-btn"
                  onClick={() => {
                    if (customPrompt.trim()) {
                      handleInspectCode("explain", undefined, customPrompt.trim());
                      setCustomPrompt("");
                    }
                  }}
                  disabled={isInspecting || !customPrompt.trim()}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
