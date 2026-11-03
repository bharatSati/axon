import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Github,
  Search,
  Lock,
  Globe,
  GitBranch,
  Star,
  Check,
  X,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  AlertCircle,
  Unlink
} from "lucide-react";
import { API_BASE } from "../config/api.js";

export default function ConnectRepoModal({
  isOpen,
  onClose,
  workspace,
  token,
  onRepoConnected,
  onRepoDisconnected
}) {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [connectingRepo, setConnectingRepo] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");

  // Fetch accessible repositories from GitHub via backend OAuth
  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/github/repositories?search=${encodeURIComponent(search)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setRepositories(data.repositories || []);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load GitHub repositories.");
      }
    } catch (err) {
      console.warn("Error fetching repositories:", err.message);
      setError("Could not connect to Axon server to browse repositories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRepositories();
    }
  }, [isOpen]);

  // Debounced search when typing
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchRepositories();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Connect selected repository to current workspace
  const handleConnect = async (repo) => {
    try {
      setConnectingRepo(repo.name);
      setError("");

      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/repository`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(repo)
      });

      if (res.ok) {
        const data = await res.json();
        onRepoConnected(data.workspace);
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to connect repository to workspace.");
      }
    } catch (err) {
      console.error("Connect repo error:", err);
      setError("Failed to connect repository to workspace.");
    } finally {
      setConnectingRepo(null);
    }
  };

  // Disconnect repository from current workspace
  const handleDisconnect = async () => {
    if (!window.confirm(`Disconnect "${workspace.repository?.name}" from "${workspace.name}"? Project Brain will be paused.`)) {
      return;
    }

    try {
      setDisconnecting(true);
      setError("");

      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/repository`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        onRepoDisconnected(data.workspace);
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to disconnect repository.");
      }
    } catch (err) {
      console.error("Disconnect error:", err);
      setError("Failed to disconnect repository.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isOpen) return null;

  const currentRepo = workspace?.repository;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="connect-repo-dialog"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-icon-wrap">
            <Github size={22} />
          </div>
          <div className="modal-header-text">
            <span className="mono-label">WORKSPACE INTEGRATION // ONE REPO PER WORKSPACE</span>
            <h3>Connect GitHub Repository</h3>
            <p>
              Link an authenticated repository to <strong>{workspace?.name}</strong>. Connecting will
              automatically initialize this workspace's persistent <strong>Project Brain</strong>.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Current Active Repo Card (if connected) */}
        {currentRepo && (
          <div className="current-repo-banner">
            <div className="current-repo-info">
              <span className="mono-label kicker-pill">
                CURRENTLY CONNECTED REPOSITORY
              </span>
              <div className="current-repo-title">
                <FolderGit2 size={16} />
                <strong>{currentRepo.fullName || currentRepo.name}</strong>
                <a
                  href={currentRepo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="repo-link"
                  title="View on GitHub"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
              <p>{currentRepo.description}</p>
            </div>
            <button
              type="button"
              className="button button--danger-outline button--small"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              <Unlink size={14} />
              <span>{disconnecting ? "Disconnecting..." : "Disconnect"}</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="repo-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="repo-search-bar">
          <div className="repo-search-input-wrap">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search repositories by name, owner, or language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button type="button" className="clear-search-btn" onClick={() => setSearch("")}>
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="refresh-btn"
            onClick={fetchRepositories}
            disabled={loading}
            title="Refresh repository list"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>

        {/* Repository List */}
        <div className="repo-list-container">
          {loading && (
            <div className="repo-loading-state">
              <RefreshCw size={22} className="spin" />
              <p>Fetching repositories accessible via GitHub OAuth...</p>
            </div>
          )}

          {!loading && repositories.length === 0 && (
            <div className="repo-empty-state">
              <FolderGit2 size={32} />
              <p>No repositories found matching "{search}".</p>
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            </div>
          )}

          {!loading &&
            repositories.map((repo) => {
              const isSelected = currentRepo && (currentRepo.fullName === repo.fullName || currentRepo.name === repo.name);
              const isConnecting = connectingRepo === repo.name;

              return (
                <div
                  key={repo.id || repo.fullName}
                  className={`repo-item-card ${isSelected ? "is-selected" : ""}`}
                >
                  <div className="repo-item-main">
                    <div className="repo-item-header">
                      <div className="repo-item-title-group">
                        <FolderGit2 size={16} className="repo-icon" />
                        <strong className="repo-name">{repo.fullName || repo.name}</strong>
                        {repo.visibility === "private" ? (
                          <span className="repo-badge repo-badge--private">
                            <Lock size={10} /> Private
                          </span>
                        ) : (
                          <span className="repo-badge repo-badge--public">
                            <Globe size={10} /> Public
                          </span>
                        )}
                        {isSelected && (
                          <span className="repo-badge repo-badge--connected">
                            <Check size={10} /> Connected
                          </span>
                        )}
                      </div>

                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="repo-ext-link"
                        title="Open on GitHub"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    <p className="repo-item-desc">{repo.description || "No description provided."}</p>

                    <div className="repo-item-meta mono-label">
                      {repo.language && (
                        <span className="repo-meta-item">
                          <i className="lang-dot" /> {repo.language}
                        </span>
                      )}
                      <span className="repo-meta-item">
                        <GitBranch size={11} /> {repo.defaultBranch || "main"}
                      </span>
                      {repo.stars !== undefined && (
                        <span className="repo-meta-item">
                          <Star size={11} /> {repo.stars}
                        </span>
                      )}
                      <span className="repo-meta-item">
                        Owner: <strong>{repo.owner}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="repo-item-action">
                    {isSelected ? (
                      <button
                        type="button"
                        className="button button--small button--ghost"
                        disabled
                      >
                        <Check size={14} />
                        <span>Connected</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button--lime button--small"
                        onClick={() => handleConnect(repo)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw size={13} className="spin" />
                            <span>Connecting...</span>
                          </>
                        ) : currentRepo ? (
                          <span>Replace</span>
                        ) : (
                          <span>Connect</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <span className="mono-label">
            {repositories.length} {repositories.length === 1 ? "repository" : "repositories"} accessible
          </span>
          <button type="button" className="button button--ghost button--small" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
