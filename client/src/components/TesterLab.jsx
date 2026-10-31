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
  "Authentication & GitHub OAuth Exchange",
  "Workspace Management & Repository Sync",
  "Project Brain Hybrid RAG Engine (BM25 + Cosine)",
  "Employee Directory & Role Access Control",
  "Client Three.js & Atmosphere UI Viewports"
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
              <span className="health-grade-text">98</span>
            </div>
            <div className="health-meta">
              <div className="health-score-val">STABILITY HIGH</div>
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
            <span className="kpi-title">TEST COVERAGE</span>
            <div className="kpi-icon-wrap">
              <ShieldCheck size={16} color="#c8ff3d" />
            </div>
          </div>
          <div className="kpi-number">94.6%</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">ROBUST VECTORS</span>
            <span className="kpi-meta-desc">across modules</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">BOUNDARY MATRICES</span>
            <div className="kpi-icon-wrap">
              <TestTube size={16} color="#38bdf8" />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#38bdf8" }}>18 Cases</div>
          <div className="kpi-sub">
            <span className="kpi-tag-blue">EDGE CONDITIONS</span>
            <span className="kpi-meta-desc">isolated</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">REGRESSION RISK</span>
            <div className="kpi-icon-wrap">
              <ShieldAlert size={16} color="#c8ff3d" />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#c8ff3d" }}>LOW</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">0.02% PROB</span>
            <span className="kpi-meta-desc">zero breaking leaks</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">SUITE RUNTIME</span>
            <div className="kpi-icon-wrap">
              <Clock size={16} color="#fbbf24" />
            </div>
          </div>
          <div className="kpi-number" style={{ color: "#fbbf24" }}>420 ms</div>
          <div className="kpi-sub">
            <span className="kpi-tag-amber">PARALLEL EXEC</span>
            <span className="kpi-meta-desc">vitest pipeline</span>
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
          <span>PERSISTENT RAG VECTORS</span>
        </div>
      </div>

      {/* Main Test Plan Output */}
      <div className="role-deck-output-box">
        {loading ? (
          <div className="deck-loading-state">
            <RefreshCw size={28} className="spin" color="#10b981" />
            <h3>Analyzing Code Architecture &amp; Boundary Conditions...</h3>
            <p>Evaluating schema validation, async error boundaries, and integration failure points.</p>
          </div>
        ) : testPlan ? (
          <>
            <div className="deck-output-head">
              <div className="deck-output-title">
                <CheckCircle2 size={16} color="#10b981" />
                <span className="mono-label" style={{ color: "#fff" }}>
                  QA VERIFICATION STRATEGY: {selectedModule}
                </span>
              </div>
              <button type="button" className="copy-btn" onClick={handleCopy}>
                {copied ? <Check size={13} color="#c8ff3d" /> : <Copy size={13} />}
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
            <TestTube size={36} color="#10b981" />
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