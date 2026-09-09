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

      // If requested provider key is missing, gracefully fall back to the available key if configured
      if (activeProvider === "groq" && !process.env.GROQ_API_KEY && process.env.GEMINI_API_KEY) {
        activeProvider = "gemini";
      } else if (activeProvider === "gemini" && !process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY) {
        activeProvider = "groq";
      }

      // Set headers for Server-Sent Events streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      if (activeProvider === "groq") {
        if (!process.env.GROQ_API_KEY) {
          throw new Error("GROQ_API_KEY is not configured. Please add your Groq API key in Secrets or Environment Variables (get a free key at https://console.groq.com).");
        }

        const groq = getGroqClient();
        const groqMessages = [
          { role: "system" as const, content: systemInstruction },
          ...messages.map((m: { role: string; content: string }) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
          })),
        ];

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
          temperature,
          stream: true,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            res.write(`data: ${JSON.stringify({ text, provider: "groq", model: "llama-3.3-70b-versatile" })}\n\n`);
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

        const responseStream = await ai.models.generateContentStream({
          model: "gemini-3.6-flash",
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature,
          },
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text, provider: "gemini", model: "gemini-3.6-flash" })}\n\n`);
          }
        }
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
