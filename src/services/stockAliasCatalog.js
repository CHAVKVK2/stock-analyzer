const STOCK_ALIAS_CATALOG = [
  {
    symbol: '005930.KS',
    exchange: 'KSC',
    name: 'Samsung Electronics Co., Ltd.',
    aliases: ['삼성전자', '삼성', 'samsung', 'samsungelectronics', '005930'],
  },
  {
    symbol: '000660.KS',
    exchange: 'KSC',
    name: 'SK Hynix Inc.',
    aliases: ['sk하이닉스', '하이닉스', 'skhynix', 'hynix', '000660'],
  },
  {
    symbol: '035420.KS',
    exchange: 'KSC',
    name: 'NAVER Corporation',
    aliases: ['네이버', 'naver', '035420'],
  },
  {
    symbol: '035720.KQ',
    exchange: 'KOSDAQ',
    name: 'Kakao Corp.',
    aliases: ['카카오', 'kakao', '035720'],
  },
  {
    symbol: '005380.KS',
    exchange: 'KSC',
    name: 'Hyundai Motor Company',
    aliases: ['현대차', '현대자동차', 'hyundai', 'hyundaimotor', '005380'],
  },
  {
    symbol: '000270.KS',
    exchange: 'KSC',
    name: 'Kia Corporation',
    aliases: ['기아', '기아차', 'kia', 'kiacorp', '000270'],
  },
  {
    symbol: '373220.KS',
    exchange: 'KSC',
    name: 'LG Energy Solution, Ltd.',
    aliases: ['lg에너지솔루션', 'lg엔솔', 'energysolution', 'lgenergysolution', '373220'],
  },
  {
    symbol: '068270.KS',
    exchange: 'KSC',
    name: 'Celltrion, Inc.',
    aliases: ['셀트리온', 'celltrion', '068270'],
  },
  {
    symbol: '005490.KS',
    exchange: 'KSC',
    name: 'POSCO Holdings Inc.',
    aliases: ['포스코', '포스코홀딩스', 'posco', 'poscoholdings', '005490'],
  },
  {
    symbol: '051910.KS',
    exchange: 'KSC',
    name: 'LG Chem, Ltd.',
    aliases: ['lg화학', 'lgchem', '051910'],
  },
  {
    symbol: 'AAPL',
    exchange: 'NASDAQ',
    name: 'Apple Inc.',
    aliases: ['애플', 'apple', 'aapl'],
  },
  {
    symbol: 'TSLA',
    exchange: 'NASDAQ',
    name: 'Tesla, Inc.',
    aliases: ['테슬라', 'tesla', 'tsla'],
  },
  {
    symbol: 'NVDA',
    exchange: 'NASDAQ',
    name: 'NVIDIA Corporation',
    aliases: ['엔비디아', 'nvidia', 'nvda'],
  },
  {
    symbol: 'MSFT',
    exchange: 'NASDAQ',
    name: 'Microsoft Corporation',
    aliases: ['마이크로소프트', 'microsoft', 'msft'],
  },
  {
    symbol: 'GOOGL',
    exchange: 'NASDAQ',
    name: 'Alphabet Inc. Class A',
    aliases: ['구글', '알파벳', 'google', 'alphabet', 'googl'],
  },
  {
    symbol: 'AMZN',
    exchange: 'NASDAQ',
    name: 'Amazon.com, Inc.',
    aliases: ['아마존', 'amazon', 'amzn'],
  },
  {
    symbol: 'META',
    exchange: 'NASDAQ',
    name: 'Meta Platforms, Inc.',
    aliases: ['메타', '페이스북', 'facebook', 'meta'],
  },
  {
    symbol: 'NFLX',
    exchange: 'NASDAQ',
    name: 'Netflix, Inc.',
    aliases: ['넷플릭스', 'netflix', 'nflx'],
  },
];

export function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s._,'"()\-\[\]{}+/]+/g, '');
}

function buildSearchTerms(stock) {
  return Array.from(
    new Set(
      [stock.symbol, stock.symbol.split('.')[0], stock.name, ...(stock.aliases || [])]
        .map(normalizeLookupKey)
        .filter(Boolean)
    )
  );
}

export function resolveLocalAlias(query) {
  const normalized = normalizeLookupKey(query);
  if (!normalized) return null;

  for (const stock of STOCK_ALIAS_CATALOG) {
    if (buildSearchTerms(stock).includes(normalized)) {
      return {
        symbol: stock.symbol,
        name: stock.name,
        exchange: stock.exchange,
        type: 'EQUITY',
      };
    }
  }

  return null;
}

export function searchLocalAliases(query, limit = 8) {
  const normalized = normalizeLookupKey(query);
  if (!normalized) return [];

  return STOCK_ALIAS_CATALOG
    .map(stock => {
      const terms = buildSearchTerms(stock);
      let score = -1;

      if (terms.includes(normalized)) score = 300;
      else if (terms.some(term => term.startsWith(normalized))) score = 200;
      else if (terms.some(term => term.includes(normalized))) score = 100;

      return score > -1
        ? {
            score,
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            type: 'EQUITY',
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map(({ score, ...item }) => item);
}
