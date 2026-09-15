import {
  checkRateLimit,
  checkAndIncrementServerQuota,
  validateChatPayload,
  getAiClient,
  getGroqClient,
  resolveGroqModel,
  GEMINI_MODEL,
  formatGeminiContents,
  streamGeminiWithResilience,
  getSystemInstruction,
  formatCleanErrorMessage,
} from "../server/chatCore";

export default async function handler(req: any, res: any) {
  // 1. CORS headers
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
    // Parse body if passed as string in serverless
    let parsedBody = req.body;
    if (typeof parsedBody === "string") {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        parsedBody = {};
      }
    }

    // 2. IP Rate Limiting
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

    // 3. Payload Validation
    const validation = validateChatPayload(parsedBody);
    if (!validation.isValid || !validation.data) {
      return res.status(400).json({ error: validation.error || "Invalid request payload." });
    }

    const { messages, mode, provider: requestedProvider, webSearch, userId, isVipOrFounder } = validation.data;

    // 4. Server-Side Quota Enforcement
    if (userId) {
      const quotaCheck = checkAndIncrementServerQuota(userId, isVipOrFounder);
      if (!quotaCheck.allowed) {
        return res.status(403).json({
          error: "Server quota exceeded: You have used all 15 free queries. Please upgrade to VIP for unlimited requests!",
        });
      }
    }

    // 5. Detect multimodal image attachments
    const hasImageAttachments = messages.some(
      (m) => m.attachments && m.attachments.some((a) => a.type.startsWith("image/"))
    );

    let activeProvider = requestedProvider;
    if (activeProvider === "auto") {
      activeProvider = hasImageAttachments ? "gemini" : mode === "normal" ? "groq" : "gemini";
    } else if (hasImageAttachments && activeProvider === "groq") {
      activeProvider = "gemini";
    }

    const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

    if (activeProvider === "groq" && !hasGroqKey) {
      if (hasGeminiKey) {
        activeProvider = "gemini";
      } else {
        return res.status(400).json({
          error: "GROQ_API_KEY is not configured in Vercel Environment Variables. Please add it or configure GEMINI_API_KEY.",
        });
      }
    } else if (activeProvider === "gemini" && !hasGeminiKey) {
      if (hasGroqKey && !hasImageAttachments) {
        activeProvider = "groq";
      } else {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured in Vercel Environment Variables. Please add it in project settings.",
        });
      }
    }

    // 6. SSE Streaming Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const systemInstruction = getSystemInstruction(mode);
    const temperature = mode === "cat-code" ? 0.25 : 0.7;

    if (activeProvider === "groq") {
      const groq = getGroqClient();
      const groqMessages = [
        { role: "system" as const, content: systemInstruction },
        ...messages.map((m) => {
          let content = m.content;
          if (m.attachments && m.attachments.length > 0) {
            const textDocs = m.attachments
              .filter((a) => !a.type.startsWith("image/"))
              .map((a) => `\n[Attached File: ${a.name}]\n${a.data}\n`)
              .join("\n");
            if (textDocs) content = `${textDocs}\n${content}`;
          }
          return {
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content,
          };
        }),
      ];

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
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        }
      } catch (groqErr: any) {
        console.warn("Groq streaming failed in Vercel function, attempting Gemini fallback:", groqErr?.message);
        if (!streamStarted && hasGeminiKey) {
          activeProvider = "gemini";
        } else {
          throw groqErr;
        }
      }
    }

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
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
          if (text) {
            res.write(`data: ${JSON.stringify({ text, provider: "gemini", model })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        },
        () => clientDisconnected
      );
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
