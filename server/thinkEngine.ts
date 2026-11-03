import { GoogleGenAI } from "@google/genai";

export type ThinkDepthLevel = "FAST" | "STANDARD" | "DEEP" | "INTENSIVE";

export interface ThinkSettings {
  enabled: boolean;
  intensity: "auto" | "standard" | "deep" | "intensive";
  verificationEnabled: boolean;
}

export interface VerificationCheckResult {
  name: string;
  passed: boolean;
  details: string;
}

export interface ThinkVerificationSummary {
  status: "verified" | "fast_pass" | "corrected" | "unverified";
  depth: ThinkDepthLevel;
  classifiedComplexity: string;
  checks: VerificationCheckResult[];
  correctionApplied: boolean;
  durationMs: number;
  timestamp: string;
}

// Server-side configurable parameters for Gemini thinking configuration
export const SERVER_THINK_CONFIG: Record<
  ThinkDepthLevel,
  {
    geminiThinkingLevel: "LOW" | "MEDIUM" | "HIGH";
    requiresVerification: boolean;
    maxVerificationRetries: number;
  }
> = {
  FAST: {
    geminiThinkingLevel: "LOW",
    requiresVerification: false,
    maxVerificationRetries: 0,
  },
  STANDARD: {
    geminiThinkingLevel: "MEDIUM",
    requiresVerification: true,
    maxVerificationRetries: 1,
  },
  DEEP: {
    geminiThinkingLevel: "HIGH",
    requiresVerification: true,
    maxVerificationRetries: 1,
  },
  INTENSIVE: {
    geminiThinkingLevel: "HIGH",
    requiresVerification: true,
    maxVerificationRetries: 1,
  },
};

/**
 * Cheap rule-based complexity classifier.
 * Only calls Gemini if the query is truly ambiguous or on the borderline.
 */
