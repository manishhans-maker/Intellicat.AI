import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
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
      throw new Error("GROQ_API_KEY is not configured. Please add your Groq API key in Secrets or Environment Variables.");
    }
    groqClient = new Groq({ apiKey: key });
  }
  return groqClient;
}

const CANDIDATE_GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
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
    console.warn("Could not list Groq models dynamically, falling back to llama-3.1-8b-instant:", err);
  }
  return "llama-3.1-8b-instant";
}

const GEMINI_CANDIDATE_MODELS = ["gemini-3.6-flash"];

async function streamGeminiWithFallback(
  ai: GoogleGenAI,
  formattedContents: any[],
  systemInstruction: string,
  temperature: number,
  onChunk: (text: string, model: string) => void
) {
  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature,
          },
        });
        let receivedAny = false;
        for await (const chunk of responseStream) {
          if (chunk.text) {
            receivedAny = true;
            onChunk(chunk.text, model);
          }
        }
        if (receivedAny) return;
      } catch (err: any) {
        console.warn(`Gemini model ${model} attempt ${attempt + 1} failed:`, err?.message);
        lastErr = err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  }
  if (lastErr) throw lastErr;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // System instruction: IntelicatAI, the brilliant Cybernetic Cat Coder & AI Software Architect
  const SYSTEM_INSTRUCTION = `You are IntelicatAI 🐾, the ultra-smart Cybernetic Cat Coder and AI Software Engineer.
You combine feline agility, sharp analytical reflexes, and world-class programming craftsmanship.

Key Traits:
- Master coder in TypeScript, JavaScript, Python, Rust, Go, SQL, React, Next.js, Algorithms, and System Architecture.
- You write clean, modular, production-ready, bug-free code with clear comments and best practices.
- You have a subtle, witty, brilliant cat persona (occasional playful feline cat puns like "purr-fectly executed", "zero bugs caught like mice", "fast reflexes", but always high intelligence and deep technical utility).
- You can explain complex coding concepts simply, debug tough errors, architect resilient software, optimize performance, and brainstorm breakthrough tech.
- Format responses cleanly with syntax-highlighted markdown codeblocks and clear bullet points.`;

  // Providers availability check
  app.get("/api/providers", (_req, res) => {
    res.json({
      groq: Boolean(process.env.GROQ_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      defaultProvider: process.env.GROQ_API_KEY ? "groq" : "gemini",
    });
  });

  // API endpoint for Chat with real-time SSE streaming for Groq & Gemini
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, mode = "normal", provider = "auto" } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      let systemInstruction = "";
      let temperature = 0.7;

      if (mode === "normal") {
        systemInstruction = `You are a helpful, versatile, friendly, and intelligent AI companion.
You are in "Normal Chat Mode" — designed to have natural, engaging, and thoughtful conversations on any subject.
- Talk casually, answer general knowledge questions, discuss ideas, help with writing, planning, learning, and storytelling.
- Be warm, direct, empathetic, and clear.
- Do NOT force cat puns, gimmicks, or unsolicited code dumps unless the user specifically asks for code.
- Format responses cleanly with markdown and clear paragraphs.`;
        temperature = 0.7;
      } else {
        // Cat Code Mode
        systemInstruction = `You are IntelicatAI 🐾, the ultra-smart Cybernetic Cat Coder and AI Software Engineer.
You are in "Cat Code Mode" — feline agility meets superhuman programming power.
- Master of software engineering, algorithms, frontend/backend, debugging, system architecture, TypeScript, Python, Rust, React, SQL, and DevOps.
- Write clean, production-grade, bug-free, modular code with helpful explanations.
- Have a clever, playful cyber-cat personality (with occasional witty feline puns like "purr-fectly compiled", "catching bugs faster than mice", "fast reflexes").
- Hunt down errors, optimize algorithms, and deliver high-signal code solutions.`;
        temperature = 0.3;
      }

      // Determine active provider: Normal Talk uses Groq, Cat Code uses Gemini
      let activeProvider = provider;
      if (!activeProvider || activeProvider === "auto") {
        activeProvider = mode === "normal" ? "groq" : "gemini";
      }

      // Graceful automatic fallback if the selected provider key is missing
      const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
      const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

      if (activeProvider === "groq" && !hasGroqKey) {
        if (hasGeminiKey) {
          activeProvider = "gemini";
        } else {
          return res.status(400).json({
            error: "GROQ_API_KEY is not configured. Please add GROQ_API_KEY in your Secrets or Environment Variables (get a free key at https://console.groq.com) or configure GEMINI_API_KEY.",
          });
        }
      } else if (activeProvider === "gemini" && !hasGeminiKey) {
        if (hasGroqKey) {
          activeProvider = "groq";
        } else {
          return res.status(400).json({
            error: "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your Secrets or Environment Variables (get a key at https://aistudio.google.com/app/apikey) or configure GROQ_API_KEY.",
          });
        }
      }

      // Set headers for Server-Sent Events streaming AFTER key validation
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      if (activeProvider === "groq") {
        const groq = getGroqClient();
        const groqMessages = [
          { role: "system" as const, content: systemInstruction },
          ...messages.map((m: { role: string; content: string }) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
          })),
        ];

        let selectedModel = await resolveGroqModel(groq);
        let streamStarted = false;

        // Attempt Groq with fallback to lighter models or Gemini
        try {
          let completion: any;
          try {
            completion = await groq.chat.completions.create({
              model: selectedModel,
              messages: groqMessages,
              temperature,
              stream: true,
            });
          } catch (modelErr: any) {
            console.warn(`Groq error with model ${selectedModel}, trying llama-3.1-8b-instant:`, modelErr?.message);
            selectedModel = "llama-3.1-8b-instant";
            completion = await groq.chat.completions.create({
              model: selectedModel,
              messages: groqMessages,
              temperature,
              stream: true,
            });
          }

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              streamStarted = true;
              res.write(`data: ${JSON.stringify({ text, provider: "groq", model: selectedModel })}\n\n`);
            }
          }
        } catch (groqFailure: any) {
          console.error("Groq execution failed:", groqFailure);
          if (!streamStarted && process.env.GEMINI_API_KEY) {
            console.log("Falling back seamlessly to Gemini Flash...");
            const formattedContents = messages.map((m: { role: string; content: string }) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            }));
            const ai = getAiClient();
            await streamGeminiWithFallback(
              ai,
              formattedContents,
              systemInstruction,
              temperature,
              (text, model) => {
                res.write(`data: ${JSON.stringify({ text, provider: "gemini", model })}\n\n`);
              }
            );
          } else {
            throw groqFailure;
          }
        }
      } else {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY is not configured. Please add your Gemini API key in Secrets or Environment Variables.");
        }

        const formattedContents = messages.map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const ai = getAiClient();
        await streamGeminiWithFallback(
          ai,
          formattedContents,
          systemInstruction,
          temperature,
          (text, model) => {
            res.write(`data: ${JSON.stringify({ text, provider: "gemini", model })}\n\n`);
          }
        );
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("AI API Streaming Error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: error.message || "Failed to generate AI response. Please verify your API key.",
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message || "Stream interrupted" })}\n\n`);
        res.end();
      }
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "IntelicatAI Engine", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IntelicatAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
