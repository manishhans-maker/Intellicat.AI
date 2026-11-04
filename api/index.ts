import express from "express";
import dotenv from "dotenv";
import { apiRouter } from "../server/apiRouter";

dotenv.config();

const app = express();

app.use(express.json({ limit: "15mb" }));

// Middleware for parsing errors
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

// Mount the API router
app.use(apiRouter);

export default app;
