export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const customGroqKey = (req.headers["x-groq-api-key"] || req.query?.groqKey || "").toString().trim();
  const hasServerGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
  const hasGroq = Boolean(hasServerGroq || customGroqKey !== "");
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

  res.status(200).json({
    groq: hasGroq,
    serverGroqConfigured: hasServerGroq,
    hasCustomGroqKey: customGroqKey.length > 0,
    gemini: hasGemini,
    defaultProvider: hasGroq ? "groq" : hasGemini ? "gemini" : "groq",
    searchAvailable: true,
  });
}
