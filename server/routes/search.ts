export default async function searchHandler(req: any, res: any) {
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

  const query = (req.query?.q || req.body?.q || "").toString().trim();
  if (!query) {
    return res.status(400).json({ error: "Search query 'q' parameter is required." });
  }

  try {
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // 1. DuckDuckGo Instant Answers API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; IntelicatAI/2.0)" },
      });

      if (ddgRes.ok) {
        const data: any = await ddgRes.json();
        if (data.AbstractText) {
          results.push({
            title: data.Heading || `${query} Overview`,
            url: data.AbstractURL || "https://duckduckgo.com/?q=" + encodeURIComponent(query),
            snippet: data.AbstractText,
          });
        }
        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 4)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.slice(0, 60) + "...",
                url: topic.FirstURL,
                snippet: topic.Text,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("DuckDuckGo Instant Answer fetch failed, checking fallback:", e);
    }

    // 2. Wikipedia Search API as supplementary authoritative knowledge
    if (results.length < 3) {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
          query
        )}&limit=4&namespace=0&format=json`;
        const wikiRes = await fetch(wikiUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; IntelicatAI/2.0)" },
        });
        if (wikiRes.ok) {
          const wikiData: any = await wikiRes.json();
          const titles = wikiData[1] || [];
          const snippets = wikiData[2] || [];
          const urls = wikiData[3] || [];
          for (let i = 0; i < titles.length; i++) {
            if (titles[i] && urls[i] && !results.some((r) => r.url === urls[i])) {
              results.push({
                title: titles[i],
                url: urls[i],
                snippet: snippets[i] || `Wikipedia article covering ${titles[i]}`,
              });
            }
          }
        }
      } catch (e) {
        console.warn("Wikipedia fallback notice:", e);
      }
    }

    return res.status(200).json({
      query,
      resultsCount: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Search API Error:", err);
    return res.status(500).json({ error: "Failed to perform web search." });
  }
}
