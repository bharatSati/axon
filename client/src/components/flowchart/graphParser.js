/**
 * Lightweight Mermaid flowchart parser.
 *
 * Mermaid already owns layout + rendering. This parser only needs enough
 * structure for the studio's inspector, search, minimap and 3D view:
 * node labels, edges, subgraph names and a coarse shape category.
 */

export const GRAPH_GROUP_COLORS = [
  "#c8ff3d",
  "#38bdf8",
  "#a78bfa",
  "#f59e0b",
  "#34d399",
  "#fb7185",
  "#e879f9",
  "#facc15"
];

const HEADER_RE = /^\s*(?:flowchart|graph)\s+(?:TD|TB|BT|RL|LR)\b/i;
const SKIP_RE =
  /^\s*(?:classDef|class|style|linkStyle|click|direction|accTitle|accDescr|title)\b/i;
const SUBGRAPH_RE = /^subgraph\s+(?:"([^"]+)"|([A-Za-z0-9_-]+)(?:\s*\["([^"]+)"\])?)/i;

const NODE_RE =
  /([A-Za-z0-9_][\w-]*)\s*(\[\(|\(\[|\[\[|\(\(|\{\{|\(|\{|\[|>)\s*(?:"([^"]*)"|([^\]\)\}\n]+?))\s*(\]\)|\)\]|\]\]|\)\)|\}\}|\)|\}|\]|>)/g;

const EDGE_RE =
  /([A-Za-z0-9_][\w-]*)\s*(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*(-->|---|-.->|==>|--x|--o|<-->)\s*(?:\|([^|]*)\|\s*)?(?=([A-Za-z0-9_][\w-]*))/g;

function cleanLabel(value) {
  return String(value || "")
    .replace(/^["']|["']$/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function shapeFromBrackets(open, close) {
  if (open === "{" || close === "}") return "decision";
  if (open === "((" || open === "([" || close === "))" || close === "])") {
    if (open === "([") return "terminal";
    return "circle";
  }
  if (open === "[(" || close === ")]") return "database";
  if (open === "[[" || close === "]]") return "subroutine";
  if (open === "{{" || close === "}}") return "hexagon";
  if (open === ">" || close === ">") return "flag";
  return "process";
}

function ensureNode(map, id, label, shape, group) {
  if (!id) return;
  const existing = map.get(id);
  if (existing) {
    if (label && existing.label === existing.id) existing.label = label;
    if (shape && shape !== "process") existing.shape = shape;
    if (group && (!existing.group || existing.group === "Core")) existing.group = group;
    return;
  }
  map.set(id, {
    id,
    label: cleanLabel(label) || id,
    shape: shape || "process",
    group: group || "Core"
  });
}

/**
 * @param {string} rawCode
 * @returns {{ nodes: Array<{id:string,label:string,shape:string,group:string}>, edges: Array<{from:string,to:string,label:string,type:string}>, groups: string[] }}
 */
export function parseMermaidGraph(rawCode) {
  const empty = { nodes: [], edges: [], groups: [] };
  if (!rawCode || typeof rawCode !== "string") return empty;

  const nodeMap = new Map();
  const edgeList = [];
  const groups = [];
  let currentGroup = "Core";

  const lines = rawCode.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("%%")) continue;

    if (HEADER_RE.test(line)) continue;

    if (/^subgraph\b/i.test(line)) {
      const match = line.match(SUBGRAPH_RE);
      const title = cleanLabel(match?.[3] || match?.[2] || match?.[1] || "Group");
      currentGroup = title || "Group";
      if (!groups.includes(currentGroup)) groups.push(currentGroup);
      continue;
    }

    if (/^end\b/i.test(line)) {
      currentGroup = "Core";
      continue;
    }

    if (SKIP_RE.test(line)) continue;

    // Node declarations with explicit labels.
    NODE_RE.lastIndex = 0;
    let nodeMatch;
    while ((nodeMatch = NODE_RE.exec(line)) !== null) {
      const id = nodeMatch[1];
      const open = nodeMatch[2];
      const close = nodeMatch[5];
      const rawLabel = nodeMatch[3] !== undefined ? nodeMatch[3] : nodeMatch[4];
      ensureNode(nodeMap, id, rawLabel, shapeFromBrackets(open, close), currentGroup);
    }

    // Edges: A --> B, A -->|label| B, A -.-> B, A ==> B ...
    EDGE_RE.lastIndex = 0;
    let edgeMatch;
    while ((edgeMatch = EDGE_RE.exec(line)) !== null) {
      const from = edgeMatch[1];
      const to = edgeMatch[4];
      const label = cleanLabel(edgeMatch[3]);
      if (!from || !to || from === to) continue;
      if (HEADER_RE.test(from) || HEADER_RE.test(to)) continue;

      ensureNode(nodeMap, from, "", "process", currentGroup);
      ensureNode(nodeMap, to, "", "process", currentGroup);

      const duplicate = edgeList.some(
        (edge) => edge.from === from && edge.to === to && edge.label === label
      );
      if (!duplicate) {
        edgeList.push({ from, to, label, type: edgeMatch[2] });
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: edgeList,
    groups
  };
}

export function getConnectedIds(nodeId, edges) {
  const ids = new Set();
  if (!nodeId) return ids;
  ids.add(nodeId);
  for (const edge of edges) {
    if (edge.from === nodeId) ids.add(edge.to);
    if (edge.to === nodeId) ids.add(edge.from);
  }
  return ids;
}
