const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=1&format=json';

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

export async function getFearGreedIndex() {
  const cacheKey = 'fear-greed:latest';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await fetch(FEAR_GREED_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    throw new Error(`Fear & Greed API error: ${response.status}`);
  }

  const payload = await response.json();
  const latest = payload?.data?.[0];
  if (!latest) {
    throw new Error('Fear & Greed API returned no data');
  }

  const result = {
    value: Number(latest.value),
    classification: latest.value_classification || '',
    updatedAt: latest.timestamp ? new Date(Number(latest.timestamp) * 1000).toISOString() : null,
    timeUntilUpdate: latest.time_until_update ? Number(latest.time_until_update) : null,
    source: 'alternative.me',
  };

  setCache(cacheKey, result);
  return result;
}
