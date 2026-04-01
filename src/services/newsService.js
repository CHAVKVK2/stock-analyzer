import YahooFinance from 'yahoo-finance2';
import Parser from 'rss-parser';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const rssParser = new Parser({
  customFields: { item: [['source', 'source']] },
});

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function dateStr(date) {
  return date.toISOString().split('T')[0];
}

export async function getCompanyNews(symbol) {
  const cacheKey = `news:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const isKorean = /\.(KS|KQ)$/i.test(symbol);
  let news = [];

  if (isKorean) {
    news = await getGoogleNews(symbol, 'ko');
  } else {
    try {
      news = await getFinnhubNews(symbol);
    } catch {
      news = [];
    }

    if (!news.length) {
      news = await getGoogleNews(symbol, 'en');
    }
  }

  setCache(cacheKey, news);
  return news;
}

async function getGoogleNews(symbol, locale = 'ko') {
  const companyName = await resolveCompanyName(symbol);
  const config = locale === 'ko'
    ? { hl: 'ko', gl: 'KR', ceid: 'KR:ko' }
    : { hl: 'en-US', gl: 'US', ceid: 'US:en' };

  const feedUrl =
    `https://news.google.com/rss/search` +
    `?q=${encodeURIComponent(companyName)}` +
    `&hl=${config.hl}&gl=${config.gl}&ceid=${config.ceid}`;

  const feed = await rssParser.parseURL(feedUrl);

  return (feed.items || [])
    .slice(0, 10)
    .map(item => ({
      headline: item.title || '',
      source: parseSource(item),
      datetime: item.pubDate ? dateStr(new Date(item.pubDate)) : '',
      url: item.link || '',
    }))
    .filter(article => article.headline && article.url);
}

async function resolveCompanyName(symbol) {
  let companyName = symbol.replace(/\.(KS|KQ)$/i, '');

  try {
    const quote = await yahooFinance.quote(symbol);
    const raw = quote.longName || quote.shortName || '';
    if (raw) {
      companyName = raw
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/\s*(Co\.,?\s*Ltd\.?|Inc\.?|Corp\.?|Corporation|Holdings?|Class\s+[A-Z]|주식회사)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  } catch {
    // Fall back to the ticker when quote metadata is unavailable.
  }

  return companyName;
}

function parseSource(item) {
  const source = item.source;
  if (!source) return item.creator || 'Google News';
  if (typeof source === 'string') return source;
  if (typeof source === 'object') return source._ || source.text || item.creator || 'Google News';
  return 'Google News';
}

async function getFinnhubNews(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === '?기기에키입력') return [];

  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const url =
    `https://finnhub.io/api/v1/company-news` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&from=${dateStr(from)}&to=${dateStr(to)}` +
    `&token=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub API error: ${res.status}`);

  const articles = await res.json();
  if (!Array.isArray(articles)) return [];

  return articles
    .filter(article => article.headline && article.url)
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 10)
    .map(article => ({
      headline: article.headline,
      source: article.source || '',
      datetime: dateStr(new Date(article.datetime * 1000)),
      url: article.url,
    }));
}
