import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return aiClient;
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
    const { messages, mode = "normal" } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in environment variables.",
      });
    }

    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const ai = getAiClient();

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

    // Set headers for Server-Sent Events streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

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
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Vercel Serverless Chat API Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Failed to generate AI response. Please check GEMINI_API_KEY.",
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
}
