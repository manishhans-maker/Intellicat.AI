import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// --- In-Memory Rate Limiting for Serverless ---
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 40;

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

// --- Lazy SDK Clients ---
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in Vercel Environment Variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "intelicatai-serverless",
        },
      },
    });
  }
  return aiClient;
}

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error("GROQ_API_KEY is not configured in Vercel Environment Variables.");
    }
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

// --- Candidate Models ---
const CANDIDATE_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
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

const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

// --- Message Formatting ---
interface ValidatedAttachment {
  name: string;
  type: string;
  data: string;
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
          parts.push({
            text: `\n[Attached document: ${att.name}]\n${att.data}\n`,
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
        .map((a) => `\n[Attached File: ${a.name}]\n${a.data}\n`)
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

function getSystemInstruction(mode: "normal" | "cat-code"): string {
  if (mode === "normal") {
    return `You are IntelicatAI in "Normal Talk Mode" — a helpful, versatile, friendly, and ultra-fast conversational companion.
- Designed to have natural, engaging, and thoughtful discussions on any topic (writing, ideas, science, philosophy, planning, brainstorming, and learning).
- Speak with warm intelligence, clarity, and empathy.
- When asked friendly greetings (e.g. "How are you", "Yoo bro", "What's up"), respond warmly, casually, and enthusiastically!
- Format responses cleanly with Markdown, clear paragraphs, and bullet points.`;
  } else {
    return `You are IntelicatAI 🐾, the legendary Cybernetic Cat Coder and AI Software Architect.
You are in "Cat Code Mode" — supreme feline agility meets world-class software engineering.
Core Directives:
- Elite master of TypeScript, JavaScript, Python, Rust, Go, SQL, React, Node.js, Next.js, Algorithms, and Distributed Systems.
- Production-grade, modular, robust code with witty, playful cyber-cat banter.
- Hunt down bugs and optimize performance with sharp feline precision!`;
  }
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

  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return "The AI engine is temporarily busy. Please click Retry to continue.";
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "The AI model is experiencing high demand. Please retry in a few seconds.";
  }
  if (msg.includes("API_KEY") || msg.includes("API key not valid")) {
    return "API key authentication issue. Please check your project settings.";
  }

  return msg.replace(/\n+/g, " ").trim();
}

// --- Main Vercel Serverless Function Handler ---
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "IntelicatAI Serverless Engine" });
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
      webSearch = false,
    } = parsedBody || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const hasImageAttachments = messages.some(
      (m: any) => m.attachments && m.attachments.some((a: any) => a.type?.startsWith("image/"))
    );

    const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

    let activeProvider = requestedProvider;
    if (activeProvider === "auto") {
      activeProvider = hasImageAttachments ? "gemini" : hasGroqKey ? "groq" : "gemini";
    } else if (hasImageAttachments && activeProvider === "groq") {
      activeProvider = "gemini";
    }

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

    const systemInstruction = getSystemInstruction(mode);
    const temperature = mode === "cat-code" ? 0.25 : 0.7;
    let streamStarted = false;

    // --- Provider 1: Groq ---
    if (activeProvider === "groq" && hasGroqKey) {
      try {
        const groq = getGroqClient();
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
      } catch (groqErr: any) {
        console.warn("Groq streaming error, attempting failover to Gemini:", groqErr?.message);
        if (!streamStarted && hasGeminiKey) {
          activeProvider = "gemini";
        } else {
          throw groqErr;
        }
      }
    }

    // --- Provider 2: Gemini (Primary or Failover) ---
    if (activeProvider === "gemini") {
      const ai = getAiClient();
      const formattedContents = formatGeminiContents(messages);

      const configsToTry: any[] = [];
      if (webSearch) {
        configsToTry.push({
          systemInstruction,
          temperature,
          tools: [{ googleSearch: {} }],
        });
      }
      configsToTry.push({
        systemInstruction,
        temperature,
      });

      let geminiSuccess = false;
      let lastGeminiError: any = null;

      for (const config of configsToTry) {
        if (geminiSuccess || clientDisconnected) break;

        for (const model of GEMINI_CANDIDATE_MODELS) {
          if (geminiSuccess || clientDisconnected) break;

          try {
            const responseStream = await ai.models.generateContentStream({
              model,
              contents: formattedContents,
              config,
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
                streamStarted = true;
                geminiSuccess = true;
                res.write(`data: ${JSON.stringify({ text, provider: "gemini", model })}\n\n`);
                if (typeof (res as any).flush === "function") {
                  (res as any).flush();
                }
              }
            }

            if (geminiSuccess) break;
          } catch (err: any) {
            lastGeminiError = err;
            const errMsg = String(err?.message || err);
            console.warn(`Gemini attempt (${model}) failed:`, errMsg.slice(0, 100));
            // If search tool quota failed, break to retry config without tools
            if (config.tools && (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED"))) {
              break;
            }
          }
        }
      }

      if (!geminiSuccess && !streamStarted) {
        // As a final safety net: if Gemini failed and Groq key is available, try Groq
        if (hasGroqKey && !hasImageAttachments) {
          try {
            const groq = getGroqClient();
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
                res.write(`data: ${JSON.stringify({ text, provider: "groq", model: selectedModel })}\n\n`);
                if (typeof (res as any).flush === "function") {
                  (res as any).flush();
                }
              }
            }
          } catch (finalGroqErr) {
            throw lastGeminiError || finalGroqErr;
          }
        } else if (lastGeminiError) {
          throw lastGeminiError;
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Vercel Chat API Error:", error);
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
