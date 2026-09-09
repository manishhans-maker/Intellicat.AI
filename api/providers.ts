export default function handler(req: any, res: any) {
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

  res.status(200).json({
    groq: hasGroq,
    gemini: hasGemini,
    defaultProvider: hasGroq ? "groq" : hasGemini ? "gemini" : "groq",
  });
}
