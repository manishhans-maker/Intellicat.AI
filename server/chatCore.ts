import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// --- In-Memory Rate Limiter ---
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 35; // 35 requests per minute

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);

  if (!record) {
    record = { timestamps: [now] };
    rateLimitMap.set(identifier, record);
    return { allowed: true };
  }

  // Filter out timestamps outside window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  record.timestamps.push(now);
  return { allowed: true };
}

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of rateLimitMap.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (record.timestamps.length === 0) {
      rateLimitMap.delete(id);
    }
  }
}, 5 * 60 * 1000);

// --- Server-Side Quota Tracking ---
// Tracks total requests per user on server as secondary defense against frontend tampering
const userUsageMap = new Map<string, number>();

export function checkAndIncrementServerQuota(
  userId: string | undefined,
  isVipOrFounder: boolean
): { allowed: boolean; remaining?: number; currentUsage?: number } {
  if (isVipOrFounder || !userId) {
    return { allowed: true };
  }

  const current = userUsageMap.get(userId) || 0;
  // Maximum free requests enforced server-side
  const MAX_FREE_REQUESTS = 15;

  if (current >= MAX_FREE_REQUESTS) {
    return { allowed: false, remaining: 0, currentUsage: current };
  }

  userUsageMap.set(userId, current + 1);
  return { allowed: true, remaining: Math.max(0, MAX_FREE_REQUESTS - (current + 1)), currentUsage: current + 1 };
}

// --- Request Validation ---
export interface ValidatedAttachment {
  name: string;
  type: string;
  data: string; // clean base64 string
}

export interface ValidatedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: ValidatedAttachment[];
}

export interface ValidatedChatRequest {
  messages: ValidatedMessage[];
  mode: 'normal' | 'cat-code';
  provider: 'auto' | 'groq' | 'gemini';
  webSearch: boolean;
  userId?: string;
  isVipOrFounder: boolean;
}

export function validateChatPayload(body: any): { isValid: boolean; error?: string; data?: ValidatedChatRequest } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { messages, mode = 'normal', provider = 'auto', webSearch = false, userId, isVipOrFounder = false } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: 'Messages array is required and must not be empty.' };
  }

  if (messages.length > 50) {
    return { isValid: false, error: 'Conversation history exceeds maximum of 50 turns.' };
  }

  const validatedMessages: ValidatedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      return { isValid: false, error: `Message at index ${i} is invalid.` };
    }

    const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user';
    const content = typeof m.content === 'string' ? m.content : '';

    if (content.length > 30000) {
      return { isValid: false, error: `Message at index ${i} exceeds maximum allowed length (30,000 characters).` };
    }

    const validatedAttachments: ValidatedAttachment[] = [];
    if (m.attachments && Array.isArray(m.attachments)) {
      if (m.attachments.length > 4) {
        return { isValid: false, error: `Maximum of 4 attachments allowed per message.` };
      }

      for (const att of m.attachments) {
        if (!att || typeof att !== 'object') continue;
        const type = typeof att.type === 'string' ? att.type.toLowerCase() : '';
        const name = typeof att.name === 'string' ? att.name.slice(0, 100) : 'attachment';
        const rawData = typeof att.data === 'string' ? att.data : '';

        // Allowed types: images or plain text / code
        const isImage = type.startsWith('image/');
        const isText = type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('typescript');

        if (!isImage && !isText) {
          return { isValid: false, error: `Unsupported attachment type: ${type}. Please upload images or text/code files.` };
        }

        // Limit data size: approx 6MB max
        if (rawData.length > 8 * 1024 * 1024) {
          return { isValid: false, error: `Attachment ${name} exceeds maximum size limit (6MB).` };
        }

        const cleanData = rawData.includes('base64,') ? rawData.split('base64,')[1] : rawData;
        validatedAttachments.push({
          name,
          type,
          data: cleanData,
        });
      }
    }

    validatedMessages.push({
      role,
      content,
      attachments: validatedAttachments.length > 0 ? validatedAttachments : undefined,
    });
  }

  const validMode = mode === 'cat-code' ? 'cat-code' : 'normal';
  const validProvider = provider === 'groq' || provider === 'gemini' ? provider : 'auto';

  return {
    isValid: true,
    data: {
      messages: validatedMessages,
      mode: validMode,
      provider: validProvider,
      webSearch: Boolean(webSearch),
      userId: typeof userId === 'string' ? userId.slice(0, 128) : undefined,
      isVipOrFounder: Boolean(isVipOrFounder),
    },
  };
}

// --- Gemini & Groq Clients ---
let aiClient: GoogleGenAI | null = null;
export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured. Please add it to your environment variables or secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'intelicatai-architect',
        },
      },
    });
  }
  return aiClient;
}

let groqClient: Groq | null = null;
export function getGroqClient(): Groq {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY is not configured. Please add it to your environment variables or secrets.');
    }
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

const CANDIDATE_GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
];

export async function resolveGroqModel(groq: Groq): Promise<string> {
  try {
    const list = await groq.models.list();
    const available = new Set(list.data.map((m: any) => m.id));
    for (const candidate of CANDIDATE_GROQ_MODELS) {
      if (available.has(candidate)) {
        return candidate;
      }
    }
    const textModel = list.data.find((m: any) => !m.id.includes('whisper'));
    if (textModel) return textModel.id;
  } catch (err) {
    console.warn('Groq model dynamic list fallback:', err);
  }
  return 'llama-3.1-8b-instant';
}

