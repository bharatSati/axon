import { useState, useEffect, useRef, useMemo } from "react";
import {
  Code2,
  FileCode,
  FileText,
  FolderGit2,
  Sparkles,
  Send,
  Check,
  Copy,
  Search,
  RefreshCw,
  ShieldAlert,
  Zap,
  TestTube,
  Layers,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Github,
  History,
  Palette,
  GitPullRequest,
  AlertCircle,
  X,
  ChevronUp,
  Trash2,
  Terminal,
  ScanLine,
  Gauge,
  FileCode2
} from "lucide-react";
import gsap from "gsap";
import FormattedAIResponse from "./FormattedAIResponse";
import FocusOverlay from "./FocusOverlay";
import PromptComposer from "./PromptComposer";
import TimeMachine from "./TimeMachine";
import FlowchartStudio from "./FlowchartStudio";
import PRIntelligenceStudio from "./PRIntelligenceStudio";
import { API_BASE } from "../config/api.js";

const BRAIN_ACTIONS = [
  { id: "explain", label: "Architecture & Data Flow", icon: Sparkles, desc: "Deep architectural role, inputs, outputs, and design pattern analysis" },
  { id: "dependencies", label: "Dependencies & Callers", icon: Layers, desc: "Inspect internal modules, downstream callers, and external packages" },
  { id: "security", label: "Security & Edge Cases", icon: ShieldAlert, desc: "Identify vulnerability risks, sanitization gaps, and failure modes" },
  { id: "optimize", label: "Performance & Latency", icon: Zap, desc: "Algorithmic complexity, memory footprint, and optimization tips" },
  { id: "tests", label: "Unit Tests & Mocks", icon: TestTube, desc: "Comprehensive Jest/Vitest unit tests with realistic edge cases" }
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
      return "#c8ff3d";
  }
};

/**
 * Fast & clean syntax highlighter for code buffers.
 * Escapes HTML and tokenizes keywords, strings, functions, comments, numbers, types.
 */
function highlightSyntax(code) {
  if (!code) return "";
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|import|export|from|class|async|await|try|catch|finally|throw|new|typeof|instanceof|switch|case|default|while|for|break|continue|def|elif|lambda|self|yield|interface|type|extends|implements|enum|public|private|protected)\b)|(\b(?:true|false|null|undefined|None|True|False|nil)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b[a-zA-Z0-9_]+(?=\s*\()|(=>|===|!==|==|!=|&&|\|\||[+\-*\/%]=?))/gm,
    (m, comment, str, kw, bool, num, type, fnOrOp) => {
      if (comment) return `<span class="tok-comment">${comment}</span>`;
      if (str) return `<span class="tok-string">${str}</span>`;
      if (kw) return `<span class="tok-keyword">${kw}</span>`;
      if (bool) return `<span class="tok-boolean">${bool}</span>`;
      if (num) return `<span class="tok-number">${num}</span>`;
      if (type) return `<span class="tok-type">${type}</span>`;
      if (fnOrOp) {
        if (
          fnOrOp.includes("=") ||
          fnOrOp.includes("&") ||
          fnOrOp.includes("|") ||
          fnOrOp.includes("+") ||
          fnOrOp.includes("-") ||
          fnOrOp.includes("*") ||
          fnOrOp.includes("/")
        ) {
          return `<span class="tok-operator">${fnOrOp}</span>`;
        }
        return `<span class="tok-function">${fnOrOp}</span>`;
      }
      return m;
    }
  );
}

