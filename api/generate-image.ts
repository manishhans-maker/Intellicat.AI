import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("Failed to initialize Gemini client for prompt optimization:", e);
    }
  }
  return geminiClient;
}

// Track last generation timestamp per client IP (3 second anti-spam cooldown instead of 45s lockout)
const ipCooldownMap = new Map<string, number>();
const COOLDOWN_MS = 2500; // 2.5 seconds

/**
 * Intelligent rule-based prompt cleaner & anatomical enhancer (instant fallback)
 */
function heuristicPromptEnhancer(rawPrompt: string, style: string): string {
  let cleaned = rawPrompt.trim();

  // Strip conversational prefixes with generous typo tolerance
  cleaned = cleaned.replace(/^(can\s+you\s+)?(please\s+)?(make|create|generate|genrate|render|draw|paint|show|give)(\s+me)?(\s+an?|\s+the)?(\s+image|\s+picture|\s+photo|\s+illustration|\s+drawing|\s+art|\s+wallpaper)?(\s+of|\s+with|\s+about)?\s+/i, '');
  cleaned = cleaned.replace(/^(i\s+want\s+(an?|the)?\s*(image|picture|photo)?\s*(of)?\s*)/i, '');
  cleaned = cleaned.replace(/^(a\s+photo\s+of|a\s+picture\s+of|an\s+image\s+of)\s+/i, '');
  cleaned = cleaned.trim() || rawPrompt.trim();

  // Fix common slang / typos
  cleaned = cleaned.replace(/\blambo\b/gi, 'Lamborghini supercar');
  cleaned = cleaned.replace(/\bferari\b/gi, 'Ferrari');
  cleaned = cleaned.replace(/\bporshe\b/gi, 'Porsche');

  const lower = cleaned.toLowerCase();
  const isVehicle = /\b(car|lambo|lamborghini|ferrari|porsche|bugatti|bmw|audi|supercar|vehicle|truck|motorcycle|hypercar)\b/.test(lower);
  const isFeline = /\b(cat|kitten|kitty|feline|cheetah|leopard|tiger|lion)\b/.test(lower);
  const isCanine = /\b(dog|puppy|canine|wolf|hound)\b/.test(lower);
  const isHuman = /\b(man|woman|person|girl|boy|warrior|character|model|cyberpunk girl|robot person)\b/.test(lower);

  let anatomicalSafety = '';

  if (isVehicle) {
    anatomicalSafety = 'complete intact vehicle, all four alloy wheels perfectly circular and symmetrical in accurate ground perspective, realistic tire tread firmly on pavement, sharp aerodynamic body panels, no missing wheels, no three wheels, no warped chassis';
  } else if (isFeline) {
    anatomicalSafety = 'anatomically correct feline, exactly one natural fluffy tail, four symmetrical paws, clean facial symmetry, crisp whiskers, lifelike fur texture, no duplicate tails, no extra limbs, natural cat anatomy';
  } else if (isCanine) {
    anatomicalSafety = 'anatomically correct canine, exactly one natural tail, four symmetrical paws, clean facial symmetry, lifelike fur, no extra limbs';
  } else if (isHuman) {
    anatomicalSafety = 'anatomically correct hands with exactly five distinct fingers, symmetrical facial features, realistic human proportions';
  }

  // Style embellishments
  let styleSuffix = '';
  switch (style) {
    case 'realistic':
      styleSuffix = 'photorealistic, 8k resolution, cinematic lighting, shot on 35mm lens, f/1.8, ultra sharp focus, award-winning photography';
      break;
    case 'cyberpunk':
      styleSuffix = 'sleek cybernetic futuristic aesthetic, neon red and dark carbon accents, holographic glow, 8k resolution, cinematic reflections, sharp focus';
      break;
    case 'anime':
      styleSuffix = 'masterpiece anime illustration, vibrant dynamic lines, Makoto Shinkai studio aesthetic, crisp detailing, gorgeous lighting';
      break;
    case '3d-render':
      styleSuffix = 'Pixar Disney 3D render style, Octane render, ray-traced ambient occlusion, glossy surfaces, cute highly detailed 3D modeling';
      break;
    case 'watercolor':
      styleSuffix = 'artistic watercolor painting, expressive pigments, delicate paper grain texture, soft fluid color bleeding, artistic masterpiece';
      break;
    default:
      styleSuffix = 'high resolution, 8k, sharp focus, beautiful lighting';
  }

  return [cleaned, anatomicalSafety, styleSuffix].filter(Boolean).join(', ');
}

