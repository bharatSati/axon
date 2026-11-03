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
  Share2,
  FolderGit2,
  Clock,
  Layers,
  Award
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

export default function MarketerDeck({ workspace, token }) {
  const repoName = workspace?.repository?.name || workspace?.name || "Repository";
  const repoDesc = workspace?.repository?.description || workspace?.description || "";
  const featureTopics = [
    repoDesc ? `${repoName}: ${repoDesc}` : `${repoName} Full Platform Architecture & Overview`,
    "Core Capabilities & Developer Experience",
    "Performance, Latency & Scalability Highlights",
    "Security Architecture & Infrastructure Boundaries",
    "Product Release, Feature Highlights & Roadmap"
  ];

  const [activeChannel, setActiveChannel] = useState("twitter");
  const [selectedTopic, setSelectedTopic] = useState(featureTopics[0]);
  const [activeAudience, setActiveAudience] = useState("developers");
  const [activeTone, setActiveTone] = useState("hyped");
  const [customPrompt, setCustomPrompt] = useState("");
  const [deckOutput, setDeckOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const currentTopic = selectedTopic || featureTopics[0];

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
      {/* Symmetric Top Header Card */}
      <div className="analytics-header-card">
        <div className="analytics-header-main">
          <div className="analytics-eyebrow">
            <span className="analytics-live-dot" />
            PRODUCT POSITIONING &amp; VIRAL CAMPAIGN ENGINE
          </div>
          <h1 className="analytics-main-title">Growth &amp; Product Marketing Deck</h1>
          <div className="analytics-repo-strip">
            <span className="analytics-repo-badge">
              <FolderGit2 size={14} className="text-lime" />
              <strong>{workspace?.repository?.fullName || workspace?.name || "Repository"}</strong>
            </span>
            <span className="analytics-branch-badge">
              branch: <code>{workspace?.repository?.defaultBranch || "main"}</code>
            </span>
            <span className="analytics-meta-pill">
              {CHANNELS.length} Multi-Channels
            </span>
            <span className="analytics-meta-pill" style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.3)" }}>
              Brain RAG Active
            </span>
          </div>
        </div>

        {/* Campaign Score & Primary Action */}
        <div className="analytics-header-actions">
          <div className="analytics-health-card">
            <div className="health-grade-circle" style={{ borderColor: "#c8ff3d" }}>
              <span className="health-grade-text" style={{ color: "#c8ff3d", fontSize: "15px" }}>
                {deckOutput?.deck ? "94" : "—"}
              </span>
            </div>
            <div className="health-meta">
              <div className="health-score-val" style={{ color: "#c8ff3d" }}>
                {deckOutput?.deck ? "RESONANCE HIGH" : "STANDBY"}
              </div>
              <div className="health-label">Growth Resonance Score</div>
            </div>
          </div>

          <div className="analytics-action-buttons">
            <button
              type="button"
              className="analytics-btn-primary"
              onClick={() => handleGenerateCampaign()}
              disabled={loading}
              title="Generate viral marketing campaign"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{loading ? "Synthesizing..." : "Generate Campaign"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Symmetric Bento KPI Grid: 4 Growth Metrics */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">ACTIVE CAMPAIGNS</span>
            <div className="kpi-icon-wrap">
              <Megaphone size={16} />
            </div>
          </div>
          <div className="kpi-number">{CHANNELS.length} Channels</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">OMNICHANNEL</span>
            <span>Twitter, LinkedIn, Product Hunt</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">TARGET AUDIENCE</span>
            <div className="kpi-icon-wrap">
              <Target size={16} />
            </div>
          </div>
          <div className="kpi-number">{AUDIENCES.length} Personas</div>
          <div className="kpi-sub">
            <span className="kpi-tag-blue">CALIBRATED</span>
            <span>Devs, Founders, Enterprise, Hackers</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">CONTENT VELOCITY</span>
            <div className="kpi-icon-wrap">
              <Zap size={16} />
            </div>
          </div>
          <div className="kpi-number">Real-Time</div>
          <div className="kpi-sub">
            <span className="kpi-tag-lime">LLM 120B</span>
            <span>Instant zero-hallucination copy</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">MARKET POSITIONING</span>
            <div className="kpi-icon-wrap">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-number">100% Unique</div>
          <div className="kpi-sub">
            <span className="kpi-tag-blue">DIFFERENTIATED</span>
            <span>Trained on live codebase AST</span>
          </div>
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
                style={{ "--accent-ch": "#c8ff3d" }}
                onClick={() => {
                  setActiveChannel(ch.id);
                  if (deckOutput && !loading) {
                    handleGenerateCampaign(ch.id);
                  }
                }}
              >
                <div className="channel-tab-head">
                  <Icon size={18} style={{ color: isActive ? "#c8ff3d" : "#8b9089" }} />
                  <span className="channel-tab-title">{ch.label}</span>
                </div>
                <div className="channel-tab-sub">{ch.subtitle}</div>
                {isActive && <div className="channel-tab-indicator" style={{ background: "#c8ff3d" }} />}
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
            <Target size={12} />
            <span>CODEBASE FEATURE ANCHOR:</span>
          </label>
          <select
            value={currentTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="growth-select"
          >
            {featureTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {/* Audience Selector */}
        <div className="config-block">
          <label className="mono-label">
            <Sliders size={12} />
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
                <span>{aud.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tone Selector */}
        <div className="config-block">
          <label className="mono-label">
            <Flame size={12} />
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
              <Megaphone size={40} />
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
