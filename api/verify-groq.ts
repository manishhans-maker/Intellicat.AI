import Groq from "groq-sdk";

export default async function verifyGroqHandler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-groq-api-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const key = (req.body?.apiKey || (req.headers["x-groq-api-key"] as string) || process.env.GROQ_API_KEY || "").trim();
  if (!key) {
    return res.status(400).json({
      valid: false,
      error: "Missing Groq API key. Provide a key starting with 'gsk_' from console.groq.com.",
    });
  }

  try {
    const groq = new Groq({ apiKey: key });
    const modelList = await groq.models.list();
    const activeModels = modelList.data
      .map((m: any) => m.id)
      .filter((id: string) => !id.includes("whisper"));

    return res.status(200).json({
      valid: true,
      modelsCount: activeModels.length,
      models: activeModels.slice(0, 10),
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      error: err?.message || "Invalid Groq API key or network error connecting to Groq API.",
    });
  }
}
