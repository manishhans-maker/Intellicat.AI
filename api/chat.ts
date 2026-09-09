import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
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

export default async function handler(req: any, res: any) {
  // Allow CORS if needed
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { messages, mode = "normal", provider = "auto" } = req.body || {};
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
          error: "GROQ_API_KEY is not configured. Please add GROQ_API_KEY in your Vercel Environment Variables (get a free key at https://console.groq.com) or configure GEMINI_API_KEY.",
        });
      }
    } else if (activeProvider === "gemini" && !hasGeminiKey) {
      if (hasGroqKey) {
        activeProvider = "groq";
      } else {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your Vercel Environment Variables (get a key at https://aistudio.google.com/app/apikey) or configure GROQ_API_KEY.",
        });
      }
    }

    // Set headers for Server-Sent Events streaming AFTER key validation
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    if (activeProvider === "groq") {
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
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }
      }
    } else {
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
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Vercel Serverless Chat API Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Failed to generate AI response. Please check your API key configuration.",
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
}
