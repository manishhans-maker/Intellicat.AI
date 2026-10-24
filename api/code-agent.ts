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
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

interface FileContextInput {
  path: string;
  content: string;
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

    const systemPrompt = `You are a professional software engineer.
You are tasked with implementing the user's requested changes to the codebase.
The user's framework is ${framework}.

CRITICAL REQUIREMENTS:
1. MULTI-FILE ARCHITECTURE: Structure the application across multiple files. Do not put everything in one file. Use 'src/components/...' for components, 'src/utils/...' for utilities, 'src/types/...' for types, etc.
2. FULL CODE: In "fileChanges", you MUST provide the FULL, complete source code for every file you create or modify. Do not use placeholders (e.g., "// existing code...").
3. OUTPUT FORMAT: Respond ONLY with a valid JSON object. No other text.

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
${task}

[ACTIVE FILE]:
${activeFilePath}

[CURRENT RUNTIME ERRORS]:
${formattedErrors}

[SELECTED CODE]:
${selectedCode}

[FILE CONTENTS]:
${formattedFiles}`;

    let agentResponse: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: systemPrompt,
          config: {
            temperature: 0.15,
          },
        });

        const rawText = response.text || "";
        if (rawText) {
          // Robust JSON extraction: look for the first '{' and last '}'
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          const cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/```json\n?|\n?```/g, "").trim();
          
          try {
            agentResponse = JSON.parse(cleaned);
          } catch (jsonErr) {
            console.error(`JSON Parse failed for model ${model}. Raw text:\n${rawText.slice(0, 500)}...`);
            try {
              const fixed = cleaned + (cleaned.endsWith("}") ? "" : "}");
              agentResponse = JSON.parse(fixed);
            } catch (e2) {
              const codeMatch = rawText.match(/```(?:tsx|jsx|ts|js|html)?\n([\s\S]*?)```/);
              if (codeMatch) {
                agentResponse = {
                  success: true,
                  plan: { taskSummary: task, steps: ["Implemented requested changes"], targetFiles: ["src/App.tsx"] },
                  fileChanges: [
                    {
                      path: "src/App.tsx",
                      action: "modify",
                      content: codeMatch[1],
                      reason: "User requested updates",
                    },
                  ],
                  explanation: "Successfully updated your app.",
                };
              } else {
                throw jsonErr;
              }
            }
          }
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
          agentResponse = JSON.parse(groqText);
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
