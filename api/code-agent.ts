import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("Failed to initialize Gemini client for code agent:", e);
    }
  }
  return geminiClient;
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

interface FileContextInput {
  path: string;
  content: string;
}

/**
 * Resilient JSON and Code Extractor for Coding Agent responses
 * Handles raw JSON, markdown-wrapped JSON, unescaped string characters,
 * truncated JSON, and pure code blocks.
 */
function robustParseAgentJson(
  rawText: string,
  task: string,
  activeFilePath: string,
  modelName: string
): any {
  if (!rawText || typeof rawText !== "string") return null;

  const trimmed = rawText.trim();

  // 1. Direct standard parse
  try {
    const direct = JSON.parse(trimmed);
    if (direct && (direct.fileChanges || direct.plan || direct.explanation)) {
      return direct;
    }
  } catch {}

  // 2. Strip leading/trailing markdown code fences (```json ... ``` or ``` ...)
  const cleaned = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && (parsed.fileChanges || parsed.plan || parsed.explanation)) {
      return parsed;
    }
  } catch {}

  // 3. Find outermost braces
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidateJson = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidateJson);
      if (parsed && (parsed.fileChanges || parsed.plan || parsed.explanation)) {
        return parsed;
      }
    } catch {}

    // 4. Try repairing literal unescaped newlines/tabs inside JSON strings
    try {
      let inString = false;
      let escaped = false;
      let repaired = "";
      for (let i = 0; i < candidateJson.length; i++) {
        const char = candidateJson[i];
        if (char === '"' && !escaped) {
          inString = !inString;
          repaired += char;
        } else if (inString && (char === '\n' || char === '\r')) {
          repaired += char === '\n' ? '\\n' : '\\r';
        } else if (inString && char === '\t') {
          repaired += '\\t';
        } else {
          repaired += char;
        }
        escaped = !escaped && char === '\\';
      }
      const parsed = JSON.parse(repaired);
      if (parsed && (parsed.fileChanges || parsed.plan || parsed.explanation)) {
        return parsed;
      }
    } catch {}
  }

  // 5. Try fixing truncated JSON (auto-close quotes, brackets, braces)
  if (firstBrace !== -1) {
    let candidate = cleaned.substring(firstBrace);
    let inString = false;
    let escaped = false;
    let openBraces = 0;
    let openBrackets = 0;
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === '"' && !escaped) {
        inString = !inString;
      } else if (!inString) {
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
        else if (ch === '[') openBrackets++;
        else if (ch === ']') openBrackets--;
      }
      escaped = !escaped && ch === '\\';
    }

    if (inString) candidate += '"';
    while (openBrackets > 0) {
      candidate += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      candidate += '}';
      openBraces--;
    }

    try {
      const parsed = JSON.parse(candidate);
      if (parsed && (parsed.fileChanges || parsed.plan || parsed.explanation)) {
        return parsed;
      }
    } catch {}
  }

  // 6. Regex fallback for markdown code blocks (```tsx ... ```, ```jsx ... ```, ```html ... ```)
  const codeBlockRegex = /```(?:tsx|jsx|ts|js|html|css)?\s*([\s\S]*?)```/gi;
  const matches = [...rawText.matchAll(codeBlockRegex)];
  if (matches.length > 0) {
    const fileChanges = matches.map((m, idx) => {
      const codeSnippet = m[1].trim();
      let detectedPath = activeFilePath || "src/App.tsx";
      if (codeSnippet.startsWith("<!DOCTYPE") || codeSnippet.includes("<html")) {
        detectedPath = "index.html";
      } else if (idx > 0) {
        detectedPath = `src/components/Component${idx + 1}.tsx`;
      }
      return {
        path: detectedPath,
        action: "modify",
        content: codeSnippet,
        reason: "Extracted code from AI response",
      };
    });

    return {
      success: true,
      plan: {
        taskSummary: task,
        steps: ["Updated project source files"],
        targetFiles: fileChanges.map((f) => f.path),
      },
      fileChanges,
      explanation: "Successfully applied requested code modifications.",
      summary: "App code updated.",
    };
  }

  // 7. Check if rawText is raw source code (e.g. starts with import or <!DOCTYPE or function)
  if (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("export ") ||
    trimmed.startsWith("function ") ||
    trimmed.startsWith("const ") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html")
  ) {
    const targetPath = (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html"))
      ? "index.html"
      : (activeFilePath || "src/App.tsx");

    return {
      success: true,
      plan: {
        taskSummary: task,
        steps: ["Updated application component"],
        targetFiles: [targetPath],
      },
      fileChanges: [
        {
          path: targetPath,
          action: "modify",
          content: trimmed,
          reason: "Direct source update",
        },
      ],
      explanation: "Updated code directly.",
      summary: "App code updated.",
    };
  }

  console.warn(`[CodeAgent] All parsing fallbacks exhausted for model ${modelName}. Raw text sample:`, rawText.slice(0, 300));
  return null;
}

