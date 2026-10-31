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
  Play
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";

const API_BASE = "http://localhost:4000/api";

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
    <div className="role-deck-container">
      {/* Header Banner */}
      <div className="role-deck-banner">
        <div className="role-deck-banner-copy">
          <div className="mono-label kicker-pill">
            <TestTube size={13} color="#10b981" />
            TESTER &amp; QA PERSPECTIVE
          </div>
          <h2>Automated QA &amp; Reliability Lab</h2>
          <p>
            Project Brain analyzes repository architecture and generates edge-case matrices,
            integration test vectors, and automated regression suites.
          </p>
        </div>

        <div className="role-deck-actions">
          <button
            type="button"
            className="button button--lime button--large"
            onClick={handleGeneratePlan}
            disabled={loading}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
            <span>Generate QA Strategy</span>
          </button>
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