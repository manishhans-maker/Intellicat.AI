import { GoogleGenAI } from "@google/genai";

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
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-flash-latest",
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

    const systemPrompt = `You are the IntelicatAI Cyber Cat Principal Software Engineer & Autonomous Coding Agent.
You are tasked with analyzing a software project and implementing the user's requested changes with world-class production quality.

Project Framework: ${framework}
Active File: ${activeFilePath || "None"}
Repository File Tree:
- ${formattedTree || "Empty project"}

${formattedHistory ? `[CONVERSATION HISTORY]:\n${formattedHistory}\n` : ""}
${formattedErrors ? `[CURRENT RUNTIME / BUILD ERRORS TO INVESTIGATE]:\n${formattedErrors}\n` : ""}
${selectedCode ? `[USER SELECTED CODE SNIPPET IN ACTIVE FILE]:\n${selectedCode}\n` : ""}

[PROJECT FILES CONTEXT]:
${formattedFiles || "No files provided. Infer or create necessary files."}

TASK INSTRUCTIONS (MULTI-FILE ARCHITECTURE LIKE AI STUDIO):
1. Carefully inspect the user's request: "${task}".
2. Follow intent: "${intent}".
3. Formulate an actionable Implementation Plan (2-4 clear steps).
4. MULTI-FILE CODE GENERATION (CRITICAL): Do NOT cram everything into a single file. Just like AI Studio or professional IDEs, structure the app across multiple modular files when appropriate!
   - Create separate components in 'src/components/...' (e.g., 'src/components/Header.tsx', 'src/components/Dashboard.tsx', 'src/components/FeatureCard.tsx', etc.).
   - Create utility helpers in 'src/utils/...' or types in 'src/types/...'.
   - Update 'src/App.tsx' to import and orchestrate these modular components.
5. PATH ACCURACY (CRITICAL): The "path" in "fileChanges" MUST match the exact relative path or new path (e.g. use 'src/components/Header.tsx', 'src/App.tsx', etc.).
6. FULL CODE REQUIREMENT: In "fileChanges", ALWAYS provide the FULL, complete source code in "content". NEVER output snippets, placeholders like '// existing code...', or truncated sections. The code must be 100% runnable and compile cleanly.
7. Code Quality: Modern React 19 functional components, TypeScript types, Lucide icons, responsive Tailwind CSS classes, and clean error handling.

OUTPUT FORMAT:
Respond strictly with valid JSON with NO surrounding conversational markdown outside of the JSON block:
{
  "success": true,
  "plan": {
    "taskSummary": "Short 1-sentence summary of the task",
    "steps": ["Step 1...", "Step 2...", "Step 3..."],
    "targetFiles": ["src/App.tsx", "src/components/Header.tsx"]
  },
  "fileChanges": [
    {
      "path": "src/components/Header.tsx",
      "action": "create",
      "content": "Full complete code content for new component",
      "reason": "Created modular header component"
    },
    {
      "path": "src/App.tsx",
      "action": "modify",
      "content": "Full complete code content for App.tsx importing Header",
      "reason": "Integrated modular components"
    }
  ],
  "explanation": "Markdown explanation of the architecture, key decisions, and how to verify the changes",
  "checks": [
    { "passed": true, "message": "Verification or static assertion notice" }
  ],
  "summary": "Concise summary of changes made, tests, and next steps"
}`;

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
        console.warn(`Coding agent candidate [${model}] error:`, err?.message || err);
        lastError = err;
        continue;
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
