let lastGenerationTimestamp = 0;
const COOLDOWN_MS = 45000;

export default async function imageGenHandler(req: any, res: any) {
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
    const { prompt, aspectRatio = "1:1", style = "cyberpunk" } = rawData || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "Prompt is required for image generation." });
    }

    // Rate-limit check to prevent Pollinations 402/yellow error screen
    const now = Date.now();
    const elapsed = now - lastGenerationTimestamp;
    if (elapsed < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        error: `Free Tier Cooldown: 1 image every 45s. Next generation ready in ${remainingSeconds}s.`,
        remainingSeconds,
        isCooldown: true,
      });
    }

    // Clean conversational prefixes from prompt
    let cleanPrompt = prompt.trim();
    cleanPrompt = cleanPrompt.replace(/^(make\s+(me\s+)?(an?|the)?\s*(image|picture|photo|illustration|drawing)?\s*(of|with)?\s*)/i, '');
    cleanPrompt = cleanPrompt.replace(/^(generate\s+(an?|the)?\s*(image|picture|photo|illustration|drawing)?\s*(of|with)?\s*)/i, '');
    cleanPrompt = cleanPrompt.replace(/^(create\s+(an?|the)?\s*(image|picture|photo|illustration|drawing)?\s*(of|with)?\s*)/i, '');
    cleanPrompt = cleanPrompt.trim() || prompt.trim();

    const trimmedPrompt = cleanPrompt;

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

    // Enhance prompt based on selected aesthetic style
    let enhancedPrompt = trimmedPrompt;
    if (style === "cyberpunk") {
      enhancedPrompt = `${trimmedPrompt}, sleek cybernetic futuristic aesthetic, neon red and dark carbon accents, 8k resolution, cinematic lighting, sharp focus`;
    } else if (style === "anime") {
      enhancedPrompt = `${trimmedPrompt}, anime masterpiece, detailed manga illustration, vibrant, studio quality`;
    } else if (style === "realistic") {
      enhancedPrompt = `${trimmedPrompt}, hyper-realistic photography, 35mm lens, natural lighting, ultra high fidelity`;
    } else if (style === "3d-render") {
      enhancedPrompt = `${trimmedPrompt}, 3D Pixar Disney style render, Octane render, glossy surfaces, ray tracing, cute robot`;
    } else if (style === "watercolor") {
      enhancedPrompt = `${trimmedPrompt}, artistic watercolor painting, soft pigment flow, expressive ink details`;
    }

    // Provider-flexible architecture:
    // Uses Pollinations FLUX engine (fast, free, high quality, zero Gemini quota consumption)
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    lastGenerationTimestamp = Date.now();

    return res.status(200).json({
      imageUrl,
      prompt: trimmedPrompt,
      enhancedPrompt,
      aspectRatio,
      style,
      provider: "pollinations-flux",
      cooldownSeconds: 45,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate image. Please try again.",
    });
  }
}
