import express from "express";
import dotenv from "dotenv";
import { apiRouter } from "../server/apiRouter";

dotenv.config();

const app = express();

app.use(express.json({ limit: "15mb" }));

// Robust CORS headers for serverless execution
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "*");
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

// Vercel Serverless Function entry point: supports both standard (req, res) handler and Express app export
export default function handler(req: any, res: any) {
  return app(req, res);
}
