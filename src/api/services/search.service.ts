import { createHash } from "crypto";
import { env } from "../config/env";
import { getCachedSearch, cacheSearch } from "./memory.service";

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Check if a user message likely needs real-time web search.
 */
export function shouldAutoSearch(message: string): boolean {
  const keywords = ["latest", "today", "news", "current", "price", "now", "recent", "2024", "2025", "2026"];
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Query the Serper API for web search results.
 * Results are cached in Redis for 10 minutes by query hash.
 */
export async function searchWeb(query: string, numResults = 5): Promise<SearchResult[]> {
  const hash = createHash("md5").update(query).digest("hex");

  // Check cache first
  const cached = await getCachedSearch(hash);
  if (cached) {
    return JSON.parse(cached) as SearchResult[];
  }

  const res = await fetch(`${env.SERPER_BASE_URL}/search`, {
    method: "POST",
    headers: {
      "X-API-KEY": env.SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: numResults }),
  });

  if (!res.ok) {
    console.error("[Serper] Search failed:", res.status, res.statusText);
    return [];
  }

  const data = (await res.json()) as {
    organic?: Array<{ title: string; link: string; snippet: string }>;
  };

  const results: SearchResult[] = (data.organic ?? []).slice(0, 3).map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));

  // Cache the results
  await cacheSearch(hash, JSON.stringify(results));

  return results;
}

/**
 * Format Serper results into a system prompt block.
 */
export function formatSearchBlock(results: SearchResult[]): string {
  if (!results.length) return "";
  const lines = results.map((r, i) => `${i + 1}. ${r.title}: ${r.snippet} (${r.link})`).join("\n");
  return `[WEB SEARCH RESULTS]\n${lines}`;
}
