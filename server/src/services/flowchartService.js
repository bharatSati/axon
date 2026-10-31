import { queryWorkspaceBrain } from "./rag/ragQueryService.js";
import { callGroqChat, sanitizeAIOutput } from "./rag/groqService.js";
import { Workspace } from "../models/Workspace.js";

/**
 * Standard Colorful Cyberpunk Mermaid Palette Classes
 */
const COLORFUL_MERMAID_CLASSES = `
  %% Vibrant Cyberpunk Styling Classes
  classDef client fill:#082f49,stroke:#38bdf8,stroke-width:2px,color:#f0f9ff,font-weight:bold
  classDef gateway fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff,font-weight:bold
  classDef auth fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#faf5ff,font-weight:bold
  classDef logic fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#f0fdf4,font-weight:bold
  classDef ai fill:#283618,stroke:#c8ff3d,stroke-width:2px,color:#0b0f0a,font-weight:bold
  classDef db fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fffbeb,font-weight:bold
  classDef queue fill:#4c0519,stroke:#fb7185,stroke-width:2px,color:#fff1f2,font-weight:bold
  classDef decision fill:#3f2c00,stroke:#f59e0b,stroke-width:2px,color:#fef3c7,font-weight:bold
  classDef success fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ecfdf5,font-weight:bold
  classDef error fill:#450a0a,stroke:#f87171,stroke-width:2px,color:#fef2f2,font-weight:bold
`;

/**
 * Clean and extract Mermaid code block from raw AI output
 */
function extractMermaidCode(rawText) {
  if (!rawText) return "";

  // 1. Try finding ```mermaid ... ``` block
  const match = rawText.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/i);
  let code = match ? match[1].trim() : rawText.trim();

  // If code has leading markdown artifacts, clean them
  code = code.replace(/^(?:mermaid|graph|flowchart)\b/i, (m) => m.toLowerCase());

  // Ensure it starts with a valid mermaid diagram type
  if (!code.startsWith("flowchart") && !code.startsWith("graph") && !code.startsWith("sequenceDiagram")) {
    code = `flowchart TD\n${code}`;
  }

  // Ensure colorful class definitions are appended if not present
  if (!code.includes("classDef client")) {
    code = `${code}\n\n${COLORFUL_MERMAID_CLASSES}`;
  }

  return code;
}

/**
 * Generate an architectural Mermaid flowchart from user prompt + Project Brain RAG context
 */
export async function generateFlowchartDiagram(workspaceId, prompt, options = {}) {
  const { detailLevel = "comprehensive", orientation = "TD" } = options;

  const workspace = await Workspace.findOne({ id: workspaceId }).lean();
  const repoName = workspace?.repository?.fullName || workspace?.name || "Axon Workspace";

  // 1. Retrieve RAG chunks from Project Brain related to this prompt
  let ragChunks = [];
  try {
    const ragRes = await queryWorkspaceBrain(workspaceId, prompt, { topK: 5 });
    if (ragRes?.results) ragChunks = ragRes.results;
  } catch (err) {
    console.warn("RAG query notice for flowchart generation:", err.message);
  }

  const formattedContext = ragChunks
    .map((c, i) => `--- [CODE CONTEXT ${i + 1}: ${c.filePath}] ---\n${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are the Axon Architectural Visualizer and System Flowchart Engineer.
Your task is to convert developer prompts and software codebase logic into ULTRA-VIBRANT, COLORFUL, and COMPILE-READY Mermaid.js flowcharts.

CRITICAL MERMAID SYNTAX RULES:
1. Always start with: \`flowchart ${orientation}\`
2. Group related stages into \`subgraph SubgraphName["Title with Emoji"] ... end\` blocks.
3. Every node MUST have clear emojis and concise descriptions.
4. Apply colorful class definitions to every node using \`:::className\`:
   - \`:::client\` for frontend, browsers, user inputs (cyan neon)
   - \`:::gateway\` for API gateway, ingress, router (indigo neon)
   - \`:::auth\` for authentication, tokens, security checks (purple neon)
   - \`:::logic\` for controllers, domain services, workers (emerald green)
   - \`:::ai\` for LLM, Groq, Project Brain RAG, vector retrieval (lime neon)
   - \`:::db\` for databases, schemas, MongoDB, storage (amber gold)
   - \`:::decision\` for conditionals, checks, validation branches (orange gold)
   - \`:::success\` for 200 OK, successful responses, redirects (green)
   - \`:::error\` for 401, 403, 404, 500 rejections (red)
5. Include descriptive transition arrows: e.g. \`A -->|Bearer Token Validated| B\` or \`C -->|No| D\`
6. Never output broken syntax or raw HTML tags inside node labels.
7. Wrap your entire diagram in a single \`\`\`mermaid code fence.
8. Follow the diagram with a concise 3-5 bullet point architectural walkthrough explaining what happens at each step in plain English without symbol clutter.`;

  const userPrompt = `REPOSITORY / WORKSPACE: ${repoName}

USER ARCHITECTURAL REQUEST / PROMPT:
"${prompt}"

ENGINEERING REPOSITORY CONTEXT (PROJECT BRAIN RAG):
${formattedContext || "Standard full-stack client-server architecture with React frontend, Express API gateway, JWT auth, MongoDB Atlas, and Groq 120B Project Brain."}

TASK:
Generate a vibrant, colorful, and accurate Mermaid flowchart diagram depicting this exact architecture and process flow, followed by a concise step-by-step walkthrough.`;

  try {
    const rawResponse = await callGroqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.25, max_tokens: 1500 }
    );

    if (!rawResponse) {
      throw new Error("AI service returned empty response");
    }

    // Extract Mermaid block and explanation text
    const mermaidMatch = rawResponse.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/i);
    const mermaidCode = extractMermaidCode(mermaidMatch ? mermaidMatch[1] : rawResponse);

    // Everything after the code block is the explanation walkthrough
    let explanation = "";
    if (mermaidMatch) {
      const parts = rawResponse.split(/```(?:mermaid)?[\s\S]*?```/i);
      explanation = parts[parts.length - 1]?.trim() || "";
    } else {
      explanation = "Architectural flowchart synthesized from repository source files and Project Brain.";
    }

    return {
      success: true,
      prompt,
      title: deriveTitleFromPrompt(prompt),
      mermaidCode,
      explanation: sanitizeAIOutput(explanation),
      relevantChunks: ragChunks
    };
  } catch (err) {
    console.error("generateFlowchartDiagram error:", err);
    throw new Error(`Failed to generate architectural flowchart: ${err.message}`);
  }
}

