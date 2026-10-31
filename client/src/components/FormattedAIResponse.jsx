import { useState } from "react";
import { Check, Copy, Terminal, Sparkles, Layers } from "lucide-react";

/**
 * Clean all backslashes, escape sequences, and symbol artifacts from raw AI text.
 */
function sanitizeText(raw) {
  if (!raw) return "";
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\([*_#[\]()~`>+\-=|{}!\\])/g, "$1") // unescape backslash escapes
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(/\\/g, "") // strip stray backslashes
    .trim();
}

/**
 * Format inline tokens like `inline code`, **bold text**, and *italic* without showing raw symbols.
 */
function formatInlineTokens(str) {
  if (!str) return "";

  // Split by backtick inline code: `code`
  const codeParts = str.split(/`([^`]+)`/g);
  return codeParts.map((part, idx) => {
    // Odd index is inside `code`
    if (idx % 2 === 1) {
      return (
        <code key={idx} className="ai-inline-code">
          {part}
        </code>
      );
    }

    // Even index can have **bold**
    const boldParts = part.split(/\*\*([^*]+)\*\*/g);
    return boldParts.map((bPart, bIdx) => {
      if (bIdx % 2 === 1) {
        return (
          <strong key={`${idx}-${bIdx}`} className="ai-bold-text">
            {bPart}
          </strong>
        );
      }

      // Check for *italic*
      const italicParts = bPart.split(/\*([^*]+)\*/g);
      return italicParts.map((iPart, iIdx) => {
        if (iIdx % 2 === 1) {
          return (
            <em key={`${idx}-${bIdx}-${iIdx}`} className="ai-italic-text">
              {iPart}
            </em>
          );
        }
        return iPart;
      });
    });
  });
}

/**
 * Gorgeous Section Divider Component:
 * Replaces ugly raw dashes like "----", "---", or "--- Title ---" with a sleek UI element.
 */
function SectionDivider({ label }) {
  return (
    <div className="ai-section-break">
      <span className="ai-section-line" />
      {label ? (
        <span className="ai-section-pill">
          <Sparkles size={11} color="#c8ff3d" />
          <span>{label}</span>
        </span>
      ) : (
        <span className="ai-section-dot-cluster">
          <span className="dot" />
          <span className="dot dot-active" />
          <span className="dot" />
        </span>
      )}
      <span className="ai-section-line" />
    </div>
  );
}

/**
 * Standalone Copyable Code Block Component
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-code-card">
      <div className="ai-code-header">
        <div className="ai-code-lang">
          <Terminal size={12} color="#61dafb" />
          <span>{(language || "code").toUpperCase()}</span>
        </div>
        <button
          type="button"
          className="ai-code-copy-btn"
          onClick={handleCopy}
          title="Copy code snippet"
        >
          {copied ? <Check size={12} color="#c8ff3d" /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy Code"}</span>
        </button>
      </div>
      <pre className="ai-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Clean Markdown Table Component
 */
function TableBlock({ headers, rows }) {
  if (!headers || !headers.length) return null;

  return (
    <div className="ai-table-wrapper">
      <table className="ai-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{formatInlineTokens(h.trim())}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{formatInlineTokens(cell.trim())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main Formatted AI Response Component:
 * Removes backslashes, markdown hashes, repetitive dashes, and renders natural English with sleek UI components.
 */
export default function FormattedAIResponse({ content }) {
  if (!content) return null;

  const sanitized = sanitizeText(content);
  const lines = sanitized.split("\n");

  const blocks = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: [...currentList] });
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Fence (```)
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "code",
          language: codeLang || "text",
          code: codeLines.join("\n")
        });
        inCodeBlock = false;
        codeLang = "";
        codeLines = [];
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, "").trim();
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    // 2. Dash / Equals Section Dividers (e.g. "----", "====", "--- [Section Name] ---")
    const titleDividerMatch = trimmed.match(/^[ \t]*[-=_*~]{2,}\s*\[?([^\]\n]+?)\]?\s*[-=_*~]{2,}[ \t]*$/);
    if (titleDividerMatch) {
      flushList();
      const cleanTitle = titleDividerMatch[1].replace(/^[#\s]+/, "").trim();
      blocks.push({ type: "divider", label: cleanTitle });
      continue;
    }

    if (/^[ \t]*[-=_*~]{3,}[ \t]*$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    // 3. Markdown Tables (| Header | Header |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Check if this is the start of a table
      const tableLines = [trimmed];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
        tableLines.push(lines[j].trim());
        j++;
      }

      // If at least 2 lines and second is separator |---|---|
      if (tableLines.length >= 2 && /^\|[-:\s|]+\|$/.test(tableLines[1])) {
        flushList();
        const headers = tableLines[0].split("|").slice(1, -1);
        const rows = tableLines.slice(2).map((r) => r.split("|").slice(1, -1));
        blocks.push({ type: "table", headers, rows });
        i = j - 1;
        continue;
      }
    }

    // 4. Headings (#, ##, ###, ####) - Remove symbols, keep clean title
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      // Strip any leading emoji or symbols from title for a clean look
      const title = headerMatch[2]
        .replace(/^[📦🛡️🔍⚡🧪💡⚠️\s#\-*~_]+/, "")
        .replace(/[\[\]]/g, "")
        .trim();
      blocks.push({
        type: "header",
        level,
        text: title || headerMatch[2]
      });
      continue;
    }

    // 5. Highlighted Callout / Verdict / Summary Cards
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith("quick verdict") ||
      lower.startsWith("verdict:") ||
      lower.startsWith("security verdict:") ||
      lower.startsWith("key recommendation:") ||
      lower.startsWith("summary:") ||
      lower.startsWith("note:") ||
      lower.startsWith("important:")
    ) {
      flushList();
      blocks.push({ type: "callout", text: trimmed });
      continue;
    }

    // 6. Bullet Items (* , - , + , • , 1. , 2.)
    const bulletMatch = trimmed.match(/^([*\-+•]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[2]);
      continue;
    }

    // 7. Normal Paragraph
    flushList();
    blocks.push({ type: "paragraph", text: trimmed });
  }

  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ type: "code", language: codeLang || "text", code: codeLines.join("\n") });
  }
  flushList();

  return (
    <div className="formatted-ai-response">
      {blocks.map((block, idx) => {
        if (block.type === "divider") {
          return <SectionDivider key={idx} label={block.label} />;
        }

        if (block.type === "header") {
          return (
            <div key={idx} className={`ai-header ai-header-h${block.level}`}>
              <span className="ai-header-dot" />
              <h4>{formatInlineTokens(block.text)}</h4>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <CodeBlock
              key={idx}
              language={block.language}
              code={block.code}
            />
          );
        }

        if (block.type === "table") {
          return (
            <TableBlock
              key={idx}
              headers={block.headers}
              rows={block.rows}
            />
          );
        }

        if (block.type === "callout") {
          return (
            <div key={idx} className="ai-callout-card">
              <Sparkles size={14} color="#c8ff3d" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>{formatInlineTokens(block.text)}</div>
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={idx} className="ai-list-group">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="ai-list-item">
                  <span className="ai-list-bullet" />
                  <div className="ai-list-text">{formatInlineTokens(item)}</div>
                </li>
              ))}
            </ul>
          );
        }

        // Paragraph
        return (
          <p key={idx} className="ai-paragraph">
            {formatInlineTokens(block.text)}
          </p>
        );
      })}
    </div>
  );
}
