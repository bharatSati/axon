import { useState } from "react";
import { motion } from "motion/react";
import {
  TestTube,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Zap,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Terminal,
  Play,
  FolderGit2,
  ShieldCheck,
  Clock,
  Sparkles
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import { API_BASE } from "../config/api.js";

const TARGET_MODULES = [
  "All Workspace Modules (Full System)",
  "API Routing & Endpoint Controllers",
  "Authentication, Authorization & Sessions",
  "Database Models & Persistence Layer",
  "Core Business Logic & Service Pipelines",
  "Frontend Components & UI State Boundaries"
];

export default function TesterLab({ workspace, token }) {
  const [selectedModule, setSelectedModule] = useState(TARGET_MODULES[0]);
  const [testPlan, setTestPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePlan = async () => {
    if (!workspace?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/brain/test-lab`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetModule: selectedModule })
      });

      if (res.ok) {
        const data = await res.json();
        setTestPlan(data);
      } else {
        const err = await res.json();
        setTestPlan({ error: err.error || "Failed to generate QA plan." });
      }
    } catch (err) {
      console.error("Test lab error:", err);
      setTestPlan({ error: "Network error connecting to Project Brain." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (testPlan?.plan) {
      navigator.clipboard.writeText(testPlan.plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasGeneratedPlan = Boolean(testPlan?.plan);
  const totalChunks = workspace?.brain?.stats?.totalChunks || 0;
  const totalFiles = workspace?.brain?.stats?.totalFiles || 0;

  return (
    <div className="role-deck-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Symmetric Top Header Card */}
      <div className="analytics-header-card">
        <div className="analytics-header-main">
          <div className="analytics-eyebrow">
            <span className="analytics-live-dot" />
            QA &amp; RELIABILITY TEST AUTOMATION LAB
          </div>
          <h1 className="analytics-main-title">Automated QA &amp; Reliability Lab</h1>
          <div className="analytics-repo-strip">
            <span className="analytics-repo-badge">
              <FolderGit2 size={14} className="text-lime" />
              <strong>{workspace?.repository?.fullName || workspace?.name || "Repository"}</strong>
            </span>
            <span className="analytics-branch-badge">
              branch: <code>{workspace?.repository?.defaultBranch || "main"}</code>
            </span>
            <span className="analytics-meta-pill">
              AI Engine: Groq 120B • Hybrid RAG 384d
            </span>
          </div>
        </div>

        {/* QA Health Score Pill & Actions */}
        <div className="analytics-header-actions">
          <div className="analytics-health-card">
            <div className="health-grade-circle">
              <span className="health-grade-text">{hasGeneratedPlan ? "95" : "—"}</span>
            </div>
            <div className="health-meta">
              <div className="health-score-val">{hasGeneratedPlan ? "SYNTHESIZED" : "STANDBY"}</div>
              <div className="health-label">System QA Confidence</div>
            </div>
          </div>

          <div className="analytics-action-buttons">
            <button
              type="button"
              className="analytics-btn-primary"
              onClick={handleGeneratePlan}
              disabled={loading}
            >
              {loading ? <RefreshCw size={14} className="spin" /> : <Play size={14} fill="#050506" />}
              <span>{loading ? "Synthesizing QA..." : "Generate QA Strategy"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Symmetric Bento KPI Grid: 4 QA Lab Metrics */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">INDEXED REPO CONTEXT</span>
            <div className="kpi-icon-wrap">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="kpi-number">{totalFiles > 0 ? `${totalFiles} Files` : "Live AST"}</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">CODEBASE</span>
            <span className="kpi-meta-desc">across modules</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">RAG VECTORS</span>
            <div className="kpi-icon-wrap">
              <TestTube size={16} />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#38bdf8" }}>{totalChunks > 0 ? `${totalChunks} Chunks` : "Real-Time"}</div>
          <div className="kpi-sub">
            <span className="kpi-tag-blue">KNOWLEDGE</span>
            <span className="kpi-meta-desc">semantic index</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">TARGET SCOPE</span>
            <div className="kpi-icon-wrap">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#c8ff3d", fontSize: "18px" }}>
            {selectedModule.split(" ")[0]}
          </div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">FOCUS</span>
            <span className="kpi-meta-desc">{selectedModule.slice(0, 24)}...</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">SYNTHESIS STATUS</span>
            <div className="kpi-icon-wrap">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#fbbf24" }}>{hasGeneratedPlan ? "Ready" : "Idle"}</div>
          <div className="kpi-sub">
            <span className="kpi-tag-amber">{hasGeneratedPlan ? "COMPLETE" : "AWAITING RUN"}</span>
            <span className="kpi-meta-desc">AI test suite</span>
          </div>
        </div>
      </div>

      {/* Module Selector Strip */}
      <div className="tester-scope-card">
        <div className="scope-select-wrap">
          <label className="mono-label">SELECT TARGET ARCHITECTURE SCOPE:</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="scope-dropdown"
          >
            {TARGET_MODULES.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
        </div>

        <div className="scope-meta mono-label">
          <span>AI ENGINE: Groq 120B</span>
          <span>•</span>
          <span>HYBRID RAG VECTORS</span>
        </div>
      </div>

      {/* Main Test Plan Output */}
      <div className="role-deck-output-box">
        {loading ? (
          <div className="deck-loading-state">
            <RefreshCw size={28} className="spin" />
            <h3>Analyzing Code Architecture &amp; Boundary Conditions...</h3>
            <p>Evaluating schema validation, async error boundaries, and integration failure points.</p>
          </div>
        ) : testPlan ? (
          <>
            <div className="deck-output-head">
              <div className="deck-output-title">
                <CheckCircle2 size={16} />
                <span className="mono-label" style={{ color: "#fff" }}>
                  QA VERIFICATION STRATEGY: {selectedModule}
                </span>
              </div>
              <button type="button" className="copy-btn" onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy Suite"}</span>
              </button>
            </div>

            {testPlan.error ? (
              <div className="analysis-error-box">{testPlan.error}</div>
            ) : (
              <div className="deck-markdown-body">
                <FormattedAIResponse content={testPlan.plan} />
              </div>
            )}
          </>
        ) : (
          <div className="deck-empty-state">
            <TestTube size={36} />
            <h3>QA Test Lab Ready</h3>
            <p>
              Select a target module and click "Generate QA Strategy" to synthesize test suites
              and vulnerability edge cases using Project Brain.
            </p>
            <button
              type="button"
              className="button button--lime button--small"
              onClick={handleGeneratePlan}
            >
              <Zap size={14} />
              <span>Run Initial QA Analysis</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
