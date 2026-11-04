export default function healthHandler(_req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ status: "ok", service: "IntelicatAI Engine", timestamp: new Date().toISOString() });
}
