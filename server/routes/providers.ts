import express from "express";
import { isSearchQuotaExhausted } from "../chatCore";

export default function providersHandler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-groq-api-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const customGroqKey = ((req.headers["x-groq-api-key"] as string) || (req.query?.groqKey as string) || "").trim();
  const hasServerGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
  const hasGroq = Boolean(hasServerGroq || customGroqKey.length > 0);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

  res.status(200).json({
    groq: hasGroq,
    serverGroqConfigured: hasServerGroq,
    hasCustomGroqKey: customGroqKey.length > 0,
    gemini: hasGemini,
    defaultProvider: hasGroq ? "groq" : hasGemini ? "gemini" : "groq",
    searchAvailable: hasGemini && !isSearchQuotaExhausted(),
  });
}
