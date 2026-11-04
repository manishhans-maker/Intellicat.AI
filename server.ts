import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { apiRouter } from "./server/apiRouter";

dotenv.config();

export const app = express();

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

// SEO & Crawler routes to guarantee instant 200 OK delivery
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").sendFile(path.join(process.cwd(), "public", "robots.txt"));
});
app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml").sendFile(path.join(process.cwd(), "public", "sitemap.xml"));
});
app.get("/llms.txt", (_req, res) => {
  res.type("text/plain; charset=utf-8").sendFile(path.join(process.cwd(), "public", "llms.txt"));
});
app.get("/llms-full.txt", (_req, res) => {
  res.type("text/plain; charset=utf-8").sendFile(path.join(process.cwd(), "public", "llms-full.txt"));
});

// Mount all API endpoints from server/apiRouter
app.use(apiRouter);

// Vite middleware for development vs static build for production
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IntelicatAI server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
