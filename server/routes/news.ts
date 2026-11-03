import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export interface NewsArticle {
  id: string;
  title: string;
  headline: string;
  source: string;
  link: string;
  pubDate: string;
  timeAgo: string;
  snippet: string;
  category: string;
  newspaperName: string;
}

const CATEGORY_FEEDS: Record<string, string> = {
  top: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
  world: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en",
  technology: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en",
  business: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en",
  science: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en",
  sports: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en",
  entertainment: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en",
};

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recent";
  }
}

function cleanHtmlTags(str: string): string {
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGoogleNewsRss(xmlText: string, category: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
    const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    const fullTitle = cleanHtmlTags(titleMatch ? titleMatch[1] : "News Bulletin");
    const link = linkMatch ? linkMatch[1].trim() : "#";
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();
    const rawSnippet = descMatch ? cleanHtmlTags(descMatch[1]) : "";

    let source = sourceMatch ? cleanHtmlTags(sourceMatch[1]) : "";
    let headline = fullTitle;

    if (!source && fullTitle.includes(" - ")) {
      const parts = fullTitle.split(" - ");
      source = parts.pop() || "Global News";
      headline = parts.join(" - ");
    }

    if (!source) {
      source = "Global News Wire";
    }

    const id = `news-${Buffer.from(headline + link).toString("base64").slice(0, 16)}`;

    articles.push({
      id,
      title: fullTitle,
      headline: headline.trim(),
      source: source.trim(),
      link,
      pubDate,
      timeAgo: formatTimeAgo(pubDate),
      snippet: rawSnippet || `${headline}. Live reporting via ${source}.`,
      category,
      newspaperName: "The Intelicat Chronicle",
    });

    if (articles.length >= 16) break;
  }

  return articles;
}

export async function newsFeedHandler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const category = (req.query?.category || "top").toString().toLowerCase();
  const rssUrl = CATEGORY_FEEDS[category] || CATEGORY_FEEDS["top"];

  try {
    const feedRes = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!feedRes.ok) {
      throw new Error(`Upstream feed HTTP error ${feedRes.status}`);
    }

    const xmlText = await feedRes.text();
    const articles = parseGoogleNewsRss(xmlText, category);

    return res.status(200).json({
      success: true,
      category,
      count: articles.length,
      lastUpdated: new Date().toISOString(),
      articles,
    });
  } catch (err: any) {
    console.warn("News feed fetch notice:", err?.message || err);
    return res.status(200).json({
      success: true,
      category,
      count: 0,
      lastUpdated: new Date().toISOString(),
      articles: [],
    });
  }
}

export async function newsSummarizeHandler(req: any, res: any) {
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

  try {
    const { title, source, snippet } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "Title parameter is required to summarize news article." });
    }

    const prompt = `You are the Lead Senior Editor & Intelligence Anchor at Intelicat Global News.
Provide a high-impact, professional executive news briefing on this developing story:
Headline: "${title}"
Source Publication: "${source || "News Wire"}"
Snippet: "${snippet || ""}"

Respond strictly in valid JSON matching this schema:
{
  "executiveSummary": "2-3 concise, fact-checked sentences explaining the core development.",
  "keyTakeaways": [
    "Crucial point 1",
    "Crucial point 2",
    "Crucial point 3"
  ],
  "whyItMatters": "A clear 1-2 sentence breakdown of the broader industry, global, or technological impact."
}`;

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          });

          const raw = response.text || "";
          const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return res.status(200).json({
            success: true,
            ...parsed,
          });
        } catch {
          continue;
        }
      }
    }

    return res.status(200).json({
      success: true,
      executiveSummary: `${title}. Reported by ${source || "leading news agencies"}, this story highlights key developments in current events and industry movements.`,
      keyTakeaways: [
        `Direct reporting from ${source || "authoritative sources"}.`,
        "Immediate relevance to ongoing regional and global developments.",
        "Expected follow-up coverage as further details emerge.",
      ],
      whyItMatters: "Provides essential situational awareness for decision-makers, engineers, and researchers following modern global trends.",
    });
  } catch (err: any) {
    console.error("News summarize error:", err);
    return res.status(500).json({ error: "Failed to generate AI news summary." });
  }
}

export default newsFeedHandler;
