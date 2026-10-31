import { useState, useEffect } from "react";
import {
  History,
  Clock,
  GitCommit,
  GitCompare,
  GitBranch,
  Layers,
  Cpu,
  Database,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  Search,
  FileText,
  ChevronRight,
  Download,
  RefreshCw,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Calendar,
  Filter,
  Package,
  FolderGit2,
  AlertCircle,
  Eye,
  X,
  MessageSquare,
  Send,
  HelpCircle
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import { API_BASE } from "../config/api.js";

export default function TimeMachine({ workspace, token, onSwitchPerspective }) {
  const [activeView, setActiveView] = useState("timeline"); // "timeline" | "evolution" | "compare" | "ask"

  // Commits & Snapshot State
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [selectedSha, setSelectedSha] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [commitSearch, setCommitSearch] = useState("");
  const [snapshotTab, setSnapshotTab] = useState("explain"); // "explain" | "changed" | "tree" | "ask_commit"

  // AI Commit Explanation & Q&A State
  const [commitExplanations, setCommitExplanations] = useState({});
  const [explainingCommit, setExplainingCommit] = useState(false);
  const [commitQuestion, setCommitQuestion] = useState("");
  const [commitQAs, setCommitQAs] = useState({}); // { [sha]: [{ question, answer, loading }] }
  const [askingCommit, setAskingCommit] = useState(false);

  // Historical File Viewer
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Architecture Evolution State
  const [evolutionData, setEvolutionData] = useState(null);
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [evolutionFilter, setEvolutionFilter] = useState("ALL");

  // Version Comparison State
  const [compareBase, setCompareBase] = useState("");
  const [compareTarget, setCompareTarget] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  // General Historical Intelligence Q&A State
  const [askQuestion, setAskQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState([]);
  const [asking, setAsking] = useState(false);

  // General feedback
  const [copiedSha, setCopiedSha] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  // 1. Initial Load: Fetch Commits Timeline
  useEffect(() => {
    if (!workspace?.id) return;
    loadCommitTimeline();
  }, [workspace?.id]);

  const loadCommitTimeline = async () => {
    try {
      setLoadingCommits(true);
      setErrorNotice(null);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/time-machine/commits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.commits) {
        setCommits(data.commits);
        if (data.commits.length > 0) {
          const firstSha = data.commits[0].sha;
          setSelectedSha(firstSha);
          loadSnapshot(firstSha);
          // Set defaults for comparison
          if (data.commits.length >= 2) {
            setCompareBase(data.commits[1].sha);
            setCompareTarget(data.commits[0].sha);
          }
        }
      } else {
        setErrorNotice(data.error || "Failed to load commit timeline.");
      }
    } catch (err) {
      console.error("loadCommitTimeline error:", err);
      setErrorNotice("Could not connect to workspace repository.");
    } finally {
      setLoadingCommits(false);
    }
  };

  // 2. Load Snapshot when selected commit changes
  const loadSnapshot = async (sha) => {
    if (!sha || !workspace?.id) return;
    try {
      setLoadingSnapshot(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/time-machine/snapshot/${sha}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSnapshot(data);
        // Automatically fetch plain-language explanation if not cached
        if (!commitExplanations[sha]) {
          fetchCommitExplanation(sha);
        }
      }
    } catch (err) {
      console.error("loadSnapshot error:", err);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  // 3. Fetch Plain-Language Commit Explanation using Groq 120B + RAG
  const fetchCommitExplanation = async (sha) => {
    if (!sha || !workspace?.id) return;
    try {
      setExplainingCommit(true);
      const res = await fetch(
        `${API_BASE}/workspaces/${workspace.id}/time-machine/commit/${sha}/explain`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setCommitExplanations((prev) => ({ ...prev, [sha]: data }));
      }
    } catch (err) {
      console.error("fetchCommitExplanation error:", err);
    } finally {
      setExplainingCommit(false);
    }
  };

  // 4. Ask a Question specifically about the currently selected commit
  const handleAskAboutCommit = async (customQ) => {
    const q = customQ || commitQuestion;
    if (!q || !q.trim() || !selectedSha || !workspace?.id) return;

    const currentSha = selectedSha;
    const newEntry = { question: q.trim(), answer: null, loading: true };

    setCommitQAs((prev) => ({
      ...prev,
      [currentSha]: [newEntry, ...(prev[currentSha] || [])]
    }));
    setCommitQuestion("");
    setSnapshotTab("ask_commit");

    try {
      setAskingCommit(true);
      const res = await fetch(
        `${API_BASE}/workspaces/${workspace.id}/time-machine/commit/${currentSha}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ question: q.trim() })
        }
      );
      const data = await res.json();

      setCommitQAs((prev) => ({
        ...prev,
        [currentSha]: (prev[currentSha] || []).map((item, idx) =>
          idx === 0
            ? {
                ...item,
                answer: data.answer || "Answer synthesized from commit diff and Project Brain.",
                loading: false
              }
            : item
        )
      }));
    } catch (err) {
      setCommitQAs((prev) => ({
        ...prev,
        [currentSha]: (prev[currentSha] || []).map((item, idx) =>
          idx === 0
            ? {
                ...item,
                answer: "Network error answering question about this commit.",
                loading: false
              }
            : item
        )
      }));
    } finally {
      setAskingCommit(false);
    }
  };

  // 5. Load Architecture Evolution
  const loadEvolution = async () => {
    if (!workspace?.id) return;
    try {
      setLoadingEvolution(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/time-machine/evolution`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEvolutionData(data);
      }
    } catch (err) {
      console.error("loadEvolution error:", err);
    } finally {
      setLoadingEvolution(false);
    }
  };

  // 6. View Historical File Content
  const handleOpenFileContent = async (filePath, shaToUse) => {
    const sha = shaToUse || selectedSha;
    if (!sha || !filePath) return;

    try {
      setViewingFile({ path: filePath, sha });
      setLoadingFile(true);
      const res = await fetch(
        `${API_BASE}/workspaces/${workspace.id}/time-machine/file?sha=${sha}&filePath=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setFileContent(data);
      } else {
        setFileContent({ error: data.error || "Failed to load historical file content" });
      }
    } catch (err) {
      setFileContent({ error: "Network error loading historical file" });
    } finally {
      setLoadingFile(false);
    }
  };

  // 7. Compare Two Versions
  const handleRunComparison = async () => {
    if (!compareBase || !compareTarget || !workspace?.id) return;
    try {
      setComparing(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/time-machine/compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ baseSha: compareBase, targetSha: compareTarget })
      });
      const data = await res.json();
      if (res.ok) {
        setCompareResult(data);
      } else {
        setCompareResult({ error: data.error || "Comparison failed." });
      }
    } catch (err) {
      setCompareResult({ error: "Network error during version comparison." });
    } finally {
      setComparing(false);
    }
  };

  // 8. General Historical Question
  const handleAskHistory = async (customQ) => {
    const query = customQ || askQuestion;
    if (!query || !query.trim() || !workspace?.id) return;

    const userEntry = { question: query.trim(), answer: null, loading: true };
    setQaHistory((prev) => [userEntry, ...prev]);
    setAskQuestion("");

    try {
      setAsking(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/time-machine/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: query.trim() })
      });
      const data = await res.json();

      setQaHistory((prev) =>
        prev.map((item, i) =>
          i === 0
            ? {
                ...item,
                answer: data.answer || "Historical analysis generated from commit logs.",
                loading: false
              }
            : item
        )
      );
    } catch (err) {
      setQaHistory((prev) =>
        prev.map((item, i) =>
          i === 0
            ? { ...item, answer: "Network error querying historical intelligence.", loading: false }
            : item
        )
      );
    } finally {
      setAsking(false);
    }
  };

  const copyToClipboard = (text, shaKey) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(shaKey);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  // Filtered Commits
  const filteredCommits = commits.filter((c) => {
    if (!commitSearch) return true;
    const q = commitSearch.toLowerCase();
    return (
      c.message.toLowerCase().includes(q) ||
      c.shortSha.toLowerCase().includes(q) ||
      c.author.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  });

  const currentCommitExplanation = selectedSha ? commitExplanations[selectedSha] : null;
  const currentCommitQAList = selectedSha ? commitQAs[selectedSha] || [] : [];

  return (
    <div className="time-machine-container">
      {/* ========================================================
          1. TIME MACHINE TOP BANNER & STATS
          ======================================================== */}
      <div className="tm-banner">
        <div className="tm-banner-left">
          <div className="mono-label tm-kicker-pill">
            <History size={13} color="#a855f7" />
            <span>TIME MACHINE • EVOLUTION INTELLIGENCE</span>
          </div>
          <h2>Project Evolution &amp; Architectural Timeline</h2>
          <p>
            Explore your repository at any historical commit, inspect file versions, track structural
            revisions, compare releases, and ask Project Brain about architectural decisions.
          </p>

          <div className="tm-repo-pills">
            <span className="tm-meta-pill mono-label">
              <FolderGit2 size={12} color="#c8ff3d" />
              <span>{workspace?.repository?.fullName || workspace?.name || "Connected Repo"}</span>
            </span>
            <span className="tm-meta-pill mono-label">
              <GitBranch size={12} color="#38bdf8" />
              <span>{workspace?.repository?.defaultBranch || "main"}</span>
            </span>
            <span className="tm-meta-pill mono-label">
              <GitCommit size={12} color="#a855f7" />
              <span>{commits.length} Historical Commits</span>
            </span>
          </div>
        </div>

        <div className="tm-banner-actions">
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={loadCommitTimeline}
            disabled={loadingCommits}
          >
            <RefreshCw size={14} className={loadingCommits ? "spin" : ""} />
            <span>Sync Git History</span>
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="tm-error-card">
          <AlertCircle size={18} color="#ef4444" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* ========================================================
          2. VIEW NAVIGATION TABS
          ======================================================== */}
      <div className="tm-view-tabs">
        <button
          type="button"
          className={`tm-tab-btn ${activeView === "timeline" ? "is-active" : ""}`}
          onClick={() => setActiveView("timeline")}
        >
          <History size={15} />
          <span>Historical Snapshots</span>
          <span className="tm-tab-count mono-label">{commits.length}</span>
        </button>

        <button
          type="button"
          className={`tm-tab-btn ${activeView === "evolution" ? "is-active" : ""}`}
          onClick={() => {
            setActiveView("evolution");
            if (!evolutionData) loadEvolution();
          }}
        >
          <Cpu size={15} />
          <span>Architecture Evolution</span>
          {evolutionData?.stats?.totalMilestones && (
            <span className="tm-tab-count mono-label">
              {evolutionData.stats.totalMilestones}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tm-tab-btn ${activeView === "compare" ? "is-active" : ""}`}
          onClick={() => setActiveView("compare")}
        >
          <GitCompare size={15} />
          <span>Version Comparison</span>
        </button>

        <button
          type="button"
          className={`tm-tab-btn ${activeView === "ask" ? "is-active" : ""}`}
          onClick={() => setActiveView("ask")}
        >
          <Sparkles size={15} color="#c8ff3d" />
          <span>Ask Time Machine (AI)</span>
        </button>
      </div>

      {/* ========================================================
          VIEW 1: HISTORICAL SNAPSHOTS & COMMITS TIMELINE
          ======================================================== */}
      {activeView === "timeline" && (
        <div className="tm-timeline-layout">
          {/* Left Column: Commits Timeline Stream */}
          <div className="tm-commits-column">
            <div className="tm-commits-search">
              <Search size={14} color="#777" />
              <input
                type="text"
                placeholder="Search commits by message, SHA, author..."
                value={commitSearch}
                onChange={(e) => setCommitSearch(e.target.value)}
              />
              {commitSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setCommitSearch("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="tm-commits-list">
              {loadingCommits ? (
                <div className="tm-loading-state">
                  <RefreshCw size={22} className="spin" color="#a855f7" />
                  <span>Loading commit history...</span>
                </div>
              ) : filteredCommits.length === 0 ? (
                <div className="tm-empty-state">No matching commits found.</div>
              ) : (
                filteredCommits.map((c) => {
                  const isSelected = selectedSha === c.sha;
                  return (
                    <div
                      key={c.sha}
                      className={`tm-commit-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedSha(c.sha);
                        loadSnapshot(c.sha);
                      }}
                    >
                      <div className="tm-commit-top">
                        <span className={`tm-type-badge tm-type--${c.type} mono-label`}>
                          {c.type.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          className="tm-sha-btn mono-label"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(c.sha, c.sha);
                          }}
                          title="Copy full SHA"
                        >
                          {copiedSha === c.sha ? (
                            <Check size={11} color="#c8ff3d" />
                          ) : (
                            <Copy size={11} />
                          )}
                          <span>{c.shortSha}</span>
                        </button>
                      </div>

                      <div className="tm-commit-msg">{c.message}</div>

                      <div className="tm-commit-meta mono-label">
                        <span>{c.author}</span>
                        <span>•</span>
                        <span>{c.date}</span>
                        <span>•</span>
                        <span className="tm-commit-time">{c.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Commit Snapshot Details */}
          <div className="tm-snapshot-column">
            {loadingSnapshot ? (
              <div className="tm-snapshot-loading">
                <RefreshCw size={32} className="spin" color="#c8ff3d" />
                <h3>Travelling Back in Time...</h3>
                <p>Retrieving tree hierarchy, file deltas, and architecture milestone.</p>
              </div>
            ) : snapshot ? (
              <div className="tm-snapshot-card">
                {/* Snapshot Header */}
                <div className="tm-snapshot-header">
                  <div className="tm-snapshot-header-left">
                    <div className="tm-snapshot-sha-row">
                      <span className="mono-label kicker-pill">
                        <GitCommit size={12} color="#c8ff3d" />
                        <span>SNAPSHOT AT COMMIT {snapshot.commit.shortSha}</span>
                      </span>
                      {snapshot.milestone && (
                        <span
                          className="tm-milestone-pill mono-label"
                          style={{
                            borderColor: snapshot.milestone.color,
                            color: snapshot.milestone.color
                          }}
                        >
                          {snapshot.milestone.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="tm-snapshot-title">{snapshot.commit.subject}</h3>
                    {snapshot.commit.body && (
                      <div className="tm-snapshot-body">{snapshot.commit.body}</div>
                    )}
                    <div className="tm-snapshot-meta-strip mono-label">
                      <span>Author: <strong>{snapshot.commit.author}</strong></span>
                      <span>•</span>
                      <span>Date: <strong>{snapshot.commit.date} {snapshot.commit.time}</strong></span>
                      <span>•</span>
                      <span style={{ color: "#c8ff3d" }}>
                        +{snapshot.commit.stats.insertions}
                      </span>
                      <span style={{ color: "#ef4444" }}>
                        -{snapshot.commit.stats.deletions}
                      </span>
                    </div>
                  </div>

                  <div className="tm-snapshot-header-actions">
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => fetchCommitExplanation(snapshot.commit.sha)}
                      disabled={explainingCommit}
                      title="Re-run AI explanation"
                    >
                      <Sparkles size={13} color="#c8ff3d" />
                      <span>{explainingCommit ? "Explaining..." : "AI Breakdown"}</span>
                    </button>

                    <button
                      type="button"
                      className="button button--lime button--small"
                      onClick={() => {
                        setCompareTarget(snapshot.commit.sha);
                        setActiveView("compare");
                      }}
                      title="Set as Target version in comparison"
                    >
                      <GitCompare size={14} />
                      <span>Compare This Version</span>
                    </button>
                  </div>
                </div>

                {/* Snapshot Sub-Tabs */}
                <div className="tm-snapshot-subnav">
                  <button
                    type="button"
                    className={`tm-subtab ${snapshotTab === "explain" ? "is-active" : ""}`}
                    onClick={() => setSnapshotTab("explain")}
                  >
                    <Sparkles size={13} color="#c8ff3d" />
                    <span>AI Commit Breakdown</span>
                  </button>
                  <button
                    type="button"
                    className={`tm-subtab ${snapshotTab === "changed" ? "is-active" : ""}`}
                    onClick={() => setSnapshotTab("changed")}
                  >
                    <span>Files Changed ({snapshot.changedFiles.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`tm-subtab ${snapshotTab === "tree" ? "is-active" : ""}`}
                    onClick={() => setSnapshotTab("tree")}
                  >
                    <span>Project Tree ({snapshot.treeFiles.length} files)</span>
                  </button>
                  <button
                    type="button"
                    className={`tm-subtab ${snapshotTab === "ask_commit" ? "is-active" : ""}`}
                    onClick={() => setSnapshotTab("ask_commit")}
                  >
                    <MessageSquare size={13} color="#38bdf8" />
                    <span>Ask Questions on this Commit ({currentCommitQAList.length})</span>
                  </button>
                </div>

                {/* Sub-View 1: AI Plain-Language Commit Breakdown */}
                {snapshotTab === "explain" && (
                  <div className="tm-commit-ai-view">
                    {explainingCommit ? (
                      <div className="tm-ai-explaining-state">
                        <RefreshCw size={26} className="spin" color="#c8ff3d" />
                        <h4>Synthesizing Plain-Language Commit Breakdown...</h4>
                        <p>
                          Groq 120B is analyzing git diff patch and retrieving Project Brain RAG
                          context for commit <code>{snapshot.commit.shortSha}</code>.
                        </p>
                      </div>
                    ) : currentCommitExplanation ? (
                      <div className="tm-ai-explanation-content">
                        <div className="tm-explanation-meta mono-label">
                          <span>
                            AI ANALYSIS GROUNDED IN COMMIT DIFF &amp; PROJECT BRAIN RAG CONTEXT
                          </span>
                        </div>
                        <FormattedAIResponse content={currentCommitExplanation.explanation} />

                        {/* Quick interactive Ask Bar inside Explanation */}
                        <div className="tm-commit-inline-ask">
                          <div className="mono-label" style={{ color: "#38bdf8", fontSize: "11px" }}>
                            HAVE QUESTIONS ABOUT THIS SPECIFIC COMMIT?
                          </div>
                          <div className="inline-ask-input-row">
                            <input
                              type="text"
                              placeholder="e.g. Did this change break any route? What is the performance impact? Why was this function changed?"
                              value={commitQuestion}
                              onChange={(e) => setCommitQuestion(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !askingCommit) handleAskAboutCommit();
                              }}
                            />
                            <button
                              type="button"
                              className="inline-ask-btn"
                              onClick={() => handleAskAboutCommit()}
                              disabled={askingCommit || !commitQuestion.trim()}
                            >
                              {askingCommit ? (
                                <RefreshCw size={13} className="spin" />
                              ) : (
                                <Send size={13} />
                              )}
                              <span>Ask AI</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="tm-empty-sub">
                        <p>No explanation generated yet.</p>
                        <button
                          type="button"
                          className="button button--lime button--small"
                          onClick={() => fetchCommitExplanation(snapshot.commit.sha)}
                        >
                          <Sparkles size={14} />
                          <span>Generate Plain-Language Explanation</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-View 2: Files Changed */}
                {snapshotTab === "changed" && (
                  <div className="tm-files-list">
                    {snapshot.changedFiles.length === 0 ? (
                      <div className="tm-empty-sub">No file modifications recorded in this commit.</div>
                    ) : (
                      snapshot.changedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="tm-file-row"
                          onClick={() => handleOpenFileContent(file.path, snapshot.commit.sha)}
                        >
                          <div className="tm-file-left">
                            <span
                              className={`tm-status-pill tm-status--${file.status} mono-label`}
                            >
                              {file.status.toUpperCase()}
                            </span>
                            <span className="tm-file-path mono-label">{file.path}</span>
                          </div>

                          <div className="tm-file-right">
                            <span className={`tm-layer-tag tm-layer--${file.layer} mono-label`}>
                              {file.layer}
                            </span>
                            <div className="tm-diff-stats mono-label">
                              {file.insertions > 0 && (
                                <span className="diff-plus">+{file.insertions}</span>
                              )}
                              {file.deletions > 0 && (
                                <span className="diff-minus">-{file.deletions}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="tm-inspect-btn mono-label"
                              title="View historical code"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-View 3: Complete Historical Tree */}
                {snapshotTab === "tree" && (
                  <div className="tm-files-list">
                    <div className="tm-tree-notice mono-label">
                      <span>Historical repository snapshot at commit {snapshot.commit.shortSha}</span>
                      <span>•</span>
                      <span>Click any file to view historical code at this point</span>
                    </div>
                    {snapshot.treeFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="tm-file-row"
                        onClick={() => handleOpenFileContent(file.path, snapshot.commit.sha)}
                      >
                        <div className="tm-file-left">
                          <FileText size={14} color="#777" />
                          <span className="tm-file-path mono-label">{file.path}</span>
                        </div>

                        <div className="tm-file-right">
                          <span className={`tm-layer-tag tm-layer--${file.layer} mono-label`}>
                            {file.layer}
                          </span>
                          <button
                            type="button"
                            className="tm-inspect-btn mono-label"
                            title="Inspect code at this commit"
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-View 4: Ask Questions Specifically on this Commit */}
                {snapshotTab === "ask_commit" && (
                  <div className="tm-commit-qa-view">
                    <div className="tm-ask-commit-bar">
                      <input
                        type="text"
                        placeholder="Ask a question about this commit (e.g. 'Does this touch the database?', 'Why was this endpoint changed?')..."
                        value={commitQuestion}
                        onChange={(e) => setCommitQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !askingCommit) handleAskAboutCommit();
                        }}
                      />
                      <button
                        type="button"
                        className="button button--lime"
                        onClick={() => handleAskAboutCommit()}
                        disabled={askingCommit || !commitQuestion.trim()}
                      >
                        {askingCommit ? (
                          <RefreshCw size={13} className="spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Ask About Commit</span>
                      </button>
                    </div>

                    {/* Quick suggestion chips for this commit */}
                    <div className="commit-chips-row">
                      <span className="mono-label" style={{ fontSize: "10.5px", color: "#666" }}>
                        QUICK QUERIES FOR THIS COMMIT:
                      </span>
                      {[
                        "Does this commit touch any database schemas or models?",
                        "Did this commit introduce any breaking changes?",
                        "What is the security or rate-limiting impact of this change?",
                        "Explain the changes in the main file in simple words"
                      ].map((cq, i) => (
                        <button
                          key={i}
                          type="button"
                          className="quick-chip mono-label"
                          onClick={() => handleAskAboutCommit(cq)}
                        >
                          {cq}
                        </button>
                      ))}
                    </div>

                    {/* Q&A Thread for this commit */}
                    <div className="commit-qa-stream">
                      {currentCommitQAList.length === 0 ? (
                        <div className="tm-empty-sub">
                          <HelpCircle size={28} color="#777" style={{ marginBottom: 8 }} />
                          <p>No questions asked about this commit yet.</p>
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            Type a question above or click one of the suggested query chips.
                          </span>
                        </div>
                      ) : (
                        currentCommitQAList.map((qa, i) => (
                          <div key={i} className="commit-qa-bubble">
                            <div className="qa-q-header mono-label">
                              <span>QUESTION</span>
                              <strong>{qa.question}</strong>
                            </div>
                            <div className="qa-a-body">
                              {qa.loading ? (
                                <div className="qa-loading">
                                  <RefreshCw size={16} className="spin" color="#c8ff3d" />
                                  <span>Analyzing commit diff &amp; RAG Project Brain...</span>
                                </div>
                              ) : (
                                <FormattedAIResponse content={qa.answer} />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="tm-snapshot-empty">
                <History size={40} color="#777" />
                <h3>Select a Historical Commit</h3>
                <p>Click on any commit in the timeline on the left to travel back and explore the codebase.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: ARCHITECTURE EVOLUTION MATRIX
          ======================================================== */}
      {activeView === "evolution" && (
        <div className="tm-evolution-view">
          {/* Top Stats Overview */}
          <div className="tm-evolution-stats-grid">
            <div className="tm-stat-box">
              <div className="tm-stat-num">
                {evolutionData?.stats?.totalMilestones || commits.length}
              </div>
              <div className="tm-stat-label mono-label">HISTORICAL MILESTONES</div>
            </div>
            <div className="tm-stat-box">
              <div className="tm-stat-num" style={{ color: "#ef4444" }}>
                {evolutionData?.stats?.authRevisions || 0}
              </div>
              <div className="tm-stat-label mono-label">AUTH &amp; SECURITY REVISIONS</div>
            </div>
            <div className="tm-stat-box">
              <div className="tm-stat-num" style={{ color: "#a855f7" }}>
                {evolutionData?.stats?.databaseRevisions || 0}
              </div>
              <div className="tm-stat-label mono-label">DATABASE SCHEMA UPDATES</div>
            </div>
            <div className="tm-stat-box">
              <div className="tm-stat-num" style={{ color: "#38bdf8" }}>
                {evolutionData?.stats?.moduleRevisions || 0}
              </div>
              <div className="tm-stat-label mono-label">MODULES / SERVICES INTRODUCED</div>
            </div>
            <div className="tm-stat-box">
              <div className="tm-stat-num" style={{ color: "#f59e0b" }}>
                {evolutionData?.stats?.dependencyRevisions || 0}
              </div>
              <div className="tm-stat-label mono-label">DEPENDENCY MODIFICATIONS</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="tm-filter-strip">
            <div className="mono-label" style={{ color: "#888", fontSize: "11px" }}>
              FILTER BY ARCHITECTURE CATEGORY:
            </div>
            <div className="tm-filter-pills">
              {[
                { id: "ALL", label: "All Milestones" },
                { id: "AUTH_SECURITY", label: "Auth & Security", color: "#ef4444" },
                { id: "DATABASE", label: "Database Schema", color: "#a855f7" },
                { id: "MODULE", label: "Service Modules", color: "#38bdf8" },
                { id: "API", label: "API & Routes", color: "#10b981" },
                { id: "DEPENDENCY", label: "Dependencies", color: "#f59e0b" }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`tm-filter-btn mono-label ${evolutionFilter === f.id ? "is-active" : ""}`}
                  style={{ "--pill-color": f.color || "#c8ff3d" }}
                  onClick={() => setEvolutionFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evolution Roadmap Cards */}
          <div className="tm-milestones-stream">
            {loadingEvolution ? (
              <div className="tm-loading-state">
                <RefreshCw size={28} className="spin" color="#c8ff3d" />
                <span>Tracing architectural evolution across repository commits...</span>
              </div>
            ) : !evolutionData?.milestones ? (
              <div className="tm-empty-state">No architectural milestones recorded.</div>
            ) : (
              evolutionData.milestones
                .filter((m) => evolutionFilter === "ALL" || m.category === evolutionFilter)
                .map((m, index) => (
                  <div key={m.id || index} className="tm-milestone-card">
                    <div className="tm-milestone-left">
                      <div
                        className="tm-milestone-indicator"
                        style={{ background: m.color || "#c8ff3d" }}
                      />
                      <div className="tm-milestone-head">
                        <div className="tm-milestone-badge-row">
                          <span
                            className="tm-milestone-pill mono-label"
                            style={{ borderColor: m.color, color: m.color }}
                          >
                            {m.badge}
                          </span>
                          <span className="tm-milestone-sha mono-label">
                            {m.shortSha}
                          </span>
                          <span className="tm-milestone-date mono-label">
                            {m.date} {m.time}
                          </span>
                        </div>
                        <h4 className="tm-milestone-title">{m.title}</h4>
                        <p className="tm-milestone-desc">"{m.description}"</p>
                      </div>
                    </div>

                    <div className="tm-milestone-right">
                      <div className="tm-milestone-meta mono-label">
                        <span>By {m.author}</span>
                        <span>•</span>
                        <span>{m.filesTouched} files changed</span>
                      </div>
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() => {
                          setSelectedSha(m.sha);
                          loadSnapshot(m.sha);
                          setActiveView("timeline");
                        }}
                      >
                        <Clock size={13} />
                        <span>Travel to Snapshot</span>
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 3: VERSION COMPARISON ENGINE
          ======================================================== */}
      {activeView === "compare" && (
        <div className="tm-compare-view">
          {/* Comparison Selector Bar */}
          <div className="tm-compare-selector-bar">
            <div className="tm-compare-select-group">
              <label className="mono-label">BASE VERSION (OLDER COMMIT):</label>
              <select
                value={compareBase}
                onChange={(e) => setCompareBase(e.target.value)}
                className="tm-select"
              >
                {commits.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {c.shortSha} — {c.date} ({c.message.slice(0, 48)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="tm-swap-btn"
              onClick={() => {
                const temp = compareBase;
                setCompareBase(compareTarget);
                setCompareTarget(temp);
              }}
              title="Swap Base and Target"
            >
              <RotateCcw size={15} />
            </button>

            <div className="tm-compare-select-group">
              <label className="mono-label">TARGET VERSION (NEWER COMMIT):</label>
              <select
                value={compareTarget}
                onChange={(e) => setCompareTarget(e.target.value)}
                className="tm-select"
              >
                {commits.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {c.shortSha} — {c.date} ({c.message.slice(0, 48)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="button button--lime tm-run-compare-btn"
              onClick={handleRunComparison}
              disabled={comparing || !compareBase || !compareTarget}
            >
              {comparing ? (
                <RefreshCw size={15} className="spin" />
              ) : (
                <GitCompare size={15} />
              )}
              <span>{comparing ? "Comparing..." : "Compare Versions"}</span>
            </button>
          </div>

          {/* Comparison Output Dashboard */}
          {compareResult && (
            <div className="tm-compare-results-box">
              {compareResult.error ? (
                <div className="tm-error-card">{compareResult.error}</div>
              ) : (
                <>
                  {/* Metric Ribbon */}
                  <div className="tm-compare-metric-ribbon">
                    <div className="ribbon-card">
                      <span className="mono-label">TOTAL FILES MODIFIED</span>
                      <strong>{compareResult.stats.filesChanged}</strong>
                    </div>
                    <div className="ribbon-card">
                      <span className="mono-label">FILES ADDED</span>
                      <strong style={{ color: "#c8ff3d" }}>
                        +{compareResult.stats.addedCount}
                      </strong>
                    </div>
                    <div className="ribbon-card">
                      <span className="mono-label">FILES MODIFIED</span>
                      <strong style={{ color: "#f59e0b" }}>
                        ~{compareResult.stats.modifiedCount}
                      </strong>
                    </div>
                    <div className="ribbon-card">
                      <span className="mono-label">FILES DELETED</span>
                      <strong style={{ color: "#ef4444" }}>
                        -{compareResult.stats.deletedCount}
                      </strong>
                    </div>
                    <div className="ribbon-card">
                      <span className="mono-label">CODE DELTAS</span>
                      <strong className="mono-label">
                        <span style={{ color: "#c8ff3d" }}>
                          +{compareResult.stats.insertions}
                        </span>{" "}
                        /{" "}
                        <span style={{ color: "#ef4444" }}>
                          -{compareResult.stats.deletions}
                        </span>
                      </strong>
                    </div>
                  </div>

                  {/* AI Architectural Diff Summary */}
                  <div className="tm-ai-diff-card">
                    <div className="ai-diff-head">
                      <div className="mono-label kicker-pill">
                        <Sparkles size={12} color="#c8ff3d" />
                        <span>AI ARCHITECTURAL EVOLUTION EXPLANATION (GROQ 120B)</span>
                      </div>
                      <span className="mono-label" style={{ fontSize: "11px", color: "#888" }}>
                        {compareResult.base.shortSha} ➔ {compareResult.target.shortSha}
                      </span>
                    </div>

                    <div className="ai-diff-body">
                      <FormattedAIResponse content={compareResult.aiSummary} />
                    </div>
                  </div>

                  {/* Dependency Evolution Matrix */}
                  {compareResult.dependencyDiff &&
                    (compareResult.dependencyDiff.added.length > 0 ||
                      compareResult.dependencyDiff.removed.length > 0) && (
                      <div className="tm-deps-card">
                        <div className="mono-label" style={{ color: "#f59e0b", marginBottom: 12 }}>
                          📦 DEPENDENCY ECOSYSTEM EVOLUTION:
                        </div>
                        <div className="tm-deps-grid">
                          {compareResult.dependencyDiff.added.map((dep, i) => (
                            <div key={i} className="dep-pill dep-added mono-label">
                              <span>+</span>
                              <strong>{dep.name}</strong>
                              <span>({dep.version})</span>
                            </div>
                          ))}
                          {compareResult.dependencyDiff.removed.map((dep, i) => (
                            <div key={i} className="dep-pill dep-removed mono-label">
                              <span>-</span>
                              <strong>{dep.name}</strong>
                              <span>({dep.version})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Changed Files Breakdown List */}
                  <div className="tm-compare-files-section">
                    <div className="mono-label" style={{ color: "#888", marginBottom: 10 }}>
                      MODIFIED FILES BREAKDOWN:
                    </div>
                    <div className="tm-files-list">
                      {compareResult.allFiles.map((file, i) => (
                        <div
                          key={i}
                          className="tm-file-row"
                          onClick={() => handleOpenFileContent(file.path, compareResult.target.sha)}
                        >
                          <div className="tm-file-left">
                            <span
                              className={`tm-status-pill tm-status--${file.status} mono-label`}
                            >
                              {file.status.toUpperCase()}
                            </span>
                            <span className="tm-file-path mono-label">{file.path}</span>
                          </div>

                          <div className="tm-file-right">
                            <span className={`tm-layer-tag tm-layer--${file.layer} mono-label`}>
                              {file.layer}
                            </span>
                            <div className="tm-diff-stats mono-label">
                              {file.insertions > 0 && (
                                <span className="diff-plus">+{file.insertions}</span>
                              )}
                              {file.deletions > 0 && (
                                <span className="diff-minus">-{file.deletions}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="tm-inspect-btn mono-label"
                              title="View target version"
                            >
                              <Eye size={12} />
                              <span>View File</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          VIEW 4: ASK TIME MACHINE (AI HISTORICAL INTELLIGENCE)
          ======================================================== */}
      {activeView === "ask" && (
        <div className="tm-ask-view">
          {/* Question Input Card */}
          <div className="tm-ask-input-card">
            <div className="mono-label kicker-pill" style={{ color: "#c8ff3d" }}>
              <Sparkles size={12} />
              <span>PROJECT BRAIN HISTORICAL QUERY</span>
            </div>
            <h3>Ask About Codebase Evolution &amp; Architectural History</h3>
            <p>
              Ask specific questions regarding when features were added, why modules were restructured,
              or who introduced critical backend changes. Answers are strictly grounded in repository commits.
            </p>

            <div className="tm-ask-bar">
              <input
                type="text"
                placeholder="e.g. When was authentication or nodemailer introduced? What changed in backend architecture?"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !asking) handleAskHistory();
                }}
              />
              <button
                type="button"
                className="button button--lime"
                onClick={() => handleAskHistory()}
                disabled={asking || !askQuestion.trim()}
              >
                {asking ? <RefreshCw size={14} className="spin" /> : <ArrowRight size={14} />}
                <span>{asking ? "Analyzing..." : "Ask Time Machine"}</span>
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="tm-quick-prompts">
              <span className="mono-label" style={{ fontSize: "10.5px", color: "#666" }}>
                SUGGESTED QUERIES:
              </span>
              {[
                "When was authentication or rate limiting introduced?",
                "When was email sender or nodemailer added?",
                "What major features were completed in the earliest commits?",
                "Which files have undergone the most revisions?"
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chip mono-label"
                  onClick={() => handleAskHistory(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Q&A Stream */}
          <div className="tm-qa-stream">
            {qaHistory.map((item, idx) => (
              <div key={idx} className="tm-qa-card">
                <div className="qa-q-row">
                  <div className="q-badge mono-label">QUESTION</div>
                  <h4>{item.question}</h4>
                </div>

                <div className="qa-a-row">
                  {item.loading ? (
                    <div className="qa-loading">
                      <RefreshCw size={20} className="spin" color="#c8ff3d" />
                      <span>Scanning commit logs, diffs, and architectural metadata...</span>
                    </div>
                  ) : (
                    <div className="qa-answer-body">
                      <FormattedAIResponse content={item.answer} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          HISTORICAL FILE VIEWER MODAL / DRAWER
          ======================================================== */}
      {viewingFile && (
        <div className="tm-modal-overlay" onClick={() => setViewingFile(null)}>
          <div
            className="tm-file-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tm-modal-header">
              <div className="tm-modal-title-group">
                <FileText size={16} color="#c8ff3d" />
                <span className="tm-modal-path mono-label">{viewingFile.path}</span>
                <span className="tm-modal-sha mono-label kicker-pill">
                  COMMIT {viewingFile.sha.substring(0, 7)}
                </span>
              </div>
              <button
                type="button"
                className="tm-modal-close"
                onClick={() => setViewingFile(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-modal-body">
              {loadingFile ? (
                <div className="tm-loading-state">
                  <RefreshCw size={26} className="spin" color="#c8ff3d" />
                  <span>Loading file content at historical commit...</span>
                </div>
              ) : fileContent?.error ? (
                <div className="tm-error-card">{fileContent.error}</div>
              ) : fileContent?.content ? (
                <div className="tm-code-view">
                  <div className="tm-code-meta mono-label">
                    <span>Size: {fileContent.size} bytes</span>
                    <span>•</span>
                    <span>{fileContent.linesCount} lines</span>
                    <span>•</span>
                    <span>Layer: {fileContent.layer}</span>
                  </div>
                  <pre className="tm-code-pre">
                    <code>{fileContent.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="tm-empty-state">No content available for this file.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
