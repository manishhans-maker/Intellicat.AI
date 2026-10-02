import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// --- Rate Limiting ---
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 35;

function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);
  if (!record) {
    record = { timestamps: [now] };
    rateLimitMap.set(identifier, record);
    return { allowed: true };
  }
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }
  record.timestamps.push(now);
  return { allowed: true };
}

// --- Strict Tier Quota & 3-hr / 6-hr Cooldown Engine ---
interface ServerQuotaRecord {
  count: number;
  tier: "free" | "pro" | "elite" | "vip" | "founder";
  isRecovery: boolean;
  cooldownStage: 0 | 1 | 2; // 0 = active, 1 = 3hr, 2 = 6hr
  cooldownUntil: number; // epoch ms
}
const userQuotaMap = new Map<string, ServerQuotaRecord>();

const TIER_BASE_ALLOWANCE: Record<string, number> = {
  free: 10,
  pro: 25,
  elite: 50,
  vip: 50,
  founder: 999999,
};

const TIER_RECOVERY_ALLOWANCE: Record<string, number> = {
  free: 5,
  pro: 12,
  elite: 25,
  vip: 25,
  founder: 999999,
};

const COOLDOWN_STAGE_1_MS = 3 * 3600 * 1000; // 3 hours
const COOLDOWN_STAGE_2_MS = 6 * 3600 * 1000; // 6 hours

function checkAndIncrementQuota(
  userId: string | undefined,
  tier: "free" | "pro" | "elite" | "vip" | "founder" = "free"
): { allowed: boolean; remaining: number; max: number; error?: string } {
  // Only verified founder tier is truly unlimited
  if (tier === "founder") {
    return { allowed: true, remaining: 999999, max: 999999 };
  }

  const trackingKey = (userId && typeof userId === "string" && userId.trim() !== "")
    ? userId.trim()
    : "anonymous_client";

  const now = Date.now();
  let record = userQuotaMap.get(trackingKey);
  if (!record) {
    record = {
      count: 0,
      tier,
      isRecovery: false,
      cooldownStage: 0,
      cooldownUntil: 0,
    };
  }

  // Upgrade or sync tier
  record.tier = tier;

  // 1. Check if currently in active cooldown
  if (record.cooldownStage === 1) {
    if (now < record.cooldownUntil) {
      const waitMin = Math.ceil((record.cooldownUntil - now) / 60000);
      return {
        allowed: false,
        remaining: 0,
        max: TIER_BASE_ALLOWANCE[tier] || 10,
        error: `3-hour cooldown active (${waitMin} min remaining). You used your ${TIER_BASE_ALLOWANCE[tier]} chats. A 5-chat recovery refill unlocks after cooldown.`,
      };
    } else {
      // 3-hour cooldown expired -> transition to recovery mode!
      record.cooldownStage = 0;
      record.cooldownUntil = 0;
      record.isRecovery = true;
      record.count = 0;
    }
  } else if (record.cooldownStage === 2) {
    if (now < record.cooldownUntil) {
      const waitMin = Math.ceil((record.cooldownUntil - now) / 60000);
      return {
        allowed: false,
        remaining: 0,
        max: TIER_BASE_ALLOWANCE[tier] || 10,
        error: `Extended 6-hour cooldown active (${waitMin} min remaining). Full ${TIER_BASE_ALLOWANCE[tier]} chats reset after cooldown.`,
      };
    } else {
      // 6-hour cooldown expired -> full cycle reset!
      record.cooldownStage = 0;
      record.cooldownUntil = 0;
      record.isRecovery = false;
      record.count = 0;
    }
  }

  // 2. Active allowance
  const currentMax = record.isRecovery
    ? (TIER_RECOVERY_ALLOWANCE[tier] || 5)
    : (TIER_BASE_ALLOWANCE[tier] || 10);

  if (record.count >= currentMax) {
    // Allowance reached, activate cooldown
    if (!record.isRecovery) {
      record.cooldownStage = 1;
      record.cooldownUntil = now + COOLDOWN_STAGE_1_MS;
      userQuotaMap.set(trackingKey, record);
      return {
        allowed: false,
        remaining: 0,
        max: currentMax,
        error: `3-hour cooldown activated. You reached your limit of ${currentMax} chats. A recovery refill unlocks in 3 hours.`,
      };
    } else {
      record.cooldownStage = 2;
      record.cooldownUntil = now + COOLDOWN_STAGE_2_MS;
      userQuotaMap.set(trackingKey, record);
      return {
        allowed: false,
        remaining: 0,
        max: currentMax,
        error: `Extended 6-hour cooldown activated. Recovery chats exhausted. Full reset in 6 hours.`,
      };
    }
  }

  // Consume request
  record.count += 1;
  const remaining = Math.max(0, currentMax - record.count);

  if (record.count >= currentMax) {
    if (!record.isRecovery) {
      record.cooldownStage = 1;
      record.cooldownUntil = now + COOLDOWN_STAGE_1_MS;
    } else {
      record.cooldownStage = 2;
      record.cooldownUntil = now + COOLDOWN_STAGE_2_MS;
    }
  }

  userQuotaMap.set(trackingKey, record);
  return { allowed: true, remaining, max: currentMax };
}

