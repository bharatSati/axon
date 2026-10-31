import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Twitter,
  Linkedin,
  Rocket,
  FileText,
  Mail,
  Swords,
  Download,
  Target,
  Sliders,
  Flame,
  ArrowRight,
  BookOpen,
  Share2
} from "lucide-react";
import FormattedAIResponse from "./FormattedAIResponse";
import { API_BASE } from "../config/api.js";

const CHANNELS = [
  {
    id: "twitter",
    label: "Twitter / X Thread",
    subtitle: "5-Part Viral Launch Thread",
    icon: Twitter,
    color: "#38bdf8"
  },
  {
    id: "linkedin",
    label: "LinkedIn Story",
    subtitle: "Founder Thought-Leadership",
    icon: Linkedin,
    color: "#60a5fa"
  },
  {
    id: "producthunt",
    label: "Product Hunt Kit",
    subtitle: "Tagline, Maker Post & FAQs",
    icon: Rocket,
    color: "#f97316"
  },
  {
    id: "changelog",
    label: "Public Changelog",
    subtitle: "Customer-Facing Release Notes",
    icon: FileText,
    color: "#c8ff3d"
  },
  {
    id: "email",
    label: "Launch Email",
    subtitle: "High-Converting Newsletter",
    icon: Mail,
    color: "#c8ff3d"
  },
  {
    id: "battlecard",
    label: "Competitor Battlecard",
    subtitle: "Sales Pitch & Differentiation",
    icon: Swords,
    color: "#ef4444"
  }
];

const AUDIENCES = [
  { id: "developers", label: "Developers & Builders", icon: "👨‍💻" },
  { id: "founders", label: "Founders & CTOs", icon: "🚀" },
  { id: "enterprise", label: "Enterprise & Security", icon: "🏢" },
  { id: "early_adopters", label: "Early Adopters & Hackers", icon: "⚡" }
];

const TONES = [
  { id: "hyped", label: "Hyped & Viral", icon: "🔥" },
  { id: "technical", label: "Crisp & Technical", icon: "⚡" },
  { id: "storytelling", label: "Founder Storytelling", icon: "📖" },
  { id: "authoritative", label: "Authoritative B2B", icon: "💼" }
];

const FEATURE_TOPICS = [
  "Axon Core Modular Architecture & High-Performance Micro-Services",
  "Project Brain Real-Time RAG Engine & Vector Retrieval Synthesis",
  "Zero-Config GitHub Repository Ingestion & Code Graph Extraction",
  "Executive Multi-Role Dashboard with RBAC & Instant Role Switching",
  "Sub-Millisecond Three.js Spatial Atmosphere & 60FPS WebGL UI",
  "Instant Groq 120B AI Code Analysis, Security Audit & Bug Detection"
];

