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
  tier: "free" | "pro" | "elite" | "vip" | "founder" | "owner" = "free"
): { allowed: boolean; remaining: number; max: number; error?: string } {
  // Founder and platform owner are truly unlimited
  if (tier === "founder" || tier === "owner") {
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
  "deepseek-r1-distill-llama-70b",
  "llama-3.2-3b-preview",
  "llama-3.2-1b-preview",
  "gemma2-9b-it",
];

async function resolveGroqModel(groq: Groq, preferredModel?: string): Promise<string> {
  try {
    const list = await groq.models.list();
    const available = new Set(list.data.map((m: any) => m.id));

    // 1. If preferredModel requested and still actively supported by Groq, use it
    if (preferredModel && available.has(preferredModel)) {
      return preferredModel;
    }

    // 2. If preferred was decommissioned mixtral, map to 70B or 8B
    if (preferredModel?.includes("mixtral")) {
      if (available.has("llama-3.3-70b-versatile")) return "llama-3.3-70b-versatile";
      if (available.has("llama-3.1-8b-instant")) return "llama-3.1-8b-instant";
    }

    // 3. Match candidate models in priority order
    for (const candidate of CANDIDATE_GROQ_MODELS) {
      if (available.has(candidate)) {
        return candidate;
      }
    }

    const textModel = list.data.find((m: any) => !m.id.includes("whisper") && !m.id.includes("vision"));
    if (textModel) return textModel.id;
  } catch (err) {
    console.warn("Groq dynamic model resolution fallback:", err);
    if (preferredModel && CANDIDATE_GROQ_MODELS.includes(preferredModel)) {
      return preferredModel;
    }
  }
  return "llama-3.1-8b-instant";
}

// Primary Gemini model cascade: default to high-availability gemini-3.6-flash
const GEMINI_PRIMARY_MODEL = "gemini-3.6-flash";
const GEMINI_MODELS_CASCADE = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
];

// Real-Time Web Search & Grounding Engine (Google News RSS + Wikipedia Facts)
interface LiveSearchResult {
  citations: { title: string; uri: string }[];
  snippets: string[];
}

