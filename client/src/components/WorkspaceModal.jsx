import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Layers, X, Check, AlertCircle } from "lucide-react";

const API_BASE = "http://localhost:4000/api";

export default function WorkspaceModal({
  isOpen,
  mode = "create", // "create" | "edit"
  workspace = null,
  onClose,
  token,
  onSaved
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspace && mode === "edit") {
      setName(workspace.name || "");
      setDescription(workspace.description || "");
    } else {
      setName("");
      setDescription("");
    }
    setError("");
  }, [workspace, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const endpoint = mode === "edit"
        ? `${API_BASE}/workspaces/${workspace.id}`
        : `${API_BASE}/workspaces`;

      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        onSaved(data.workspace);
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save workspace.");
      }
    } catch (err) {
      console.error("Workspace save error:", err);
      setError("Network error connecting to Axon server.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="add-emp-dialog workspace-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
      >
        <button type="button" className="modal-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        <div className="modal-header">
          <span className="icon-pill">
            <Layers size={20} />
          </span>
          <div>
            <span className="mono-label">
              {mode === "create" ? "NEW SOFTWARE PROJECT" : "WORKSPACE CONFIGURATION"}
            </span>
            <h3>{mode === "create" ? "Create New Workspace" : "Configure Workspace"}</h3>
          </div>
        </div>

        {error && (
          <div className="repo-error-banner" style={{ margin: "14px 0 0" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-emp-form">
          <div className="form-group">
            <label>Workspace Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Payments Microservice, Mobile iOS App, Neural Core"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Project Description</label>
            <textarea
              rows={3}
              placeholder="Brief summary of the software project, architecture, or services..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.03)",
                color: "#fff",
                fontSize: "13px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button button--lime" disabled={loading}>
              <Check size={16} />
              <span>{loading ? "Saving..." : mode === "create" ? "Create Workspace" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
