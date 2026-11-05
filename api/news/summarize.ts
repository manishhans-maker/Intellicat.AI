import { newsSummarizeHandler } from "../news";

export default async function handler(req: any, res: any) {
  return newsSummarizeHandler(req, res);
}