// Track Google Search tool quota state to avoid redundant 429 failures
let searchQuotaDisabledUntil = 0;

export function isSearchQuotaExhausted(): boolean {
  return Date.now() < searchQuotaDisabledUntil;
}

export function markSearchQuotaExhausted(durationMs = 15 * 60 * 1000) {
  searchQuotaDisabledUntil = Date.now() + durationMs;
}

// Candidate Gemini Models with fallback resilience per system skills
// gemini-3.1-flash-lite provides ultra-fast latency and high availability
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

export async function streamGeminiWithResilience(
  ai: GoogleGenAI,
  formattedContents: any[],
  geminiConfig: any,
  onChunk: (text: string, citations: { title: string; uri: string }[], model: string) => void,
  isAborted: () => boolean
) {
  let lastError: any = null;

  const candidateModels = GEMINI_CANDIDATE_MODELS;

  // Determine tool usage and quota state
  const wantsTools = Boolean(geminiConfig?.tools && geminiConfig.tools.length > 0);
  const searchDisabled = wantsTools && isSearchQuotaExhausted();

  const configsToTry: any[] = [];
  if (wantsTools && !searchDisabled) {
    // Try with requested tools first
    configsToTry.push(geminiConfig);
    // Prepare resilient fallback without tools if tool quota is exceeded
    const noToolsConfig = { ...geminiConfig };
    delete noToolsConfig.tools;
    configsToTry.push(noToolsConfig);
  } else {
    // Search is either not requested or temporarily disabled due to quota limits
    const baseConfig = { ...geminiConfig };
    delete baseConfig.tools;
    configsToTry.push(baseConfig);
  }

  for (let cIdx = 0; cIdx < configsToTry.length; cIdx++) {
    const config = configsToTry[cIdx];
    const isUsingTools = Boolean(config?.tools && config.tools.length > 0);

    for (const model of candidateModels) {
      if (isAborted()) return;
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents: formattedContents,
          config,
        });

        const emittedCitations = new Set<string>();
        let streamedAnyText = false;

        for await (const chunk of responseStream) {
          if (isAborted()) return;

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

          const text = chunk.text || "";
          if (text || newCitations.length > 0) {
            streamedAnyText = true;
            onChunk(text, newCitations, model);
          }
        }

        if (streamedAnyText) {
          return;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isQuotaOrRateLimit =
          err?.status === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota");

        if (isUsingTools && isQuotaOrRateLimit) {
          // Google Search grounding quota is exhausted on this project/key.
          // Remember this to avoid failing future requests and immediately drop tools
          console.warn(`Search grounding quota exhausted on ${model}. Disabling search tool and falling back to standard inference.`);
          markSearchQuotaExhausted();
          break; // Break inner model loop, proceed directly to noToolsConfig
        }

        console.warn(`Gemini attempt failed (model: ${model}, tools: ${isUsingTools}):`, errMsg.slice(0, 150));
        if (isAborted()) return;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
}

// Helper to format clean, human-readable error messages
export function formatCleanErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred.";
  let msg = typeof error === "string" ? error : error.message || String(error);

  // Try extracting inner error message if JSON encoded
  try {
    if (msg.includes('{"error":')) {
      const match = msg.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.error?.message) {
          try {
            const nested = JSON.parse(parsed.error.message);
            if (nested.error?.message) {
              msg = nested.error.message;
            }
          } catch {
            msg = parsed.error.message;
          }
        }
      }
    }
  } catch {
    // ignore parse error
  }

  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return "API rate or quota limit reached. Please wait a brief moment before sending another prompt.";
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "The AI model is experiencing temporarily high demand. Please retry in a few seconds.";
  }
  if (msg.includes("API_KEY")) {
    return "API key authentication issue. Please check your configured keys in Settings.";
  }

  return msg.replace(/\n+/g, " ").trim();
}

// System instructions
export function getSystemInstruction(mode: 'normal' | 'cat-code'): string {
  if (mode === 'normal') {
    return `You are IntelicatAI in "Normal Talk Mode" — a helpful, versatile, friendly, and ultra-fast conversational companion.
- Designed to have natural, engaging, and thoughtful discussions on any topic (writing, ideas, science, philosophy, planning, brainstorming, and learning).
- Speak with warm intelligence, clarity, and empathy.
- When search results are available, incorporate up-to-date facts smoothly.
- Format responses cleanly with Markdown, clear paragraphs, and bullet points.`;
  } else {
    return `You are IntelicatAI 🐾, the legendary Cybernetic Cat Coder and AI Software Architect.
You are in "Cat Code Mode" — supreme feline agility meets world-class software engineering.

Core Directives:
- Elite master of TypeScript, JavaScript, Python, Rust, Go, SQL, React, Node.js, Next.js, Algorithms, and Distributed Systems.
- You produce production-grade, modular, robust, bug-free code with precise explanations and clear best practices.
- Witty, playful feline cyber-cat persona (occasional sharp cat puns like "purr-fectly compiled", "catching bugs faster than mice", "razor-sharp reflexes", but always extraordinarily intelligent and technically profound).
- Hunt down bugs, optimize algorithmic bottlenecks, and deliver high-signal code solutions with syntax-highlighted codeblocks.`;
  }
}
