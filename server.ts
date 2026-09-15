import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  checkRateLimit,
  checkAndIncrementServerQuota,
  validateChatPayload,
  getAiClient,
  getGroqClient,
  resolveGroqModel,
  GEMINI_MODEL,
  formatGeminiContents,
  formatGroqMessages,
  streamGeminiWithResilience,
  getSystemInstruction,
  formatCleanErrorMessage,
  isSearchQuotaExhausted,
} from "./server/chatCore";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware with size limits to protect against payload denial-of-service
  app.use(express.json({ limit: "15mb" }));

  // Middleware for parsing errors (e.g. malformed JSON payloads)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Malformed JSON in request body." });
    }
    if (err) {
      console.error("Express middleware error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
    next();
  });

  // Providers availability check
  app.get("/api/providers", (_req, res) => {
    const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

    res.json({
      groq: hasGroq,
      gemini: hasGemini,
      defaultProvider: hasGroq ? "groq" : "gemini",
      searchAvailable: hasGemini && !isSearchQuotaExhausted(),
    });
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "IntelicatAI Engine", timestamp: new Date().toISOString() });
  });

  // API endpoint for Chat with real-time SSE streaming, rate limiting, and security
  app.post("/api/chat", async (req, res) => {
    let clientDisconnected = false;
    res.on("close", () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
      }
    });

    try {
      // 1. IP & Rate Limiting Defense
      const rawFwd = req.headers["x-forwarded-for"];
      const fwdStr = Array.isArray(rawFwd) ? rawFwd[0] : typeof rawFwd === "string" ? rawFwd : "";
      const clientIp = fwdStr.split(",")[0]?.trim() || req.socket?.remoteAddress || "anonymous";

      const rateCheck = checkRateLimit(clientIp);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: `Rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds before sending more messages.`,
        });
      }

      // 2. Strict Payload Validation
      const validation = validateChatPayload(req.body);
      if (!validation.isValid || !validation.data) {
        return res.status(400).json({ error: validation.error || "Invalid request payload." });
      }

      const { messages, mode, provider: requestedProvider, webSearch, userId, isVipOrFounder } = validation.data;

      // 3. Server-side Quota Protection
      if (userId) {
        const quotaCheck = checkAndIncrementServerQuota(userId, isVipOrFounder);
        if (!quotaCheck.allowed) {
          return res.status(403).json({
            error: "Server quota exceeded: You have used all 15 free queries. Please upgrade to VIP for unlimited requests!",
          });
        }
      }

      // 4. Detect multimodal attachments (images)
      const hasImageAttachments = messages.some(
        (m) => m.attachments && m.attachments.some((a) => a.type.startsWith("image/"))
      );

      // Determine active provider: If images are attached, route to Gemini natively
      let activeProvider = requestedProvider;
      if (activeProvider === "auto") {
        activeProvider = hasImageAttachments ? "gemini" : mode === "normal" ? "groq" : "gemini";
      } else if (hasImageAttachments && activeProvider === "groq") {
        // Groq text models do not accept image inputs; auto-route to Gemini
        activeProvider = "gemini";
      }

      // Graceful fallback if key is missing
      const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
      const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

      if (activeProvider === "groq" && !hasGroqKey) {
        if (hasGeminiKey) {
          activeProvider = "gemini";
        } else {
          return res.status(400).json({
            error: "Neither GROQ_API_KEY nor GEMINI_API_KEY is configured. Please configure at least one API key.",
          });
        }
      } else if (activeProvider === "gemini" && !hasGeminiKey) {
        if (hasGroqKey && !hasImageAttachments) {
          activeProvider = "groq";
        } else {
          return res.status(400).json({
            error: "GEMINI_API_KEY is required for image understanding and Google Search grounding. Please add GEMINI_API_KEY.",
          });
        }
      }

      // 5. Initialize SSE Streaming Headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const systemInstruction = getSystemInstruction(mode);
      const temperature = mode === "cat-code" ? 0.25 : 0.7;

      if (activeProvider === "groq") {
        const groq = getGroqClient();
        const groqMessages = formatGroqMessages(messages, systemInstruction);

        let selectedModel = await resolveGroqModel(groq);
        let streamStarted = false;

        try {
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
            }
          }
        } catch (groqErr: any) {
          console.warn("Groq streaming error, attempting fallback to Gemini:", groqErr?.message);
          if (!streamStarted && hasGeminiKey) {
            activeProvider = "gemini";
          } else {
            throw groqErr;
          }
        }
      }

      // Gemini generation (either primary or fallback)
      if (activeProvider === "gemini") {
        const ai = getAiClient();
        const formattedContents = formatGeminiContents(messages);

        const geminiConfig: any = {
          systemInstruction,
          temperature,
        };

        if (webSearch) {
          geminiConfig.tools = [{ googleSearch: {} }];
        }

        await streamGeminiWithResilience(
          ai,
          formattedContents,
          geminiConfig,
          (text, citations, model) => {
            if (citations.length > 0) {
              res.write(`data: ${JSON.stringify({ citations })}\n\n`);
            }
            if (text) {
              res.write(`data: ${JSON.stringify({ text, provider: "gemini", model })}\n\n`);
            }
          },
          () => clientDisconnected
        );
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Chat streaming failure:", error);
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