export default async function codeAgentHandler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      task,
      intent = "edit", // "chat" | "plan" | "edit" | "explain" | "fix_bug" | "refactor" | "test" | "review_security"
      files = [],
      fileTree = [],
      activeFilePath = "",
      runtimeErrors = [],
      framework = "react",
      selectedCode = "",
      history = [],
      selectedModel = "",
      attachments = [],
    } = req.body || {};

    let candidateModels = [...CANDIDATE_MODELS];
    if (selectedModel && typeof selectedModel === "string" && selectedModel.trim() !== "") {
      const cleanM = selectedModel.trim();
      candidateModels = [cleanM, ...candidateModels.filter(m => m !== cleanM)];
    }

    if (!task || typeof task !== "string" || task.trim() === "") {
      return res.status(400).json({ error: "Task or prompt description is required." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "AI engine is not configured (missing GEMINI_API_KEY).",
      });
    }

    // Prepare bounded file context (cap content at ~12k tokens total to prevent context window overflow)
    const formattedFiles = (files as FileContextInput[])
      .map((f) => {
        const truncated = f.content.length > 25000 ? f.content.slice(0, 25000) + "\n...[truncated for token efficiency]" : f.content;
        return `### FILE: ${f.path}\n\`\`\`${f.path.split('.').pop() || 'text'}\n${truncated}\n\`\`\``;
      })
      .join("\n\n");

    const formattedTree = (fileTree as string[]).slice(0, 80).join("\n- ");
    const formattedErrors = (runtimeErrors as string[]).join("\n");
    const formattedHistory = Array.isArray(history) && history.length > 0
      ? history.slice(-6).map((h: any) => `[${h.role === 'user' ? 'USER REQUEST' : 'AGENT ACTION'}]: ${h.text || h.summary || ''}`).join("\n")
      : "";

    const attachedMediaDescriptions = Array.isArray(attachments) && attachments.length > 0
      ? `\n\n[ATTACHED MEDIA ASSETS (${attachments.length} files)]:\n` +
        attachments.map((a: any, idx: number) => `Asset #${idx + 1}: ${a.name} (${a.type}, ${(a.size ? Math.round(a.size / 1024) : '?')} KB)`).join("\n") +
        `\nNOTE: You can visually inspect these images/videos. If the user asks to use or display this photo/logo/media in their code, you can use the provided dataUrl or reference it cleanly.`
      : "";

    const systemPrompt = `You are an expert senior principal software engineer and game architect.
You are tasked with implementing the user's requested changes to the codebase.
The user's framework is ${framework}.

CRITICAL REQUIREMENTS:
1. COMPLETE & WORKING APP/GAME: Always ensure the main application (e.g. 'src/App.tsx' or 'index.html') is 100% complete, fully interactive, bug-free, and renders smoothly without any missing logic. Implement real state, event handlers, animations, sound effects, and responsive Tailwind styling. NEVER leave placeholder comments (e.g., "// TODO", "// existing code...").
2. HIGH QUALITY GAME ARCHITECTURE (FOR ALL GAMES):
   - Smooth Frame Loops & Physics: Use requestAnimationFrame or precise timer loops with delta-time smoothing.
   - Synthesized Web Audio API Sound Effects: Include crisp audio feedback (using browser AudioContext oscillators for jump, laser, pickup, score chime, hit, explosion, game over) with a Mute/Unmute audio button.
   - Game State Machine: Clean states (Title/Start Menu with instructions, Active Playing, Pause overlay, Game Over / Victory screen with high score persistence using localStorage).
   - Rich HUD & Visuals: Score, High Score, Level/Wave, Combo Multiplier, Health/Lives bar, and particle animations (explosions, sparks, coin bursts).
   - Cross-Device Controls: Keyboard (WASD / Arrows / Space) PLUS on-screen touch buttons for mobile devices.
3. ROBUST MODULARITY: Structure code cleanly. If creating subcomponents in 'src/components/...', export each cleanly ('export default function ComponentName') and import them in 'src/App.tsx'.
4. RELIABLE LIBRARIES: Use standard React hooks (useState, useEffect, useRef, useMemo), Tailwind CSS classes, Lucide icons ('import { ... } from "lucide-react"'), and Canvas 2D/3D APIs.
5. MULTIMODAL VISION: When photos, screenshots, UI mockups, or video attachments are provided, examine them carefully and directly reflect them in the code.
6. OUTPUT FORMAT: Respond ONLY with a valid JSON object. No other text.

JSON FORMAT:
{
  "success": true,
  "plan": {
    "taskSummary": "Short summary",
    "steps": ["Step 1", "Step 2"],
    "targetFiles": ["file1.tsx", "file2.tsx"]
  },
  "fileChanges": [
    {
      "path": "src/components/Example.tsx",
      "action": "create",
      "content": "Full complete code here",
      "reason": "Created new component"
    },
    {
      "path": "src/App.tsx",
      "action": "modify",
      "content": "Full complete updated code here",
      "reason": "Integrated component"
    }
  ],
  "explanation": "Short technical explanation of changes.",
  "summary": "Concise summary."
}

CONTEXT:
Repository File Tree:
- ${formattedTree || "Empty project"}

[CONVERSATION HISTORY]:
${formattedHistory}

[USER REQUEST]:
${task}${attachedMediaDescriptions}

[ACTIVE FILE]:
${activeFilePath}

[CURRENT RUNTIME ERRORS]:
${formattedErrors}

[SELECTED CODE]:
${selectedCode}

[FILE CONTENTS]:
${formattedFiles}`;

    // Build multimodal content parts for Gemini
    const contentParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att && att.base64 && att.type) {
          const rawBase64 = att.base64.replace(/^data:[^;]+;base64,/, "");
          contentParts.push({
            inlineData: {
              mimeType: att.type,
              data: rawBase64,
            },
          });
        }
      }
    }
    contentParts.push({ text: systemPrompt });

    let agentResponse: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: contentParts,
          config: {
            temperature: 0.15,
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text || "";
        if (rawText) {
          agentResponse = robustParseAgentJson(rawText, task, activeFilePath, model);
          if (agentResponse && (agentResponse.fileChanges || agentResponse.explanation || agentResponse.plan)) {
            break;
          }
        }
      } catch (err: any) {
        const isQuotaLimit = err?.status === 429 ||
          (typeof err?.message === 'string' && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')));
        if (isQuotaLimit) {
          console.log(`[Info] Coding agent candidate [${model}] reached rate limit (429), switching to next model...`);
        } else {
          console.log(`[Info] Coding agent candidate [${model}] notice: ${err?.message || 'candidate unavailable'}`);
        }
        lastError = err;
        continue;
      }
    }

    if (!agentResponse && process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are an expert AI software engineer. Respond ONLY with valid JSON." },
            { role: "user", content: systemPrompt }
          ],
          temperature: 0.15,
          response_format: { type: "json_object" }
        });
        const groqText = completion.choices[0]?.message?.content || "";
        if (groqText) {
          agentResponse = robustParseAgentJson(groqText, task, activeFilePath, "groq/llama-3.3-70b");
        }
      } catch (groqErr) {
        console.warn("Groq code agent fallback error:", groqErr);
      }
    }

    if (!agentResponse) {
      throw lastError || new Error("Failed to receive structured coding agent response.");
    }

    // Normalize paths in fileChanges on the server
    if (Array.isArray(agentResponse.fileChanges)) {
      const treeList = (fileTree as string[]) || [];
      agentResponse.fileChanges = agentResponse.fileChanges.map((change: any) => {
        let cleanPath = (change.path || "").trim().replace(/^(\.\/|\/)/, "");
        // Match with tree list if possible
        const base = cleanPath.split("/").pop();
        const treeMatch = treeList.find((t) => t === cleanPath || t.endsWith("/" + base) || t === base);
        if (treeMatch) {
          cleanPath = treeMatch;
        }
        return {
          ...change,
          path: cleanPath,
        };
      });
    }

    return res.status(200).json(agentResponse);
  } catch (error: any) {
    console.error("Code Agent API error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to process coding agent request.",
    });
  }
}
