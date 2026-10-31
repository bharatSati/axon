import { config } from "../../config/index.js";

/**
 * Clean and sanitize AI response: remove literal backslashes, escape artifacts, and weird characters.
 */
export function sanitizeAIOutput(text) {
  if (!text) return "";
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\([*_#[\]()~`>+\-=|{}!\\])/g, "$1")
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(/\\/g, "")
    .trim();
}

/**
 * Robust Groq API caller with automatic retry, timeout protection, and output sanitization.
 */
export async function callGroqChat(messages, options = {}) {
  const { apiKey, model, baseUrl } = config.groq;
  if (!apiKey) return null;

  const { max_tokens = 1400, temperature = 0.3, retries = 2 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "openai/gpt-oss-120b",
          messages,
          temperature,
          max_tokens
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Groq API returned [${response.status}] attempt ${attempt}: ${errText}`);
        if (response.status === 429 && attempt < retries) {
          await new Promise((res) => setTimeout(res, 1200));
          continue;
        }
        return null;
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;
      return answer ? sanitizeAIOutput(answer) : null;
    } catch (err) {
      console.warn(`Groq request attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 800));
      }
    }
  }

  return null;
}

/**
 * Generate an expert engineering answer using Groq LLM (openai/gpt-oss-120b)
 * augmented with retrieved RAG code and documentation chunks.
 */
export const generateGroqBrainAnswer = async (query, contextChunks, workspaceMeta = {}) => {
  const formattedContext = contextChunks
    .map((chunk, index) => {
      return `--- [SOURCE ${index + 1}: ${chunk.filePath}] (${chunk.title || chunk.type}) ---\n${chunk.content}`;
    })
    .join("\n\n");

  const systemPrompt = `You are the Axon Project Brain, an expert software architect with deep technical knowledge of this software project repository.
Communicate in clean, natural, professional English without symbols, weird emojis, or escape sequences.
Never output raw backslashes (\\) or escaped markdown characters like \\_ or \\*.
- Be precise, technical, and concise.
- Reference specific file paths, symbols, functions, or configurations when relevant.
- If the context doesn't contain enough detail, state what is known from the context and suggest where to look.`;

  const userPrompt = `REPOSITORY CONTEXT (${workspaceMeta.name || "Axon Workspace"}):
${formattedContext}

ENGINEERING QUESTION:
${query}

Please provide a clear, actionable architectural and engineering answer in plain English:`;

  return callGroqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.2, max_tokens: 1024 }
  );
};

/**
 * Deep inspection of a code file or selected code snippet for the Developer IDE.
 * Actions: 'explain' | 'dependencies' | 'security' | 'tests' | 'optimize'
 */
export const inspectCodeWithBrain = async ({
  filePath,
  codeSnippet,
  action = "explain",
  customPrompt = "",
  contextChunks = [],
  workspaceMeta = {}
}) => {
  const actionPrompts = {
    explain: "Analyze this code in depth: explain its architecture, data flow, responsibilities, and how it connects to the rest of the workspace.",
    dependencies: "Analyze all internal and external dependencies of this file/snippet. Identify upstream callers, downstream imports, and state flow.",
    security: "Perform a security and robustness audit on this code: identify potential vulnerabilities, input validation gaps, access control risks, and edge cases.",
    optimize: "Analyze this code for performance bottlenecks, algorithmic complexity, memory efficiency, and latency optimization.",
    tests: "Generate comprehensive unit tests and edge-case test vectors for this code, with realistic assertions and mocks."
  };

  let instruction = actionPrompts[action] || actionPrompts.explain;
  if (customPrompt && customPrompt.trim()) {
    instruction = `DEVELOPER'S CUSTOM INSTRUCTION / QUESTION:\n"${customPrompt.trim()}"\n\n(Guide: ${actionPrompts[action] || "Analyze thoroughly based on repository architecture"})`;
  }

  const formattedContext = contextChunks
    .slice(0, 4)
    .map((c, i) => `--- [RELATED REPO CHUNK ${i + 1}: ${c.filePath}] ---\n${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are the Axon Project Brain, an expert software architect and developer copilot.
Communicate in clean, natural, professional English without symbols, weird emojis, or escape sequences.
Never output raw backslashes (\\) or escaped markdown characters like \\_ or \\*.
Structure your analysis with clear headings, concise bullet points, and clean code blocks.`;

  const userPrompt = `FILE: ${filePath}
WORKSPACE REPOSITORY CONTEXT:
${formattedContext}

SELECTED CODE SNIPPET / FILE:
\`\`\`
${codeSnippet}
\`\`\`

TASK:
${instruction}`;

  return callGroqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.2, max_tokens: 1200 }
  );
};

/**
 * Generate QA & Test Strategy for Tester Role
 */
