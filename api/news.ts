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

export async function newsFeedHandler(req: any, res: any) {
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

  // Handle summarize if route or body specifies it
  if (req.body?.action === "summarize" || req.url?.includes("/summarize")) {
    return newsSummarizeHandler(req, res);
  }

  try {
    const category = (typeof req.query?.category === "string" ? req.query.category.toLowerCase() : "top") || "top";
    const searchQuery = typeof req.query?.q === "string" ? req.query.q.trim() : "";

    let targetUrl = CATEGORY_FEEDS[category] || CATEGORY_FEEDS.top;
    if (searchQuery) {
      targetUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Upstream news feed responded with status ${response.status}`);
    }

    const xml = await response.text();
    const articles: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    let index = 0;
    while ((match = itemRegex.exec(xml)) !== null && articles.length < 25) {
      const block = match[1];
      const rawTitle = (/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
      const rawLink = (/<link>([\s\S]*?)<\/link>/.exec(block)?.[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
      const rawPubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] || "").trim();
      const rawSource = (/<source[^>]*>([\s\S]*?)<\/source>/.exec(block)?.[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
      const rawDesc = (/<description>([\s\S]*?)<\/description>/.exec(block)?.[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();

      if (!rawTitle || !rawLink) continue;

      let cleanHeadline = rawTitle;
      let detectedSource = rawSource;
      const titleParts = rawTitle.split(" - ");
      if (titleParts.length > 1) {
        detectedSource = detectedSource || titleParts[titleParts.length - 1];
        cleanHeadline = titleParts.slice(0, -1).join(" - ");
      }

      const snippet = cleanHtmlTags(rawDesc).slice(0, 240);

      articles.push({
        id: `news-${index++}-${Date.now()}`,
        title: cleanHtmlTags(rawTitle),
        headline: cleanHtmlTags(cleanHeadline),
        source: detectedSource || "Global Wire",
        newspaperName: detectedSource ? `${detectedSource} Edition` : "The Intelicat Gazette",
        link: rawLink,
        pubDate: rawPubDate,
        timeAgo: formatTimeAgo(rawPubDate),
        snippet: snippet || cleanHtmlTags(cleanHeadline),
        category: category,
      });
    }

    return res.status(200).json({
      success: true,
      category,
      count: articles.length,
      lastUpdated: new Date().toISOString(),
      articles,
    });
  } catch (err: any) {
    console.warn("News feed fetch warning:", err?.message || err);
    const fallbackArticles: NewsArticle[] = [
      {
        id: "fb-1",
        title: "Global AI Compute Frontiers Advance with Low-Latency Inference",
        headline: "Global AI Compute Frontiers Advance with Low-Latency Inference",
        source: "Tech Journal",
        newspaperName: "Tech Journal Daily",
        link: "https://news.google.com",
        pubDate: new Date().toUTCString(),
        timeAgo: "10m ago",
        snippet: "Semiconductor breakthroughs and distributed edge networks accelerate real-time multi-agent reasoning systems worldwide.",
        category: "technology",
      },
      {
        id: "fb-2",
        title: "Renewable Energy Capacity Surpasses Record Milestones Across Major Continents",
        headline: "Renewable Energy Capacity Surpasses Record Milestones Across Major Continents",
        source: "World Science Review",
        newspaperName: "The Science Chronicle",
        link: "https://news.google.com",
        pubDate: new Date().toUTCString(),
        timeAgo: "35m ago",
        snippet: "International energy agencies report unprecedented solar and battery storage deployment over the past fiscal quarter.",
        category: "science",
      },
      {
        id: "fb-3",
        title: "International Markets Rally on Tech Innovations & Digital Infrastructure Investment",
        headline: "International Markets Rally on Tech Innovations & Digital Infrastructure Investment",
        source: "Financial Express",
        newspaperName: "Financial Express Morning",
        link: "https://news.google.com",
        pubDate: new Date().toUTCString(),
        timeAgo: "1h ago",
        snippet: "Global trade indexes post gains as technology and venture capital sectors expand digital workforce automation.",
        category: "business",
      },
    ];

    return res.status(200).json({
      success: true,
      category: "top",
      count: fallbackArticles.length,
      lastUpdated: new Date().toISOString(),
      articles: fallbackArticles,
      isFallback: true,
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
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
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
      } catch (geminiErr: any) {
        console.warn("Gemini news summarization warning:", geminiErr?.message || geminiErr);
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
