import YahooFinance from 'yahoo-finance2';
import Parser from 'rss-parser';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const rssParser = new Parser({
  customFields: { item: [['source', 'source']] },
});

// 인메모리 캐시 (5분)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

/**
 * 심볼에 따라 한국 종목(Google News RSS) / 미국 종목(Finnhub) 분기
 */
export async function getCompanyNews(symbol) {
  const cacheKey = `news:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const isKorean = /\.(KS|KQ)$/i.test(symbol);
  const news = isKorean
    ? await getKoreanNews(symbol)
    : await getFinnhubNews(symbol);

  setCache(cacheKey, news);
  return news;
}

// ── 한국 종목: Yahoo Finance 종목명 조회 → Google News RSS ──────────────────

async function getKoreanNews(symbol) {
  // 1. 종목명 조회
  let companyName = symbol.replace(/\.(KS|KQ)$/i, '');
  try {
    const quote = await yahooFinance.quote(symbol);
    const raw = quote.longName || quote.shortName || '';
    if (raw) {
      // 법인 형태 표기 제거 → 검색어 정제
      companyName = raw
        .replace(/\s*(Co\.,?\s*Ltd\.?|Inc\.?|Corp\.?|Holdings?|주식회사)\s*/gi, ' ')
        .trim();
    }
  } catch {
    // 실패 시 숫자 코드 그대로 사용 (검색 결과 없을 수 있음)
  }

  // 2. Google News RSS 호출
  const feedUrl =
    `https://news.google.com/rss/search` +
    `?q=${encodeURIComponent(companyName)}` +
    `&hl=ko&gl=KR&ceid=KR:ko`;

  const feed = await rssParser.parseURL(feedUrl);

  return (feed.items || [])
    .slice(0, 10)
    .map(item => ({
      headline: item.title || '',
      source:   parseSource(item),
      datetime: item.pubDate ? dateStr(new Date(item.pubDate)) : '',
      url:      item.link   || '',
    }))
    .filter(a => a.headline && a.url);
}

// rss-parser 의 source 필드는 문자열 또는 {_: text, $: attrs} 형태
function parseSource(item) {
  const s = item.source;
  if (!s) return item.creator || 'Google News';
  if (typeof s === 'string') return s;
  if (typeof s === 'object') return s._ || s.text || item.creator || 'Google News';
  return 'Google News';
}

// ── 미국 종목: Finnhub company-news ─────────────────────────────────────────

async function getFinnhubNews(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === '여기에키입력') return [];

  const to   = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const url =
    `https://finnhub.io/api/v1/company-news` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&from=${dateStr(from)}&to=${dateStr(to)}` +
    `&token=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub API 오류: ${res.status}`);

  const articles = await res.json();
  if (!Array.isArray(articles)) return [];

  return articles
    .filter(a => a.headline && a.url)
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 10)
    .map(a => ({
      headline: a.headline,
      source:   a.source   || '',
      datetime: dateStr(new Date(a.datetime * 1000)),
      url:      a.url,
    }));
}
