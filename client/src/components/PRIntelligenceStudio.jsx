import { useState, useEffect } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Cpu,
  Layers,
  ArrowRight,
  GitBranch,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Code2,
  FileCode,
  Flame,
  Bug,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Send,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  FileDiff,
  Eye,
  Clock
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import { API_BASE } from "../config/api.js";

export default function PRIntelligenceStudio({ workspace, token }) {
  // PR list & selection
  const [pullRequests, setPullRequests] = useState([]);
  const [selectedPrNumber, setSelectedPrNumber] = useState(null);
  const [selectedPr, setSelectedPr] = useState(null);
  const [prFiles, setPrFiles] = useState([]);
  const [fullDiff, setFullDiff] = useState("");
  const [isSample, setIsSample] = useState(false);
  const [loadingPrs, setLoadingPrs] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "open" | "closed"

  // Custom diff mode
  const [showCustomDiffModal, setShowCustomDiffModal] = useState(false);
  const [customDiffInput, setCustomDiffInput] = useState("");
  const [customDiffTitle, setCustomDiffTitle] = useState("");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [activeTab, setActiveTab] = useState("explainer"); // "explainer" | "review" | "regression" | "diff" | "chat"

  // Severity filter for review issues
  const [severityFilter, setSeverityFilter] = useState("all"); // "all" | "Critical" | "High" | "Medium" | "Low"

  // Interactive AI PR Assistant Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [askingChat, setAskingChat] = useState(false);

  // Copy code feedback
  const [copiedId, setCopiedId] = useState(null);

  // 1. Fetch Pull Requests on Mount
  useEffect(() => {
    if (!workspace?.id) return;
    fetchPullRequests();
  }, [workspace?.id, statusFilter]);

  const fetchPullRequests = async () => {
    try {
      setLoadingPrs(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/pr?state=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.pullRequests) {
        setPullRequests(data.pullRequests);
        setIsSample(data.isSample);
        if (data.pullRequests.length > 0 && !selectedPrNumber) {
          selectPullRequest(data.pullRequests[0].number);
        }
      }
    } catch (err) {
      console.error("Failed to load pull requests:", err);
    } finally {
      setLoadingPrs(false);
    }
  };

  // 2. Select Pull Request & Load Details
  const selectPullRequest = async (prNumber) => {
    try {
      setSelectedPrNumber(prNumber);
      setAnalysisReport(null);
      setChatMessages([]);

      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/pr/${prNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedPr(data.pr);
        setPrFiles(data.files || []);
        setFullDiff(data.fullDiff || "");

        // Automatically trigger AI Analysis for smooth developer experience
        triggerAnalysis(prNumber, data.pr, data.fullDiff);
      }
    } catch (err) {
      console.error(`Failed to load details for PR #${prNumber}:`, err);
    }
  };

  // 3. Trigger AI PR Analysis
  const triggerAnalysis = async (prNum, prMeta, diff) => {
    try {
      setAnalyzing(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/pr/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prNumber: prNum,
          customDiff: diff,
          prMetadata: prMeta
        })
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setAnalysisReport(data.report);
      }
    } catch (err) {
      console.error("AI PR Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // 4. Handle Custom Diff Submission
  const handleAnalyzeCustomDiff = () => {
    if (!customDiffInput.trim()) return;
    const customPr = {
      number: 999,
      title: customDiffTitle.trim() || "Manual Diff Review",
      state: "open",
      author: { login: "Local Developer" },
      baseBranch: "main",
      headBranch: "custom-diff",
      createdAt: new Date().toISOString(),
      additions: (customDiffInput.match(/^\+/gm) || []).length,
      deletions: (customDiffInput.match(/^-/gm) || []).length,
      changedFilesCount: (customDiffInput.match(/^diff --git/gm) || []).length || 1,
      body: "Custom diff pasted directly for AI architectural inspection & regression review."
    };

    setSelectedPrNumber(999);
    setSelectedPr(customPr);
    setFullDiff(customDiffInput);
    setPrFiles([{ filename: "custom-diff.patch", status: "modified", patch: customDiffInput }]);
    setShowCustomDiffModal(false);
    triggerAnalysis(null, customPr, customDiffInput);
  };

  // 5. Ask Interactive Question About PR
  const handleAskQuestion = async (e, customQ = null) => {
    if (e) e.preventDefault();
    const query = (customQ || chatQuestion).trim();
    if (!query || askingChat) return;

    const newMsg = { sender: "user", text: query, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatQuestion("");

    try {
      setAskingChat(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/pr/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prNumber: selectedPrNumber,
          question: query,
          prData: selectedPr
        })
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.answer,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (err) {
      console.error("Ask question error:", err);
    } finally {
      setAskingChat(false);
    }
  };

  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Issue counts & filter
  const issuesList = analysisReport?.codeReview?.issues || [];
  const filteredIssues = issuesList.filter((issue) => {
    if (severityFilter === "all") return true;
    return issue.severity?.toLowerCase() === severityFilter.toLowerCase();
  });

  const criticalCount = issuesList.filter((i) => i.severity?.toLowerCase() === "critical").length;
  const highCount = issuesList.filter((i) => i.severity?.toLowerCase() === "high").length;
  const mediumCount = issuesList.filter((i) => i.severity?.toLowerCase() === "medium").length;
  const lowCount = issuesList.filter((i) => i.severity?.toLowerCase() === "low").length;

  const decision = analysisReport?.finalAssessment?.mergeRecommendation || "ANALYZING";
  const isBlocked = decision.includes("BLOCKED") || decision.includes("DO NOT MERGE");
  const isMinorFixes = decision.includes("MINOR");
  const isReady = decision.includes("READY");

  return (
    <div className="pr-intelligence-studio" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Symmetric Top Header Card */}
      <div className="analytics-header-card">
        <div className="analytics-header-main">
          <div className="analytics-eyebrow">
            <span className="analytics-live-dot" />
            AI PULL REQUEST INTELLIGENCE &amp; CODE REVIEW MATRIX
          </div>
          <h1 className="analytics-main-title">Pull Request Explainer &amp; Reviewer</h1>
          <div className="analytics-repo-strip">
            <span className="analytics-repo-badge">
              <GitPullRequest size={14} className="text-lime" />
              <strong>{workspace?.repository?.fullName || workspace?.name || "Repository"}</strong>
            </span>
            <span className="analytics-branch-badge">
              branch: <code>{workspace?.repository?.defaultBranch || "main"}</code>
            </span>
            <span className="analytics-meta-pill">
              {pullRequests.length} PRs Tracked
            </span>
            {isSample && (
              <span className="analytics-meta-pill" style={{ color: "#fbbf24", borderColor: "rgba(251,191,36,0.3)" }}>
                Architectural Samples Active
              </span>
            )}
          </div>
        </div>

        {/* Merge Decision Card & Actions */}
        <div className="analytics-header-actions">
          <div className="analytics-health-card">
            <div className="health-grade-circle" style={{ borderColor: isBlocked ? "#ef4444" : "#c8ff3d" }}>
              <span className="health-grade-text" style={{ color: isBlocked ? "#ef4444" : "#c8ff3d", fontSize: "14px" }}>
                {isBlocked ? "FAIL" : isReady ? "PASS" : "REV"}
              </span>
            </div>
            <div className="health-meta">
              <div className="health-score-val" style={{ color: isBlocked ? "#ef4444" : isReady ? "#c8ff3d" : "#fbbf24" }}>
                {decision}
              </div>
              <div className="health-label">Merge Safety Assessment</div>
            </div>
          </div>

          <div className="analytics-action-buttons">
            <button
              type="button"
              className="analytics-btn-action"
              onClick={() => setShowCustomDiffModal(true)}
              title="Paste custom or branch diff"
            >
              <FileDiff size={14} />
              <span>Custom Diff</span>
            </button>
            <button
              type="button"
              className="analytics-btn-action"
              onClick={fetchPullRequests}
              disabled={loadingPrs}
              title="Sync latest PRs from GitHub"
            >
              <RefreshCw size={14} className={loadingPrs ? "animate-spin" : ""} />
              <span>{loadingPrs ? "Syncing..." : "Sync PRs"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Symmetric Bento KPI Grid: 4 PR Intelligence Metrics */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">TOTAL PULL REQUESTS</span>
            <div className="kpi-icon-wrap">
              <GitPullRequest size={16} />
            </div>
          </div>
          <div className="kpi-number">{pullRequests.length}</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">ALL TRACKED</span>
            <span className="kpi-meta-desc">in this repository</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">ACTIVE REVIEW QUEUE</span>
            <div className="kpi-icon-wrap">
              <Clock size={16} color="#38bdf8" />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#38bdf8" }}>
            {pullRequests.filter((p) => p.state === "open").length}
          </div>
          <div className="kpi-sub">
            <span className="kpi-tag-blue">OPEN NOW</span>
            <span className="kpi-meta-desc">awaiting merge</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">MERGED &amp; SHIPPED</span>
            <div className="kpi-icon-wrap">
              <CheckCircle2 size={16} color="#c8ff3d" />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#c8ff3d" }}>
            {pullRequests.filter((p) => p.state === "closed" || p.state === "merged").length}
          </div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">CLOSED</span>
            <span className="kpi-meta-desc">history integrated</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">SECURITY ISSUES</span>
            <div className="kpi-icon-wrap">
              <ShieldAlert size={16} color={criticalCount > 0 ? "#ef4444" : "#c8ff3d"} />
            </div>
          </div>
          <div className="kpi-number" style={{ color: criticalCount > 0 ? "#ef4444" : "#c8ff3d" }}>
            {criticalCount}
          </div>
          <div className="kpi-sub">
            <span className={criticalCount > 0 ? "kpi-tag-amber" : "kpi-tag-lime"}>
              {criticalCount > 0 ? "ATTENTION" : "ZERO CRITICAL"}
            </span>
            <span className="kpi-meta-desc">{highCount} high risk</span>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: PR List Sidebar + Comprehensive PR Intelligence Viewport */}
      <div className="pr-studio-layout">
        {/* Left Sidebar: Pull Requests Selector */}
        <aside className="pr-sidebar">
          <div className="pr-sidebar-header">
            <div className="pr-sidebar-title mono-label">
              <GitPullRequest size={12} color="#c8ff3d" />
              <span>REPOSITORY PULL REQUESTS</span>
            </div>

            <div className="pr-status-tabs">
              <button
                type="button"
                className={`pr-status-tab ${statusFilter === "all" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`pr-status-tab ${statusFilter === "open" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("open")}
              >
                Open
              </button>
              <button
                type="button"
                className={`pr-status-tab ${statusFilter === "closed" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("closed")}
              >
                Closed
              </button>
            </div>
          </div>

          {isSample && (
            <div className="pr-sample-notice mono-label">
              <Info size={11} color="#f59e0b" />
              <span>Architectural Sample PRs Active</span>
            </div>
          )}

          <div className="pr-list-scroll">
            {loadingPrs ? (
              <div className="pr-loading-list mono-label">
                <RefreshCw size={16} className="spin" color="#c8ff3d" />
                <span>Loading pull requests...</span>
              </div>
            ) : pullRequests.length === 0 ? (
              <div className="pr-empty-list mono-label">
                <p>No pull requests found in this repository.</p>
                <button
                  type="button"
                  className="pr-empty-btn"
                  onClick={() => setShowCustomDiffModal(true)}
                >
                  Analyze Custom Diff
                </button>
              </div>
            ) : (
              pullRequests.map((pr) => {
                const isSelected = selectedPrNumber === pr.number;
                return (
                  <div
                    key={pr.number}
                    className={`pr-card-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectPullRequest(pr.number)}
                  >
                    <div className="pr-card-top">
                      <div className="pr-card-badges">
                        <span className="mono-label pr-number-badge">#{pr.number}</span>
                        <span className={`mono-label pr-state-pill pr-state-pill--${pr.state}`}>
                          {pr.state === "open" ? "OPEN" : "CLOSED"}
                        </span>
                      </div>
                      <span className="mono-label pr-files-badge">
                        {pr.changedFilesCount || 0} files
                      </span>
                    </div>

                    <h4 className="pr-card-title">{pr.title}</h4>

                    <div className="pr-card-bottom mono-label">
                      <div className="pr-card-author">
                        {pr.author?.avatarUrl ? (
                          <img
                            src={pr.author.avatarUrl}
                            alt={pr.author.login}
                            className="pr-avatar"
                          />
                        ) : (
                          <div className="pr-avatar-fallback">
                            {pr.author?.login?.[0]?.toUpperCase() || "D"}
                          </div>
                        )}
                        <span>{pr.author?.login || "dev"}</span>
                      </div>

                      <div className="pr-diff-stats">
                        <span className="stat-add">+{pr.additions || 0}</span>
                        <span className="stat-del">-{pr.deletions || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Area: Deep PR Intelligence & Inspection Deck */}
        <section className="pr-details-viewport">
          {selectedPr ? (
            <>
              {/* Selected PR Top Control Strip */}
              <div className="pr-details-header">
                <div className="pr-details-meta">
                  <div className="pr-meta-kicker mono-label">
                    <span className="pr-meta-num">PR #{selectedPr.number}</span>
                    <span className={`pr-meta-state pr-meta-state--${selectedPr.state}`}>
                      {selectedPr.state?.toUpperCase()}
                    </span>
                    <span className="pr-meta-branch">
                      <GitBranch size={12} />
                      {selectedPr.baseBranch} &larr; {selectedPr.headBranch}
                    </span>
                  </div>

                  <h3 className="pr-selected-title">{selectedPr.title}</h3>

                  <div className="pr-meta-subrow mono-label">
                    <span>Opened by <strong>{selectedPr.author?.login}</strong></span>
                    <span>•</span>
                    <span className="stat-add">+{selectedPr.additions || 0} additions</span>
                    <span>•</span>
                    <span className="stat-del">-{selectedPr.deletions || 0} deletions</span>
                    <span>•</span>
                    <span>{selectedPr.changedFilesCount || prFiles.length} files modified</span>
                    {selectedPr.htmlUrl && (
                      <>
                        <span>•</span>
                        <a
                          href={selectedPr.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pr-github-link"
                        >
                          <span>View on GitHub</span>
                          <ExternalLink size={11} />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div className="pr-details-actions">
                  <button
                    type="button"
                    className="pr-reanalyze-btn mono-label"
                    onClick={() => triggerAnalysis(selectedPr.number, selectedPr, fullDiff)}
                    disabled={analyzing}
                  >
                    <RefreshCw size={13} className={analyzing ? "spin" : ""} />
                    <span>{analyzing ? "Auditing Codebase..." : "Re-Analyze with Brain"}</span>
                  </button>
                </div>
              </div>

              {/* Executive Assessment Banner */}
              {analyzing ? (
                <div className="pr-analyzing-card">
                  <div className="analyzing-halo">
                    <RefreshCw size={28} className="spin" color="#c8ff3d" />
                  </div>
                  <div>
                    <h4>Project Brain AI Auditor is Inspecting PR #{selectedPr.number}...</h4>
                    <p className="mono-label">
                      Evaluating diff against codebase chunks, tracking cross-module callers, checking
                      security vectors and computing regression impact.
                    </p>
                  </div>
                </div>
              ) : analysisReport ? (
                <div
                  className={`pr-executive-card pr-executive-card--${
                    isBlocked ? "blocked" : isMinorFixes ? "minor" : "ready"
                  }`}
                >
                  <div className="executive-left">
                    <div className="executive-decision-badge mono-label">
                      {isBlocked ? (
                        <XCircle size={18} color="#f87171" />
                      ) : isMinorFixes ? (
                        <AlertTriangle size={18} color="#f59e0b" />
                      ) : (
                        <CheckCircle2 size={18} color="#34d399" />
                      )}
                      <span>MERGE RECOMMENDATION: {decision}</span>
                    </div>

                    <p className="executive-verdict">
                      {analysisReport.finalAssessment?.executiveVerdict}
                    </p>

                    <div className="executive-disclaimer mono-label">
                      <Info size={12} />
                      <span>{analysisReport.finalAssessment?.disclaimer}</span>
                    </div>
                  </div>

                  <div className="executive-right">
                    <div className="confidence-meter-card">
                      <span className="mono-label meter-label">CONFIDENCE SCORE</span>
                      <div className="meter-value-wrap">
                        <span className="meter-number">
                          {analysisReport.finalAssessment?.confidenceScore || 88}%
                        </span>
                      </div>
                      <span className="mono-label meter-caption">
                        Calculated via Project Brain RAG validation
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Viewport Sub-Navigation Tabs */}
              <div className="pr-subnav-strip">
                <button
                  type="button"
                  className={`pr-subnav-tab ${activeTab === "explainer" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("explainer")}
                >
                  <Sparkles size={14} color="#c8ff3d" />
                  <span>1. PR Explainer</span>
                </button>

                <button
                  type="button"
                  className={`pr-subnav-tab ${activeTab === "review" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("review")}
                >
                  <Bug size={14} color="#f87171" />
                  <span>
                    2. AI Code Review
                    {issuesList.length > 0 && (
                      <span className="tab-count-pill">{issuesList.length}</span>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`pr-subnav-tab ${activeTab === "regression" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("regression")}
                >
                  <Flame size={14} color="#f59e0b" />
                  <span>
                    3. Regression &amp; Breaking Risks
                    {analysisReport?.regressionAnalysis?.canBreakExistingFunctionality && (
                      <span className="tab-danger-dot" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`pr-subnav-tab ${activeTab === "diff" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("diff")}
                >
                  <FileCode size={14} color="#38bdf8" />
                  <span>4. Unified Code Diff ({prFiles.length})</span>
                </button>

                <button
                  type="button"
                  className={`pr-subnav-tab ${activeTab === "chat" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("chat")}
                >
                  <MessageSquare size={14} color="#c8ff3d" />
                  <span>5. Ask AI About This PR</span>
                </button>
              </div>

              {/* Viewport Content Panes */}
              <div className="pr-tab-content">
                {/* ============================================================
                    TAB 1: BEGINNER-FRIENDLY PR EXPLAINER
                    ============================================================ */}
                {activeTab === "explainer" && (
                  <div className="pr-explainer-pane">
                    {analysisReport?.explanation ? (
                      <div className="explainer-cards-grid">
                        {/* What Changed */}
                        <div className="explainer-card">
                          <div className="explainer-card-head mono-label">
                            <Info size={13} color="#38bdf8" />
                            <span>WHAT CHANGES HAVE BEEN MADE?</span>
                          </div>
                          <p className="explainer-text">
                            {analysisReport.explanation.summary}
                          </p>
                        </div>

                        {/* Why Were These Changes Introduced? */}
                        <div className="explainer-card">
                          <div className="explainer-card-head mono-label">
                            <Zap size={13} color="#c8ff3d" />
                            <span>WHY WERE THESE CHANGES INTRODUCED?</span>
                          </div>
                          <p className="explainer-text">
                            {analysisReport.explanation.intentAndWhy}
                          </p>
                        </div>

                        {/* Architecture Fit */}
                        <div className="explainer-card">
                          <div className="explainer-card-head mono-label">
                            <Layers size={13} color="#c8ff3d" />
                            <span>HOW DOES THIS FIT INTO EXISTING ARCHITECTURE?</span>
                          </div>
                          <p className="explainer-text">
                            {analysisReport.explanation.architectureFit}
                          </p>
                        </div>

                        {/* New Functionality */}
                        <div className="explainer-card">
                          <div className="explainer-card-head mono-label">
                            <CheckCircle2 size={13} color="#34d399" />
                            <span>NEW FUNCTIONALITY INTRODUCED</span>
                          </div>
                          <ul className="new-func-list">
                            {(analysisReport.explanation.newFunctionality || []).map((fn, idx) => (
                              <li key={idx} className="new-func-item">
                                <span className="func-bullet">▸</span>
                                <span>{fn}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Affected Modules Layer Tags */}
                        {analysisReport.explanation.affectedModules?.length > 0 && (
                          <div className="explainer-card explainer-card--full">
                            <div className="explainer-card-head mono-label">
                              <Cpu size={13} color="#f59e0b" />
                              <span>AFFECTED SYSTEM MODULES &amp; ARCHITECTURAL LAYERS</span>
                            </div>
                            <div className="affected-layers-wrap">
                              {analysisReport.explanation.affectedModules.map((m, idx) => (
                                <div key={idx} className="affected-layer-pill">
                                  <span className="mono-label layer-tag">[{m.layer}]</span>
                                  <span className="layer-desc">{m.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pr-loading-pane mono-label">
                        <RefreshCw size={24} className="spin" color="#c8ff3d" />
                        <span>Generating simple PR explanation...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    TAB 2: DETAILED TECHNICAL CODE REVIEW & ISSUES
                    ============================================================ */}
                {activeTab === "review" && (
                  <div className="pr-review-pane">
                    {/* Severity Filter Strip */}
                    <div className="review-filter-strip">
                      <div className="filter-left mono-label">
                        <span>FILTER BY SEVERITY:</span>
                      </div>

                      <div className="filter-pills">
                        <button
                          type="button"
                          className={`sev-filter-btn ${severityFilter === "all" ? "is-active" : ""}`}
                          onClick={() => setSeverityFilter("all")}
                        >
                          All ({issuesList.length})
                        </button>
                        <button
                          type="button"
                          className={`sev-filter-btn sev-filter-btn--critical ${severityFilter === "Critical" ? "is-active" : ""}`}
                          onClick={() => setSeverityFilter("Critical")}
                        >
                          🔴 Critical ({criticalCount})
                        </button>
                        <button
                          type="button"
                          className={`sev-filter-btn sev-filter-btn--high ${severityFilter === "High" ? "is-active" : ""}`}
                          onClick={() => setSeverityFilter("High")}
                        >
                          🟠 High ({highCount})
                        </button>
                        <button
                          type="button"
                          className={`sev-filter-btn sev-filter-btn--medium ${severityFilter === "Medium" ? "is-active" : ""}`}
                          onClick={() => setSeverityFilter("Medium")}
                        >
                          🟡 Medium ({mediumCount})
                        </button>
                        <button
                          type="button"
                          className={`sev-filter-btn sev-filter-btn--low ${severityFilter === "Low" ? "is-active" : ""}`}
                          onClick={() => setSeverityFilter("Low")}
                        >
                          ⚪ Low ({lowCount})
                        </button>
                      </div>
                    </div>

                    {/* Issues List */}
                    <div className="issues-container">
                      {filteredIssues.length === 0 ? (
                        <div className="no-issues-box">
                          <CheckCircle2 size={36} color="#34d399" />
                          <h4>No Issues Found For Selected Filter</h4>
                          <p className="mono-label">
                            All inspected code blocks meet established reliability and security standards for this criteria.
                          </p>
                        </div>
                      ) : (
                        filteredIssues.map((issue, idx) => (
                          <div
                            key={issue.id || idx}
                            className={`issue-card issue-card--${issue.severity?.toLowerCase()}`}
                          >
                            <div className="issue-card-head">
                              <div className="issue-meta-tags">
                                <span className={`mono-label issue-sev-pill issue-sev-pill--${issue.severity?.toLowerCase()}`}>
                                  {issue.severity?.toUpperCase()}
                                </span>
                                <span className="mono-label issue-cat-pill">
                                  {issue.category}
                                </span>
                                <span className="mono-label issue-file-tag">
                                  {issue.fileName}
                                </span>
                                <span className="mono-label issue-line-tag">
                                  {issue.lineNumber}
                                </span>
                              </div>
                            </div>

                            <h4 className="issue-title">{issue.title}</h4>

                            <div className="issue-body-content">
                              <div className="issue-desc-box">
                                <span className="mono-label section-kicker">PROBLEM EXPLANATION</span>
                                <p>{issue.description}</p>
                              </div>

                              <div className="issue-why-box">
                                <span className="mono-label section-kicker">WHY THIS IS DANGEROUS / PROBLEMATIC</span>
                                <p>{issue.whyProblematic}</p>
                              </div>

                              {issue.suggestedFix && (
                                <div className="issue-fix-box">
                                  <div className="fix-header mono-label">
                                    <span>SUGGESTED FIX / CORRECTED CODE</span>
                                    <button
                                      type="button"
                                      className="copy-fix-btn"
                                      onClick={() => handleCopyCode(issue.id || idx, issue.suggestedFix)}
                                    >
                                      {copiedId === (issue.id || idx) ? (
                                        <>
                                          <Check size={11} color="#c8ff3d" />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={11} />
                                          <span>Copy Fix</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="fix-code-block">
                                    <code>{issue.suggestedFix}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ============================================================
                    TAB 3: REGRESSION IMPACT & BREAKING RISKS
                    ============================================================ */}
                {activeTab === "regression" && (
                  <div className="pr-regression-pane">
                    {analysisReport?.regressionAnalysis ? (
                      <div className="regression-grid">
                        {/* Overall Regression Gauge Banner */}
                        <div
                          className={`regression-banner regression-banner--${analysisReport.regressionAnalysis.riskLevel?.toLowerCase()}`}
                        >
                          <div className="gauge-icon-wrap">
                            <Flame size={32} />
                          </div>
                          <div className="gauge-text-wrap">
                            <div className="mono-label gauge-pill">
                              REGRESSION RISK LEVEL: {analysisReport.regressionAnalysis.riskLevel?.toUpperCase()}
                            </div>
                            <h3>
                              {analysisReport.regressionAnalysis.canBreakExistingFunctionality
                                ? "Warning: High Likelihood of Breaking Existing Functionality"
                                : "Low Risk: Changes are Contained and Backward Compatible"}
                            </h3>
                            <p>
                              Cross-referenced with Project Brain's dependency graph and repository chunks.
                            </p>
                          </div>
                        </div>

                        {/* Breaking Changes List */}
                        <div className="regression-card">
                          <div className="regression-card-head mono-label">
                            <AlertTriangle size={13} color="#f87171" />
                            <span>DETECTED BREAKING CHANGES</span>
                          </div>
                          {analysisReport.regressionAnalysis.breakingChanges?.length > 0 ? (
                            <ul className="breaking-list">
                              {analysisReport.regressionAnalysis.breakingChanges.map((b, idx) => (
                                <li key={idx} className="breaking-item">
                                  <span className="breaking-bullet">⚠️</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-break-text mono-label">
                              No explicit breaking changes detected in public function signatures or exported routes.
                            </p>
                          )}
                        </div>

                        {/* Affected Consumers */}
                        <div className="regression-card">
                          <div className="regression-card-head mono-label">
                            <Layers size={13} color="#38bdf8" />
                            <span>AFFECTED CALLERS &amp; DEPENDENT MODULES</span>
                          </div>
                          <ul className="consumers-list">
                            {(analysisReport.regressionAnalysis.affectedConsumers || []).map((c, idx) => (
                              <li key={idx} className="consumer-item mono-label">
                                <span className="consumer-bullet">↳</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Contract Drift */}
                        {analysisReport.regressionAnalysis.contractDrift && (
                          <div className="regression-card regression-card--full">
                            <div className="regression-card-head mono-label">
                              <ShieldAlert size={13} color="#f59e0b" />
                              <span>API CONTRACT &amp; SCHEMA DRIFT ANALYSIS</span>
                            </div>
                            <p className="contract-drift-text">
                              {analysisReport.regressionAnalysis.contractDrift}
                            </p>
                          </div>
                        )}

                        {/* Mitigation Steps */}
                        {analysisReport.regressionAnalysis.mitigationSteps?.length > 0 && (
                          <div className="regression-card regression-card--full">
                            <div className="regression-card-head mono-label">
                              <CheckCircle2 size={13} color="#34d399" />
                              <span>RECOMMENDED REGRESSION MITIGATION STEPS</span>
                            </div>
                            <ul className="mitigation-list">
                              {analysisReport.regressionAnalysis.mitigationSteps.map((m, idx) => (
                                <li key={idx} className="mitigation-item">
                                  <span className="mitigation-bullet">✓</span>
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pr-loading-pane mono-label">
                        <RefreshCw size={24} className="spin" color="#c8ff3d" />
                        <span>Analyzing cross-module regression impact...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    TAB 4: UNIFIED CODE DIFF VIEWER
                    ============================================================ */}
                {activeTab === "diff" && (
                  <div className="pr-diff-pane">
                    <div className="diff-files-header mono-label">
                      <span>CHANGED FILES IN THIS PULL REQUEST ({prFiles.length})</span>
                    </div>

                    <div className="diff-files-list">
                      {prFiles.map((file, idx) => (
                        <div key={idx} className="diff-file-block">
                          <div className="diff-file-head mono-label">
                            <div className="file-info-left">
                              <FileCode size={13} color="#38bdf8" />
                              <span className="diff-file-name">{file.filename}</span>
                              <span className={`diff-status-pill status--${file.status}`}>
                                {file.status}
                              </span>
                            </div>

                            <div className="file-info-right">
                              <span className="stat-add">+{file.additions || 0}</span>
                              <span className="stat-del">-{file.deletions || 0}</span>
                            </div>
                          </div>

                          <pre className="diff-patch-pre">
                            <code>{file.patch || "(No diff content available)"}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ============================================================
                    TAB 5: INTERACTIVE AI PR ASSISTANT CHAT
                    ============================================================ */}
                {activeTab === "chat" && (
                  <div className="pr-chat-pane">
                    <div className="chat-intro-banner">
                      <Sparkles size={16} color="#c8ff3d" />
                      <div>
                        <h4>Ask Project Brain AI Anything About PR #{selectedPr.number}</h4>
                        <p className="mono-label">
                          Ask architectural questions, request unit test strategies, or verify performance implications.
                        </p>
                      </div>
                    </div>

                    {/* Quick Question Chips */}
                    <div className="quick-questions-strip">
                      <button
                        type="button"
                        className="quick-q-chip mono-label"
                        onClick={() => handleAskQuestion(null, "Can this PR break our existing authentication flow for active sessions?")}
                      >
                        ⚡ Will this break active auth sessions?
                      </button>
                      <button
                        type="button"
                        className="quick-q-chip mono-label"
                        onClick={() => handleAskQuestion(null, "What unit and integration tests should we write before merging this PR?")}
                      >
                        🧪 What unit tests should we add?
                      </button>
                      <button
                        type="button"
                        className="quick-q-chip mono-label"
                        onClick={() => handleAskQuestion(null, "Are there any database query bottlenecks or memory leaks introduced?")}
                      >
                        🚀 Are there performance bottlenecks?
                      </button>
                    </div>

                    {/* Chat Transcript Area */}
                    <div className="chat-transcript-area">
                      {chatMessages.length === 0 ? (
                        <div className="empty-chat-state mono-label">
                          <HelpCircle size={28} color="#666" />
                          <p>No questions asked yet. Ask any question above or type your inquiry below.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`pr-chat-bubble pr-chat-bubble--${msg.sender}`}
                          >
                            <div className="bubble-header mono-label">
                              <span>{msg.sender === "user" ? "YOU" : "PROJECT BRAIN ARCHITECT"}</span>
                              <span className="bubble-time">{msg.time}</span>
                            </div>
                            <div className="bubble-body">
                              {msg.sender === "ai" ? (
                                <FormattedAIResponse content={msg.text} />
                              ) : (
                                <p>{msg.text}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {askingChat && (
                        <div className="pr-chat-bubble pr-chat-bubble--ai is-thinking mono-label">
                          <RefreshCw size={14} className="spin" color="#c8ff3d" />
                          <span>Auditing codebase chunks and synthesizing response...</span>
                        </div>
                      )}
                    </div>

                    {/* Chat Input Bar */}
                    <form className="chat-input-bar" onSubmit={handleAskQuestion}>
                      <input
                        type="text"
                        placeholder="Ask about breaking changes, security vulnerabilities, or tests..."
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        disabled={askingChat}
                      />
                      <button
                        type="submit"
                        className="chat-send-btn mono-label"
                        disabled={askingChat || !chatQuestion.trim()}
                      >
                        <Send size={13} />
                        <span>Ask AI</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-pr-selected mono-label">
              <GitPullRequest size={36} color="#666" />
              <p>Select a pull request from the sidebar or paste a custom branch diff.</p>
            </div>
          )}
        </section>
      </div>

      {/* Modal: Custom Diff Input */}
      {showCustomDiffModal && (
        <div className="modal-backdrop" onClick={() => setShowCustomDiffModal(false)}>
          <div className="pr-custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="mono-label modal-kicker">
                <FileDiff size={14} color="#c8ff3d" />
                <span>ANALYZE CUSTOM / BRANCH DIFF</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCustomDiffModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label className="mono-label">PULL REQUEST / BRANCH TITLE:</label>
              <input
                type="text"
                placeholder="e.g. feat(gateway): introduce rate limiting middleware"
                value={customDiffTitle}
                onChange={(e) => setCustomDiffTitle(e.target.value)}
                className="custom-title-input"
              />

              <label className="mono-label">PASTE RAW GIT DIFF OR PATCH:</label>
              <textarea
                rows={12}
                placeholder="Paste `git diff` output here..."
                value={customDiffInput}
                onChange={(e) => setCustomDiffInput(e.target.value)}
                className="custom-diff-textarea"
              />
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="cancel-btn mono-label"
                onClick={() => setShowCustomDiffModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit-diff-btn mono-label"
                onClick={handleAnalyzeCustomDiff}
                disabled={!customDiffInput.trim()}
              >
                <Sparkles size={13} />
                <span>Run In-Depth AI Review</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
