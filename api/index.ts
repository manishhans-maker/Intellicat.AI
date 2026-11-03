import express from "express";
import { apiRouter } from "../server/apiRouter";

const app = express();

app.use(express.json({ limit: "15mb" }));

// Handle JSON parsing errors gracefully
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON payload." });
  }
  if (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
  next();
});

// Mount the unified API router
app.use("/api", apiRouter);
app.use(apiRouter);

export default function handler(req: any, res: any) {
  return app(req, res);
}
