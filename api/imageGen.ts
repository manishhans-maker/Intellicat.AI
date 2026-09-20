export default async function imageGenHandler(req: any, res: any) {
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { prompt, aspectRatio = "1:1", style = "cyberpunk" } = req.body || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "Prompt is required for image generation." });
    }

    const trimmedPrompt = prompt.trim();

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

    return res.status(200).json({
      imageUrl,
      prompt: trimmedPrompt,
      enhancedPrompt,
      aspectRatio,
      style,
      provider: "pollinations-flux",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate image. Please try again.",
    });
  }
}
