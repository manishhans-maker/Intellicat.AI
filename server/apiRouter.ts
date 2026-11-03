import { Router } from "express";
import chatHandler from "./routes/chat";
import imageGenHandler from "./routes/generate-image";
import searchServiceHandler from "./routes/search";
import { translateHandler } from "./routes/translate";
import { newsFeedHandler, newsSummarizeHandler } from "./routes/news";
import codeAgentHandler from "./routes/code-agent";
import providersHandler from "./routes/providers";
import verifyGroqHandler from "./routes/verify-groq";
import healthHandler from "./routes/health";
import {
  githubAuthUrlHandler,
  githubCallbackHandler,
  githubVerifyTokenHandler,
  githubConfigureHandler,
  githubClearConfigHandler,
} from "./routes/githubAuth";

export const apiRouter = Router();

// Providers availability check
apiRouter.get("/providers", providersHandler);
apiRouter.get("/api/providers", providersHandler);

// Verify personal Groq API key endpoint
apiRouter.post("/verify-groq", verifyGroqHandler);
apiRouter.post("/api/verify-groq", verifyGroqHandler);

// Health check endpoint
apiRouter.get("/health", healthHandler);
apiRouter.get("/api/health", healthHandler);

// Unified API endpoint for Chat
apiRouter.post("/chat", chatHandler);
apiRouter.get("/chat", chatHandler);
apiRouter.post("/api/chat", chatHandler);
apiRouter.get("/api/chat", chatHandler);

// Dedicated Image Generation Studio endpoint
apiRouter.post("/generate-image", imageGenHandler);
apiRouter.get("/generate-image", imageGenHandler);
apiRouter.post("/api/generate-image", imageGenHandler);
apiRouter.get("/api/generate-image", imageGenHandler);
apiRouter.post("/imageGen", imageGenHandler);
apiRouter.get("/imageGen", imageGenHandler);
apiRouter.post("/api/imageGen", imageGenHandler);
apiRouter.get("/api/imageGen", imageGenHandler);

// Dedicated Web Search Service endpoint
apiRouter.get("/search", searchServiceHandler);
apiRouter.post("/search", searchServiceHandler);
apiRouter.get("/api/search", searchServiceHandler);
apiRouter.post("/api/search", searchServiceHandler);
apiRouter.get("/searchService", searchServiceHandler);
apiRouter.post("/searchService", searchServiceHandler);
apiRouter.get("/api/searchService", searchServiceHandler);
apiRouter.post("/api/searchService", searchServiceHandler);

// Dedicated AI Translation endpoint
apiRouter.post("/translate", translateHandler);
apiRouter.post("/api/translate", translateHandler);

// Dedicated Live Newspaper & News AI endpoints
apiRouter.get("/news", newsFeedHandler);
apiRouter.get("/api/news", newsFeedHandler);
apiRouter.post("/news/summarize", newsSummarizeHandler);
apiRouter.post("/api/news/summarize", newsSummarizeHandler);

// Dedicated AI Coding Agent Workspace endpoint
apiRouter.post("/code-agent", codeAgentHandler);
apiRouter.post("/api/code-agent", codeAgentHandler);

// GitHub OAuth Flow & Token Verification Endpoints
apiRouter.get("/auth/github/url", githubAuthUrlHandler);
apiRouter.get("/api/auth/github/url", githubAuthUrlHandler);
apiRouter.get(["/auth/github/callback", "/auth/github/callback/"], githubCallbackHandler);
apiRouter.post("/auth/github/verify", githubVerifyTokenHandler);
apiRouter.post("/api/auth/github/verify", githubVerifyTokenHandler);
apiRouter.post("/auth/github/configure", githubConfigureHandler);
apiRouter.post("/api/auth/github/configure", githubConfigureHandler);
apiRouter.delete("/auth/github/configure", githubClearConfigHandler);
apiRouter.delete("/api/auth/github/configure", githubClearConfigHandler);

export default apiRouter;
