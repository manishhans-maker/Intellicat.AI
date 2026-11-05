export default function healthHandler(_req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");

  res.status(200).json({ status: "ok", service: "IntelicatAI Engine", timestamp: new Date().toISOString() });
}