/**
 * Derive clean title from prompt
 */
function deriveTitleFromPrompt(prompt = "") {
  const p = prompt.trim();
  if (p.length < 50) return p;
  const firstSentence = p.split(/[.?!]/)[0];
  return firstSentence.slice(0, 50) + "...";
}

/**
 * Preset Flowchart Library for 1-Click Architectural Exploration
 */
export function getPresetFlowcharts() {
  return [
    {
      id: "auth-jwt",
      title: "GitHub OAuth & JWT Authentication Flow",
      description: "Complete auth handshake from GitHub authorization callback to JWT issuance and role verification.",
      prompt: "Show complete authentication flow from GitHub OAuth login to JWT token generation, role extraction, and authenticateToken middleware verification.",
      icon: "Shield",
      color: "#c084fc"
    },
    {
      id: "rag-engine",
      title: "Project Brain Hybrid RAG Retrieval Engine",
      description: "Multi-stage retrieval using BM25 lexical inverted index and Vector Cosine distance synthesis.",
      prompt: "Show how Project Brain hybrid RAG query pipeline works: query parsing, BM25 inverted index lexical search, Vector Cosine similarity calculation, ranking, and Groq 120B context injection.",
      icon: "Cpu",
      color: "#c8ff3d"
    },
    {
      id: "redirect-lifecycle",
      title: "High-Speed URL Redirect & Analytics Stream",
      description: "Sub-millisecond link resolution, password protection verification, and real-time click tracking payload.",
      prompt: "Show URL redirection request lifecycle from client incoming short link request, password validation, rate limit check, click payload geo enrichment, MongoDB update, and HTTP 302 redirect.",
      icon: "Zap",
      color: "#38bdf8"
    },
    {
      id: "system-architecture",
      title: "Axon Full-Stack Modular System Architecture",
      description: "Decoupled React client, Three.js spatial background, Express API gateway, MongoDB store, and Groq LLM.",
      prompt: "Show the complete Axon system architecture: Vite React client, Three.js 60fps canvas, API Gateway routes, Workspace controllers, MongoDB database, and Groq 120B Project Brain.",
      icon: "Layers",
      color: "#10b981"
    },
    {
      id: "time-machine",
      title: "Time Machine Commit Evolution Pipeline",
      description: "Deep git history extraction, un-shallowing cache, architectural milestone detection, and version diffing.",
      prompt: "Show Time Machine architectural pipeline: workspace repository cache un-shallow fetch, commit timeline parser, architectural milestone categorization, and Groq 120B version diff comparison engine.",
      icon: "History",
      color: "#f59e0b"
    }
  ];
}
