import { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  Users,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  ArrowUpRight,
  Filter,
  Check,
  TrendingUp,
  FileCode,
  FolderGit2,
  Database,
  Terminal,
  BookOpen
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import { API_BASE } from "../config/api.js";

export default function AnalyticsStudio({ workspace, token, onOpenConnectRepo }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  // Tabs: "overview" | "diagnostic" | "contributors" | "pullRequests" | "discussions" | "commits"
  const [activeTab, setActiveTab] = useState("overview");

  // AI Diagnostic State
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);

  // Filters
  const [prFilter, setPrFilter] = useState("all"); // "all" | "merged" | "open"
  const [issueFilter, setIssueFilter] = useState("all"); // "all" | "open" | "closed"
  const [contributorSearch, setContributorSearch] = useState("");

  useEffect(() => {
    if (!workspace?.id) return;
    loadAnalytics();
  }, [workspace?.id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load analytics");
      }
      setAnalytics(data);
      if (data.aiDiagnostic) {
        setDiagnosticData(data.aiDiagnostic);
      }
    } catch (err) {
      console.error("[AnalyticsStudio] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("[AnalyticsStudio] Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateDiagnostic = async () => {
    try {
      setDiagnosticLoading(true);
      setActiveTab("diagnostic");
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/analytics/ai-diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ analyticsData: analytics })
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setDiagnosticData(data);
      } else {
        throw new Error(data.error || "Failed to generate AI diagnostic");
      }
    } catch (err) {
      console.error("[AnalyticsStudio] Diagnostic error:", err);
      alert(`Could not generate AI diagnostic: ${err.message}`);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // If no repository is connected to this workspace
  if (!loading && (!analytics || !analytics.hasRepository)) {
    return (
      <div className="analytics-empty-state">
        <div className="analytics-empty-card">
          <div className="analytics-empty-icon">
            <BarChart3 size={36} color="#c8ff3d" />
          </div>
          <h2 className="analytics-empty-title">No Repository Connected</h2>
          <p className="analytics-empty-desc">
            Connect a GitHub repository to unlock deep organization analytics, commit velocity tracking, PR merge intelligence, and AI-powered health telemetry.
          </p>
          {onOpenConnectRepo && (
            <button className="btn-primary analytics-connect-btn" onClick={onOpenConnectRepo}>
              <FolderGit2 size={16} />
              Connect GitHub Repository
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="analytics-loading-box">
        <div className="analytics-spinner-ring">
          <RefreshCw size={28} className="animate-spin text-lime" />
        </div>
        <p className="analytics-loading-text">Aggregating telemetry from Commits, PRs, Discussions & Brain Index...</p>
      </div>
    );
  }

  const { repository, health, kpis, timeSeries, contributors = [], pullRequests = [], issuesAndDiscussions = [], commitsList = [] } = analytics;

  // Filtered PRs
  const filteredPRs = pullRequests.filter((pr) => {
    if (prFilter === "merged") return pr.state === "merged" || pr.state === "closed";
    if (prFilter === "open") return pr.state === "open";
    return true;
  });

  // Filtered Issues
  const filteredIssues = issuesAndDiscussions.filter((iss) => {
    if (issueFilter === "open") return iss.state === "open";
    if (issueFilter === "closed") return iss.state === "closed";
    return true;
  });

  // Filtered Contributors
  const filteredContributors = contributors.filter((c) =>
    c.name.toLowerCase().includes(contributorSearch.toLowerCase()) ||
    c.login.toLowerCase().includes(contributorSearch.toLowerCase())
  );

  return (
    <div className="analytics-studio-container">
      {/* Top Header Bar */}
      <div className="analytics-header-card">
        <div className="analytics-header-main">
          <div className="analytics-eyebrow">
            <span className="analytics-live-dot" />
            ORGANIZATION & REPOSITORY MATRIX
          </div>
          <h1 className="analytics-main-title">Telemetry & Codebase Analytics</h1>
          <div className="analytics-repo-strip">
            <span className="analytics-repo-badge">
              <FolderGit2 size={14} className="text-lime" />
              <strong>{repository?.fullName}</strong>
            </span>
            <span className="analytics-branch-badge">
              branch: <code>{repository?.defaultBranch || "main"}</code>
            </span>
            {repository?.stars > 0 && (
              <span className="analytics-meta-pill">★ {repository.stars} stars</span>
            )}
            {repository?.htmlUrl && (
              <a
                href={repository.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="analytics-github-link"
              >
                GitHub Repo <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Health Score Pill & Actions */}
        <div className="analytics-header-actions">
          <div className="analytics-health-card">
            <div className="health-grade-circle">
              <span className="health-grade-text">{health?.grade || "A"}</span>
            </div>
            <div className="health-meta">
              <div className="health-score-val">{health?.score || 92} / 100</div>
              <div className="health-label">{health?.label}</div>
            </div>
          </div>

          <div className="analytics-action-buttons">
            <button
              className="analytics-btn-action"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh telemetry"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Syncing..." : "Sync"}
            </button>
            <button
              className="analytics-btn-primary"
              onClick={handleGenerateDiagnostic}
              disabled={diagnosticLoading}
            >
              <Sparkles size={15} />
              {diagnosticLoading ? "Synthesizing AI..." : "AI Health Diagnostic"}
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid: 5 Core Executive KPIs */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Commit Velocity */}
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Commit Velocity</span>
            <span className="kpi-icon-wrap"><GitCommit size={16} /></span>
          </div>
          <div className="kpi-number">{kpis?.totalCommits}</div>
          <div className="kpi-sub">
            <span className="kpi-trend text-lime">{kpis?.commitVelocityTrend}</span>
            <span className="kpi-meta-desc">Architectural revisions</span>
          </div>
        </div>

        {/* KPI 2: PR Merge Throughput */}
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">PR Merge Success</span>
            <span className="kpi-icon-wrap"><GitPullRequest size={16} /></span>
          </div>
          <div className="kpi-number">{kpis?.prMergeRate}%</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">{kpis?.mergedPRsCount} Merged</span>
            <span className="kpi-tag-amber">{kpis?.openPRsCount} Open</span>
            <span className="kpi-meta-desc">• {kpis?.avgReviewsPerPR} revs/PR</span>
          </div>
        </div>

        {/* KPI 3: Issues & Consensus */}
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Issue Resolution</span>
            <span className="kpi-icon-wrap"><MessageSquare size={16} /></span>
          </div>
          <div className="kpi-number">{kpis?.issueResolutionRate}%</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">{kpis?.resolvedIssuesCount} Resolved</span>
            <span className="kpi-tag-blue">{kpis?.openIssuesCount} Active</span>
          </div>
        </div>

        {/* KPI 4: Code Scale & LOC */}
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Code Scale</span>
            <span className="kpi-icon-wrap"><Code2 size={16} /></span>
          </div>
          <div className="kpi-number">~{kpis?.estimatedLOC?.toLocaleString()}</div>
          <div className="kpi-sub">
            <span className="kpi-meta-desc">{kpis?.totalSourceFiles} source files</span>
            <span className="kpi-tag-cyan">{kpis?.totalChunks} RAG Chunks</span>
          </div>
        </div>

        {/* KPI 5: Active Engineers */}
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Active Engineers</span>
            <span className="kpi-icon-wrap"><Users size={16} /></span>
          </div>
          <div className="kpi-number">{kpis?.totalContributors}</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">Synchronized</span>
            <span className="kpi-meta-desc">Org contributors</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Cadence & Languages */}
      <div className="analytics-visuals-grid">
        {/* Visual 1: Commit Cadence Timeline */}
        <div className="analytics-chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <TrendingUp size={16} className="text-lime" />
              <h3>Commit Cadence Timeline</h3>
            </div>
            <span className="chart-sub">Recent 8 intervals</span>
          </div>

          <div className="commit-cadence-bars">
            {timeSeries?.commitCadence?.map((bucket, idx) => (
              <div key={idx} className="cadence-col" title={`${bucket.label}: ${bucket.count} commits`}>
                <div className="cadence-bar-track">
                  <div
                    className="cadence-bar-fill"
                    style={{ height: `${bucket.heightPercentage || 20}%` }}
                  >
                    {bucket.count > 0 && <span className="cadence-val-badge">{bucket.count}</span>}
                  </div>
                </div>
                <span className="cadence-label">{bucket.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visual 2: Language Distribution */}
        <div className="analytics-chart-card">
          <div className="chart-header">
            <div className="chart-title-wrap">
              <FileCode size={16} className="text-lime" />
              <h3>Programming Stack & Languages</h3>
            </div>
            <span className="chart-sub">Code density by bytes</span>
          </div>

          {/* Segmented language progress bar */}
          <div className="lang-segmented-bar">
            {timeSeries?.languages?.map((lang, idx) => (
              <div
                key={idx}
                className="lang-segment"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: lang.color
                }}
                title={`${lang.name}: ${lang.percentage}% (${(lang.bytes / 1024).toFixed(1)} KB)`}
              />
            ))}
          </div>

          {/* Language Legends */}
          <div className="lang-legends-list">
            {timeSeries?.languages?.map((lang, idx) => (
              <div key={idx} className="lang-legend-item">
                <span className="lang-color-dot" style={{ backgroundColor: lang.color }} />
                <span className="lang-name">{lang.name}</span>
                <span className="lang-pct">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architectural Layer Composition Cards */}
      <div className="analytics-arch-section">
        <div className="arch-section-header">
          <Layers size={16} className="text-lime" />
          <h3>Architectural Layer Distribution</h3>
          <span className="arch-sub">Classification derived from Project Brain chunk taxonomy</span>
        </div>

        <div className="arch-layers-grid">
          {timeSeries?.architectureLayers?.map((layer) => (
            <div key={layer.id} className="arch-layer-card">
              <div className="arch-layer-top">
                <span className="arch-layer-name">{layer.layer}</span>
                <span className="arch-layer-pct" style={{ color: layer.color }}>{layer.percentage}%</span>
              </div>
              <div className="arch-progress-track">
                <div
                  className="arch-progress-fill"
                  style={{ width: `${layer.percentage}%`, backgroundColor: layer.color }}
                />
              </div>
              <div className="arch-layer-tech">{layer.tech}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Deep Exploration Tab Navigation */}
      <div className="analytics-tabs-wrapper">
        <div className="analytics-tabs-nav">
          <button
            className={`analytics-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={14} />
            Executive Summary
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "diagnostic" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("diagnostic");
              if (!diagnosticData && !diagnosticLoading) handleGenerateDiagnostic();
            }}
          >
            <Sparkles size={14} />
            AI Diagnostic
            {diagnosticData && <span className="tab-indicator-dot" />}
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "contributors" ? "active" : ""}`}
            onClick={() => setActiveTab("contributors")}
          >
            <Users size={14} />
            Contributors ({contributors.length})
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "pullRequests" ? "active" : ""}`}
            onClick={() => setActiveTab("pullRequests")}
          >
            <GitPullRequest size={14} />
            Pull Requests ({pullRequests.length})
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "discussions" ? "active" : ""}`}
            onClick={() => setActiveTab("discussions")}
          >
            <MessageSquare size={14} />
            Discussions & Issues ({issuesAndDiscussions.length})
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "commits" ? "active" : ""}`}
            onClick={() => setActiveTab("commits")}
          >
            <GitCommit size={14} />
            Commit Stream ({commitsList.length})
          </button>
        </div>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="analytics-tab-panel">
        {/* TAB 1: EXECUTIVE SUMMARY */}
        {activeTab === "overview" && (
          <div className="analytics-panel-overview">
            <div className="overview-summary-card">
              <div className="overview-summary-header">
                <ShieldCheck size={20} className="text-lime" />
                <h3>Repository Velocity & Organization Assessment</h3>
              </div>
              <p className="overview-summary-lead">
                <strong>{repository?.fullName}</strong> maintains a health grade of{" "}
                <span className="text-lime font-bold">{health?.grade}</span> with an aggregate score of{" "}
                <strong>{health?.score}/100</strong>. Engineering throughput reflects{" "}
                <strong>{kpis?.prMergeRate}% PR merge efficiency</strong> across{" "}
                <strong>{kpis?.totalPRs} reviewed pull requests</strong> and an active resolution of{" "}
                <strong>{kpis?.issueResolutionRate}% of reported technical discussions</strong>.
              </p>

              <div className="overview-factors-grid">
                <div className="factor-tile">
                  <div className="factor-top">
                    <span className="factor-label">Commit Cadence</span>
                    <CheckCircle2 size={15} className="text-lime" />
                  </div>
                  <div className="factor-val">{health?.metrics?.commitCadence}</div>
                </div>

                <div className="factor-tile">
                  <div className="factor-top">
                    <span className="factor-label">PR Throughput</span>
                    <CheckCircle2 size={15} className="text-lime" />
                  </div>
                  <div className="factor-val">{health?.metrics?.prThroughput}</div>
                </div>

                <div className="factor-tile">
                  <div className="factor-top">
                    <span className="factor-label">Issue Responsiveness</span>
                    <CheckCircle2 size={15} className="text-lime" />
                  </div>
                  <div className="factor-val">{health?.metrics?.issueResolution}</div>
                </div>

                <div className="factor-tile">
                  <div className="factor-top">
                    <span className="factor-label">Code Modularity</span>
                    <CheckCircle2 size={15} className="text-lime" />
                  </div>
                  <div className="factor-val">{health?.metrics?.codeQuality}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI EXECUTIVE DIAGNOSTIC */}
        {activeTab === "diagnostic" && (
          <div className="analytics-panel-diagnostic">
            {diagnosticLoading ? (
              <div className="diagnostic-loading-box">
                <Sparkles size={28} className="animate-spin text-lime" />
                <h4>Synthesizing Executive Architecture Health Assessment...</h4>
                <p>Analyzing commit trends, PR review depth, and code modularity with RAG AI.</p>
              </div>
            ) : diagnosticData ? (
              <div className="diagnostic-report-card">
                <div className="diagnostic-report-header">
                  <div className="diagnostic-meta">
                    <Sparkles size={18} className="text-lime" />
                    <span className="diagnostic-heading">AXON Principal Engineering Diagnostic</span>
                    {diagnosticData.generatedAt && (
                      <span className="diagnostic-timestamp">
                        • {new Date(diagnosticData.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-regenerate"
                    onClick={handleGenerateDiagnostic}
                    disabled={diagnosticLoading}
                  >
                    <RefreshCw size={13} />
                    Regenerate Diagnostic
                  </button>
                </div>
                <div className="diagnostic-report-content">
                  <FormattedAIResponse content={diagnosticData.summary} />
                </div>
              </div>
            ) : (
              <div className="diagnostic-cta-box">
                <Sparkles size={32} color="#c8ff3d" />
                <h3>Generate Deep Repository Diagnostic</h3>
                <p>Run Groq-powered AI synthesis to audit velocity, pull request turnaround, and technical debt risk factors.</p>
                <button className="analytics-btn-primary" onClick={handleGenerateDiagnostic}>
                  <Sparkles size={16} />
                  Run AI Repository Diagnostic
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONTRIBUTORS LEADERBOARD */}
        {activeTab === "contributors" && (
          <div className="analytics-panel-contributors">
            <div className="table-controls-bar">
              <input
                type="text"
                placeholder="Search contributor name or login..."
                value={contributorSearch}
                onChange={(e) => setContributorSearch(e.target.value)}
                className="analytics-search-input"
              />
              <span className="table-count-label">{filteredContributors.length} Engineers</span>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Engineer</th>
                    <th>Role & Responsibility</th>
                    <th>Commits</th>
                    <th>PRs Authored</th>
                    <th>Issues Raised</th>
                    <th>Activity Share</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContributors.map((c, idx) => (
                    <tr key={idx}>
                      <td className="contributor-cell">
                        <img src={c.avatarUrl} alt={c.name} className="contributor-avatar" />
                        <div className="contributor-names">
                          <span className="contributor-name">{c.name}</span>
                          <span className="contributor-login">@{c.login}</span>
                        </div>
                      </td>
                      <td>
                        <span className="role-tag-pill">{c.role}</span>
                      </td>
                      <td>
                        <strong>{c.commitsCount}</strong>
                      </td>
                      <td>{c.prsCount}</td>
                      <td>{c.issuesCount}</td>
                      <td>
                        <div className="activity-share-wrap">
                          <div className="activity-track">
                            <div className="activity-fill" style={{ width: `${c.percentage}%` }} />
                          </div>
                          <span className="activity-pct">{c.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PULL REQUESTS MATRIX */}
        {activeTab === "pullRequests" && (
          <div className="analytics-panel-prs">
            <div className="table-controls-bar">
              <div className="pill-filter-group">
                <button
                  className={`pill-filter-btn ${prFilter === "all" ? "active" : ""}`}
                  onClick={() => setPrFilter("all")}
                >
                  All ({pullRequests.length})
                </button>
                <button
                  className={`pill-filter-btn ${prFilter === "merged" ? "active" : ""}`}
                  onClick={() => setPrFilter("merged")}
                >
                  Merged ({pullRequests.filter((p) => p.state === "merged" || p.state === "closed").length})
                </button>
                <button
                  className={`pill-filter-btn ${prFilter === "open" ? "active" : ""}`}
                  onClick={() => setPrFilter("open")}
                >
                  Open ({pullRequests.filter((p) => p.state === "open").length})
                </button>
              </div>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>PR #</th>
                    <th>Title & Feature Spec</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Review Comments</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPRs.map((pr) => (
                    <tr key={pr.number}>
                      <td className="pr-number-cell">#{pr.number}</td>
                      <td className="pr-title-cell">
                        <span className="pr-title-text">{pr.title}</span>
                      </td>
                      <td>
                        <span className="pr-author-pill">@{pr.author}</span>
                      </td>
                      <td>
                        <span className={`pr-status-pill status-${pr.state}`}>
                          {pr.state.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="comments-count-pill">
                          <MessageSquare size={12} />
                          {pr.commentsCount || 0} reviews
                        </span>
                      </td>
                      <td>
                        {pr.url && (
                          <a href={pr.url} target="_blank" rel="noreferrer" className="table-ext-link">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DISCUSSIONS & ISSUES */}
        {activeTab === "discussions" && (
          <div className="analytics-panel-discussions">
            <div className="table-controls-bar">
              <div className="pill-filter-group">
                <button
                  className={`pill-filter-btn ${issueFilter === "all" ? "active" : ""}`}
                  onClick={() => setIssueFilter("all")}
                >
                  All ({issuesAndDiscussions.length})
                </button>
                <button
                  className={`pill-filter-btn ${issueFilter === "closed" ? "active" : ""}`}
                  onClick={() => setIssueFilter("closed")}
                >
                  Resolved ({issuesAndDiscussions.filter((i) => i.state === "closed").length})
                </button>
                <button
                  className={`pill-filter-btn ${issueFilter === "open" ? "active" : ""}`}
                  onClick={() => setIssueFilter("open")}
                >
                  Open ({issuesAndDiscussions.filter((i) => i.state === "open").length})
                </button>
              </div>
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Issue #</th>
                    <th>Technical Topic / Decision</th>
                    <th>Author</th>
                    <th>Labels</th>
                    <th>Status</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((iss) => (
                    <tr key={iss.number}>
                      <td className="issue-num-cell">#{iss.number}</td>
                      <td className="issue-title-cell">
                        <span className="issue-title-text">{iss.title}</span>
                      </td>
                      <td>
                        <span className="issue-author-pill">@{iss.author}</span>
                      </td>
                      <td>
                        <div className="issue-labels-wrap">
                          {(iss.labels || []).map((l, lIdx) => (
                            <span key={lIdx} className="issue-label-chip">{l}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`issue-status-pill status-${iss.state}`}>
                          {iss.state === "closed" ? "RESOLVED" : "OPEN"}
                        </span>
                      </td>
                      <td>
                        <span className="comments-count-pill">
                          <MessageSquare size={12} />
                          {iss.commentsCount || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: COMMITS STREAM */}
        {activeTab === "commits" && (
          <div className="analytics-panel-commits">
            <div className="commits-stream-list">
              {commitsList.map((c, idx) => (
                <div key={idx} className="commit-stream-item">
                  <div className="commit-sha-badge">
                    <code>{c.sha}</code>
                  </div>
                  <div className="commit-content-meta">
                    <span className="commit-message-text">{c.message}</span>
                    <div className="commit-sub-meta">
                      <span className="commit-author-tag">by @{c.author}</span>
                      {c.date && (
                        <span className="commit-date-tag">
                          <Clock size={12} />
                          {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="commit-ext-btn">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
