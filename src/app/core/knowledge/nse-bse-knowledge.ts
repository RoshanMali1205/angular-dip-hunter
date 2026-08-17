/**
 * Built-in NSE/BSE facts for Finance Buddy (local fallback + Gemini prompt).
 * Keep `src/assets/knowledge/nse-bse.json` and
 * `netlify/functions/nse-bse-knowledge.json` identical.
 */

import pack from '../../../assets/knowledge/nse-bse.json';

export interface NseBseTopic {
  id: string;
  title: string;
  keywords: string[];
  strongKeywords?: string[];
  answer: string;
}

export interface NseBseKnowledgePack {
  version: number;
  disclaimer: string;
  prompt: string;
  topics: NseBseTopic[];
}

export const NSE_BSE_KNOWLEDGE = pack as NseBseKnowledgePack;

export function nseBsePromptSnippet(): string {
  return NSE_BSE_KNOWLEDGE.prompt;
}

export function formatNseBseReply(topic: NseBseTopic): string {
  return `${topic.answer} ${NSE_BSE_KNOWLEDGE.disclaimer}`;
}

/**
 * Match a user question to a market-structure fact.
 * Requires a distinctive phrase so dip/plan/portfolio chats are not stolen.
 */
export function matchNseBseFact(query: string): NseBseTopic | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  let best: { topic: NseBseTopic; score: number } | null = null;

  for (const topic of NSE_BSE_KNOWLEDGE.topics) {
    let score = 0;

    for (const kw of topic.strongKeywords ?? []) {
      const needle = kw.toLowerCase();
      if (needle && q.includes(needle)) {
        score += needle.includes(' ') || needle.length >= 6 ? 3 : 2;
      }
    }

    for (const kw of topic.keywords) {
      const needle = kw.toLowerCase();
      if (!needle || !q.includes(needle)) continue;
      score += needle.includes(' ') ? 2 : 1;
    }

    if (score >= 2 && (!best || score > best.score)) {
      best = { topic, score };
    }
  }

  return best?.topic ?? null;
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!,:;'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