// --- SDK Client Factories ---
let cachedAiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!cachedAiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    cachedAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  }
  return cachedAiClient;
}

function getGroqClient(customKey?: string): Groq {
  const key = customKey?.trim() || process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  return new Groq({ apiKey: key });
}

// Active and verified Groq candidate models
const CANDIDATE_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

async function resolveGroqModel(groq: Groq): Promise<string> {
  try {
    const list = await groq.models.list();
    const available = new Set(list.data.map((m: any) => m.id));
    for (const candidate of CANDIDATE_GROQ_MODELS) {
      if (available.has(candidate)) {
        return candidate;
      }
    }
    const textModel = list.data.find((m: any) => !m.id.includes("whisper"));
    if (textModel) return textModel.id;
  } catch (err) {
    console.warn("Groq dynamic model resolution fallback:", err);
  }
  return "llama-3.1-8b-instant";
}

// Primary Gemini model cascade: default to ultra-stable 3.6 Flash
const GEMINI_PRIMARY_MODEL = "gemini-3.6-flash";
const GEMINI_MODELS_CASCADE = [
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

// --- Message Formatting ---
interface ValidatedAttachment {
  name: string;
  type: string;
  data: string;
  extractedText?: string;
}

interface ValidatedMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ValidatedAttachment[];
}

function formatGeminiContents(messages: ValidatedMessage[]): any[] {
  const formatted: { role: "user" | "model"; parts: any[] }[] = [];

  for (const m of messages) {
    const parts: any[] = [];

    if (m.attachments && m.attachments.length > 0) {
      for (const att of m.attachments) {
        if (att.type.startsWith("image/")) {
          const base64Data = att.data.includes(";base64,")
            ? att.data.split(";base64,")[1]
            : att.data.includes("base64,")
            ? att.data.split("base64,")[1]
            : att.data;
          const cleanBase64 = base64Data.trim();
          if (cleanBase64) {
            parts.push({
              inlineData: {
                mimeType: att.type,
                data: cleanBase64,
              },
            });
          }
        } else {
          // Efficient document context: use extracted text or excerpt
          const docText = att.extractedText || att.data;
          const excerpt = docText.length > 8000 ? docText.slice(0, 8000) + "\n...[truncated for token efficiency]" : docText;
          parts.push({
            text: `\n[Attached Document: ${att.name}]\n${excerpt}\n`,
          });
        }
      }
    }

    const contentText = (m.content || "").trim();
    if (contentText) {
      parts.push({ text: contentText });
    }

    if (parts.length === 0) {
      if (m.role === "user") {
        parts.push({ text: "Hello" });
      } else {
        continue;
      }
    }

    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts.push(...parts);
    } else {
      formatted.push({ role, parts });
    }
  }

  if (formatted.length > 0 && formatted[0].role === "model") {
    formatted.unshift({
      role: "user",
      parts: [{ text: "Hello, IntelicatAI." }],
    });
  }

  if (formatted.length === 0) {
    formatted.push({
      role: "user",
      parts: [{ text: "Hello" }],
    });
  }

  return formatted;
}