export default function MarketerDeck({ workspace, token }) {
  const [activeChannel, setActiveChannel] = useState("twitter");
  const [selectedTopic, setSelectedTopic] = useState(FEATURE_TOPICS[0]);
  const [activeAudience, setActiveAudience] = useState("developers");
  const [activeTone, setActiveTone] = useState("hyped");
  const [customPrompt, setCustomPrompt] = useState("");
  const [deckOutput, setDeckOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleGenerateCampaign = async (overrideChannel) => {
    if (!workspace?.id) return;
    const channelToUse = overrideChannel || activeChannel;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/brain/growth-deck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          featureQuery: selectedTopic,
          channel: channelToUse,
          audience: activeAudience,
          tone: activeTone,
          customPrompt: customPrompt.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDeckOutput(data);
      } else {
        const err = await res.json();
        setDeckOutput({ error: err.error || "Failed to generate marketing campaign." });
      }
    } catch (err) {
      console.error("Marketer campaign error:", err);
      setDeckOutput({ error: "Network error connecting to Project Brain." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (deckOutput?.deck) {
      navigator.clipboard.writeText(deckOutput.deck);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!deckOutput?.deck) return;
    const blob = new Blob([deckOutput.deck], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axon-${activeChannel}-campaign.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentChannelMeta = CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];
  const charCount = deckOutput?.deck ? deckOutput.deck.length : 0;
  const wordCount = deckOutput?.deck ? deckOutput.deck.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="growth-studio-container">
      {/* Top Banner */}
      <div className="growth-studio-banner">
        <div className="growth-banner-copy">
          <div className="mono-label growth-kicker-pill">
            <Flame size={14} color="#f59e0b" />
            <span>GROWTH ENGINE &amp; VIRAL LAUNCHPAD</span>
          </div>
          <h2>Axon Growth Launchpad &amp; Campaign Studio</h2>
          <p>
            Project Brain translates your codebase architecture, commits, and technical features into
            ready-to-publish viral marketing campaigns across Twitter, LinkedIn, Product Hunt, and beyond.
          </p>
        </div>

        <div className="growth-banner-actions">
          <button
            type="button"
            className="button button--lime button--large growth-hero-btn"
            onClick={() => handleGenerateCampaign()}
            disabled={loading}
          >
            {loading ? <RefreshCw size={17} className="spin" /> : <Sparkles size={17} />}
            <span>{loading ? "Generating Campaign..." : "Generate Viral Campaign"}</span>
          </button>
        </div>
      </div>

      {/* Multi-Channel Switcher Tabs */}
      <div className="growth-channels-bar">
        <div className="channels-label mono-label">SELECT CAMPAIGN CHANNEL:</div>
        <div className="channels-grid">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                className={`growth-channel-tab ${isActive ? "active" : ""}`}
                style={{ "--accent-ch": ch.color }}
                onClick={() => {
                  setActiveChannel(ch.id);
                  if (deckOutput && !loading) {
                    handleGenerateCampaign(ch.id);
                  }
                }}
              >
                <div className="channel-tab-head">
                  <Icon size={18} style={{ color: isActive ? ch.color : "#999" }} />
                  <span className="channel-tab-title">{ch.label}</span>
                </div>
                <div className="channel-tab-sub">{ch.subtitle}</div>
                {isActive && <div className="channel-tab-indicator" style={{ background: ch.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls & Configuration Matrix */}
      <div className="growth-config-matrix">
        {/* Topic Anchor */}
        <div className="config-block topic-block">
          <label className="mono-label">
            <Target size={12} color="#f59e0b" />
            <span>CODEBASE FEATURE ANCHOR:</span>
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="growth-select"
          >
            {FEATURE_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {/* Audience Selector */}
        <div className="config-block">
          <label className="mono-label">
            <Sliders size={12} color="#38bdf8" />
            <span>TARGET AUDIENCE:</span>
          </label>
          <div className="pill-selector">
            {AUDIENCES.map((aud) => (
              <button
                key={aud.id}
                type="button"
                className={`pill-btn ${activeAudience === aud.id ? "active" : ""}`}
                onClick={() => setActiveAudience(aud.id)}
              >
                <span>{aud.icon}</span>
                <span>{aud.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tone Selector */}
        <div className="config-block">
          <label className="mono-label">
            <Flame size={12} color="#f97316" />
            <span>TONE OF VOICE:</span>
          </label>
          <div className="pill-selector">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`pill-btn ${activeTone === t.id ? "active tone-active" : ""}`}
                onClick={() => setActiveTone(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Prompt & Directive Bar */}
      <div className="growth-prompt-bar">
        <div className="prompt-input-wrapper">
          <Sparkles size={16} className="prompt-sparkle-icon" color="#c8ff3d" />
          <input
            type="text"
            className="growth-prompt-input"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleGenerateCampaign();
              }
            }}
            placeholder="Add custom angle or campaign instruction (e.g., 'Focus on 10x faster startup than Next.js', 'Frame as a tweet from an exhausted engineer', 'Highlight zero data leakage')..."
          />
          {customPrompt && (
            <button
              type="button"
              className="prompt-clear-btn mono-label"
              onClick={() => setCustomPrompt("")}
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="button"
          className="growth-run-btn"
          onClick={() => handleGenerateCampaign()}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw size={14} className="spin" />
          ) : (
            <ArrowRight size={14} />
          )}
          <span>Run Brain</span>
        </button>
      </div>

      {/* Main Campaign Output Card */}
      <div className="growth-output-card">
        {loading ? (
          <div className="growth-loading-state">
            <div className="pulse-spinner-wrap">
              <RefreshCw size={36} className="spin" color="#c8ff3d" />
            </div>
            <h3>Distilling Technical Codebase into Viral Marketing Assets...</h3>
            <p>
              Groq 120B AI is analyzing repository chunks, formatting channel structure for{" "}
              <strong>{currentChannelMeta.label}</strong>, and tuning copy for{" "}
              <strong>{activeAudience}</strong> in <strong>{activeTone}</strong> tone.
            </p>
          </div>
        ) : deckOutput ? (
          <>
            {/* Top Output Metadata Bar */}
            <div className="growth-output-head">
              <div className="output-meta-left">
                <div
                  className="channel-badge mono-label"
                  style={{
                    borderColor: currentChannelMeta.color,
                    color: currentChannelMeta.color
                  }}
                >
                  <currentChannelMeta.icon size={13} />
                  <span>{currentChannelMeta.label.toUpperCase()}</span>
                </div>
                <div className="output-stat mono-label">
                  <span>Audience:</span>
                  <strong>{activeAudience}</strong>
                </div>
                <div className="output-stat mono-label">
                  <span>Tone:</span>
                  <strong>{activeTone}</strong>
                </div>
                <div className="output-stat mono-label">
                  <span>Length:</span>
                  <strong>{wordCount} words</strong>
                  <span className="faded">({charCount} chars)</span>
                </div>
                <div className="output-stat mono-label">
                  <span>Read Time:</span>
                  <strong>~{readTimeMin} min</strong>
                </div>
              </div>

              <div className="output-actions">
                <button
                  type="button"
                  className="growth-action-btn"
                  onClick={handleCopy}
                  title="Copy Campaign Copy"
                >
                  {copied ? <Check size={14} color="#c8ff3d" /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy Campaign"}</span>
                </button>

                <button
                  type="button"
                  className="growth-action-btn"
                  onClick={handleDownload}
                  title="Download as Markdown"
                >
                  <Download size={14} />
                  <span>Download .md</span>
                </button>

                <button
                  type="button"
                  className="growth-action-btn"
                  onClick={() => handleGenerateCampaign()}
                  title="Regenerate Campaign"
                >
                  <RefreshCw size={14} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Error or Beautified Campaign Content */}
            {deckOutput.error ? (
              <div className="analysis-error-box">{deckOutput.error}</div>
            ) : (
              <div className="growth-copy-viewport">
                <FormattedAIResponse content={deckOutput.deck} />
              </div>
            )}

            {/* Expandable Brain Context Chunks */}
            {deckOutput.relevantChunks && deckOutput.relevantChunks.length > 0 && (
              <div className="growth-sources-drawer">
                <button
                  type="button"
                  className="sources-toggle-btn mono-label"
                  onClick={() => setShowSources(!showSources)}
                >
                  <BookOpen size={12} color="#c8ff3d" />
                  <span>
                    {showSources ? "Hide" : "Inspect"} Brain Source Chunks (
                    {deckOutput.relevantChunks.length})
                  </span>
                </button>

                {showSources && (
                  <div className="sources-list-grid">
                    {deckOutput.relevantChunks.map((chunk, idx) => (
                      <div key={idx} className="source-chunk-card">
                        <div className="source-chunk-path mono-label">
                          📄 {chunk.filePath}
                          {chunk.score && (
                            <span className="source-score">
                              match: {(chunk.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="source-chunk-snippet mono-label">
                          {chunk.content?.slice(0, 220)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="growth-empty-state">
            <div className="empty-icon-halo">
              <Megaphone size={40} color="#f59e0b" />
            </div>
            <h3>Axon Growth Engine Ready</h3>
            <p>
              Select your campaign channel above (Twitter/X, LinkedIn, Product Hunt, Changelog, Email,
              or Battlecard), choose your audience and tone, and synthesize launch-ready viral assets
              directly from your code.
            </p>
            <div className="empty-quick-actions">
              <button
                type="button"
                className="button button--lime button--large"
                onClick={() => handleGenerateCampaign("twitter")}
              >
                <Twitter size={16} />
                <span>Launch Twitter / X Thread</span>
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => handleGenerateCampaign("producthunt")}
              >
                <Rocket size={16} />
                <span>Generate Product Hunt Kit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
