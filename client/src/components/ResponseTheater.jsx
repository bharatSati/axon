import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, Sparkles } from "lucide-react";
import FocusOverlay from "./FocusOverlay";
import FormattedAIResponse from "./FormattedAIResponse";

/**
 * Reusable "big screen" response reader.
 *
 * Every studio that produces an AI answer can drop this in and get the same
 * cinematic, full-width reading experience without duplicating overlay logic.
 */
export default function ResponseTheater({
  open = false,
  onClose,
  originRef,
  title = "AI response",
  kicker = "AXON · DEEP READ",
  badge,
  content,
  error,
  icon: Icon = Sparkles
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const handleCopy = () => {
    const text = content || error || "";
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <FocusOverlay
      open={open}
      onClose={onClose}
      originRef={originRef}
      icon={Icon}
      kicker={kicker}
      title={title}
      badge={badge}
      footer={
        <div className="theater-footer-bar">
          <span className="theater-footer-note">
            <Sparkles size={13} />
            AI generated · verify critical recommendations before shipping
          </span>
          <button type="button" className="theater-copy-btn" onClick={handleCopy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy response"}</span>
          </button>
        </div>
      }
    >
      <div className="focus-response response-theater-body">
        {error ? (
          <div className="analysis-error-box">
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        ) : (
          <FormattedAIResponse content={content} />
        )}
      </div>
    </FocusOverlay>
  );
}