export default function DeveloperStudio({ workspace, token, onSwitchPerspective, onOpenConnectRepo }) {
  const [studioMode, setStudioMode] = useState("editor"); // "editor" | "timemachine" | "flowchart" | "pr-review"
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFileContent, setLoadingFileContent] = useState(false);
  const [isLiveGitHub, setIsLiveGitHub] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [activeTabFiles, setActiveTabFiles] = useState([]);
  const [fileSearch, setFileSearch] = useState("");
  const [fileCategory, setFileCategory] = useState("all"); // "all" | "code" | "docs" | "config"

  // Editor Viewport & Appearance Customization
  const [fontSize, setFontSize] = useState(14.5); // 11px to 22px
  const [wordWrap, setWordWrap] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false); // Focus / Fullscreen Mode
  const [activeLine, setActiveLine] = useState(null);
  const [scrollInfo, setScrollInfo] = useState({ top: 0, height: 12 });

  // In-File Quick Find (Cmd+F / Ctrl+F)
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findMatches, setFindMatches] = useState([]);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // Brain Code Context & Selection State
  const [selectedAction, setSelectedAction] = useState("explain");
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [promptMode, setPromptMode] = useState("preset");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [followupPrompt, setFollowupPrompt] = useState("");
  const [brainAnalysis, setBrainAnalysis] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);

  // Interactive AI Conversation Thread
  const [chatThread, setChatThread] = useState([]);

  // Cinematic focus stage (code / analysis)
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusKind, setFocusKind] = useState("analysis");
  const [focusTurnId, setFocusTurnId] = useState(null);
  const focusOriginRef = useRef(null);

  // Floating Selection Action HUD
  const [showSelectionHud, setShowSelectionHud] = useState(false);
  const [hudCoords, setHudCoords] = useState({ top: 0, left: 0 });

  const codeViewerRef = useRef(null);
  const findInputRef = useRef(null);
  const editorPaneRef = useRef(null);

  // Global Keyboard Shortcuts (Cmd+F / Ctrl+F for Find, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
        setTimeout(() => findInputRef.current?.focus(), 50);
      } else if (e.key === "Escape") {
        if (findOpen) setFindOpen(false);
        if (showSelectionHud) setShowSelectionHud(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [findOpen, showSelectionHud]);

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

  // Memoized syntax-highlighted lines of the active file for 60FPS fluid scrolling
  const highlightedLines = useMemo(() => {
    if (!activeFile?.content) return [];
    return activeFile.content.split("\n").map((line) => highlightSyntax(line));
  }, [activeFile?.content]);

  // Auto-fetch file content if currently active file has no content loaded
  useEffect(() => {
    if (activeFile && (activeFile.content === null || activeFile.content === undefined)) {
      fetchFileContent(activeFile.path);
    }
  }, [selectedFilePath, activeFile?.content]);

  // In-File Find Match Calculator
  useEffect(() => {
    if (!findQuery.trim() || !activeFile?.content) {
      setFindMatches([]);
      setActiveMatchIdx(0);
      return;
    }
    const lines = activeFile.content.split("\n");
    const q = findQuery.toLowerCase();
    const matchedLineIndexes = [];

    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(q)) {
        matchedLineIndexes.push(idx + 1);
      }
    });

    setFindMatches(matchedLineIndexes);
    setActiveMatchIdx(0);
  }, [findQuery, activeFile?.content]);

  // Jump to specific match in editor
  const handleJumpToMatch = (direction) => {
    if (findMatches.length === 0) return;
    let nextIdx = activeMatchIdx;
    if (direction === "next") {
      nextIdx = (activeMatchIdx + 1) % findMatches.length;
    } else {
      nextIdx = (activeMatchIdx - 1 + findMatches.length) % findMatches.length;
    }
    setActiveMatchIdx(nextIdx);
    setActiveLine(findMatches[nextIdx]);

    if (codeViewerRef.current) {
      const lineTarget = findMatches[nextIdx];
      const lineEl = document.getElementById(`code-line-${lineTarget}`);
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        const targetScroll = Math.max(0, (lineTarget - 5) * (fontSize * 1.7));
        codeViewerRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  };

  // Run Brain inspection when triggered (with custom prompt or preset action)
  const handleInspectCode = async (overrideAction, overrideSnippet, overridePrompt) => {
    if (!activeFile && !overrideSnippet) return;
    const actionToRun = overrideAction || selectedAction;
    const promptToUse = overridePrompt !== undefined ? overridePrompt : customPrompt;
    const codeToAnalyze = overrideSnippet !== undefined ? overrideSnippet : (selectedSnippet || activeFile?.content);

    const promptLabel = promptToUse ? promptToUse : (BRAIN_ACTIONS.find((a) => a.id === actionToRun)?.label || actionToRun);

    try {
      setIsInspecting(true);
      setShowSelectionHud(false);

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

        // Add to conversation thread
        setChatThread((prev) => [
          ...prev,
          {
            id: Date.now(),
            prompt: promptLabel,
            analysis: data.analysis,
            action: actionToRun,
            relevantChunks: data.relevantChunks || [],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
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
    if (activeFile && activeFile.content && !brainAnalysis && chatThread.length === 0) {
      handleInspectCode("explain", activeFile.content.slice(0, 2000), "");
    }
  }, [activeFile?.content]);

  // Single, unambiguous prompt contract: preset OR template OR custom — never mixed.
  const handleComposerRun = ({ mode, action, prompt }) => {
    if (mode === "preset") setSelectedAction(action);
    if (mode === "template") setPromptTemplate(prompt);
    if (mode === "custom") setCustomPrompt(prompt);
    handleInspectCode(action, undefined, mode === "preset" ? "" : prompt);
  };

  const openFocusStage = (kind, turnId, event) => {
    if (event?.currentTarget) focusOriginRef.current = event.currentTarget;
    setFocusKind(kind);
    setFocusTurnId(turnId ?? null);
    setFocusOpen(true);
  };

  const latestTurn =
    (focusTurnId && chatThread.find((turn) => turn.id === focusTurnId)) ||
    (chatThread.length ? chatThread[chatThread.length - 1] : null);

  const focusAnalysis = latestTurn?.analysis || brainAnalysis?.analysis || "";
  const focusChunks = latestTurn?.relevantChunks || brainAnalysis?.relevantChunks || [];

  const handleFocusAsk = () => {
    if (!followupPrompt.trim() || isInspecting) return;
    handleInspectCode("custom", undefined, followupPrompt.trim());
    setFollowupPrompt("");
    setFocusTurnId(null);
    setFocusKind("analysis");
  };

  const handleEditorScroll = (event) => {
    const element = event.currentTarget;
    const max = element.scrollHeight - element.clientHeight;
    const ratio = max > 0 ? element.scrollTop / max : 0;
    const visible = element.scrollHeight > 0 ? (element.clientHeight / element.scrollHeight) * 100 : 100;
    setScrollInfo({ top: ratio * (100 - Math.min(visible, 100)), height: Math.min(visible, 100) });
  };

  const handleMinimapClick = (event) => {
    const element = codeViewerRef.current;
    if (!element) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    element.scrollTo({
      top: ratio * (element.scrollHeight - element.clientHeight),
      behavior: "smooth"
    });
  };

  // Compact minimap: one tiny bar per line, sized and indented from the source.
  const minimapBars = useMemo(() => {
    if (!activeFile?.content) return [];
    return activeFile.content.split("\n").slice(0, 220).map((line, index) => {
      const indent = Math.min(18, line.length - line.trimStart().length);
      const length = Math.min(100, Math.max(4, line.trim().length * 1.35));
      return { index, indent, length, empty: !line.trim() };
    });
  }, [activeFile?.content]);

  // Smoothly ease the editor to cinematic focus when the Focus toggle flips.
  useEffect(() => {
    if (!editorPaneRef.current) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".studio-editor-pane",
        { opacity: 0.55, scale: 0.985, filter: "blur(4px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }
      );
    }, editorPaneRef);
    return () => ctx.revert();
  }, [isMaximized]);

  // Handle open tab
  const handleOpenFile = (path) => {
    setSelectedFilePath(path);
    setSelectedSnippet("");
    setShowSelectionHud(false);
    setActiveLine(null);
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

  // Handle user selecting text in the code viewer & spawn Floating AI HUD
  const handleCodeMouseUp = (e) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (text && text.length > 5) {
      setSelectedSnippet(text);
      const rect = codeViewerRef.current?.getBoundingClientRect();
      if (rect) {
        setShowSelectionHud(true);
        setHudCoords({
          top: Math.max(10, e.clientY - rect.top - 46),
          left: Math.min(rect.width - 320, Math.max(20, e.clientX - rect.left - 120))
        });
      }
    } else {
      setShowSelectionHud(false);
    }
  };

  const handleCopyCode = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(selectedSnippet || activeFile.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyAnalysis = (textToCopy) => {
    const text = textToCopy || brainAnalysis?.analysis;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedAnalysis(true);
      setTimeout(() => setCopiedAnalysis(false), 2000);
    }
  };

  const lastTurn = chatThread[chatThread.length - 1];
  const currentActionObj =
    lastTurn?.action === "custom"
      ? {
          id: "custom",
          label: "Custom prompt",
          icon: Terminal,
          desc: "Your own question, answered with file and repository context"
        }
      : BRAIN_ACTIONS.find((a) => a.id === (lastTurn?.action || selectedAction)) || BRAIN_ACTIONS[0];
  const hasRepo = !!workspace?.repository;

  // Empty State: No Repository Connected
  if (!hasRepo) {
    return (
      <div className="developer-studio-container" style={{ padding: "40px 20px", display: "grid", placeItems: "center" }}>
        <div style={{ maxWidth: "560px", textAlign: "center", background: "#0a0c0e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "48px 32px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(200, 255, 61, 0.1)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
            <FolderGit2 size={32} color="#c8ff3d" />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", marginBottom: "10px" }}>
            No GitHub Repository Connected
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
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
      {/* ============================================================
          TOP STUDIO HEADER (CLEAN AXON DASHBOARD BAR)
          ============================================================ */}
      <div className="studio-top-header">
        <div className="studio-top-left">
          {/* Repository Badge */}
          <div className="studio-repo-badge mono-label">
            <Github size={13} color="#c8ff3d" />
            <span className="studio-repo-name">{workspace.repository.fullName || workspace.repository.name}</span>
            <span className="studio-branch-tag">:{workspace.repository.defaultBranch || "main"}</span>
            {isLiveGitHub && (
              <span className="studio-live-pill" title="Live stream from GitHub API">
                <span className="studio-live-dot" /> LIVE
              </span>
            )}
          </div>

          {/* Perspective Mode Switcher */}
          <div className="studio-mode-switcher">
            <button
              type="button"
              className={`studio-mode-tab ${studioMode === "editor" ? "is-active" : ""}`}
              onClick={() => setStudioMode("editor")}
            >
              <Code2 size={13} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              className={`studio-mode-tab ${studioMode === "timemachine" ? "is-active" : ""}`}
              onClick={() => setStudioMode("timemachine")}
            >
              <History size={13} />
              <span>Revisions</span>
            </button>
            <button
              type="button"
              className={`studio-mode-tab ${studioMode === "flowchart" ? "is-active" : ""}`}
              onClick={() => setStudioMode("flowchart")}
            >
              <Palette size={13} />
              <span>Flowcharts</span>
            </button>
            <button
              type="button"
              className={`studio-mode-tab ${studioMode === "pr-review" ? "is-active" : ""}`}
              onClick={() => setStudioMode("pr-review")}
            >
              <GitPullRequest size={13} />
              <span>PR Review</span>
            </button>
          </div>
        </div>

        <div className="studio-top-right">
          {/* Quick In-File Search */}
          <button
            type="button"
            className={`studio-action-btn ${findOpen ? "is-active" : ""}`}
            onClick={() => {
              setFindOpen((o) => !o);
              if (!findOpen) setTimeout(() => findInputRef.current?.focus(), 50);
            }}
            title="Find in active file (Ctrl+F)"
          >
            <Search size={13} />
            <span>Find</span>
          </button>

          {/* Refresh / Sync Repo */}
          <button
            type="button"
            className="studio-action-btn"
            onClick={fetchFiles}
            title="Refresh repository files live from GitHub"
          >
            <RefreshCw size={13} className={loadingFiles ? "spin" : ""} />
            <span>Sync</span>
          </button>

          {/* Focus Mode Toggle */}
          <button
            type="button"
            className={`studio-action-btn ${isMaximized ? "is-active" : ""}`}
            onClick={() => setIsMaximized((m) => !m)}
            title={isMaximized ? "Exit Focus Mode" : "Focus View (Collapse sidebars)"}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isMaximized ? "Restore" : "Focus"}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Work Area / Perspective Switcher */}
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
              PANE 1: FILE EXPLORER / TREE
              ============================================================ */}
          <div className="studio-pane studio-filetree-pane">
            <div className="pane-header">
              <div className="pane-title">
                <FolderGit2 size={14} color="#c8ff3d" />
                <span>EXPLORER</span>
              </div>
              <span className="mono-label file-count-badge">{filteredFiles.length} files</span>
            </div>

            {/* Search files with clear action */}
            <div className="filetree-search-wrap">
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search repository files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
              />
              {fileSearch && (
                <button
                  type="button"
                  className="filetree-clear-search-btn"
                  onClick={() => setFileSearch("")}
                  title="Clear file search"
                >
                  <X size={12} />
                </button>
              )}
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

            {/* Files List with full vertical scroll */}
            <div className="filetree-list" data-lenis-prevent>
              {loadingFiles ? (
                <div className="filetree-loading">
                  <RefreshCw size={18} className="spin text-lime" />
                  <span>Fetching repository files...</span>
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
                      <div className="filetree-item-top">
                        <span className="file-icon">
                          {isDoc ? (
                            <FileText size={13} color="#94a3b8" />
                          ) : isJs ? (
                            <FileCode size={13} color="#c8ff3d" />
                          ) : (
                            <Code2 size={13} color="#38bdf8" />
                          )}
                        </span>
                        <span className="file-name">{file.name}</span>
                        {file.size > 0 && (
                          <span className="file-size mono-label">
                            {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}k` : `${file.size}b`}
                          </span>
                        )}
                      </div>
                      <span className="file-path-sub mono-label">{file.path}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================
              PANE 2: EXPANDED CODE EDITOR & BRAIN PROMPT BAR
              ============================================================ */}
          <div className="studio-pane studio-editor-pane" ref={editorPaneRef}>
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
                    <FileCode size={13} color={isActive ? "#c8ff3d" : "#94a3b8"} />
                    <span className="tab-title">{fileObj ? fileObj.name : path}</span>
                    {activeTabFiles.length > 1 && (
                      <button
                        type="button"
                        className="tab-close-btn"
                        onClick={(e) => handleCloseTab(path, e)}
                        title="Close file tab"
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
                <span className="editor-current-path">{activeFile ? activeFile.path : "Select File"}</span>
                {activeFile && (
                  <span className="editor-meta-pill">
                    {activeFile.linesCount || (activeFile.content ? activeFile.content.split("\n").length : 0)} LINES • {activeFile.language}
                  </span>
                )}
              </div>

              <div className="editor-actions-strip">
                <button
                  type="button"
                  className={`subbar-btn ${findOpen ? "is-active" : ""}`}
                  onClick={() => setFindOpen((o) => !o)}
                  title="Find in code (Ctrl+F)"
                >
                  <Search size={13} />
                  <span>Find</span>
                </button>
                <button
                  type="button"
                  className="subbar-btn"
                  onClick={handleCopyCode}
                  title="Copy code or selected snippet"
                >
                  {copiedCode ? <Check size={13} color="#c8ff3d" /> : <Copy size={13} />}
                  <span>{copiedCode ? "Copied" : selectedSnippet ? "Copy Snippet" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  className="subbar-btn subbar-btn--stage"
                  onClick={(event) => openFocusStage("code", null, event)}
                  title="Open the cinema stage for this file"
                >
                  <Maximize2 size={13} />
                  <span>Theater</span>
                </button>
              </div>
            </div>

            {/* In-File Find Bar Overlay */}
            {findOpen && (
              <div className="in-file-find-bar">
                <Search size={13} color="#c8ff3d" />
                <input
                  ref={findInputRef}
                  type="text"
                  placeholder="Find in active file..."
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleJumpToMatch(e.shiftKey ? "prev" : "next");
                    }
                  }}
                  className="find-input"
                />
                <span className="find-counter mono-label">
                  {findMatches.length > 0
                    ? `${activeMatchIdx + 1} of ${findMatches.length}`
                    : findQuery ? "No matches" : "Type query"}
                </span>
                <button
                  type="button"
                  className="find-arrow-btn"
                  onClick={() => handleJumpToMatch("prev")}
                  disabled={findMatches.length === 0}
                  title="Previous match (Shift+Enter)"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="find-arrow-btn"
                  onClick={() => handleJumpToMatch("next")}
                  disabled={findMatches.length === 0}
                  title="Next match (Enter)"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="find-close-btn"
                  onClick={() => setFindOpen(false)}
                  title="Close search (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ============================================================
                BRAIN PROMPT CONSOLE — preset / library / custom, never mixed
                ============================================================ */}
            <PromptComposer
              actions={BRAIN_ACTIONS}
              action={selectedAction}
              onActionChange={setSelectedAction}
              mode={promptMode}
              onModeChange={setPromptMode}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
              template={promptTemplate}
              onTemplateChange={setPromptTemplate}
              onRun={handleComposerRun}
              loading={isInspecting || loadingFileContent}
              contextLabel={activeFile ? activeFile.name : "No file"}
              snippet={selectedSnippet}
              onClearSnippet={() => {
                setSelectedSnippet("");
                setShowSelectionHud(false);
              }}
              onExpand={(event) => openFocusStage("composer", null, event)}
              compact
              runLabel="Ask Brain"
            />

            {/* ============================================================
                EXPANDED CODE VIEWER VIEWPORT (HIGH READABILITY)
                ============================================================ */}
            <div className={`code-stage ${isMaximized ? "is-cinematic" : ""}`}>
              <div
                className="code-viewer-container"
                ref={codeViewerRef}
                onMouseUp={handleCodeMouseUp}
                onScroll={handleEditorScroll}
                onPointerMove={(event) => {
                  const element = codeViewerRef.current;
                  if (!element) return;
                  const rect = element.getBoundingClientRect();
                  element.style.setProperty("--editor-mx", `${event.clientX - rect.left}px`);
                  element.style.setProperty("--editor-my", `${event.clientY - rect.top}px`);
                }}
                data-lenis-prevent
              >
                <span className="code-viewer-aura" aria-hidden="true" />
                <span className="code-viewer-scanline" aria-hidden="true" />

                {/* Floating Selection AI HUD Pill */}
                {showSelectionHud && selectedSnippet && (
                  <div
                    className="floating-selection-hud"
                    style={{ top: `${hudCoords.top}px`, left: `${hudCoords.left}px` }}
                  >
                    <span className="hud-badge">
                      <Sparkles size={11} color="#c8ff3d" />
                      {selectedSnippet.length}c
                    </span>
                    <button
                      type="button"
                      className="hud-action-btn"
                      onClick={() => handleInspectCode("explain", selectedSnippet, "")}
                    >
                      Explain
                    </button>
                    <button
                      type="button"
                      className="hud-action-btn"
                      onClick={() => handleInspectCode("optimize", selectedSnippet, "")}
                    >
                      Optimize
                    </button>
                    <button
                      type="button"
                      className="hud-action-btn"
                      onClick={() => handleInspectCode("security", selectedSnippet, "")}
                    >
                      Security
                    </button>
                    <button
                      type="button"
                      className="hud-action-btn"
                      onClick={() => handleInspectCode("tests", selectedSnippet, "")}
                    >
                      Tests
                    </button>
                    <button
                      type="button"
                      className="hud-action-btn"
                      onClick={handleCopyCode}
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      type="button"
                      className="hud-close-btn"
                      onClick={() => setShowSelectionHud(false)}
                    >
                      ×
                    </button>
                  </div>
                )}

                {loadingFileContent ? (
                  <div className="code-editor-empty">
                    <RefreshCw size={28} className="spin text-lime" />
                    <p style={{ color: "#f1f5f9", fontWeight: 600, marginTop: "12px", fontSize: "14px" }}>
                      Loading file content...
                    </p>
                    <span className="mono-label" style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {activeFile?.path}
                    </span>
                  </div>
                ) : activeFile ? (
                  <div className="code-editor-viewport">
                    <div className="code-lines-table">
                      {highlightedLines.map((html, idx) => {
                        const lineNum = idx + 1;
                        const isCurrentActive = activeLine === lineNum;
                        const isMatch = findMatches.includes(lineNum);
                        return (
                          <div
                            key={idx}
                            id={`code-line-${lineNum}`}
                            className={`code-line-row ${isCurrentActive ? "is-active" : ""} ${isMatch ? "is-match" : ""}`}
                            onClick={() => setActiveLine(lineNum)}
                          >
                            <span
                              className="code-line-num mono-label"
                              aria-hidden="true"
                              style={{ fontSize: `${fontSize - 1}px` }}
                            >
                              {lineNum}
                            </span>
                            <span
                              className="code-line-content mono-label"
                              style={{
                                fontSize: `${fontSize}px`,
                                lineHeight: 1.7,
                                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                                wordBreak: wordWrap ? "break-word" : "normal"
                              }}
                              dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="code-editor-empty">
                    <Code2 size={36} color="#64748b" />
                    <p style={{ fontSize: "15px", color: "#f1f5f9", fontWeight: 600 }}>
                      Select a file to inspect code
                    </p>
                    <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "-4px" }}>
                      Choose any repository file from the Explorer on the left
                    </p>
                  </div>
                )}
              </div>

              {activeFile?.content ? (
                <button
                  type="button"
                  className="code-minimap"
                  onClick={handleMinimapClick}
                  title="Code minimap — click to jump"
                  aria-label="Code minimap"
                >
                  <span className="code-minimap-top">
                    <ScanLine size={9} />
                  </span>
                  {minimapBars.map((bar) => (
                    <span
                      key={bar.index}
                      className={`code-minimap-bar ${bar.empty ? "is-empty" : ""}`}
                      style={{
                        marginLeft: `${bar.indent * 0.55}%`,
                        width: `${bar.length}%`
                      }}
                    />
                  ))}
                  <span
                    className="code-minimap-thumb"
                    style={{ top: `${scrollInfo.top}%`, height: `${Math.max(8, scrollInfo.height)}%` }}
                  />
                </button>
              ) : null}
            </div>

            {/* ============================================================
                EDITOR STATUS BAR (IDE Bottom Bar)
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
                {activeLine && (
                  <>
                    <span className="status-separator">•</span>
                    <span className="status-item text-lime">Line {activeLine}</span>
                  </>
                )}
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
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>FONT:</span>
                  <button
                    type="button"
                    className="font-btn"
                    onClick={() => setFontSize((s) => Math.max(11, Number((s - 1).toFixed(1))))}
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span className="font-val">{fontSize}px</span>
                  <button
                    type="button"
                    className="font-btn"
                    onClick={() => setFontSize((s) => Math.min(22, Number((s + 1).toFixed(1))))}
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
                  title={isMaximized ? "Restore sidebars" : "Focus Mode (collapse sidebars)"}
                >
                  {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  <span>{isMaximized ? "Exit Focus" : "Focus"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================
              PANE 3: PROJECT BRAIN (AI ARCHITECTURE & CODE INTELLIGENCE)
              ============================================================ */}
          <div className="studio-pane studio-brain-pane">
            <div className="pane-header brain-pane-header">
              <div className="pane-title">
                <Sparkles size={14} color="#c8ff3d" />
                <span>PROJECT BRAIN</span>
              </div>
              <div className="brain-header-right">
                <span className="brain-provider-pill">Groq • Llama 3.3</span>
                {chatThread.length > 0 && (
                  <button
                    type="button"
                    className="brain-clear-chat-btn"
                    onClick={() => {
                      setChatThread([]);
                      setBrainAnalysis(null);
                    }}
                    title="Clear analysis thread"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="brain-pane-body">
              {/* Active Mode Info Card */}
              <div className="brain-mode-card">
                <div className="brain-mode-header">
                  <currentActionObj.icon size={14} color="#c8ff3d" />
                  <strong>{currentActionObj.label}</strong>
                </div>
                <p>{currentActionObj.desc}</p>
              </div>

              {/* Single Smooth Scroll Analysis Output Container */}
              <div className="brain-analysis-output" data-lenis-prevent>
                {isInspecting ? (
                  <div className="brain-inspecting-state">
                    <RefreshCw size={24} className="spin text-lime" />
                    <h4>Project Brain is Analyzing...</h4>
                    <p>Synthesizing code architecture and repository context.</p>
                  </div>
                ) : chatThread.length > 0 ? (
                  <div className="brain-messages-stream">
                    {chatThread.map((turn, tIdx) => (
                      <div key={turn.id || tIdx} className="brain-chat-turn">
                        <div className="analysis-header-row">
                          <span className="turn-title">
                            <Sparkles size={12} color="#c8ff3d" />
                            {turn.prompt}
                            <span className="turn-timestamp">{turn.timestamp}</span>
                          </span>
                          <div className="analysis-actions">
                            <button
                              type="button"
                              className="copy-analysis-btn"
                              onClick={() => handleCopyAnalysis(turn.analysis)}
                            >
                              <Copy size={12} />
                              <span>Copy</span>
                            </button>
                            <button
                              type="button"
                              className="expand-analysis-btn"
                              onClick={(event) => openFocusStage("analysis", turn.id, event)}
                              title="Expand response into focus stage"
                            >
                              <Maximize2 size={12} />
                              <span>Expand</span>
                            </button>
                          </div>
                        </div>

                        <div className="analysis-content-markdown">
                          <FormattedAIResponse content={turn.analysis} />
                        </div>

                        {/* Related RAG Knowledge Chunks */}
                        {turn.relevantChunks && turn.relevantChunks.length > 0 && (
                          <div className="related-chunks-section">
                            <span className="mono-label related-chunks-title">
                              RELATED REPOSITORY CONTEXT:
                            </span>
                            {turn.relevantChunks.map((chunk, i) => (
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
                      </div>
                    ))}
                  </div>
                ) : brainAnalysis ? (
                  <>
                    <div className="analysis-header-row">
                      <span className="turn-title">
                        <Sparkles size={12} color="#c8ff3d" />
                        AI CODE ANALYSIS
                      </span>
                      <div className="analysis-actions">
                        <button
                          type="button"
                          className="copy-analysis-btn"
                          onClick={() => handleCopyAnalysis(brainAnalysis.analysis)}
                        >
                          {copiedAnalysis ? <Check size={12} color="#c8ff3d" /> : <Copy size={12} />}
                          <span>{copiedAnalysis ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          type="button"
                          className="expand-analysis-btn"
                          onClick={(event) => openFocusStage("analysis", null, event)}
                          title="Expand response into focus stage"
                        >
                          <Maximize2 size={12} />
                          <span>Expand</span>
                        </button>
                      </div>
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
                  </>
                ) : (
                  <div className="brain-empty-state">
                    <Sparkles size={24} color="#64748b" />
                    <p>Click "Ask Brain" or type a prompt below to analyze this file or inspect selected code.</p>
                  </div>
                )}
              </div>

              {/* Interactive Ask Follow-up Bar */}
              <div className="brain-followup-bar">
                <div className="followup-input-wrap">
                  <Terminal size={13} className="followup-terminal-icon" />
                  <input
                    type="text"
                    placeholder="Ask a follow-up to Project Brain…"
                    value={followupPrompt}
                    onChange={(e) => setFollowupPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && followupPrompt.trim()) {
                        handleInspectCode("custom", undefined, followupPrompt.trim());
                        setFollowupPrompt("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="followup-send-btn"
                    onClick={() => {
                      if (followupPrompt.trim()) {
                        handleInspectCode("custom", undefined, followupPrompt.trim());
                        setFollowupPrompt("");
                      }
                    }}
                    disabled={isInspecting || !followupPrompt.trim()}
                    title="Send question to Brain"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CINEMATIC FOCUS STAGE — code theatre / deep response reading
          ============================================================ */}
      <FocusOverlay
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        originRef={focusOriginRef}
        icon={focusKind === "code" ? FileCode2 : Sparkles}
        kicker={focusKind === "code" ? "AXON CODE ENGINE · THEATER" : "PROJECT BRAIN · DEEP READ"}
        title={
          focusKind === "code"
            ? activeFile?.path || "Repository file"
            : latestTurn?.prompt || "AI analysis"
        }
        badge={
          focusKind === "code"
            ? `${activeFile?.language || "text"} · ${activeFile?.linesCount || highlightedLines.length} lines`
            : latestTurn?.timestamp || "LIVE"
        }
        footer={
          <div className="focus-ask-bar">
            <Gauge size={15} className="focus-ask-icon" />
            <input
              type="text"
              value={followupPrompt}
              onChange={(event) => setFollowupPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleFocusAsk();
              }}
              placeholder={
                focusKind === "code"
                  ? "Ask Brain about this entire file…"
                  : "Ask a follow-up about this answer…"
              }
            />
            <button type="button" onClick={handleFocusAsk} disabled={isInspecting || !followupPrompt.trim()}>
              {isInspecting ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
              <span>{isInspecting ? "Thinking" : "Send"}</span>
            </button>
          </div>
        }
      >
        {focusKind === "code" ? (
          <div className="focus-code-viewport" data-lenis-prevent>
            <div className="focus-code-toolbar">
              <span className="mono-label">
                <FileCode2 size={13} />
                {activeFile?.name || "file"}
              </span>
              <span className="mono-label focus-code-tools">
                <span>read-only stage</span>
                <span>·</span>
                <span>{fontSize}px</span>
                <button type="button" onClick={handleCopyCode}>
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </span>
            </div>
            <div className="focus-code-lines">
              {highlightedLines.map((html, idx) => (
                <div key={idx} className="focus-code-line">
                  <span className="focus-code-num">{idx + 1}</span>
                  <code dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="focus-response">
            {focusAnalysis ? (
              <FormattedAIResponse content={focusAnalysis} />
            ) : (
              <div className="focus-response-empty">
                <Sparkles size={24} />
                <p>No analysis yet. Ask Project Brain a question below.</p>
              </div>
            )}

            {focusChunks.length > 0 && (
              <div className="focus-chunk-list">
                <span className="mono-label">RELATED REPOSITORY CONTEXT</span>
                {focusChunks.map((chunk, index) => (
                  <div key={index} className="focus-chunk">
                    <FileText size={13} />
                    <span>{chunk.filePath}</span>
                    <strong>{Math.round((chunk.score || 0) * 100)}%</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </FocusOverlay>
    </div>
  );
}
