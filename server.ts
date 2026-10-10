import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { isSearchQuotaExhausted } from "./server/chatCore";
import chatHandler from "./api/chat";
import imageGenHandler from "./api/imageGen";
import searchServiceHandler from "./api/searchService";

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
  app.get("/api/providers", (req, res) => {
    const customGroqKey = ((req.headers["x-groq-api-key"] as string) || (req.query?.groqKey as string) || "").trim();
    const hasServerGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
    const hasGroq = hasServerGroq || customGroqKey.length > 0;
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

    res.json({
      groq: hasGroq,
      serverGroqConfigured: hasServerGroq,
      hasCustomGroqKey: customGroqKey.length > 0,
      gemini: hasGemini,
      defaultProvider: hasGroq ? "groq" : "gemini",
      searchAvailable: hasGemini && !isSearchQuotaExhausted(),
    });
  });

  // Verify personal Groq API key endpoint
  app.post("/api/verify-groq", async (req, res) => {
    const key = (req.body?.apiKey || (req.headers["x-groq-api-key"] as string) || process.env.GROQ_API_KEY || "").trim();
    if (!key) {
      return res.status(400).json({
        valid: false,
        error: "Missing Groq API key. Provide a key starting with 'gsk_' from console.groq.com.",
      });
    }

    try {
      const groq = new Groq({ apiKey: key });
      const modelList = await groq.models.list();
      const activeModels = modelList.data
        .map((m: any) => m.id)
        .filter((id: string) => !id.includes("whisper"));

      return res.json({
        valid: true,
        modelsCount: activeModels.length,
        models: activeModels.slice(0, 10),
      });
    } catch (err: any) {
      return res.status(400).json({
        valid: false,
        error: err?.message || "Invalid Groq API key or network error connecting to Groq API.",
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "IntelicatAI Engine", timestamp: new Date().toISOString() });
  });

  // Explicit SEO & Crawler routes to guarantee instant 200 OK delivery to Googlebot & AI agents
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").sendFile(path.join(process.cwd(), "public", "robots.txt"));
  });
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").sendFile(path.join(process.cwd(), "public", "sitemap.xml"));
  });
  app.get("/llms.txt", (_req, res) => {
    res.type("text/plain; charset=utf-8").sendFile(path.join(process.cwd(), "public", "llms.txt"));
  });

  // Unified API endpoint for Chat
  app.post("/api/chat", chatHandler);

  // Dedicated Image Generation Studio endpoint (Disabled per user request)
  // app.post("/api/generate-image", imageGenHandler);

  // Dedicated Web Search Service endpoint
  app.get("/api/search", searchServiceHandler);
  app.post("/api/search", searchServiceHandler);

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
