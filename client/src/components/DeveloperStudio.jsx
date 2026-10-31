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
  AlertCircle,
  X,
  CornerDownLeft,
  ChevronUp,
  MessageSquare,
  Trash2,
  FileSearch,
  SlidersHorizontal,
  Activity,
  HardDrive,
  Monitor,
  Power,
  Disc
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import TimeMachine from "./TimeMachine";
import FlowchartStudio from "./FlowchartStudio";
import PRIntelligenceStudio from "./PRIntelligenceStudio";
import { API_BASE } from "../config/api.js";

const CYBER_MODULES_INIT = [
  { id: "core_init", name: "core_init", state: "Ready", type: "KERNEL_CORE", latency: "4.2ms", mem: "32 MB", desc: "Microkernel orchestration & system thread scheduler" },
  { id: "data_block", name: "data_block", state: "Active", type: "STREAM_PIPE", latency: "11.8ms", mem: "128 MB", desc: "Dual-buffered AST streaming & token parser" },
  { id: "render_buffer", name: "render_buffer", state: "Active", type: "GPU_SURFACE", latency: "16.6ms", mem: "64 MB", desc: "3D Perspective viewport & CRT rasterizer engine" },
  { id: "node_vector", name: "node_vector", state: "Ready", type: "RAG_EMBED", latency: "21.4ms", mem: "96 MB", desc: "384-dimensional semantic code vector memory" },
  { id: "io_stream", name: "io_stream", state: "Active", type: "DUPLEX_NET", latency: "9.5ms", mem: "48 MB", desc: "Live GitHub websocket & duplex telemetry pipe" }
];

