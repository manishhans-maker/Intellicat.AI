import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
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