export const generateQATestPlan = async (targetModule, contextChunks = [], workspaceMeta = {}) => {
  const formattedContext = contextChunks
    .slice(0, 4)
    .map((c, i) => `--- [CODE MODULE ${i + 1}: ${c.filePath}] ---\n${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are the Axon QA Intelligence Brain. Communicate in clean, professional English without raw backslashes or symbol clutter. Generate automated verification plans, edge cases, regression check matrices, and integration test suites based on repository code.`;
  const userPrompt = `TARGET MODULE / SCOPE: ${targetModule || "Full Repository"}
REPOSITORY ARCHITECTURAL CONTEXT:
${formattedContext}

Generate a comprehensive, actionable QA & Testing Strategy:
1. Critical Test Scenarios & Edge Cases
2. Integration Verification Points
3. Recommended Automated Test Suite Structure (Unit & E2E)
4. Potential Failure Modes & Reliability Risks`;

  return callGroqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.25, max_tokens: 1200 }
  );
};

/**
 * Generate Multi-Channel Viral Marketing Assets, Launch Kits & Competitive Pitches
 */
export const generateMarketingDeck = async ({
  featureQuery = "Full Product Architecture",
  channel = "twitter",
  audience = "developers",
  tone = "hyped",
  customPrompt = "",
  contextChunks = [],
  workspaceMeta = {}
}) => {
  const formattedContext = contextChunks
    .slice(0, 4)
    .map((c, i) => `--- [FEATURE CONTEXT ${i + 1}: ${c.filePath}] ---\n${c.content}`)
    .join("\n\n");

  const channelGuides = {
    twitter: "Generate a viral 5-part Twitter/X launch thread. Start with a scroll-stopping hook tweet. Follow with problem/pain point, 2 tweets explaining the architecture and speed advantages, and a final CTA tweet with relevant developer hashtags. Format clearly as Tweet 1/5, Tweet 2/5, etc.",
    linkedin: "Generate a high-engagement LinkedIn founder/thought-leadership post. Begin with a powerful 1-sentence hook that stops the feed. Share the engineering journey, the problem existing tools fail to solve, 3 bullet points on how our tech solves it, and end with an open question to drive comments.",
    producthunt: "Generate a complete Product Hunt Launch Kit. Include: 1. Catchy Tagline (< 60 chars), 2. The Problem We Solved, 3. Key Differentiators, 4. Official Maker First Comment (personal, humble, inviting feedback), 5. Three FAQs for launch day hunters.",
    changelog: "Generate a clean, customer-facing Product Changelog & Release Notes. Include: 1. Release Version & Title, 2. Major Features & What's New, 3. Performance & Speed Optimizations, 4. Under-the-Hood Bug Fixes, 5. What We're Building Next.",
    email: "Generate a high-converting Product Launch Email & Newsletter. Include: 1. Three high-open-rate Subject Line options, 2. Preview snippet, 3. Compelling, personal email body explaining the new release, 4. Primary Call-To-Action (CTA) button copy, 5. P.S. note.",
    battlecard: "Generate a Competitor Battlecard & Differentiation Analysis. Include: 1. Core Value Proposition vs Traditional Alternatives, 2. Feature Comparison Matrix (Why Our Architecture Wins), 3. Top 3 Objections & Exact Counter-Pitches, 4. The One-Liner Closing Pitch."
  };

  const channelInstruction = channelGuides[channel] || channelGuides.twitter;

  const toneGuides = {
    hyped: "Tone: Energetic, bold, exciting, viral, high enthusiasm suitable for a major product launch.",
    technical: "Tone: Crisp, confident, technical, authoritative, focused on performance and architecture.",
    storytelling: "Tone: Authentic, narrative-driven, personal founder journey, transparent and relatable.",
    authoritative: "Tone: Premium, polished, B2B enterprise grade, ROI-focused, and professional."
  };

  const audienceGuides = {
    developers: "Target Audience: Software engineers, developers, and tech builders who value speed, clean APIs, and modern stacks.",
    founders: "Target Audience: Startup founders, CTOs, and tech leaders looking for scalability, productivity, and rapid growth.",
    enterprise: "Target Audience: Enterprise decision-makers focused on security, compliance, reliability, and team efficiency.",
    early_adopters: "Target Audience: Tech enthusiasts, indie hackers, and early adopters eager for new innovative tools."
  };

  const systemPrompt = `You are the Axon Growth Engine and Product Marketing Copilot.
Communicate in clean, natural, professional English without raw backslashes or symbol clutter.
Translate repository architectures and code into copy-paste-ready viral marketing campaigns.
${toneGuides[tone] || toneGuides.hyped}
${audienceGuides[audience] || audienceGuides.developers}`;

  let userPrompt = `TOPIC / FEATURE FOCUS: ${featureQuery}
CHANNEL FORMAT: ${channel.toUpperCase()}
TARGET AUDIENCE: ${audience}
TONE OF VOICE: ${tone}

ENGINEERING REPOSITORY CONTEXT:
${formattedContext}

TASK:
${channelInstruction}`;

  if (customPrompt && customPrompt.trim()) {
    userPrompt += `\n\nMARKETER'S CUSTOM ANGLE / INSTRUCTION:\n"${customPrompt.trim()}"`;
  }

  return callGroqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.35, max_tokens: 1400 }
  );
};
