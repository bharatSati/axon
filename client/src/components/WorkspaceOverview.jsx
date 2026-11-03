import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Database,
  Edit3,
  ExternalLink,
  FileText,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Github,
  Globe,
  History,
  Layers,
  Lock,
  Megaphone,
  Palette,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  TestTube,
  Trash2,
  Unlink,
  UploadCloud,
  Users
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";

const STUDIOS = [
  {
    id: "developer",
    title: "Developer Studio",
    description: "Browse source files, inspect symbols, and query your codebase with AI.",
    icon: Code2,
    group: "Engineering"
  },
  {
    id: "pr-review",
    title: "AI PR Reviewer",
    description: "Review pull requests for bugs, breaking changes, and hidden risk.",
    icon: GitPullRequest,
    group: "Code quality"
  },
  {
    id: "tester",
    title: "Tester Lab",
    description: "Generate test plans, edge cases, and regression coverage.",
    icon: TestTube,
    group: "Quality"
  },
  {
    id: "timemachine",
    title: "Time Machine",
    description: "Trace how the architecture evolved across your commit history.",
    icon: History,
    group: "History"
  },
  {
    id: "flowchart",
    title: "Flowchart Studio",
    description: "Turn system logic into clear, shareable architecture diagrams.",
    icon: Palette,
    group: "Visualization"
  },
  {
    id: "marketer",
    title: "Marketer Deck",
    description: "Draft launches, positioning, and release narratives from real code.",
    icon: Megaphone,
    group: "Growth"
  }
];

const FILTERS = [
  { id: "all", label: "All sources" },
  { id: "code", label: "Code" },
  { id: "commit", label: "Commits" },
  { id: "pull_request", label: "Pull requests" },
  { id: "issue", label: "Discussions" },
  { id: "document", label: "Documents" }
];

const SUGGESTIONS = [
  "How does authentication work?",
  "Explain the project architecture",
  "What API routes are exposed?",
  "How is state managed?"
];

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function StatusBadge({ status }) {
  const map = {
    ready: { label: "Brain ready", tone: "ready" },
    indexing: { label: "Indexing", tone: "busy" },
    error: { label: "Needs attention", tone: "danger" },
    uninitialized: { label: "Not connected", tone: "muted" }
  };
  const state = map[status] || map.uninitialized;
  return (
    <span className={`ov-status ov-status--${state.tone}`}>
      <i />
      {state.label}
    </span>
  );
}

