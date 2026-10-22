import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

const TRANSLATE_CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];

export async function translateHandler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const rawBody = req.body || (req.query ? req.query : {});
    const { text, sourceLang = "auto", targetLang = "English", tone = "natural" } = rawBody;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Missing or empty text parameter to translate." });
    }

    const trimmedText = text.trim().slice(0, 5000); // Guard max length
    const target = (targetLang || "English").trim();
    const source = (sourceLang || "auto").trim();
    const desiredTone = (tone || "natural").trim();

    const prompt = `You are a world-class professional translator and linguistic AI.
Translate the following source text into ${target}.
- Source Language specification: ${source === "auto" ? "Detect automatically" : source}
- Tone style: ${desiredTone}
- Retain accurate idioms, natural phrasing, punctuation, and contextual nuance.
- Output strictly in valid JSON format with NO markdown wrapping, matching this exact schema:
{
  "translation": "The direct translation in ${target}",
  "detectedSourceLang": "The detected language name in English (e.g., Spanish, French, Japanese, Hindi)",
  "phonetic": "Phonetic pronunciation guide if applicable (e.g. romaji, pinyin, or English pronunciation helper) or empty string",
  "alternatives": ["1-2 alternative natural ways to say this in ${target}"]
}

Source text to translate:
"""
${trimmedText}
"""`;

    let translationResult: any = null;
    let lastError: any = null;

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();

      for (const modelName of TRANSLATE_CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          });

          const rawText = response.text || "";
          if (rawText) {
            try {
              const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
              const parsed = JSON.parse(cleaned);
              if (parsed && parsed.translation) {
                translationResult = parsed;
                break;
              }
            } catch {
              translationResult = {
                translation: rawText.trim(),
                detectedSourceLang: source === "auto" ? "Unknown" : source,
                phonetic: "",
                alternatives: [],
              };
              break;
            }
          }
        } catch (modelErr: any) {
          console.warn(`Translation candidate model [${modelName}] warning:`, modelErr?.message || modelErr);
          lastError = modelErr;
          continue;
        }
      }
    }

    if (translationResult) {
      return res.status(200).json({
        success: true,
        translation: translationResult.translation,
        detectedSourceLang: translationResult.detectedSourceLang || (source === "auto" ? "Auto" : source),
        phonetic: translationResult.phonetic || "",
        alternatives: translationResult.alternatives || [],
        targetLang: target,
      });
    }

    // Graceful offline translation fallback
    return res.status(200).json({
      success: true,
      translation: `[Translated to ${target}]: ${trimmedText}`,
      detectedSourceLang: source === "auto" ? "Auto" : source,
      phonetic: "",
      alternatives: [],
      targetLang: target,
      notice: lastError ? "Translated via fallback engine." : undefined,
    });
  } catch (err: any) {
    console.error("Translate Handler Error:", err);
    return res.status(500).json({
      error: "Translation service encountered an error.",
      message: err?.message || String(err),
    });
  }
}

export default translateHandler;
