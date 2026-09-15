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

  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

  res.status(200).json({
    groq: hasGroq,
    gemini: hasGemini,
    defaultProvider: hasGroq ? "groq" : hasGemini ? "gemini" : "groq",
    searchAvailable: hasGemini,
  });
}
