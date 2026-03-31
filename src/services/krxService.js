import { normalizeLookupKey } from './stockAliasCatalog.js';

const KRX_LIST_URL = 'https://kind.krx.co.kr/corpgeneral/corpList.do?method=download';
const KRX_CACHE_TTL = 24 * 60 * 60 * 1000;

let krxCache = {
  fetchedAt: 0,
  items: [],
};

export async function searchKrxStocks(query, limit = 10) {
  const normalized = normalizeLookupKey(query);
  if (!normalized) return [];

  const items = await getKrxStockList();

  return items
    .map(item => {
      const terms = buildSearchTerms(item);
      let score = -1;

      if (terms.includes(normalized)) score = 300;
      else if (terms.some(term => term.startsWith(normalized))) score = 220;
      else if (terms.some(term => term.includes(normalized))) score = 120;

      return score > -1 ? { score, ...item } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map(({ score, ...item }) => item);
}

export async function resolveKrxStock(query) {
  const matches = await searchKrxStocks(query, 1);
  return matches[0] || null;
}

async function getKrxStockList() {
  if (Date.now() - krxCache.fetchedAt < KRX_CACHE_TTL && krxCache.items.length) {
    return krxCache.items;
  }

  const response = await fetch(KRX_LIST_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`KRX list request failed with status ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const html = new TextDecoder('euc-kr').decode(buffer);
  const items = parseKrxHtmlTable(html);

  krxCache = {
    fetchedAt: Date.now(),
    items,
  };

  return items;
}

function parseKrxHtmlTable(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const results = [];

  for (const [, rowHtml] of rows) {
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => cleanHtml(match[1]));
    if (cells.length < 3) continue;

    const [companyName, market, code] = cells;
    if (!/^\d{6}$/.test(code)) continue;

    const suffix = marketToYahooSuffix(market);
    if (!suffix) continue;

    results.push({
      symbol: `${code}${suffix}`,
      name: companyName,
      exchange: market,
      type: 'EQUITY',
      code,
    });
  }

  return results;
}

function marketToYahooSuffix(market) {
  const normalized = String(market || '').trim().toUpperCase();
  if (normalized === 'KOSPI' || normalized === '유가') return '.KS';
  if (normalized === 'KOSDAQ' || normalized === '코스닥') return '.KQ';
  return null;
}

function cleanHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchTerms(item) {
  return Array.from(
    new Set([
      item.name,
      item.symbol,
      item.code,
    ].map(normalizeLookupKey).filter(Boolean))
  );
}