/**
 * AI-Powered Prompt Expander via Gemini (Enforces Midjourney/Flux quality & anatomical perfection)
 */
async function optimizePromptWithAI(userPrompt: string, style: string): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    return heuristicPromptEnhancer(userPrompt, style);
  }

  const systemInstruction = `You are an elite AI Image Generation Prompt Engineer (master of Flux.1, Midjourney v6, SDXL).
Transform the user's raw image request into an anatomically and physically flawless, ultra-detailed image prompt.
MANDATORY PHYSICAL & ANATOMICAL RULES:
1. Fix all typos, slang, and misspellings (e.g. "genrate" -> "generate", "lambo" -> "Lamborghini supercar", "ferari" -> "Ferrari").
2. Strip conversational filler ("make me", "generate", "draw me", "give me a picture of").
3. ENFORCE ANATOMICAL & STRUCTURAL INTEGRITY:
   - For CARS/VEHICLES: Explicitly specify "complete pristine vehicle, all four alloy wheels perfectly circular and symmetrical in accurate ground perspective, realistic tire tread firmly planted on asphalt, complete chassis with crisp windshield and aerodynamic curves, no missing wheels, no three wheels, no warped geometry".
   - For ANIMALS (cats, dogs, etc.): Explicitly specify "anatomically accurate, exactly one natural tail, four symmetrical paws, clean facial symmetry, crisp whiskers, lifelike fur texture, no duplicate tails, no extra limbs".
   - For HUMANS/CHARACTERS: Explicitly specify "anatomically accurate hands with five distinct fingers, symmetrical facial features, realistic proportions".
4. Tailor to style: ${style}.
5. Add professional composition, camera angle, and cinematic studio lighting.
6. Output ONLY the optimized prompt text. Do NOT wrap in quotes. Do NOT add preamble or explanations.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `${systemInstruction}\n\nUser Request: "${userPrompt.slice(0, 500)}"`,
      config: {
        temperature: 0.2,
      },
    });

    const optimized = response.text?.trim();
    if (optimized && optimized.length > 15) {
      return optimized.replace(/^["']|["']$/g, '');
    }
  } catch (err) {
    console.warn("AI prompt optimization fallback:", err);
  }

  return heuristicPromptEnhancer(userPrompt, style);
}

export default async function generateImageHandler(req: any, res: any) {
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

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use POST or GET." });
  }

  try {
    const rawData = req.method === "POST" ? req.body : req.query;
    const { prompt, aspectRatio = "1:1", style = "realistic", engine = "flux" } = rawData || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "Prompt is required for image generation." });
    }

    // IP-based anti-spam check (2.5 seconds per user rather than global 45s lockout)
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "anonymous_client";

    const now = Date.now();
    const lastTime = ipCooldownMap.get(clientIp) || 0;
    const elapsed = now - lastTime;

    if (elapsed < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSec}s before generating the next image.`,
        remainingSeconds: waitSec,
        isCooldown: true,
      });
    }

    // AI-Powered anatomical & structural prompt optimization
    const enhancedPrompt = await optimizePromptWithAI(prompt, style);

    // Map aspect ratios to pixel dimensions
    let width = 1024;
    let height = 1024;

    switch (aspectRatio) {
      case "16:9":
        width = 1280;
        height = 720;
        break;
      case "9:16":
        width = 720;
        height = 1280;
        break;
      case "4:3":
        width = 1024;
        height = 768;
        break;
      case "3:4":
        width = 768;
        height = 1024;
        break;
      default:
        width = 1024;
        height = 1024;
    }

    // Model selection: flux or turbo
    const selectedModel = engine === "turbo" ? "turbo" : "flux";
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${selectedModel}`;

    // Record client IP timestamp
    ipCooldownMap.set(clientIp, Date.now());

    return res.status(200).json({
      imageUrl,
      prompt: prompt.trim(),
      enhancedPrompt,
      aspectRatio,
      style,
      engine: selectedModel,
      provider: "pollinations-flux",
      cooldownSeconds: 2,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate image. Please try again.",
    });
  }
}
