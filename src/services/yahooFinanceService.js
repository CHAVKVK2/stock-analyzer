import YahooFinance from 'yahoo-finance2';
import { searchKrxStocks } from './krxService.js';
import { resolveLocalAlias, searchLocalAliases } from './stockAliasCatalog.js';
import { assertPriceDataQuality } from './priceDataQuality.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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

export async function getPriceHistory(ticker, range = '6mo') {
  const cacheKey = `price:${ticker}:${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const daysMap = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825 };
  const days = daysMap[range] || 180;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await yahooFinance.chart(ticker, { period1, interval: '1d' });
  const meta = result.meta || {};
  const quotes = (result.quotes || []).filter(q => q.close != null);

  const prices = quotes.map(q => ({
    date: formatDate(q.date),
    open: rnd(q.open),
    high: rnd(q.high),
    low: rnd(q.low),
    close: rnd(q.close),
    volume: q.volume || 0,
  }));

  const dataQuality = assertPriceDataQuality(prices);

  const data = {
    ticker,
    meta: {
      longName: meta.longName || meta.shortName || ticker,
      currency: meta.currency || 'USD',
      exchangeName: meta.exchangeName || '',
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketChangePercent: meta.regularMarketChangePercent,
    },
    prices,
    dataQuality,
  };

  setCache(cacheKey, data);
  return data;
}

export async function getFinancials(ticker) {
  const cacheKey = `financials:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const period1 = '2019-01-01';

  const [annFin, qFin, annBs, qBs, annCf, qCf] = await Promise.allSettled([
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, type: 'annual', module: 'financials' }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, type: 'quarterly', module: 'financials' }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, type: 'annual', module: 'balance-sheet' }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, type: 'quarterly', module: 'balance-sheet' }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, type: 'annual', module: 'cash-flow' }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, type: 'quarterly', module: 'cash-flow' }),
  ]);

  const get = r => (r.status === 'fulfilled' ? r.value : []);

  const data = {
    ticker,
    incomeStatement: {
      annual: parseIncomeStatements(get(annFin), 'annual'),
      quarterly: parseIncomeStatements(get(qFin), 'quarterly'),
    },
    balanceSheet: {
      annual: parseBalanceSheets(get(annBs), 'annual'),
      quarterly: parseBalanceSheets(get(qBs), 'quarterly'),
    },
    cashFlow: {
      annual: parseCashFlows(get(annCf), 'annual'),
      quarterly: parseCashFlows(get(qCf), 'quarterly'),
    },
  };

  setCache(cacheKey, data);
  return data;
}

export async function searchTickers(query) {
  if (!query) return [];

  const [localSuggestions, krxSuggestions] = await Promise.all([
    Promise.resolve(searchLocalAliases(query)),
    searchKrxStocks(query, 10).catch(() => []),
  ]);

  try {
    const result = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
    const remoteSuggestions = (result.quotes || [])
      .filter(q => q.symbol)
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchange || '',
        type: q.quoteType || '',
      }));

    return dedupeSuggestions([...localSuggestions, ...krxSuggestions, ...remoteSuggestions]);
  } catch {
    const localMatch = resolveLocalAlias(query);
    if (localMatch) return [localMatch];
    return krxSuggestions;
  }
}

function parseIncomeStatements(items, period) {
  return items
    .filter(s => s.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(s => ({
      date: formatStatementDate(s.date, period),
      totalRevenue: s.totalRevenue ?? null,
      grossProfit: s.grossProfit ?? null,
      operatingIncome: s.operatingIncome ?? null,
      ebit: s.EBIT ?? null,
      ebitda: s.EBITDA ?? null,
      netIncome: s.netIncome ?? null,
      researchDevelopment: s.researchAndDevelopment ?? null,
      totalOperatingExpenses: s.operatingExpense ?? null,
      basicEPS: s.basicEPS ?? null,
      dilutedEPS: s.dilutedEPS ?? null,
    }));
}

function parseBalanceSheets(items, period) {
  return items
    .filter(s => s.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(s => ({
      date: formatStatementDate(s.date, period),
      totalAssets: s.totalAssets ?? null,
      totalCurrentAssets: s.currentAssets ?? null,
      cash: s.cashAndCashEquivalents ?? null,
      shortTermInvestments: s.shortTermInvestments ?? s.cashCashEquivalentsAndShortTermInvestments ?? null,
      cashAndShortTerm: s.cashCashEquivalentsAndShortTermInvestments ?? null,
      netReceivables: s.receivables ?? null,
      totalLiabilities: s.totalLiabilitiesNetMinorityInterest ?? null,
      totalCurrentLiabilities: s.currentLiabilities ?? null,
      longTermDebt: s.longTermDebt ?? null,
      shortLongTermDebt: s.currentDebt ?? null,
      totalStockholderEquity: s.stockholdersEquity ?? null,
      retainedEarnings: s.retainedEarnings ?? null,
    }));
}

function parseCashFlows(items, period) {
  return items
    .filter(s => s.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(s => ({
      date: formatStatementDate(s.date, period),
      operatingCashFlow: s.operatingCashFlow ?? s.cashFlowFromContinuingOperatingActivities ?? null,
      capitalExpenditures: s.capitalExpenditure ?? null,
      freeCashFlow: s.freeCashFlow ?? null,
      totalCashFromInvestingActivities: s.investingCashFlow ?? s.cashFlowFromContinuingInvestingActivities ?? null,
      totalCashFromFinancingActivities: s.financingCashFlow ?? s.cashFlowFromContinuingFinancingActivities ?? null,
      dividendsPaid: s.cashDividendsPaid ?? s.commonStockDividendPaid ?? null,
      repurchaseOfStock: s.repurchaseOfCapitalStock ?? null,
      changeInCash: s.changesInCash ?? null,
    }));
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function formatStatementDate(date, period) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();

  if (period === 'quarterly') {
    const month = d.getMonth() + 1;
    if ([3, 6, 9, 12].includes(month)) {
      const q = Math.ceil(month / 3);
      return `Q${q} ${year}`;
    }
  }

  return year.toString();
}

function rnd(n) {
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

function dedupeSuggestions(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.symbol.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
