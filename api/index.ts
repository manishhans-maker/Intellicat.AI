import express from "express";
import dotenv from "dotenv";
import { apiRouter } from "../server/apiRouter";

dotenv.config();

const app = express();

app.use(express.json({ limit: "15mb" }));

// Robust CORS headers for serverless execution
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE,PATCH");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-groq-api-key"
  );
  next();
});

// Normalize req.url in Vercel serverless environment
app.use((req, _res, next) => {
  if (req.url) {
    if (req.url.startsWith("/api/index.ts")) {
      req.url = req.url.replace("/api/index.ts", "") || "/";
    }
  }
  next();
});

// Middleware for parsing errors
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON in request body." });
  }
  if (err) {
    console.error("Vercel Serverless Express error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
  next();
});

// Mount the API router
app.use(apiRouter);

// Fallback for any unhandled /api/* route
app.use((_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Vercel Serverless Function entry point:
// Returning a Promise keeps the Vercel Lambda container open until streaming / response completion.
export default function handler(req: any, res: any) {
  return new Promise<void>((resolve) => {
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
    res.on("error", () => resolve());

    try {
      app(req, res, (err: any) => {
        if (err && !res.headersSent && !res.writableEnded) {
          res.status(500).json({ error: err.message || "Internal Server Error" });
        }
        resolve();
      });
    } catch (uncaught: any) {
      console.error("Uncaught serverless handler exception:", uncaught);
      if (!res.headersSent && !res.writableEnded) {
        res.status(500).json({ error: uncaught?.message || "Internal Server Error" });
      }
      resolve();
    }
  });
}