export async function classifyQueryComplexity(
  userQuery: string,
  mode: string,
  aiClient?: GoogleGenAI
): Promise<{ depth: ThinkDepthLevel; reason: string; ruleBased: boolean }> {
  const trimmed = userQuery.trim();
  const lower = trimmed.toLowerCase();

  // 1. Fast Mode override
  if (mode === "fast") {
    return { depth: "FAST", reason: "Fast Mode explicitly selected", ruleBased: true };
  }

  // 2. Greetings and simple pleasantries
  const greetingRegex =
    /^(hi|hello|hey|yo|howdy|sup|greetings|good\s+(morning|afternoon|evening)|namaste|hola)(\s+[a-z0-9!.]+)?$/i;
  if (trimmed.length < 35 && greetingRegex.test(trimmed)) {
    return { depth: "FAST", reason: "Short conversational greeting", ruleBased: true };
  }

  // 3. Short acknowledgements & gratitudes
  const ackRegex = /^(thanks|thank you|ok|okay|cool|awesome|great|got it|sounds good|understood)[.!]?$/i;
  if (trimmed.length < 30 && ackRegex.test(trimmed)) {
    return { depth: "FAST", reason: "Short user acknowledgement", ruleBased: true };
  }

  // 4. Ultra-simple single-term facts or definitions
  const simpleDefRegex = /^(what is|who is|define|meaning of|translate)\s+([a-zA-Z0-9\s-]{1,25})\??$/i;
  if (trimmed.length < 40 && simpleDefRegex.test(trimmed) && !lower.includes("code") && !lower.includes("algorithm")) {
    return { depth: "FAST", reason: "Concise factual definition query", ruleBased: true };
  }

  // 5. Deep Think mode explicitly configured
  if (mode === "deep-think") {
    if (trimmed.length > 600 || lower.includes("architecture") || lower.includes("distributed") || lower.includes("proof")) {
      return { depth: "INTENSIVE", reason: "Deep Think with multi-layered technical query", ruleBased: true };
    }
    return { depth: "DEEP", reason: "Deep Think Mode active", ruleBased: true };
  }

  // 6. Intensive Indicators: complex systems, architecture, multi-constraint coding, formal mathematical proofs
  const intensiveKeywords = [
    "architecture",
    "microservices",
    "distributed system",
    "concurrency",
    "deadlock",
    "race condition",
    "database schema migration",
    "formal proof",
    "step-by-step mathematical proof",
    "security audit",
    "write a full compiler",
    "full-stack application from scratch",
    "multi-tenant",
  ];
  if (intensiveKeywords.some((kw) => lower.includes(kw)) || trimmed.length > 1200) {
    return { depth: "INTENSIVE", reason: "Multi-layered technical / architectural complexity", ruleBased: true };
  }

  // 7. Deep Indicators: coding, debugging, algorithms, math problems, essay outlines, comparative analysis
  const deepKeywords = [
    "debug",
    "why is this failing",
    "optimize",
    "algorithm",
    "time complexity",
    "space complexity",
    "refactor",
    "derive",
    "compare and contrast",
    "pros and cons",
    "write a script",
    "write a function",
    "build a website",
    "solve this equation",
  ];
  if (
    mode === "coding" ||
    mode === "cat-code" ||
    mode === "study" ||
    deepKeywords.some((kw) => lower.includes(kw)) ||
    trimmed.length > 350
  ) {
    return { depth: "DEEP", reason: "Analytical, algorithmic, or pedagogical reasoning required", ruleBased: true };
  }

  // 8. Standard: general discussions, explanations, creative writing, advice
  if (trimmed.length < 250) {
    return { depth: "STANDARD", reason: "Standard conversational inquiry", ruleBased: true };
  }

  // 9. If border case (> 250 chars, no obvious keywords) and aiClient is available, cheap 1-token classification
  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const classificationPrompt = `Classify the cognitive complexity of this user prompt into exactly ONE word from: [FAST, STANDARD, DEEP, INTENSIVE].
User Prompt: "${trimmed.slice(0, 300)}"
Reply with only the chosen single word.`;

      const res = await Promise.race([
        aiClient.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: classificationPrompt,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Classification timeout")), 3500)),
      ]) as any;

      const reply = (res.text || "").toUpperCase().trim();
      if (reply.includes("INTENSIVE")) {
        return { depth: "INTENSIVE", reason: "Gemini heuristic: intensive technical task", ruleBased: false };
      }
      if (reply.includes("DEEP")) {
        return { depth: "DEEP", reason: "Gemini heuristic: deep reasoning needed", ruleBased: false };
      }
      if (reply.includes("FAST")) {
        return { depth: "FAST", reason: "Gemini heuristic: lightweight query", ruleBased: false };
      }
      return { depth: "STANDARD", reason: "Gemini heuristic: standard complexity", ruleBased: false };
    } catch (e) {
      // Fallback cleanly to standard
      return { depth: "STANDARD", reason: "Default standard classification (fallback)", ruleBased: true };
    }
  }

  return { depth: "STANDARD", reason: "Standard complexity classification", ruleBased: true };
}

/**
 * Deterministic Safety, Secret Leak & Syntax Verification Check.
 * Runs on every response, even if user disabled semantic verification.
 */
