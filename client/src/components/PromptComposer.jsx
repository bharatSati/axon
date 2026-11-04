import { useMemo } from "react";
import {
  Sparkles,
  Wand2,
  PenLine,
  Zap,
  ChevronRight,
  Maximize2,
  Check,
  Layers
} from "lucide-react";

export const DEFAULT_PROMPT_TEMPLATES = [
  {
    id: "architecture",
    label: "Explain the architecture",
    prompt:
      "Explain the architecture, data flow, inputs, outputs and design patterns used in this file. Mention how it fits into the wider repository."
  },
  {
    id: "dependencies",
    label: "Trace dependencies & callers",
    prompt:
      "List every internal module, downstream caller and external package this code depends on. Call out anything that could break if this file changes."
  },
  {
    id: "security",
    label: "Audit security & edge cases",
    prompt:
      "Audit this code for security vulnerabilities, injection risks, missing validation and unsafe edge cases. Give concrete fixes for every issue."
  },
  {
    id: "performance",
    label: "Find performance bottlenecks",
    prompt:
      "Find performance bottlenecks, algorithmic complexity, memory pressure and unnecessary work in this code. Suggest measurable optimisations."
  },
  {
    id: "tests",
    label: "Generate a test suite",
    prompt:
      "Generate a comprehensive unit and integration test suite for this code, including mocks, edge cases and failure-mode assertions."
  },
  {
    id: "recent",
    label: "Summarise recent evolution",
    prompt:
      "Summarise how this file and its surrounding modules evolved across recent commits, and explain what the latest changes were trying to achieve."
  }
];

const MODES = [
  { id: "preset", label: "Preset", icon: Sparkles, hint: "Ready-made analysis modes" },
  { id: "template", label: "Prompt library", icon: Wand2, hint: "Curated questions for the brain" },
  { id: "custom", label: "Write prompt", icon: PenLine, hint: "Ask anything in your own words" }
];

export default function PromptComposer({
  actions = [],
  action,
  onActionChange,
  mode = "preset",
  onModeChange,
  customPrompt = "",
  onCustomPromptChange,
  template = "",
  onTemplateChange,
  templates = DEFAULT_PROMPT_TEMPLATES,
  onRun,
  loading = false,
  disabled = false,
  contextLabel = "Current file",
  snippet = "",
  onClearSnippet,
  onExpand,
  compact = false,
  runLabel = "Run Brain"
}) {
  const activeAction = useMemo(() => {
    const found = actions.find((item) => item.id === action);
    return found || actions[0] || null;
  }, [actions, action]);

  const activeMode = MODES.find((item) => item.id === mode) || MODES[0];

  const promptText =
    mode === "template" ? template : mode === "custom" ? customPrompt : "";

  const canRun = !disabled && !loading && (mode === "preset" ? !!activeAction : promptText.trim().length > 0);

  const handleRun = () => {
    if (!canRun) return;
    onRun?.({
      mode,
      action: mode === "preset" ? activeAction?.id || "explain" : "custom",
      prompt: mode === "preset" ? "" : promptText.trim()
    });
  };

  return (
    <div
      className={`prompt-composer ${compact ? "prompt-composer--compact" : ""} ${loading ? "is-loading" : ""}`}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          handleRun();
        }
      }}
    >
      <div className="pc-topline">
        <div className="pc-mode-tabs" role="tablist" aria-label="Prompt mode">
          {MODES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={mode === item.id}
                className={`pc-mode-tab ${mode === item.id ? "is-active" : ""}`}
                onClick={() => onModeChange?.(item.id)}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pc-context">
          <span className="pc-context-pill">
            <Layers size={12} />
            {contextLabel}
          </span>
          {snippet ? (
            <span className="pc-snippet-pill">
              <Check size={11} />
              {snippet.length} chars selected
              {onClearSnippet && (
                <button type="button" onClick={onClearSnippet} title="Clear selection">
                  ×
                </button>
              )}
            </span>
          ) : null}
          {onExpand && (
            <button type="button" className="pc-expand-btn" onClick={onExpand} title="Open cinematic focus stage">
              <Maximize2 size={13} />
              <span>Expand</span>
            </button>
          )}
        </div>
      </div>

      <div className="pc-surface">
        {mode === "preset" && (
          <div className="pc-preset-grid">
            {actions.map((item) => {
              const Icon = item.icon || Sparkles;
              const selected = activeAction?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`pc-preset-card ${selected ? "is-selected" : ""}`}
                  onClick={() => onActionChange?.(item.id)}
                >
                  <span className="pc-preset-icon">
                    <Icon size={15} />
                  </span>
                  <span className="pc-preset-copy">
                    <strong>{item.label}</strong>
                    {!compact && <span>{item.desc}</span>}
                  </span>
                  <ChevronRight size={13} className="pc-preset-arrow" />
                </button>
              );
            })}
          </div>
        )}

        {mode === "template" && (
          <div className="pc-template-grid">
            {templates.map((item) => {
              const selected = item.prompt === template;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`pc-template-card ${selected ? "is-selected" : ""}`}
                  onClick={() => onTemplateChange?.(item.prompt)}
                >
                  <span className="pc-template-dot" />
                  <span>{item.label}</span>
                  <ChevronRight size={12} />
                </button>
              );
            })}
          </div>
        )}

        {mode === "custom" && (
          <div className="pc-custom">
            <PenLine size={15} className="pc-custom-icon" />
            <textarea
              value={customPrompt}
              onChange={(event) => onCustomPromptChange?.(event.target.value)}
              rows={compact ? 2 : 3}
              placeholder="Write a precise question about this code… e.g. “Why does this hook re-render on every keystroke, and how would you fix it?”"
            />
            <span className="pc-char-count">{customPrompt.length} / 2000</span>
          </div>
        )}
      </div>

      <div className="pc-footer">
        <div className="pc-footer-note">
          <span className={`pc-mode-dot pc-mode-dot--${mode}`} />
          <span>{activeMode.hint}</span>
          {mode === "template" && template ? <em>{template.slice(0, 88)}{template.length > 88 ? "…" : ""}</em> : null}
        </div>

        <button type="button" className="pc-run-btn" onClick={handleRun} disabled={!canRun}>
          {loading ? (
            <span className="pc-run-spinner" />
          ) : (
            <Zap size={14} />
          )}
          <span>{loading ? "Thinking…" : runLabel}</span>
          <kbd>⌘↵</kbd>
        </button>
      </div>
    </div>
  );
}