function formatGroqMessages(
  messages: ValidatedMessage[],
  systemInstruction: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const result: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemInstruction },
  ];

  for (const m of messages) {
    let content = m.content || "";
    if (m.attachments && m.attachments.length > 0) {
      const textDocs = m.attachments
        .filter((a) => !a.type.startsWith("image/"))
        .map((a) => {
          const docText = a.extractedText || a.data;
          const excerpt = docText.length > 6000 ? docText.slice(0, 6000) + "\n...[excerpt]" : docText;
          return `\n[Attached File: ${a.name}]\n${excerpt}\n`;
        })
        .join("\n");
      if (textDocs) {
        content = `${textDocs}\n${content}`;
      }
    }

    const trimmed = content.trim();
    if (!trimmed) {
      if (m.role === "assistant") {
        continue;
      } else {
        content = "Hello";
      }
    }

    const role = m.role === "assistant" ? "assistant" : "user";
    const lastMsg = result[result.length - 1];
    if (lastMsg && lastMsg.role === role) {
      lastMsg.content = `${lastMsg.content}\n\n${content}`;
    } else {
      result.push({ role, content });
    }
  }

  if (result.length <= 1) {
    result.push({ role: "user", content: "Hello" });
  }

  return result;
}

function formatGradeLabel(grade: string): string {
  switch (grade) {
    case "class-1-5":
      return "Elementary (Class 1-5)";
    case "class-6":
      return "Class 6";
    case "class-7":
      return "Class 7 (Middle School)";
    case "class-8":
      return "Class 8";
    case "class-9":
      return "Class 9";
    case "class-10":
      return "Class 10";
    case "class-11-12":
      return "High School (Class 11-12)";
    case "college":
      return "College / University";
    default:
      return "Class 7";
  }
}

function getSystemInstruction(
  mode: string,
  studyGrade?: string,
  spaceContext?: string,
  memoriesContext?: string
): string {
  let baseInstruction = "";

  switch (mode) {
    case "fast":
      baseInstruction = `You are IntelicatAI in Fast Mode.
- Provide direct, rapid, concise, and ultra-accurate answers.
- Avoid unnecessary fluff or repetition.
- Use clean formatting, quick bullet points, and high efficiency.`;
      break;

    case "deep-think":
      baseInstruction = `You are IntelicatAI in Deep Think Mode.
- Approach problems with meticulous step-by-step reasoning, analytical depth, and clear logic.
- Break complex questions into:
  1. Conceptual Understanding & Core Problem
  2. Step-by-Step Analysis / Derivation
  3. Key Trade-offs, Edge Cases, or Nuances
  4. Final Actionable Conclusion
- Maintain intellectual precision, thoroughness, and clarity.`;
      break;

    case "search":
      baseInstruction = `You are IntelicatAI in Web Search Mode.
- Deliver up-to-date, fact-checked information synthesized clearly.
- Always organize results logically with summaries, clear key takeaways, and references to credible sources.
- Highlight verifiable facts, dates, and recent developments.`;
      break;

    case "creative":
      baseInstruction = `You are IntelicatAI in Creative Mode.
- Unleash imaginative storytelling, engaging writing, innovative brainstorming, and vivid analogies.
- Balance creative flair with articulate expression, humor, and originality.
- Adapt tone to fit stories, scripts, essays, naming ideas, or creative campaigns.`;
      break;

    case "coding":
    case "cat-code":
      baseInstruction = `You are IntelicatAI 🐾, the legendary Cybernetic Cat Coder.
- Elite master of TypeScript, JavaScript, Python, Rust, Go, SQL, React, HTML/CSS, UI design, and Algorithms.
- LIVE ARTIFACT & WEBSITE SYSTEM: The chat interface has an interactive Live Website Artifact engine that automatically renders web apps, games, landing pages, and components in real time!
- When asked to build, create, or design any website, game, tool, calculator, dashboard, or web app:
  * Provide the complete, self-contained, fully functioning runnable HTML/CSS/JavaScript or single-file React component in a single code block (e.g. \`\`\`html ... \`\`\` or \`\`\`jsx ... \`\`\`).
  * Include interactive logic, state, modern Tailwind CSS classes, inline scripts, and nice styling so the user can immediately test, interact with, and play the website you built!
  * Never use placeholders like "// implement later" or "<!-- add code here -->" — build the real, functioning app.
- Highlight architectural patterns, edge cases, and performance with playful, sharp cybernetic cat personality.
- Hunt down bugs with feline precision!`;
      break;

    case "study":
      const gradeLabel = studyGrade ? formatGradeLabel(studyGrade) : "Class 7";
      baseInstruction = `You are IntelicatAI in Study & Homework Tutor Mode, currently tailored for: **${gradeLabel}**.
- Provide pedagogical, encouraging, and age-appropriate explanations.
- Help students truly understand concepts rather than just giving raw answers.
- When solving homework problems:
  1. Identify the given information and what needs to be solved.
  2. Explain the governing formula or rule in simple terms.
  3. Provide step-by-step working with clear intermediate steps.
  4. State the final answer with units.
  5. Provide a quick check or practice tip.
- Support quizzes (with questions, options, and explanations), flashcards, and concept summaries when requested.
- Use encouraging, positive tutoring tone suitable for ${gradeLabel} students.`;
      break;

    case "normal":
    default:
      baseInstruction = `You are IntelicatAI — a helpful, versatile, friendly, and ultra-fast conversational companion.
- Designed to have natural, engaging, and thoughtful discussions on any topic.
- Speak with warm intelligence, clarity, and empathy.
- Format responses cleanly with Markdown, clear paragraphs, and bullet points.`;
      break;
  }

  // Universal Symbol & Math Readability Directive
  baseInstruction += `\n\n[Formatting Directives]:
- Output clean Unicode symbols directly for arrows, transitions, and math (e.g. →, ⇒, ←, ↔, ×, ÷, ±, ≤, ≥, ≠, ≈, °, ², ³, √(x)) instead of raw LaTeX code like $\\rightarrow$ or $\\times$.
- Never output raw unrendered LaTeX markers for simple arrows or equations.`;

  // Append Space Context if active
  if (spaceContext && spaceContext.trim()) {
    baseInstruction += `\n\n[Active Project Space Context & Instructions]:\n${spaceContext.trim()}`;
  }

  // Append Active Memories Context if enabled
  if (memoriesContext && memoriesContext.trim()) {
    baseInstruction += `\n\n[User Memory Context — Personalize responses based on these known facts]:\n${memoriesContext.trim()}`;
  }

  return baseInstruction;
}

function formatCleanErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred.";
  let msg = typeof error === "string" ? error : error.message || String(error);

  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        msg = parsed.error.message;
      }
    }
  } catch {
    // ignore
  }

  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("429")) {
    return "Gemini API daily quota limit reached. You can switch to Groq LPU (Ultra-Fast) in model settings, or continue using non-AI features like Spaces, Notes, and Flashcards!";
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "The AI model is experiencing high demand. Please retry in a moment.";
  }
  if (msg.includes("API_KEY") || msg.includes("API key not valid")) {
    return "API key authentication issue. Please verify your API key in Settings.";
  }

  return msg.replace(/\n+/g, " ").trim();
}

// --- Main Chat Handler ---
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-groq-api-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "IntelicatAI Engine v2" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  let clientDisconnected = false;
  res.on?.("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  });

  try {
    let parsedBody = req.body;
    if (typeof parsedBody === "string") {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        parsedBody = {};
      }
    }

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "anonymous";

    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds before sending more requests.`,
      });
    }

    const {
      messages = [],
      mode = "normal",
      provider: requestedProvider = "auto",
      model: requestedModel,
      webSearch = false,
      studyGrade = "class-7",
      spaceContext = "",
      memoriesContext = "",
      userId,
      isVipOrFounder = false,
      userTier: requestedUserTier,
      groqApiKey: bodyGroqKey,
      customGroqKey,
    } = parsedBody || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    // Determine effective user plan tier strictly
    let effectiveTier: "free" | "pro" | "elite" | "founder" = "free";
    if (requestedUserTier === "pro") {
      effectiveTier = "pro";
    } else if (requestedUserTier === "elite") {
      effectiveTier = "elite";
    } else if (requestedUserTier === "founder" && isVipOrFounder) {
      effectiveTier = "founder";
    } else {
      effectiveTier = "free";
    }

    // Server-side strict quota check (tracked per userId or client IP)
    const trackingKey = (userId && typeof userId === "string" && userId.trim() !== "")
      ? userId.trim()
      : ((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "anonymous_client");

    const quotaCheck = checkAndIncrementQuota(trackingKey, effectiveTier);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: quotaCheck.error || `Account query limit reached (${quotaCheck.max} requests for ${effectiveTier} tier). To protect API quota, please wait for reset.`,
      });
    }

    // Verify model authorization based on plan tier
    if (requestedModel) {
      if (requestedModel === "gemini-3.8-flash" && effectiveTier === "free") {
        return res.status(403).json({
          error: "Gemini 3.8 Flash requires Intelicat Pro ($10) or Elite ($50). Please use Gemini 3.6 Flash (Default) or upgrade your plan.",
        });
      }
      if (
        requestedModel === "gemini-3.1-pro-preview" &&
        effectiveTier !== "elite" &&
        effectiveTier !== "founder"
      ) {
        return res.status(403).json({
          error: "Gemini 3.1 Pro requires Intelicat Elite ($50) or Founder. Please upgrade your plan to unlock.",
        });
      }
    }

    // Determine custom Groq Key from header or body or env
    const headerGroqKey = (req.headers["x-groq-api-key"] as string) || "";
    const effectiveGroqKey = (customGroqKey || bodyGroqKey || headerGroqKey || process.env.GROQ_API_KEY || "").trim();
    const hasGroqKey = effectiveGroqKey.length > 0;
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

    const hasImageAttachments = messages.some(
      (m: any) => m.attachments && m.attachments.some((a: any) => a.type?.startsWith("image/"))
    );

    // Provider routing logic with explicit model matching
    let activeProvider = requestedProvider;
    if (requestedModel) {
      if (requestedModel.startsWith("gemini-")) {
        activeProvider = "gemini";
      } else if (
        requestedModel.startsWith("llama-") ||
        requestedModel.startsWith("mixtral-") ||
        requestedModel.startsWith("gemma")
      ) {
        activeProvider = "groq";
      }
    }

    if (activeProvider === "auto") {
      // If user is in fast mode or groq is available and no images, prefer Groq to save Gemini quota!
      if (hasImageAttachments) {
        activeProvider = "gemini";
      } else if (mode === "fast" && hasGroqKey) {
        activeProvider = "groq";
      } else if (hasGroqKey) {
        activeProvider = "groq";
      } else {
        activeProvider = "gemini";
      }
    } else if (hasImageAttachments && activeProvider === "groq") {
      activeProvider = "gemini";
    }

    // Fallback if requested provider key is missing
    if (activeProvider === "groq" && !hasGroqKey) {
      activeProvider = hasGeminiKey ? "gemini" : "groq";
    } else if (activeProvider === "gemini" && !hasGeminiKey) {
      activeProvider = hasGroqKey && !hasImageAttachments ? "groq" : "gemini";
    }

    // Initialize SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const systemInstruction = getSystemInstruction(mode, studyGrade, spaceContext, memoriesContext);
    const temperature = mode === "coding" || mode === "cat-code" ? 0.2 : mode === "deep-think" ? 0.3 : 0.7;
    let streamStarted = false;

    // --- Provider 1: Groq ---
    if (activeProvider === "groq" && hasGroqKey) {
      try {
        const groq = getGroqClient(effectiveGroqKey);
        const groqMessages = formatGroqMessages(messages, systemInstruction);
        let selectedModel = await resolveGroqModel(groq);
        if (
          requestedModel &&
          (requestedModel.startsWith("llama-") ||
            requestedModel.startsWith("mixtral-") ||
            requestedModel.startsWith("gemma"))
        ) {
          selectedModel = requestedModel;
        }

        const completion = await groq.chat.completions.create({
          model: selectedModel,
          messages: groqMessages,
          temperature,
          stream: true,
        });

        for await (const chunk of completion) {
          if (clientDisconnected) break;
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            streamStarted = true;
            res.write(`data: ${JSON.stringify({ text, provider: "groq", model: selectedModel })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        }
      } catch (groqErr: any) {
        console.warn("Groq streaming error:", groqErr?.message);
        if (!streamStarted && hasGeminiKey) {
          activeProvider = "gemini";
        } else {
          throw groqErr;
        }
      }
    }

    // --- Provider 2: Gemini (Resilient multi-model cascade on temporary 503/high demand) ---
    if (activeProvider === "gemini") {
      if (!hasGeminiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = getAiClient();
      const formattedContents = formatGeminiContents(messages);

      const geminiConfig: any = {
        systemInstruction,
        temperature,
      };

      if (webSearch) {
        geminiConfig.tools = [{ googleSearch: {} }];
      }

      let lastGeminiError: any = null;

      const candidateModels =
        requestedModel && requestedModel.startsWith("gemini-")
          ? [requestedModel, ...GEMINI_MODELS_CASCADE.filter((m) => m !== requestedModel)]
          : GEMINI_MODELS_CASCADE;

      for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
        const candidateModel = candidateModels[modelIdx];
        try {
          const responseStream = await ai.models.generateContentStream({
            model: candidateModel,
            contents: formattedContents,
            config: geminiConfig,
          });

          const emittedCitations = new Set<string>();

          for await (const chunk of responseStream) {
            if (clientDisconnected) break;

            const newCitations: { title: string; uri: string }[] = [];
            const groundingChunks = (chunk as any)?.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && Array.isArray(groundingChunks)) {
              for (const g of groundingChunks) {
                if (g.web?.uri && !emittedCitations.has(g.web.uri)) {
                  emittedCitations.add(g.web.uri);
                  newCitations.push({
                    title: g.web.title || new URL(g.web.uri).hostname,
                    uri: g.web.uri,
                  });
                }
              }
            }

            if (newCitations.length > 0) {
              res.write(`data: ${JSON.stringify({ citations: newCitations })}\n\n`);
              if (typeof (res as any).flush === "function") {
                (res as any).flush();
              }
            }

            const text = chunk.text || "";
            if (text) {
              if (!streamStarted && requestedModel && candidateModel !== requestedModel) {
                res.write(
                  `data: ${JSON.stringify({
                    text: `*[Notice: ${requestedModel} is currently experiencing temporary high demand on Google's servers. Handed over to ${candidateModel} for zero delay! ⚡]*\n\n`,
                    provider: "gemini",
                    model: candidateModel,
                  })}\n\n`
                );
              }
              streamStarted = true;
              res.write(`data: ${JSON.stringify({ text, provider: "gemini", model: candidateModel })}\n\n`);
              if (typeof (res as any).flush === "function") {
                (res as any).flush();
              }
            }
          }

          if (streamStarted) {
            lastGeminiError = null;
            break;
          }
        } catch (candidateErr: any) {
          console.warn(`Gemini candidate [${candidateModel}] error:`, candidateErr?.message || candidateErr);
          lastGeminiError = candidateErr;

          // If stream already started, don't attempt another model mid-stream
          if (streamStarted) {
            break;
          }

          // If web search tool caused error or 503, remove tools for fallback attempt
          if (geminiConfig.tools) {
            delete geminiConfig.tools;
          }

          // Brief 300ms pause before trying next candidate
          if (modelIdx < candidateModels.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      if (!streamStarted && lastGeminiError) {
        console.warn("All Gemini candidates failed, checking Groq fallback...");
        // If quota exhausted and Groq key is available, seamlessly failover to Groq!
        if (hasGroqKey && !hasImageAttachments) {
          try {
            res.write(
              `data: ${JSON.stringify({
                text: "*[Notice: Gemini experiencing temporary high demand. Seamlessly switched to Groq LPU engine to finish your response! ⚡]*\n\n",
                provider: "groq",
              })}\n\n`
            );
            const groq = getGroqClient(effectiveGroqKey);
            const groqMessages = formatGroqMessages(messages, systemInstruction);
            const selectedModel = await resolveGroqModel(groq);
            const completion = await groq.chat.completions.create({
              model: selectedModel,
              messages: groqMessages,
              temperature,
              stream: true,
            });
            for await (const chunk of completion) {
              if (clientDisconnected) break;
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) {
                streamStarted = true;
                res.write(`data: ${JSON.stringify({ text, provider: "groq", model: selectedModel })}\n\n`);
                if (typeof (res as any).flush === "function") {
                  (res as any).flush();
                }
              }
            }
          } catch (groqFallbackErr) {
            throw lastGeminiError;
          }
        } else {
          throw lastGeminiError;
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Chat API Error:", error);
    const safeMessage = formatCleanErrorMessage(error);
    const statusCode =
      typeof error?.status === "number" && error.status >= 400 && error.status < 600
        ? error.status
        : 500;

    if (!res.headersSent) {
      res.status(statusCode).json({ error: safeMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: safeMessage })}\n\n`);
      res.end();
    }
  }
}