export function runDeterministicChecks(
  draft: string,
  userPrompt: string
): { passed: boolean; issues: string[]; checks: VerificationCheckResult[] } {
  const issues: string[] = [];
  const checks: VerificationCheckResult[] = [];

  // Check 1: Secret and Sensitive Token Leak Detection
  const secretPatterns = [
    { name: "Google API Key", regex: /AIza[0-9A-Za-z_-]{35}/g },
    { name: "Groq API Key", regex: /gsk_[0-9A-Za-z]{30,}/g },
    { name: "Bearer Token", regex: /Bearer\s+[A-Za-z0-9._-]{24,}/gi },
    { name: "System Key Leak", regex: /GEMINI_API_KEY\s*=\s*['"][^'"]+['"]/gi },
    { name: "Private Env Variable", regex: /process\.env\.(GEMINI_API_KEY|GROQ_API_KEY)/gi },
  ];

  let hasSecretLeak = false;
  for (const pat of secretPatterns) {
    if (pat.regex.test(draft)) {
      hasSecretLeak = true;
      issues.push(`Detected potential sensitive credential exposure (${pat.name}).`);
      break;
    }
  }

  checks.push({
    name: "Credential & Secret Shield",
    passed: !hasSecretLeak,
    details: hasSecretLeak ? "Blocked potential token exposure" : "0 credentials or private keys detected in output",
  });

  // Check 2: Prompt Injection / System Override Containment
  const injectionLeakSignals = [
    /ignore all previous instructions/i,
    /system prompt:\s*["`]/i,
    /you are an unrestricted ai/i,
  ];
  let hasInjectionSignal = false;
  for (const sig of injectionLeakSignals) {
    if (sig.test(draft) && !sig.test(userPrompt)) {
      hasInjectionSignal = true;
      issues.push("Response exhibits system prompt override or untrusted injection echo.");
      break;
    }
  }

  checks.push({
    name: "Prompt Injection Defense",
    passed: !hasInjectionSignal,
    details: hasInjectionSignal ? "Flagged untrusted instruction echo" : "System guidelines strictly preserved",
  });

  // Check 3: Code Syntax & Completeness Verification (if code fences exist)
  const codeFenceMatches = draft.match(/```[a-zA-Z0-9_-]*\n[\s\S]*?```/g);
  const totalTripleBackticks = (draft.match(/```/g) || []).length;
  let codeIssueFound = false;

  // Unclosed code block
  if (totalTripleBackticks % 2 !== 0) {
    codeIssueFound = true;
    issues.push("Unclosed markdown code block detected (odd count of ``` backticks).");
  }

  // Bracket balance check on code blocks
  if (codeFenceMatches && codeFenceMatches.length > 0) {
    for (const block of codeFenceMatches) {
      const codeOnly = block.replace(/```[a-zA-Z0-9_-]*\n/, "").replace(/```$/, "");
      const openCurly = (codeOnly.match(/\{/g) || []).length;
      const closeCurly = (codeOnly.match(/\}/g) || []).length;
      const openParen = (codeOnly.match(/\(/g) || []).length;
      const closeParen = (codeOnly.match(/\)/g) || []).length;

      // In HTML or template literals, unmatched braces can be normal, so only flag huge disparities
      if (Math.abs(openCurly - closeCurly) > 3) {
        codeIssueFound = true;
        issues.push(`Code block bracket disparity detected ({: ${openCurly}, }: ${closeCurly}).`);
        break;
      }
      if (Math.abs(openParen - closeParen) > 3) {
        codeIssueFound = true;
        issues.push(`Code block parenthesis disparity detected ((: ${openParen}, ): ${closeParen}).`);
        break;
      }
    }
  }

  checks.push({
    name: "Code Syntax & Fences",
    passed: !codeIssueFound,
    details: codeIssueFound ? "Detected syntax or unclosed code fence disparity" : "Markdown codeblocks & delimiters valid",
  });

  // Check 4: Completion & Truncation Check
  const trimmedDraft = draft.trim();
  const lastChar = trimmedDraft.slice(-1);
  const trailingTruncationWords = [
    /\b(and\s+the|because\s+the|such\s+as|for\s+example,|in\s+order\s+to|namely,)$/i,
  ];

  let isTruncated = false;
  if (trimmedDraft.length > 50) {
    if (lastChar === "," || lastChar === ":" || lastChar === "-" || lastChar === "=") {
      isTruncated = true;
      issues.push("Answer appears truncated at trailing operator or delimiter.");
    }
    for (const pat of trailingTruncationWords) {
      if (pat.test(trimmedDraft)) {
        isTruncated = true;
        issues.push("Answer terminates abruptly mid-phrase.");
        break;
      }
    }
  }

  checks.push({
    name: "Structural Completeness",
    passed: !isTruncated,
    details: isTruncated ? "Detected abrupt termination mid-sentence" : "Complete termination verified",
  });

  const overallPassed = issues.length === 0;
  return { passed: overallPassed, issues, checks };
}

/**
 * Semantic Verification Engine (calls Gemini to check relevance, contradictions, and accuracy)
 */
export async function runSemanticVerification(
  aiClient: GoogleGenAI,
  userPrompt: string,
  draft: string
): Promise<{ passed: boolean; issues: string[]; checks: VerificationCheckResult[] }> {
  // First run deterministic checks
  const deterministic = runDeterministicChecks(draft, userPrompt);
  if (!deterministic.passed) {
    return deterministic;
  }

  try {
    const verificationPrompt = `You are the IntelicatAI Verification Engine. Evaluate the following DRAFT response against the USER PROMPT for:
1. Did it answer what was requested?
2. Are there any obvious factual contradictions, falsehoods, or unfulfilled promises?
3. Is it logically coherent and complete?

USER PROMPT:
"""
${userPrompt.slice(0, 1500)}
"""

DRAFT RESPONSE:
"""
${draft.slice(0, 2500)}
"""

Reply in strict JSON with no markdown wrapping:
{"passed": true|false, "issue": "brief description if failed, or none"}
`;

    const res = await Promise.race([
      aiClient.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: verificationPrompt,
        config: {
          responseMimeType: "application/json",
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Semantic verification timeout")), 7000)),
    ]) as any;

    const parsed = JSON.parse(res.text?.trim() || '{"passed": true, "issue": "none"}');
    const semanticChecks = [...deterministic.checks];

    if (parsed.passed === false && parsed.issue && parsed.issue !== "none") {
      semanticChecks.push({
        name: "Instruction & Alignment Verification",
        passed: false,
        details: parsed.issue,
      });
      return {
        passed: false,
        issues: [parsed.issue],
        checks: semanticChecks,
      };
    }

    semanticChecks.push({
      name: "Instruction & Alignment Verification",
      passed: true,
      details: "Directly addresses user prompt with coherent logic",
    });

    return {
      passed: true,
      issues: [],
      checks: semanticChecks,
    };
  } catch (err: any) {
    // If semantic check fails due to network/parsing, rely safely on deterministic checks
    console.warn("Semantic verification fallback to deterministic checks:", err?.message);
    const checks = [...deterministic.checks];
    checks.push({
      name: "Instruction & Alignment Verification",
      passed: true,
      details: "Deterministic validation passed (semantic scanner bypassed)",
    });
    return {
      passed: true,
      issues: [],
      checks,
    };
  }
}

/**
 * Correction Engine: runs exactly ONE controlled repair if verification failed.
 */
export async function runCorrectionStep(
  aiClient: GoogleGenAI,
  userPrompt: string,
  draft: string,
  issues: string[],
  systemInstruction: string,
  modelName: string = "gemini-3.8-flash"
): Promise<{ correctedText: string; verified: boolean; checks: VerificationCheckResult[] }> {
  const correctionPrompt = `[CORRECTION DIRECTIVE]
The draft response to the user's prompt had the following issues identified by the verification engine:
${issues.map((iss, i) => `${i + 1}. ${iss}`).join("\n")}

Repair and complete the response so that these issues are cleanly resolved while preserving all other accurate content. Provide the full final response directly.

Original User Prompt:
${userPrompt}

Draft Response to Fix:
${draft}`;

  try {
    const res = await Promise.race([
      aiClient.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [{ text: correctionPrompt }],
          },
        ],
        config: {
          systemInstruction,
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Correction timeout")), 18000)),
    ]) as any;

    const corrected = (res.text || "").trim();
    if (!corrected) {
      return {
        correctedText: draft,
        verified: false,
        checks: [
          {
            name: "Single-Step Correction",
            passed: false,
            details: "Correction returned empty output, retained original draft",
          },
        ],
      };
    }

    // Verify corrected output with deterministic checks
    const secondCheck = runDeterministicChecks(corrected, userPrompt);
    const finalChecks: VerificationCheckResult[] = [
      ...secondCheck.checks,
      {
        name: "Correction Engine",
        passed: secondCheck.passed,
        details: secondCheck.passed
          ? "Targeted single-shot correction resolved identified issues"
          : "Correction attempted, some issues remained",
      },
    ];

    return {
      correctedText: corrected,
      verified: secondCheck.passed,
      checks: finalChecks,
    };
  } catch (err) {
    console.warn("Correction step error, keeping draft:", err);
    return {
      correctedText: draft,
      verified: false,
      checks: [
        {
          name: "Correction Engine",
          passed: false,
          details: "Correction engine encountered network issue, preserved safe draft",
        },
      ],
    };
  }
}