export default function WorkspaceOverview({
  workspace,
  brainStatus = "uninitialized",
  brainStats = {},
  brainDocuments = [],
  isUploadingDoc = false,
  onUploadDocument,
  onDeleteDocument,
  brainQuery,
  setBrainQuery,
  brainAnswer,
  isBrainSearching,
  onAskBrain,
  selectedFilterType,
  setSelectedFilterType,
  expandedSourceIdx,
  setExpandedSourceIdx,
  onSelectFeature,
  onOpenConnectRepo,
  onEditWorkspace,
  onDeleteWorkspace,
  onDisconnectRepo,
  onReindexBrain,
  employeeCount = 0,
  workspaceCount = 0,
  roleConfig
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  if (!workspace) return null;

  const repo = workspace.repository;
  const isReady = brainStatus === "ready";
  const allowed = roleConfig?.allowedFeatures || [];
  const studios = useMemo(
    () => STUDIOS.filter((studio) => !allowed.length || allowed.includes(studio.id)),
    [allowed]
  );

  const sourceIcon = (type) => {
    if (type === "pull_request") return <GitPullRequest size={14} />;
    if (type === "commit") return <GitBranch size={14} />;
    if (type === "issue" || type === "discussion") return <Megaphone size={14} />;
    if (type === "document") return <FileText size={14} />;
    return <Code2 size={14} />;
  };

  return (
    <section className="ov-page">
      {/* Page header */}
      <header className="ov-head">
        <div className="ov-head-main">
          <div className="ov-eyebrow">
            <span className="ov-eyebrow-dot" />
            Workspace overview
          </div>
          <div className="ov-title-row">
            <h1>{workspace.name}</h1>
            {repo && (
              <span className="ov-visibility">
                {repo.visibility === "private" ? <Lock size={11} /> : <Globe size={11} />}
                {repo.visibility === "private" ? "Private" : "Public"}
              </span>
            )}
          </div>
          <p className="ov-subtitle">
            {workspace.description ||
              "A focused workspace for engineering intelligence, repository insight, and team collaboration."}
          </p>
          <div className="ov-meta-row">
            <span className="ov-meta">
              <FolderGit2 size={13} />
              {repo ? repo.fullName || repo.name : "No repository connected"}
            </span>
            <span className="ov-meta">
              <GitBranch size={13} />
              {repo?.defaultBranch || "main"}
            </span>
            <span className="ov-meta">
              <Activity size={13} />
              Updated {formatDate(workspace.updatedAt)}
            </span>
          </div>
        </div>

        <div className="ov-head-actions">
          {repo && (
            <button
              type="button"
              className="ov-btn ov-btn--quiet"
              onClick={() => onReindexBrain?.(workspace.id)}
              disabled={brainStatus === "indexing"}
              title="Re-index repository into Project Brain"
            >
              <RefreshCw size={14} className={brainStatus === "indexing" ? "animate-spin" : ""} />
              {brainStatus === "indexing" ? "Indexing..." : "Re-index brain"}
            </button>
          )}
          <button type="button" className="ov-btn ov-btn--quiet" onClick={() => onEditWorkspace?.(workspace)}>
            <Edit3 size={15} />
            Settings
          </button>
          <button type="button" className="ov-btn ov-btn--primary" onClick={onOpenConnectRepo}>
            <FolderGit2 size={15} />
            {repo ? "Manage repository" : "Connect repository"}
          </button>
        </div>
      </header>

      {/* Summary metrics */}
      <div className="ov-stats">
        <div className="ov-stat">
          <span className="ov-stat-label">Indexed files</span>
          <strong>{brainStats.totalFiles || 0}</strong>
          <span className="ov-stat-hint">Parsed from the repository</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Chunks indexed</span>
          <strong>{brainStats.totalChunks || 0}</strong>
          <span className="ov-stat-hint">Vectorised context for AI</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Commits analysed</span>
          <strong>{brainStats.totalCommits || 0}</strong>
          <span className="ov-stat-hint">Historical change coverage</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Project brain</span>
          <strong className="ov-stat-status">
            <StatusBadge status={brainStatus} />
          </strong>
          <span className="ov-stat-hint" title={workspace.brain?.error || ""}>
            {workspace.brain?.error ? workspace.brain.error.slice(0, 40) + "..." : "Retrieval engine status"}
          </span>
        </div>
      </div>

      {/* Repository + knowledge base */}
      <div className="ov-top-grid">
        <section className="ov-card ov-card--repo">
          <div className="ov-card-head">
            <div>
              <p className="ov-card-kicker">Source</p>
              <h2>Connected repository</h2>
            </div>
            {repo && (
              <a
                className="ov-icon-btn"
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                title="Open on GitHub"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          {repo ? (
            <div className="ov-repo">
              <div className="ov-repo-main">
                <div className="ov-repo-icon">
                  <Github size={20} />
                </div>
                <div className="ov-repo-copy">
                  <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="ov-repo-name">
                    {repo.fullName || repo.name}
                    <ArrowUpRight size={13} />
                  </a>
                  <p>{repo.description || "Repository connected to this workspace."}</p>
                </div>
              </div>

              <div className="ov-repo-meta">
                {repo.language && (
                  <span>
                    <i className="ov-lang-dot" />
                    {repo.language}
                  </span>
                )}
                <span>
                  <GitBranch size={12} /> {repo.defaultBranch || "main"}
                </span>
                <span>
                  <Star size={12} /> {repo.stars || 0}
                </span>
                <span>
                  <Users size={12} /> {repo.owner}
                </span>
              </div>

              <div className="ov-repo-actions">
                <button type="button" className="ov-btn ov-btn--quiet" onClick={() => onSelectFeature("developer")}>
                  <Code2 size={14} /> Explore code
                </button>
                <button type="button" className="ov-btn ov-btn--quiet" onClick={() => onSelectFeature("analytics")}>
                  <BarChart3 size={14} /> Analytics
                </button>
                <button type="button" className="ov-btn ov-btn--quiet" onClick={onOpenConnectRepo}>
                  <RefreshCw size={14} /> Replace
                </button>
                <button type="button" className="ov-btn ov-btn--danger" onClick={onDisconnectRepo}>
                  <Unlink size={14} /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="ov-empty ov-empty--repo">
              <div className="ov-empty-icon">
                <Github size={22} />
              </div>
              <h3>No repository connected</h3>
              <p>
                Connect a GitHub repository to index your source code and activate every AI studio in
                this workspace.
              </p>
              <button type="button" className="ov-btn ov-btn--primary" onClick={onOpenConnectRepo}>
                <FolderGit2 size={15} /> Connect GitHub repository
              </button>
            </div>
          )}
        </section>

        <aside className="ov-card ov-card--knowledge">
          <div className="ov-card-head">
            <div>
              <p className="ov-card-kicker">Project brain</p>
              <h2>Knowledge base</h2>
            </div>
            {isReady && (
              <label className="ov-upload" title="Upload a document">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={onUploadDocument}
                  disabled={isUploadingDoc}
                  hidden
                />
                {isUploadingDoc ? <RefreshCw size={14} className="spin" /> : <UploadCloud size={14} />}
                <span>{isUploadingDoc ? "Indexing" : "Upload"}</span>
              </label>
            )}
          </div>

          <div className="ov-kb-block">
            <div className="ov-kb-label">Technologies</div>
            {brainStats.techStack?.length ? (
              <div className="ov-tags">
                {brainStats.techStack.map((tech) => (
                  <span key={tech} className="ov-tag">
                    {tech}
                  </span>
                ))}
              </div>
            ) : (
              <p className="ov-muted">Detected technologies will appear after indexing.</p>
            )}
          </div>

          <div className="ov-kb-block">
            <div className="ov-kb-head">
              <div className="ov-kb-label">Documents</div>
              <span className="ov-count">{brainDocuments.length}</span>
            </div>

            {brainDocuments.length ? (
              <ul className="ov-doc-list">
                {brainDocuments.map((doc) => (
                  <li key={doc.id}>
                    <FileText size={14} />
                    <div>
                      <span className="ov-doc-name" title={doc.name}>
                        {doc.name}
                      </span>
                      <span className="ov-doc-meta">
                        {doc.chunkCount || 0} chunks · {Math.max(1, Math.round((doc.size || 0) / 1024))} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ov-icon-btn ov-icon-btn--danger"
                      onClick={() => onDeleteDocument?.(doc.id, doc.name)}
                      title="Remove document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ov-muted">
                Add architecture notes, API specifications, or product docs to enrich retrieval.
              </p>
            )}
          </div>

          <div className="ov-kb-note">
            <Database size={14} />
            <span>Local embeddings · 384 dimensions · private to this workspace</span>
          </div>
        </aside>
      </div>

      {/* Project brain query */}
      <section className="ov-card ov-card--brain">
        <div className="ov-card-head">
          <div>
            <p className="ov-card-kicker">Ask anything</p>
            <h2>Project brain</h2>
          </div>
          <div className="ov-brain-model">
            <Sparkles size={13} />
            Groq · GPT-OSS 120B
          </div>
        </div>

        {isReady ? (
          <>
            <div className="ov-filters">
              <button
                type="button"
                className="ov-filter-toggle"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Layers size={14} />
                {FILTERS.find((filter) => filter.id === selectedFilterType)?.label || "All sources"}
                <ChevronDown size={14} className={filtersOpen ? "is-open" : ""} />
              </button>
              <div className={`ov-filter-list ${filtersOpen ? "is-open" : ""}`}>
                {FILTERS.map((filter) => (
                  <button
                    type="button"
                    key={filter.id}
                    className={selectedFilterType === filter.id ? "is-active" : ""}
                    onClick={() => {
                      setSelectedFilterType(filter.id);
                      setFiltersOpen(false);
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ov-ask">
              <input
                type="text"
                value={brainQuery}
                onChange={(event) => setBrainQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onAskBrain?.()}
                placeholder="Ask about architecture, authentication, routes, data models…"
              />
              <button
                type="button"
                className="ov-btn ov-btn--primary"
                onClick={() => onAskBrain?.()}
                disabled={isBrainSearching || !brainQuery?.trim()}
              >
                {isBrainSearching ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                {isBrainSearching ? "Thinking" : "Ask"}
              </button>
            </div>

            <div className="ov-suggestions">
              <span>Try</span>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => {
                    setBrainQuery(suggestion);
                    onAskBrain?.(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {brainAnswer && (
              <div className="ov-answer">
                {brainAnswer.error ? (
                  <p className="ov-answer-error">{brainAnswer.error}</p>
                ) : (
                  <>
                    <div className="ov-answer-head">
                      <span>
                        <CheckCircle2 size={14} /> Answer
                      </span>
                      <span className="ov-answer-provider">
                        {brainAnswer.provider || "Groq · GPT-OSS 120B"}
                      </span>
                    </div>
                    <div className="ov-answer-body">
                      <FormattedAIResponse content={brainAnswer.answer} />
                    </div>

                    {brainAnswer.sources?.length > 0 && (
                      <div className="ov-sources">
                        <div className="ov-sources-head">
                          <span>Sources</span>
                          <span>{brainAnswer.sources.length} retrieved</span>
                        </div>
                        {brainAnswer.sources.map((source, index) => {
                          const open = expandedSourceIdx === index;
                          return (
                            <div className="ov-source" key={index}>
                              <button
                                type="button"
                                className="ov-source-top"
                                onClick={() => setExpandedSourceIdx?.(open ? null : index)}
                              >
                                <span className="ov-source-title">
                                  {sourceIcon(source.type)}
                                  <strong>{source.filePath || source.title || "Repository source"}</strong>
                                </span>
                                <span className="ov-source-meta">
                                  {Math.round((source.score || 0) * 100)}% match
                                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </span>
                              </button>
                              {open && source.snippet && (
                                <pre className="ov-source-snippet">{source.snippet}</pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="ov-empty ov-empty--brain">
            <div className="ov-empty-icon">
              <Sparkles size={22} />
            </div>
            <h3>Project brain is not active</h3>
            <p>
              Connect a repository to build a private knowledge index. Then you can ask questions
              about the codebase in plain language.
            </p>
            <button type="button" className="ov-btn ov-btn--quiet" onClick={onOpenConnectRepo}>
              <FolderGit2 size={15} /> Connect repository
            </button>
          </div>
        )}
      </section>

      {/* Studios */}
      <section className="ov-studios">
        <div className="ov-section-head">
          <div>
            <p className="ov-card-kicker">AI studios</p>
            <h2>Work across the whole repository</h2>
          </div>
          <div className="ov-section-meta">
            <span>
              <Users size={13} /> {employeeCount} team members
            </span>
            <span>
              <Layers size={13} /> {workspaceCount} workspaces
            </span>
          </div>
        </div>

        <div className="ov-studio-grid">
          {studios.map((studio) => {
            const Icon = studio.icon;
            return (
              <button
                type="button"
                key={studio.id}
                className="ov-studio"
                onClick={() => onSelectFeature(studio.id)}
              >
                <span className="ov-studio-icon">
                  <Icon size={18} />
                </span>
                <span className="ov-studio-copy">
                  <span className="ov-studio-group">{studio.group}</span>
                  <strong>{studio.title}</strong>
                  <span className="ov-studio-desc">{studio.description}</span>
                </span>
                <ArrowUpRight size={16} className="ov-studio-arrow" />
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}