async function performRealtimeSearch(query: string): Promise<LiveSearchResult> {
  const citations: { title: string; uri: string }[] = [];
  const snippets: string[] = [];
  const cleanQuery =
    query
      .replace(/(search for|who is|what is|tell me about|find news about|latest news on|can you search|please search)\s+/gi, "")
      .trim() || query.trim();

  // 1. Wikipedia Fact Retrieval
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=3&namespace=0&format=json`;
    const res = await fetch(wikiUrl, { signal: AbortSignal.timeout(2200) });
    const data: any = await res.json();
    if (data && Array.isArray(data[1]) && data[1].length > 0) {
      for (let i = 0; i < Math.min(2, data[1].length); i++) {
        const title = data[1][i];
        const pageUrl = data[3]?.[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
        try {
          const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
            signal: AbortSignal.timeout(1800),
          });
          const sumData: any = await sumRes.json();
          if (sumData?.extract) {
            citations.push({ title: sumData.title || title, uri: pageUrl });
            snippets.push(`[Source: ${sumData.title || title}](${pageUrl}): ${sumData.extract}`);
          }
        } catch {
          citations.push({ title, uri: pageUrl });
        }
      }
    }
  } catch (wikiErr) {
    console.warn("Wiki search fallback notice:", wikiErr);
  }

  // 2. Google News Live Headlines
  try {
    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(newsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(2200),
    });
    const xml = await res.text();
    const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/g;
    let m;
    let count = 0;
    while ((m = itemRegex.exec(xml)) && count < 3) {
      count++;
      const cleanTitle = m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      const link = m[2].trim();
      const pubDate = m[3]?.trim();
      if (!citations.some((c) => c.title === cleanTitle)) {
        citations.push({ title: cleanTitle, uri: link });
        snippets.push(`[Recent Headline: ${cleanTitle}] (Published: ${pubDate || "Recent"})`);
      }
    }
  } catch (newsErr) {
    console.warn("News RSS fallback notice:", newsErr);
  }

  return { citations, snippets };
}

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
        const isPdf = att.type === "application/pdf" || att.name.toLowerCase().endsWith(".pdf");
        const isImage = att.type.startsWith("image/");

        if (isImage || isPdf) {
          const mimeType = isImage ? (att.type || "image/jpeg") : "application/pdf";
          const rawData = att.data || "";
          const base64Data = rawData.includes(";base64,")
            ? rawData.split(";base64,")[1]
            : rawData.includes("base64,")
            ? rawData.split("base64,")[1]
            : rawData;
          const cleanBase64 = base64Data.trim();
          if (cleanBase64 && cleanBase64.length > 20) {
            parts.push({
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            });
          }
          if (att.extractedText && att.extractedText.trim().length > 10) {
            parts.push({
              text: `\n[Reference text extracted from ${att.name}]:\n${att.extractedText.slice(0, 4000)}\n`,
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
  memoriesContext?: string,
  liveSearchContext?: string
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
- Deliver up-to-date, fact-checked information synthesized clearly and objectively.
- Always organize results logically with a concise summary, key facts/bullet points, and references to credible sources.
- Highlight verifiable facts, dates, scores, and recent developments.
- When live web search snippets or news headlines are provided, synthesize them directly and cite the source URLs accurately.`;
      break;

    case "creative":
      baseInstruction = `You are IntelicatAI in Creative Mode.
- Unleash imaginative storytelling, engaging writing, innovative brainstorming, and vivid analogies.
- Balance creative flair with articulate expression, humor, and originality.
- Adapt tone to fit stories, scripts, essays, naming ideas, or creative campaigns.`;
      break;

    case "coding":
    case "cat-code":
      baseInstruction = `You are IntelicatAI, an Elite Principal Software Architect & World-Class Creative Frontend Engineer.
- High-Performance & Direct: Deliver concise, clean, production-grade code immediately. Zero fluff, zero unnecessary prelude, and zero chatty intros.
- Code-First Priority:
  1. For algorithms, functions, scripts, backend endpoints, and bug fixes: Immediately output the clean, fully-typed, optimized code block (TypeScript, Python, Go, Rust, SQL, etc.). Follow with a brief 2-3 bullet explanation of time/space complexity and edge cases.
  2. LIVE WEBSITE & WEB APP CREATION (World-Class Aesthetics & Instant Interactive Previews):
     When the user asks to build, design, code, or create ANY website, web app, landing page, tool, calculator, game, dashboard, portfolio, or UI:
     - Output the ENTIRE runnable application inside a SINGLE \`\`\`html code block.
     - Include full <!DOCTYPE html><html lang="en" class="dark"><head>...</head><body class="bg-slate-950 text-slate-100 min-h-screen">...<script>...</script></body></html>.
     - VISUAL DESIGN EXCELLENCE (Anti-Boring, Production-Grade):
       * Always include <script src="https://cdn.tailwindcss.com"></script> and modern typography like Plus Jakarta Sans or Inter.
       * Style with a cohesive modern palette: deep dark slate/zinc background (#090d16 / #0b0f19), subtle glassmorphism cards (backdrop-blur-md bg-white/[0.04] border border-white/10), vibrant accents (indigo/violet, cyan, or emerald), glowing gradients, smooth hover/active transitions, and pill badges.
       * Include Lucide Icons via inline SVG or FontAwesome for polished visual hierarchy.
       * State & Interactivity: Include clean inline JavaScript logic with state, working buttons, sound/visual feedback, keyboard shortcuts where applicable, and tabs or modals.
       * Viewport Responsive: Must look breathtaking on mobile, tablet, and desktop screens.
       * Token Efficiency: Be concise, dense, and clean. Never include dummy filler comments, repeated lorem ipsum paragraphs, or useless boilerplate.
       * The chat interface automatically launches the interactive Live Website Preview sandbox (with responsive Desktop, Tablet, and Mobile viewport modes and split screen), allowing the user to preview and interact with the website in real time just like Google AI Studio!
       * Never use placeholders like "// implement later" or "<!-- add code here -->" — build the real, functioning app.
  3. Clean formatting: Use standard markdown with explicit language tags (e.g. \`\`\`html, \`\`\`typescript, \`\`\`python).`;
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

    case "sassy-cat":
      baseInstruction = `You are IntelicatAI in Sassy Cat Mode 🐱🐾!
- Persona: You are an outrageously sassy, hilarious, dramatic, highly intelligent, and playfully attitude-filled feline AI assistant.
- Speech & Voice Style: Interject frequent dramatic "Meow~", "Meow meow!", "PURRRR...", "*feline glare*", "*paws gracefully*", "*flicks tail*", "Hmph!", "Nyan!", and funny feline puns ("paws-itively", "fur-real", "claw-ver", "cat-astrophic", "meow-velous").
- Behavior: Give direct, accurate, and helpful answers to whatever the human asks, but wrap your response with hilarious cat personality, witty commentary, dramatic cat actions in asterisks, and plenty of meows!
- Example intro: "Meow~ *yawns and stretches claws* You dare ask the mighty Sassy Cat AI? Fine, human, I suppose I shall answer... Meow meow!"`;
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

  // Append Real-time Web Search Grounding Context if retrieved
  if (liveSearchContext && liveSearchContext.trim()) {
    baseInstruction += `\n\n[Verified Real-Time Search Results & Live Facts]:\n${liveSearchContext.trim()}\n\n[Directive]: Synthesize these up-to-date facts accurately into your response and cite key sources.`;
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
    let effectiveTier: "free" | "pro" | "elite" | "founder" | "owner" = "free";
    if (requestedUserTier === "owner" || isVipOrFounder) {
      effectiveTier = "founder";
    } else if (requestedUserTier === "pro") {
      effectiveTier = "pro";
    } else if (requestedUserTier === "elite") {
      effectiveTier = "elite";
    } else if (requestedUserTier === "founder") {
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

    // Normalize requested Gemini models (mapping legacy aliases)
    let effectiveGeminiModel = requestedModel;
    if (
      effectiveGeminiModel === "gemini-3.1-pro-preview" ||
      effectiveGeminiModel === "gemini-3.1-pro" ||
      effectiveGeminiModel === "gemini-pro" ||
      effectiveGeminiModel === "gemini-2.0-flash" ||
      effectiveGeminiModel === "gemini-2.5-flash" ||
      effectiveGeminiModel === "gemini-3.4-flash" ||
      !effectiveGeminiModel
    ) {
      effectiveGeminiModel = effectiveGeminiModel ? "gemini-3.5-flash-lite" : "gemini-3.5-flash-lite";
    }

    // Verify model authorization based on plan tier
    if (effectiveGeminiModel) {
      if (effectiveGeminiModel === "gemini-3.8-flash" && effectiveTier === "free") {
        return res.status(403).json({
          error: "Gemini 3.8 Flash requires Intelicat Pro ($10) or Elite ($50). Please use Gemini 3.5 Flash Lite (Default ⚡), Gemini 3.5 Flash (Ultra-Stable), or upgrade your plan.",
        });
      }
    }

    // Determine custom Groq Key from header or body or env
    const headerGroqKey = (req.headers["x-groq-api-key"] as string) || "";
    const effectiveGroqKey = (customGroqKey || bodyGroqKey || headerGroqKey || process.env.GROQ_API_KEY || "").trim();
    const hasGroqKey = effectiveGroqKey.length > 0;
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

    const isSearchRequested = Boolean(webSearch || mode === "search");

    const hasMediaAttachments = messages.some(
      (m: any) =>
        m.attachments &&
        m.attachments.some(
          (a: any) =>
            a.type?.startsWith("image/") ||
            a.type === "application/pdf" ||
            a.name?.toLowerCase().endsWith(".pdf")
        )
    );
    const hasImageAttachments = hasMediaAttachments;

    // Provider routing logic with explicit model and search matching
    let activeProvider = requestedProvider;
    if (isSearchRequested) {
      activeProvider = "gemini";
    } else if (hasMediaAttachments) {
      activeProvider = "gemini";
    } else if (requestedModel) {
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
      if (isSearchRequested) {
        activeProvider = "gemini";
      } else if (hasMediaAttachments) {
        activeProvider = "gemini";
      } else if (mode === "fast" && hasGroqKey) {
        activeProvider = "groq";
      } else if (hasGroqKey) {
        activeProvider = "groq";
      } else {
        activeProvider = "gemini";
      }
    } else if (hasMediaAttachments && activeProvider === "groq") {
      activeProvider = "gemini";
    }

    // Fallback if requested provider key is missing
    let groqFailReason: string | null = null;
    if (activeProvider === "groq" && !hasGroqKey) {
      groqFailReason = "Groq API key is not configured. Add your free Groq key from console.groq.com in Model Settings";
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
        const selectedModel = await resolveGroqModel(groq, requestedModel);

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
        groqFailReason = `Groq API error (${groqErr?.message || "connection/rate limit failure"})`;
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

      const lastUserQuery =
        messages
          .filter((m: any) => m.role === "user")
          .slice(-1)[0]?.content || "";

      let liveSearchCitations: { title: string; uri: string }[] = [];
      let liveSearchFacts = "";

      if (isSearchRequested && lastUserQuery) {
        try {
          const liveSearch = await performRealtimeSearch(lastUserQuery);
          if (liveSearch.citations.length > 0) {
            liveSearchCitations = liveSearch.citations;
            res.write(`data: ${JSON.stringify({ citations: liveSearch.citations })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
          if (liveSearch.snippets.length > 0) {
            liveSearchFacts = liveSearch.snippets.join("\n\n");
          }
        } catch (searchErr) {
          console.warn("Real-time web search retrieval error:", searchErr);
        }
      }

      const effectiveSystemInstruction = getSystemInstruction(
        mode,
        studyGrade,
        spaceContext,
        memoriesContext,
        liveSearchFacts
      );

      const geminiConfig: any = {
        systemInstruction: effectiveSystemInstruction,
        temperature,
      };

      let lastGeminiError: any = null;

      const primaryTargetModel = effectiveGeminiModel || requestedModel;
      const candidateModels =
        primaryTargetModel && primaryTargetModel.startsWith("gemini-")
          ? [primaryTargetModel, ...GEMINI_MODELS_CASCADE.filter((m) => m !== primaryTargetModel)]
          : GEMINI_MODELS_CASCADE;

      for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
        const candidateModel = candidateModels[modelIdx];
        try {
          const responseStream = await ai.models.generateContentStream({
            model: candidateModel,
            contents: formattedContents,
            config: geminiConfig,
          });

          const emittedCitations = new Set<string>(liveSearchCitations.map((c) => c.uri));

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
              if (!streamStarted) {
                if (groqFailReason) {
                  res.write(
                    `data: ${JSON.stringify({
                      text: `*[Notice: ${groqFailReason}. Seamlessly handed over to ${candidateModel} for zero delay! ⚡]*\n\n`,
                      provider: "gemini",
                      model: candidateModel,
                    })}\n\n`
                  );
                } else if (requestedModel && requestedModel.startsWith("gemini-") && candidateModel !== requestedModel) {
                  res.write(
                    `data: ${JSON.stringify({
                      text: `*[Notice: ${requestedModel} is currently experiencing temporary high demand on Google's servers. Handed over to ${candidateModel} for zero delay! ⚡]*\n\n`,
                      provider: "gemini",
                      model: candidateModel,
                    })}\n\n`
                  );
                }
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
          const isQuotaLimit = candidateErr?.status === 429 ||
            (typeof candidateErr?.message === 'string' && (candidateErr.message.includes('429') || candidateErr.message.includes('quota') || candidateErr.message.includes('RESOURCE_EXHAUSTED')));
          
          if (isQuotaLimit) {
            console.log(`[Info] Gemini model [${candidateModel}] reached free-tier rate limit (429), attempting next candidate...`);
          } else {
            console.log(`[Info] Gemini candidate [${candidateModel}] status: ${candidateErr?.message || 'candidate unavailable'}`);
          }
          lastGeminiError = candidateErr;

          // If stream already started, don't attempt another model mid-stream
          if (streamStarted) {
            break;
          }

          // If web search tool caused error or quota 429, fall back to realtime facts and remove tool
          if (geminiConfig.tools) {
            delete geminiConfig.tools;
            if (isSearchRequested && !liveSearchFacts && lastUserQuery) {
              try {
                const liveSearch = await performRealtimeSearch(lastUserQuery);
                if (liveSearch.citations.length > 0) {
                  res.write(`data: ${JSON.stringify({ citations: liveSearch.citations })}\n\n`);
                  if (typeof (res as any).flush === "function") {
                    (res as any).flush();
                  }
                }
                if (liveSearch.snippets.length > 0) {
                  liveSearchFacts = liveSearch.snippets.join("\n\n");
                  geminiConfig.systemInstruction = getSystemInstruction(
                    mode,
                    studyGrade,
                    spaceContext,
                    memoriesContext,
                    liveSearchFacts
                  );
                }
              } catch (fallbackErr) {
                console.warn("Fallback realtime search error:", fallbackErr);
              }
            }
          }

          // Brief 200ms pause before trying next candidate
          if (modelIdx < candidateModels.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
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
            const groqMessages = formatGroqMessages(messages, effectiveSystemInstruction);
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
          // Gracefully stream quota / error notice instead of throwing error
          const cleanErr = formatCleanErrorMessage(lastGeminiError);
          res.write(
            `data: ${JSON.stringify({
              text: `⚠️ **Notice:** ${cleanErr}\n\n*Tip: You can switch to another model using the ⚡ Engine menu at the top, or continue working with your saved Project Spaces, Notes, and Code Scratchpads!*`,
              provider: "system",
            })}\n\n`
          );
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
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