const SYSTEM_STATUS_INIT = [
  { id: "boot_seq", name: "Boot sequence", state: "Ready", metric: "100% OK", desc: "Core OS microkernel verified & locked" },
  { id: "render_buf", name: "Render buffer", state: "Active", metric: "60.0 FPS", desc: "DirectWebGL 3D surface composition" },
  { id: "input_ch", name: "Input channel", state: "Active", metric: "1000 Hz", desc: "Low-latency keyboard & cursor interrupt" },
  { id: "mem_block", name: "Memory block", state: "Ready", metric: "418 MB / 1024 MB", desc: "Volatile heap RAM partition allocated" },
  { id: "session_lp", name: "Session loop", state: "Active", metric: "Δ 16.6ms", desc: "Frame sync locked with zero drift" }
];

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
      return "#c8ff3d";
  }
};

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
  const [fontSize, setFontSize] = useState(13.5); // 12px to 22px
  const [wordWrap, setWordWrap] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false); // Focus / Fullscreen Mode
  const [activeLine, setActiveLine] = useState(null);

  // In-File Quick Find (Cmd+F / Ctrl+F)
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findMatches, setFindMatches] = useState([]);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // Brain Code Context & Selection State
  const [selectedAction, setSelectedAction] = useState("explain");
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [brainAnalysis, setBrainAnalysis] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);

  // Interactive AI Conversation Thread
  const [chatThread, setChatThread] = useState([]);

  // Floating Selection Action HUD
  const [showSelectionHud, setShowSelectionHud] = useState(false);
  const [hudCoords, setHudCoords] = useState({ top: 0, left: 0 });

  const codePreRef = useRef(null);
  const codeViewerRef = useRef(null);
  const findInputRef = useRef(null);
  const terminalChassisRef = useRef(null);
  const terminalScrollRef = useRef(null);

  // 3D Cyberpunk Terminal State
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [tiltEnabled, setTiltEnabled] = useState(true);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [timeStr, setTimeStr] = useState("");
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [activeNav, setActiveNav] = useState("MAIN"); // "MAIN" | "FILES" | "SYSTEM" | "MENU"
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState("modules"); // "modules" | "status" | "brain"
  const [modulesList, setModulesList] = useState(CYBER_MODULES_INIT);
  const [systemStatusList, setSystemStatusList] = useState(SYSTEM_STATUS_INIT);
  const [memoryUsage, setMemoryUsage] = useState({ used: 418, total: 1024 });

  // Bottom Terminal State
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalTab, setTerminalTab] = useState("all"); // "all" | "compile" | "runtime" | "system"
  const [terminalInput, setTerminalInput] = useState("");
  const [isRunningBuffer, setIsRunningBuffer] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, time: "00:00:01", type: "system", tag: "SYS", msg: "AXON // CORE TERMINAL v3.4 kernel loaded successfully." },
    { id: 2, time: "00:00:02", type: "info", tag: "INIT", msg: "Workspace context mounted: AXON RAG 384d vector engine ready." },
    { id: 3, time: "00:00:03", type: "success", tag: "OK", msg: "Subsystems online: core_init, data_block, render_buffer, node_vector, io_stream." },
    { id: 4, time: "00:00:04", type: "runtime", tag: "READY", msg: "3D Perspective viewport initialized. Awaiting buffer commands." }
  ]);

  // Digital Clock Live Stream
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const h = pad(now.getUTCHours());
      const m = pad(now.getUTCMinutes());
      const s = pad(now.getUTCSeconds());
      setTimeStr(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Online / Offline Network Telemetry
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Realistic Memory Usage Telemetry Loop
  useEffect(() => {
    const memInterval = setInterval(() => {
      setMemoryUsage((prev) => {
        const delta = (Math.random() - 0.48) * 3;
        const nextUsed = Math.min(620, Math.max(380, Math.round(prev.used + delta)));
        return { used: nextUsed, total: 1024 };
      });
    }, 4500);
    return () => clearInterval(memInterval);
  }, []);

  // 3D Chassis Mouse Tilt Calculator
  const handleMouseMove = (e) => {
    if (!tiltEnabled || !terminalChassisRef.current) return;
    const rect = terminalChassisRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({
      x: Number((-(y * 3.0)).toFixed(2)),
      y: Number(((x * 3.0)).toFixed(2))
    });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  // Bottom Terminal Append & Execution Handlers
  const appendTerminalLog = (type, tag, msg) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const t = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
    setTerminalLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), time: t, type, tag, msg }
    ]);
    setTimeout(() => {
      if (terminalScrollRef.current) {
        terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleRunBuffer = () => {
    if (isRunningBuffer || !activeFile) return;
    setIsRunningBuffer(true);
    appendTerminalLog("runtime", "EXEC", `Compiling buffer: ${activeFile.name} (${activeFile.language || "text"})...`);
    
    setTimeout(() => {
      appendTerminalLog("compile", "COMP", `Syntax validation: 0 errors, 0 warnings. Abstract Syntax Tree OK.`);
    }, 300);

    setTimeout(() => {
      const lineCount = activeFile.linesCount || (activeFile.content ? activeFile.content.split("\n").length : 0);
      appendTerminalLog("success", "OK", `Buffer executed successfully: ${lineCount} lines evaluated. Exit code: 0`);
      setIsRunningBuffer(false);
    }, 700);
  };

  const handleTerminalCommand = (e) => {
    if (e.key !== "Enter") return;
    const cmd = terminalInput.trim();
    if (!cmd) return;
    setTerminalInput("");
    appendTerminalLog("info", "CLI", `$ ${cmd}`);

    const lower = cmd.toLowerCase();
    if (lower === "clear" || lower === "cls") {
      setTerminalLogs([]);
    } else if (lower === "help") {
      appendTerminalLog("system", "HELP", "Available commands: run, compile, clear, status, modules, rag, ping, help");
    } else if (lower === "run" || lower === "compile") {
      handleRunBuffer();
    } else if (lower === "status") {
      appendTerminalLog("system", "SYS", `SYS: ${isOnline ? "ONLINE" : "OFFLINE"} | MEM: ${memoryUsage.used}MB/1024MB | MODE: DEV_KERNEL | FILES: ${files.length}`);
    } else if (lower === "modules") {
      appendTerminalLog("system", "MOD", "Active modules: core_init (Ready), data_block (Active), render_buffer (Active), node_vector (Ready), io_stream (Active)");
    } else if (lower === "rag") {
      appendTerminalLog("info", "RAG", "Project Brain RAG index: 384 dimensions, vector similarity: KNN, Provider: Groq");
    } else if (lower === "ping") {
      appendTerminalLog("success", "PONG", `Kernel latency: ${(Math.random() * 8 + 4).toFixed(1)}ms. Roundtrip OK.`);
    } else {
      appendTerminalLog("error", "ERR", `Command not recognized: '${cmd}'. Type 'help' for available commands.`);
    }
  };

  const toggleModuleState = (modId) => {
    setModulesList((prev) =>
      prev.map((m) => {
        if (m.id !== modId) return m;
        const nextState = m.state === "Ready" ? "Active" : m.state === "Active" ? "Error" : "Ready";
        appendTerminalLog("system", "MOD", `Module [${m.name}] transitioned to: ${nextState}`);
        return { ...m, state: nextState };
      })
    );
  };

  const filteredLogs = terminalLogs.filter((log) => {
    if (terminalTab === "all") return true;
    if (terminalTab === "compile") return log.type === "compile" || log.tag === "COMP";
    if (terminalTab === "runtime") return log.type === "runtime" || log.tag === "EXEC" || log.tag === "READY";
    if (terminalTab === "system") return log.type === "system" || log.type === "info" || log.tag === "SYS";
    return true;
  });

  // Global Keyboard Shortcuts (e.g. Cmd+F / Ctrl+F for Find, Esc to close)
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

    // Smooth scroll to line
    if (codeViewerRef.current) {
      const lineTarget = findMatches[nextIdx];
      const targetScroll = Math.max(0, (lineTarget - 5) * (fontSize * 1.7));
      codeViewerRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
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
      handleInspectCode("explain", activeFile.content.slice(0, 2000));
    }
  }, [activeFile?.content]);

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
      // Position floating HUD near cursor
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
      {/* Subtle CRT Monitor Scanlines Effect */}
      {crtEnabled && <div className="cyber-crt-scanlines" aria-hidden="true" />}

      {/* 3D Perspective Terminal Chassis */}
      <div
        className="cyber-terminal-chassis"
        ref={terminalChassisRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: tiltEnabled
            ? `perspective(1200px) rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg)`
            : "none"
        }}
      >
        {/* ============================================================
            1. TOP STATUS BAR (CORE TERMINAL, SYS STATUS, MEMORY, CLOCK)
            ============================================================ */}
        <div className="cyber-top-statusbar">
          <div className="cyber-status-left">
            <div className="cyber-system-brand">
              <span className="cyber-brand-marker">▲</span>
              <span className="cyber-brand-title">CORE TERMINAL</span>
              <span className="cyber-brand-ver">AXON_OS // v3.4</span>
            </div>

            {/* Online/Offline indicator */}
            <div className={`cyber-online-badge ${isOnline ? "is-online" : "is-offline"}`}>
              <span className="cyber-pulse-dot" />
              <span>{isOnline ? "SYS: ONLINE" : "SYS: OFFLINE"}</span>
            </div>

            {/* Operating Mode */}
            <div className="cyber-mode-badge mono-label">
              <span className="cyber-tag-dim">MODE:</span>
              <span className="cyber-mode-text">DEV_KERNEL</span>
            </div>

            {/* Memory Usage Meter */}
            <div className="cyber-memory-badge mono-label" title="Dynamic RAM telemetry">
              <span className="cyber-tag-dim">MEM:</span>
              <span className="cyber-mem-val">{memoryUsage.used} MB / {memoryUsage.total} MB</span>
              <div className="cyber-mem-meter-bar">
                <div
                  className="cyber-mem-fill"
                  style={{ width: `${((memoryUsage.used / memoryUsage.total) * 100).toFixed(0)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="cyber-status-right">
            {/* Live Digital Clock */}
            <div className="cyber-clock-display mono-label">
              <span className="cyber-clock-icon">⏱</span>
              <span>{timeStr || "00:00:00 UTC"}</span>
            </div>

            {/* CRT Scanline Toggle */}
            <button
              type="button"
              className={`cyber-toggle-btn ${crtEnabled ? "is-active" : ""}`}
              onClick={() => setCrtEnabled((c) => !c)}
              title="Toggle CRT Monitor Scanlines Effect"
            >
              CRT: {crtEnabled ? "ON" : "OFF"}
            </button>

            {/* 3D Tilt Toggle */}
            <button
              type="button"
              className={`cyber-toggle-btn ${tiltEnabled ? "is-active" : ""}`}
              onClick={() => {
                setTiltEnabled((t) => !t);
                if (tiltEnabled) setMouseTilt({ x: 0, y: 0 });
              }}
              title="Toggle 3D Perspective Mouse Tilt"
            >
              3D: {tiltEnabled ? "ON" : "OFF"}
            </button>

            {/* Sync GitHub */}
            <button
              type="button"
              className="cyber-action-btn"
              onClick={fetchFiles}
              title="Refresh repository files live from GitHub"
            >
              <RefreshCw size={12} className={loadingFiles ? "spin" : ""} />
              <span>SYNC REPO</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            2. NAVIGATION BAR (MAIN, FILES, SYSTEM, MENU)
            ============================================================ */}
        <div className="cyber-navbar">
          <div className="cyber-nav-left">
            <button
              type="button"
              className={`cyber-nav-btn ${activeNav === "MAIN" && studioMode === "editor" ? "is-active" : ""}`}
              onClick={() => {
                setActiveNav("MAIN");
                setStudioMode("editor");
                setIsMaximized(false);
              }}
            >
              <span className="cyber-btn-corner" />
              <span className="cyber-nav-text">MAIN</span>
            </button>

            <button
              type="button"
              className={`cyber-nav-btn ${activeNav === "FILES" && studioMode === "editor" ? "is-active" : ""}`}
              onClick={() => {
                setActiveNav("FILES");
                setStudioMode("editor");
                setIsMaximized(false);
              }}
            >
              <span className="cyber-btn-corner" />
              <span className="cyber-nav-text">FILES</span>
              <span className="cyber-nav-badge">{files.length}</span>
            </button>

            <button
              type="button"
              className={`cyber-nav-btn ${activeNav === "SYSTEM" && studioMode === "editor" ? "is-active" : ""}`}
              onClick={() => {
                setActiveNav("SYSTEM");
                setStudioMode("editor");
                setIsMaximized(false);
                setRightSidebarTab("status");
              }}
            >
              <span className="cyber-btn-corner" />
              <span className="cyber-nav-text">SYSTEM</span>
              <span className="cyber-nav-badge-green">ONLINE</span>
            </button>

            <div className="cyber-nav-menu-wrapper" style={{ position: "relative" }}>
              <button
                type="button"
                className={`cyber-nav-btn ${showNavMenu || studioMode !== "editor" ? "is-active" : ""}`}
                onClick={() => setShowNavMenu((m) => !m)}
              >
                <span className="cyber-btn-corner" />
                <span className="cyber-nav-text">MENU</span>
                <ChevronDown size={11} className={showNavMenu ? "rotate-180" : ""} />
              </button>

              {/* Futuristic Menu Dropdown */}
              {showNavMenu && (
                <div className="cyber-menu-dropdown">
                  <div className="cyber-menu-heading mono-label">// SELECT PERSPECTIVE MODE</div>
                  <button
                    type="button"
                    className={`cyber-menu-item ${studioMode === "editor" ? "is-active" : ""}`}
                    onClick={() => {
                      setStudioMode("editor");
                      setActiveNav("MAIN");
                      setShowNavMenu(false);
                    }}
                  >
                    <Code2 size={13} color="#00FF66" />
                    <span>Code Terminal (Core Editor)</span>
                  </button>
                  <button
                    type="button"
                    className={`cyber-menu-item ${studioMode === "timemachine" ? "is-active" : ""}`}
                    onClick={() => {
                      setStudioMode("timemachine");
                      setShowNavMenu(false);
                    }}
                  >
                    <History size={13} color="#00FF66" />
                    <span>Time Machine (Commit Revisions)</span>
                  </button>
                  <button
                    type="button"
                    className={`cyber-menu-item ${studioMode === "flowchart" ? "is-active" : ""}`}
                    onClick={() => {
                      setStudioMode("flowchart");
                      setShowNavMenu(false);
                    }}
                  >
                    <Palette size={13} color="#00FF66" />
                    <span>Architecture Flowcharts</span>
                  </button>
                  <button
                    type="button"
                    className={`cyber-menu-item ${studioMode === "pr-review" ? "is-active" : ""}`}
                    onClick={() => {
                      setStudioMode("pr-review");
                      setShowNavMenu(false);
                    }}
                  >
                    <GitPullRequest size={13} color="#00FF66" />
                    <span>PR Reviewer Intelligence</span>
                  </button>
                  <div className="cyber-menu-divider" />
                  <button
                    type="button"
                    className="cyber-menu-item"
                    onClick={() => {
                      setIsMaximized((m) => !m);
                      setShowNavMenu(false);
                    }}
                  >
                    {isMaximized ? <Minimize2 size={13} color="#00FF66" /> : <Maximize2 size={13} color="#00FF66" />}
                    <span>{isMaximized ? "Exit Focus Mode" : "Focus / Fullscreen View"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Perspective Switcher */}
            <div className="studio-mode-switcher">
              <button
                type="button"
                className={`studio-mode-tab ${studioMode === "editor" ? "is-active" : ""}`}
                onClick={() => setStudioMode("editor")}
              >
                <Code2 size={12} />
                <span>Editor</span>
              </button>
              <button
                type="button"
                className={`studio-mode-tab studio-mode-tab--tm ${studioMode === "timemachine" ? "is-active" : ""}`}
                onClick={() => setStudioMode("timemachine")}
              >
                <History size={12} color={studioMode === "timemachine" ? "#00FF66" : "#888"} />
                <span>Revisions</span>
              </button>
              <button
                type="button"
                className={`studio-mode-tab studio-mode-tab--flow ${studioMode === "flowchart" ? "is-active" : ""}`}
                onClick={() => setStudioMode("flowchart")}
              >
                <Palette size={12} color={studioMode === "flowchart" ? "#00FF66" : "#888"} />
                <span>Flowcharts</span>
              </button>
              <button
                type="button"
                className={`studio-mode-tab studio-mode-tab--pr ${studioMode === "pr-review" ? "is-active" : ""}`}
                onClick={() => setStudioMode("pr-review")}
              >
                <GitPullRequest size={12} color={studioMode === "pr-review" ? "#00FF66" : "#888"} />
                <span>PR Review</span>
              </button>
            </div>
          </div>

          <div className="cyber-nav-right">
            <div className="cyber-repo-pill mono-label">
              <Github size={12} color="#00FF66" />
              <span className="cyber-repo-name">{workspace.repository.fullName || workspace.repository.name}</span>
              <span className="cyber-branch-tag">:{workspace.repository.defaultBranch || "main"}</span>
              {isLiveGitHub && (
                <span className="live-github-pill" title="Live stream from GitHub API">
                  <span className="live-dot" /> LIVE
                </span>
              )}
            </div>

            {/* Quick In-File Search */}
            <button
              type="button"
              className={`cyber-rect-btn ${findOpen ? "is-active" : ""}`}
              onClick={() => {
                setFindOpen((o) => !o);
                if (!findOpen) setTimeout(() => findInputRef.current?.focus(), 50);
              }}
              title="Find in active file (Ctrl+F)"
            >
              <Search size={12} />
              <span>FIND</span>
            </button>

            {/* Quick Focus Mode toggle */}
            <button
              type="button"
              className={`cyber-rect-btn ${isMaximized ? "is-active" : ""}`}
              onClick={() => setIsMaximized((m) => !m)}
              title={isMaximized ? "Exit Focus Mode" : "Focus / Fullscreen View"}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span>{isMaximized ? "RESTORE" : "FOCUS"}</span>
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
            <div className="filetree-list">
              {loadingFiles ? (
                <div className="filetree-loading">
                  <RefreshCw size={18} className="spin text-lime" />
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
                      <div className="filetree-item-top">
                        <span className="file-icon">
                          {isDoc ? (
                            <FileText size={13} color="#979b91" />
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
                    <FileCode size={13} color={isActive ? "#c8ff3d" : "#888"} />
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
                    <Check size={11} color="#c8ff3d" />
                    <span>Snippet ({selectedSnippet.length}c)</span>
                    <button
                      type="button"
                      className="clear-snippet-btn"
                      onClick={() => {
                        setSelectedSnippet("");
                        setShowSelectionHud(false);
                      }}
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
                  <span>Ask Brain</span>
                </button>
              </div>
            </div>

            {/* ============================================================
                EXPANDED CODE VIEWER VIEWPORT (UNIFIED SINGLE SCROLL CONTAINER)
                ============================================================ */}
            <div
              className="code-viewer-container"
              ref={codeViewerRef}
              onMouseUp={handleCodeMouseUp}
            >
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
                    onClick={() => handleInspectCode("explain", selectedSnippet)}
                  >
                    Explain
                  </button>
                  <button
                    type="button"
                    className="hud-action-btn"
                    onClick={() => handleInspectCode("optimize", selectedSnippet)}
                  >
                    Optimize
                  </button>
                  <button
                    type="button"
                    className="hud-action-btn"
                    onClick={() => handleInspectCode("security", selectedSnippet)}
                  >
                    Security
                  </button>
                  <button
                    type="button"
                    className="hud-action-btn"
                    onClick={() => handleInspectCode("tests", selectedSnippet)}
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
                  <RefreshCw size={32} className="spin text-lime" />
                  <p style={{ color: "#fff", fontWeight: 600, marginTop: "12px", fontSize: "15px" }}>
                    Streaming live from GitHub...
                  </p>
                  <span className="mono-label" style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "12px" }}>
                    {activeFile?.path}
                  </span>
                </div>
              ) : activeFile ? (
                <div className="code-editor-viewport">
                  {/* Sticky Pinned Line Numbers Gutter */}
                  <div
                    className="line-numbers-gutter"
                    aria-hidden="true"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                  >
                    {(activeFile.content || "")
                      .split("\n")
                      .map((_, idx) => {
                        const lineNum = idx + 1;
                        const isMatch = findMatches.includes(lineNum);
                        const isCurrentActive = activeLine === lineNum;
                        return (
                          <span
                            key={idx}
                            className={`line-num ${isMatch ? "is-match" : ""} ${isCurrentActive ? "is-active" : ""}`}
                            onClick={() => setActiveLine(lineNum)}
                            title={`Jump to line ${lineNum}`}
                          >
                            {lineNum}
                          </span>
                        );
                      })}
                  </div>

                  {/* Preformatted Code Content with Unified Scrolling */}
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
                    <code>{activeFile.content || "// File content is empty."}</code>
                    <span className="cyber-terminal-cursor" aria-hidden="true">█</span>
                  </pre>
                </div>
              ) : (
                <div className="code-editor-empty">
                  <Code2 size={40} color="#00FF66" />
                  <p style={{ fontSize: "15px" }}>Select any repository file from the Explorer on the left</p>
                </div>
              )}
            </div>

            {/* ============================================================
                BOTTOM TERMINAL (LOGS, COMPILE, RUNTIME, CLI INTERFACE)
                ============================================================ */}
            <div className={`cyber-bottom-terminal ${terminalOpen ? "is-open" : "is-collapsed"}`}>
              <div className="terminal-header-strip">
                <div className="terminal-title-group">
                  <Terminal size={13} color="#00FF66" />
                  <span className="terminal-title-text mono-label">AXON_TERMINAL // STDOUT &amp; RUNTIME</span>
                  <span className="terminal-status-tag mono-label">ONLINE • EXIT: 0</span>
                </div>

                {/* Filter Tabs */}
                <div className="terminal-filter-tabs">
                  <button
                    type="button"
                    className={`term-tab ${terminalTab === "all" ? "is-active" : ""}`}
                    onClick={() => setTerminalTab("all")}
                  >
                    ALL ({terminalLogs.length})
                  </button>
                  <button
                    type="button"
                    className={`term-tab ${terminalTab === "compile" ? "is-active" : ""}`}
                    onClick={() => setTerminalTab("compile")}
                  >
                    COMPILE
                  </button>
                  <button
                    type="button"
                    className={`term-tab ${terminalTab === "runtime" ? "is-active" : ""}`}
                    onClick={() => setTerminalTab("runtime")}
                  >
                    RUNTIME
                  </button>
                  <button
                    type="button"
                    className={`term-tab ${terminalTab === "system" ? "is-active" : ""}`}
                    onClick={() => setTerminalTab("system")}
                  >
                    SYSTEM
                  </button>
                </div>

                {/* Terminal Actions */}
                <div className="terminal-actions-group">
                  <button
                    type="button"
                    className="term-run-btn"
                    onClick={handleRunBuffer}
                    disabled={isRunningBuffer || !activeFile}
                    title="Compile & Run current active file"
                  >
                    {isRunningBuffer ? <RefreshCw size={11} className="spin" /> : <Play size={11} fill="#00FF66" />}
                    <span>{isRunningBuffer ? "COMPILING..." : "RUN BUFFER"}</span>
                  </button>
                  <button
                    type="button"
                    className="term-ctrl-btn"
                    onClick={() => setTerminalLogs([])}
                    title="Clear Terminal Output"
                  >
                    <Trash2 size={11} />
                    <span>CLEAR</span>
                  </button>
                  <button
                    type="button"
                    className="term-ctrl-btn"
                    onClick={() => setTerminalOpen((o) => !o)}
                    title={terminalOpen ? "Collapse Terminal" : "Expand Terminal"}
                  >
                    {terminalOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                  </button>
                </div>
              </div>

              {/* Terminal Logs & Interactive CLI Input */}
              {terminalOpen && (
                <div className="terminal-body-scroll" ref={terminalScrollRef}>
                  <div className="terminal-logs-stream mono-label">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className={`terminal-log-row log-${log.type}`}>
                        <span className="log-time">[{log.time}]</span>
                        <span className={`log-tag tag-${log.type}`}>[{log.tag}]</span>
                        <span className="log-message">{log.msg}</span>
                      </div>
                    ))}
                    {isRunningBuffer && (
                      <div className="terminal-log-row log-runtime">
                        <span className="log-time">[{new Date().toUTCString().slice(17, 25)}]</span>
                        <span className="log-tag tag-runtime">[EXEC]</span>
                        <span className="log-message">
                          Executing AST pipeline... <span className="cyber-terminal-cursor">█</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="terminal-cli-bar">
                    <span className="cli-prompt mono-label">axon@core-terminal:~$</span>
                    <input
                      type="text"
                      className="cli-input mono-label"
                      placeholder="Type CLI command (e.g. 'run', 'compile', 'status', 'modules', 'ping', 'help')..."
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={handleTerminalCommand}
                    />
                    <span className="cyber-terminal-cursor">█</span>
                  </div>
                </div>
              )}
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
                  <span style={{ fontSize: "10px", color: "#666" }}>FONT:</span>
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
                  title={isMaximized ? "Restore sidebars" : "Focus / Fullscreen Mode (collapse sidebars)"}
                >
                  {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  <span>{isMaximized ? "Exit Focus" : "Focus View"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================
              PANE 3: CYBER RIGHT SIDEBAR (MODULES, SYSTEM STATUS, BRAIN)
              ============================================================ */}
          <div className="studio-pane studio-cyber-sidebar-pane">
            <div className="pane-header cyber-sidebar-header">
              <div className="cyber-sidebar-tabs">
                <button
                  type="button"
                  className={`cyber-side-tab ${rightSidebarTab === "modules" ? "is-active" : ""}`}
                  onClick={() => setRightSidebarTab("modules")}
                  title="Hardware & Subsystem Modules"
                >
                  <Layers size={12} />
                  <span>MODULES</span>
                  <span className="cyber-tab-badge">5</span>
                </button>
                <button
                  type="button"
                  className={`cyber-side-tab ${rightSidebarTab === "status" ? "is-active" : ""}`}
                  onClick={() => setRightSidebarTab("status")}
                  title="Real-Time System Diagnostics"
                >
                  <Activity size={12} />
                  <span>SYSTEM STATUS</span>
                  <span className="cyber-tab-badge-green">OK</span>
                </button>
                <button
                  type="button"
                  className={`cyber-side-tab ${rightSidebarTab === "brain" ? "is-active" : ""}`}
                  onClick={() => setRightSidebarTab("brain")}
                  title="Project Brain Vector Intelligence"
                >
                  <Sparkles size={12} />
                  <span>PROJECT BRAIN</span>
                </button>
              </div>

              {rightSidebarTab === "brain" && chatThread.length > 1 && (
                <button
                  type="button"
                  className="brain-clear-chat-btn"
                  onClick={() => setChatThread([])}
                  title="Clear analysis thread"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* TAB CONTENT 1: MODULES PANEL */}
            {rightSidebarTab === "modules" && (
              <div className="cyber-modules-panel">
                <div className="cyber-panel-legend mono-label">
                  <span>// CORE HARDWARE &amp; LOGIC MODULES</span>
                  <span className="text-dim">TOTAL: {modulesList.length}</span>
                </div>

                <div className="cyber-modules-list">
                  {modulesList.map((mod) => (
                    <div key={mod.id} className="cyber-module-card">
                      <div className="mod-card-top">
                        <div className="mod-title-group">
                          <span className="mod-accent-mark">›</span>
                          <span className="mod-name mono-label">{mod.name}</span>
                          <span className="mod-type-tag mono-label">{mod.type}</span>
                        </div>
                        <button
                          type="button"
                          className={`mod-status-indicator state-${mod.state.toLowerCase()}`}
                          onClick={() => toggleModuleState(mod.id)}
                          title={`Click to cycle module state (Current: ${mod.state})`}
                        >
                          <span className="status-dot" />
                          <span className="status-text">{mod.state}</span>
                        </button>
                      </div>

                      <p className="mod-desc">{mod.desc}</p>

                      <div className="mod-telemetry-row mono-label">
                        <span className="mod-stat">
                          <span className="stat-label">LATENCY:</span> {mod.latency}
                        </span>
                        <span className="mod-stat">
                          <span className="stat-label">ALLOC:</span> {mod.mem}
                        </span>
                        <button
                          type="button"
                          className="mod-ping-btn"
                          onClick={() => {
                            appendTerminalLog(
                              "info",
                              "MOD",
                              `Diagnostic ping sent to [${mod.name}]: ACK OK, latency=${(Math.random() * 5 + 3).toFixed(1)}ms`
                            );
                          }}
                        >
                          PING
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subsystem Summary Footer */}
                <div className="cyber-subsystem-footer mono-label">
                  <div className="footer-stat">
                    <span>ACTIVE BUFFER:</span>
                    <strong className="text-lime">0x8F4A</strong>
                  </div>
                  <div className="footer-stat">
                    <span>BUS LOAD:</span>
                    <strong className="text-lime">14.2%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: SYSTEM STATUS PANEL */}
            {rightSidebarTab === "status" && (
              <div className="cyber-status-panel">
                <div className="cyber-panel-legend mono-label">
                  <span>// SUBSYSTEM HEALTH &amp; TELEMETRY</span>
                  <span className="text-lime">KERNEL: v3.4.19</span>
                </div>

                <div className="cyber-system-status-list">
                  {systemStatusList.map((item) => (
                    <div key={item.id} className="cyber-status-row">
                      <div className="status-row-left">
                        <div className="status-indicator-pill">
                          <span className={`status-glow-dot dot-${item.state.toLowerCase()}`} />
                        </div>
                        <div className="status-text-meta">
                          <span className="status-item-name">{item.name}</span>
                          <span className="status-item-desc">{item.desc}</span>
                        </div>
                      </div>
                      <div className="status-row-right">
                        <span className={`status-metric-badge badge-${item.state.toLowerCase()} mono-label`}>
                          {item.state === "Ready" ? "READY" : item.state === "Active" ? "ACTIVE" : "ERROR"}
                        </span>
                        <span className="status-sub-metric mono-label">{item.metric}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hardware Telemetry Gauges */}
                <div className="cyber-gauges-section">
                  <span className="cyber-gauge-title mono-label">DYNAMIC HARDWARE UTILIZATION</span>

                  <div className="cyber-gauge-item">
                    <div className="gauge-label-row mono-label">
                      <span>VOLATILE RAM ALLOCATION</span>
                      <span className="text-lime">{memoryUsage.used} MB / {memoryUsage.total} MB</span>
                    </div>
                    <div className="cyber-gauge-track">
                      <div
                        className="cyber-gauge-bar bar-lime"
                        style={{ width: `${((memoryUsage.used / memoryUsage.total) * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="cyber-gauge-item">
                    <div className="gauge-label-row mono-label">
                      <span>PIPELINE INSTRUCTION LOAD</span>
                      <span className="text-cyan">34.8% • 4.2 GHz</span>
                    </div>
                    <div className="cyber-gauge-track">
                      <div className="cyber-gauge-bar bar-cyan" style={{ width: "35%" }} />
                    </div>
                  </div>

                  <div className="cyber-gauge-item">
                    <div className="gauge-label-row mono-label">
                      <span>PACKET DUPLEX STABILITY</span>
                      <span className="text-lime">99.98% • TLS 1.3</span>
                    </div>
                    <div className="cyber-gauge-track">
                      <div className="cyber-gauge-bar bar-lime" style={{ width: "99.8%" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: PROJECT BRAIN INTELLIGENCE */}
            {rightSidebarTab === "brain" && (
              <div className="brain-pane-body">
                {/* Active Mode Info Card */}
                <div className="brain-mode-card">
                  <div className="brain-mode-header">
                    <currentActionObj.icon size={15} color="#00FF66" />
                    <strong>{currentActionObj.label}</strong>
                  </div>
                  <p>{currentActionObj.desc}</p>
                </div>

                {/* Single Smooth Scroll Analysis Output Container */}
                <div className="brain-analysis-output">
                  {isInspecting ? (
                    <div className="brain-inspecting-state">
                      <RefreshCw size={26} className="spin text-lime" />
                      <h4>Project Brain is Analyzing...</h4>
                      <p>Synthesizing code architecture with Groq &amp; RAG vector chunks.</p>
                    </div>
                  ) : chatThread.length > 0 ? (
                    <div className="brain-messages-stream">
                      {chatThread.map((turn, tIdx) => (
                        <div key={turn.id || tIdx} className="brain-chat-turn">
                          <div className="analysis-header-row">
                            <span className="mono-label turn-title">
                              <Sparkles size={11} className="text-lime" />
                              {turn.prompt}
                              <span className="turn-timestamp">{turn.timestamp}</span>
                            </span>
                            <button
                              type="button"
                              className="copy-analysis-btn"
                              onClick={() => handleCopyAnalysis(turn.analysis)}
                            >
                              <Copy size={12} />
                              <span>Copy</span>
                            </button>
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
                        <span className="mono-label turn-title">
                          <Sparkles size={11} className="text-lime" />
                          AI CODE ANALYSIS
                        </span>
                        <button
                          type="button"
                          className="copy-analysis-btn"
                          onClick={() => handleCopyAnalysis(brainAnalysis.analysis)}
                        >
                          {copiedAnalysis ? <Check size={12} color="#00FF66" /> : <Copy size={12} />}
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
                    </>
                  ) : (
                    <div className="brain-empty-state">
                      <Sparkles size={24} color="#666" />
                      <p>Click "Ask Brain" or type a custom prompt to inspect this file's architecture or highlight any code snippet.</p>
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
                      title="Send to Brain"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
