'use strict';

const state = {
  currentTicker: null,
  currentRange: '6mo',
  currentFinancialPeriod: 'annual',
  technicalData: null,
  financialData: null,
  currency: 'USD',
};

const tickerInput = document.getElementById('tickerInput');
const suffixSelect = document.getElementById('suffixSelect');
const searchBtn = document.getElementById('searchBtn');
const autocomplete = document.getElementById('autocomplete');
const errorBanner = document.getElementById('errorBanner');
const errorMsg = document.getElementById('errorMsg');
const stockHeader = document.getElementById('stockHeader');
const loadingSpinner = document.getElementById('loadingSpinner');
const mainContent = document.getElementById('mainContent');
const signalOverview = document.getElementById('signalOverview');
const signalHeadline = document.getElementById('signalHeadline');
const signalStrength = document.getElementById('signalStrength');
const signalReasons = document.getElementById('signalReasons');
const signalRisks = document.getElementById('signalRisks');
const signalSummaryBody = document.getElementById('signalSummaryBody');
const scoreCards = document.getElementById('scoreCards');
const marketBadges = document.getElementById('marketBadges');

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
  setupTabs();
  setupRangeButtons();
  setupFinancialControls();
  setupIndicatorToggles();
  loadFromURL();
});

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const ticker = params.get('ticker');
  const range = params.get('range') || '6mo';
  if (!ticker) return;

  tickerInput.value = ticker;
  state.currentRange = range;
  document.querySelectorAll('.range-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.range === range);
  });
  search(ticker, range);
}

function pushURL(ticker, range) {
  const url = new URL(window.location);
  url.searchParams.set('ticker', ticker);
  url.searchParams.set('range', range);
  history.pushState({}, '', url);
}

function setupSearch() {
  searchBtn.addEventListener('click', triggerSearch);
  tickerInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') triggerSearch();
  });

  let debounceTimer;
  tickerInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = tickerInput.value.trim();
    if (query.length < 1) {
      autocomplete.classList.add('hidden');
      return;
    }
    debounceTimer = setTimeout(() => fetchAutocomplete(query), 250);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.search-wrapper')) {
      autocomplete.classList.add('hidden');
    }
  });
}

async function triggerSearch() {
  const raw = tickerInput.value.trim();
  if (!raw) return;

  if (!autocomplete.classList.contains('hidden')) {
    const firstItem = autocomplete.querySelector('.autocomplete-item');
    if (firstItem) {
      const symbol = firstItem.dataset.symbol;
      tickerInput.value = symbol;
      autocomplete.classList.add('hidden');
      if (symbol.includes('.')) suffixSelect.value = 'none';
      state.currentRange = getActiveRange();
      search(symbol, state.currentRange);
      return;
    }
  }

  autocomplete.classList.add('hidden');
  state.currentRange = getActiveRange();

  if (/[a-zA-Z\u3131-\u318E\uAC00-\uD7A3\s]/.test(raw)) {
    const { symbol, hasDot } = await resolveToTicker(raw);
    tickerInput.value = symbol;
    if (hasDot) suffixSelect.value = 'none';
    search(symbol, state.currentRange);
    return;
  }

  search(raw, state.currentRange);
}

async function resolveToTicker(query) {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    const top = (data.suggestions || [])[0];
    if (top) return { symbol: top.symbol, hasDot: top.symbol.includes('.') };
  } catch (_) {
    // Fall through to raw query.
  }
  return { symbol: query, hasDot: query.includes('.') };
}

async function fetchAutocomplete(query) {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    renderAutocomplete(data.suggestions || []);
  } catch (_) {
    autocomplete.classList.add('hidden');
  }
}

function renderAutocomplete(suggestions) {
  if (!suggestions.length) {
    autocomplete.classList.add('hidden');
    return;
  }

  autocomplete.innerHTML = suggestions.map(item => `
    <div class="autocomplete-item" data-symbol="${escapeAttribute(item.symbol)}">
      <span class="autocomplete-symbol">${escapeHtml(item.symbol)}</span>
      <span class="autocomplete-name">${escapeHtml(item.name)}</span>
      <span class="autocomplete-exchange">${escapeHtml(item.exchange || '')}</span>
    </div>
  `).join('');

  autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const symbol = item.dataset.symbol;
      tickerInput.value = symbol;
      autocomplete.classList.add('hidden');
      if (symbol.includes('.')) suffixSelect.value = 'none';
      triggerSearch();
    });
  });

  autocomplete.classList.remove('hidden');
}

async function search(ticker, range) {
  state.currentTicker = ticker;
  state.currentRange = range;

  showLoading(true);
  hideError();
  hideMainContent();
  resetSignalPanels();
  document.getElementById('newsSection').classList.add('hidden');

  pushURL(ticker, range);

  try {
    const suffix = suffixSelect.value;
    const [technicalResult, financialResult] = await Promise.allSettled([
      fetch(`/api/stock/technical?ticker=${encodeURIComponent(ticker)}&range=${range}&suffix=${suffix}`).then(res => res.json()),
      fetch(`/api/stock/financials?ticker=${encodeURIComponent(ticker)}&suffix=${suffix}`).then(res => res.json()),
    ]);

    if (technicalResult.status !== 'fulfilled' || technicalResult.value.error) {
      const errorText = technicalResult.status === 'fulfilled'
        ? technicalResult.value.error
        : 'Failed to load technical analysis data.';
      showError(errorText || 'Failed to load technical analysis data.');
      showLoading(false);
      return;
    }

    state.technicalData = technicalResult.value;
    state.currency = technicalResult.value.meta.currency || 'USD';
    renderStockHeader(technicalResult.value);
    renderSignalOverview(technicalResult.value);
    buildPriceChart(technicalResult.value);
    syncIndicatorToggleState();

    if (financialResult.status === 'fulfilled' && !financialResult.value.error) {
      state.financialData = financialResult.value;
      renderAllFinancials(financialResult.value, state.currentFinancialPeriod, state.currency);
    }

    showLoading(false);
    showMainContent();
    fetchAndRenderNews(technicalResult.value.resolvedTicker);
  } catch (_) {
    showError('Server connection failed. Please try again.');
    showLoading(false);
  }
}

function renderStockHeader(data) {
  document.getElementById('stockName').textContent = data.meta.longName || data.ticker;
  document.getElementById('stockTicker').textContent = data.resolvedTicker;
  document.getElementById('stockExchange').textContent = data.meta.exchangeName || '';

  const price = data.meta.regularMarketPrice;
  const change = data.meta.regularMarketChangePercent;
  const currency = data.meta.currency || 'USD';

  if (price != null) {
    document.getElementById('stockPrice').textContent = formatPrice(price, currency);
  } else {
    const last = data.prices[data.prices.length - 1];
    document.getElementById('stockPrice').textContent = last ? formatPrice(last.close, currency) : '';
  }

  const changeEl = document.getElementById('stockChange');
  if (change != null) {
    const sign = change >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${change.toFixed(2)}%`;
    changeEl.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;
  } else {
    changeEl.textContent = '';
    changeEl.className = 'stock-change';
  }

  document.getElementById('stockCurrency').textContent = currency;
  stockHeader.classList.remove('hidden');
}

function renderSignalOverview(data) {
  const summary = data.signalSummary || {};
  const scores = data.signalScores || {};
  const marketState = data.marketState || {};

  signalOverview.classList.remove('hidden');
  signalHeadline.textContent = formatSignal(summary.signal);
  signalHeadline.className = `signal-headline signal-${String(summary.signal || 'neutral').toLowerCase()}`;
  signalStrength.textContent = formatStrength(summary.strength);

  signalReasons.innerHTML = (summary.reasons || []).map(reason => `<li>${escapeHtml(reason)}</li>`).join('');
  signalRisks.innerHTML = (summary.risks || []).map(risk => `<li>${escapeHtml(risk)}</li>`).join('');

  scoreCards.innerHTML = `
    ${renderScoreCard('매수 점수', scores.buyScore, '추세, 모멘텀, 거래량 흐름을 종합한 점수입니다.', 'buy')}
    ${renderScoreCard('매도 점수', scores.sellScore, '하락 압력과 약세 흐름을 종합한 점수입니다.', 'sell')}
    ${renderScoreCard('추세 상태', marketState.trendStrength, `방향: ${formatLocalizedValue(marketState.trend || 'unknown')}`, 'neutral')}
    ${renderScoreCard('변동성', marketState.volatility, `모멘텀: ${formatLocalizedValue(marketState.momentum || 'unknown')}`, 'neutral')}
  `;

  marketBadges.innerHTML = [
    marketState.trend ? renderBadge(marketState.trend) : '',
    marketState.trendStrength ? renderBadge(marketState.trendStrength) : '',
    marketState.momentum ? renderBadge(marketState.momentum) : '',
    marketState.volatility ? renderBadge(marketState.volatility) : '',
    marketState.priceLocation ? renderBadge(marketState.priceLocation) : '',
  ].join('');

  const reasonsCount = (summary.reasons || []).length;
  const risksCount = (summary.risks || []).length;
  signalSummaryBody.dataset.columns = reasonsCount && risksCount ? '2' : '1';
}

function renderScoreCard(label, value, hint, tone) {
  return `
    <article class="score-card score-card-${tone}">
      <div class="score-card-label">${escapeHtml(label)}</div>
      <div class="score-card-value">${escapeHtml(formatScoreValue(value))}</div>
      <div class="score-card-hint">${escapeHtml(hint)}</div>
    </article>
  `;
}

function renderBadge(value) {
  return `<span class="market-badge">${escapeHtml(formatLocalizedValue(value))}</span>`;
}

function resetSignalPanels() {
  signalOverview.classList.add('hidden');
  signalReasons.innerHTML = '';
  signalRisks.innerHTML = '';
  scoreCards.innerHTML = '';
  marketBadges.innerHTML = '';
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const tab = button.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

function setupRangeButtons() {
  document.querySelectorAll('.range-btn').forEach(button => {
    button.addEventListener('click', () => {
      if (!state.currentTicker) return;
      document.querySelectorAll('.range-btn').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      state.currentRange = button.dataset.range;
      reloadTechnical();
    });
  });
}

function getActiveRange() {
  const active = document.querySelector('.range-btn.active');
  return active ? active.dataset.range : '6mo';
}

async function reloadTechnical() {
  if (!state.currentTicker) return;

  showLoading(true);
  hideMainContent();

  try {
    const suffix = suffixSelect.value;
    const response = await fetch(`/api/stock/technical?ticker=${encodeURIComponent(state.currentTicker)}&range=${state.currentRange}&suffix=${suffix}`);
    const data = await response.json();

    if (data.error) {
      showError(data.error);
      showLoading(false);
      return;
    }

    state.technicalData = data;
    renderStockHeader(data);
    renderSignalOverview(data);
    buildPriceChart(data);
    syncIndicatorToggleState();
    pushURL(state.currentTicker, state.currentRange);
    showLoading(false);
    showMainContent();
  } catch (_) {
    showError('Failed to reload technical data.');
    showLoading(false);
  }
}

function setupIndicatorToggles() {
  document.getElementById('toggleBB').addEventListener('change', event => {
    toggleBollingerBands(event.target.checked);
  });
  document.getElementById('toggleMA').addEventListener('change', event => {
    toggleMovingAverages(event.target.checked);
  });
  document.getElementById('toggleLevels').addEventListener('change', event => {
    toggleSupportResistance(event.target.checked);
  });
  document.getElementById('toggleRSI').addEventListener('change', event => {
    toggleRSI(event.target.checked);
  });
  document.getElementById('toggleMACD').addEventListener('change', event => {
    toggleMACD(event.target.checked);
  });
}

function syncIndicatorToggleState() {
  toggleBollingerBands(document.getElementById('toggleBB').checked);
  toggleMovingAverages(document.getElementById('toggleMA').checked);
  toggleSupportResistance(document.getElementById('toggleLevels').checked);
  toggleRSI(document.getElementById('toggleRSI').checked);
  toggleMACD(document.getElementById('toggleMACD').checked);
}

function setupFinancialControls() {
  document.querySelectorAll('.fin-tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.fin-tab-btn').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const tab = button.dataset.fintab;
      document.querySelectorAll('.fin-content').forEach(panel => panel.classList.remove('active'));
      document.getElementById(`fin-${tab}`).classList.add('active');
    });
  });

  document.querySelectorAll('.period-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      state.currentFinancialPeriod = button.dataset.period;
      if (state.financialData) {
        renderAllFinancials(state.financialData, state.currentFinancialPeriod, state.currency);
      }
    });
  });
}

async function fetchAndRenderNews(ticker) {
  const section = document.getElementById('newsSection');
  const list = document.getElementById('newsList');
  const spinner = document.getElementById('newsLoading');

  section.classList.remove('hidden');
  spinner.classList.remove('hidden');
  list.innerHTML = '';

  try {
    const response = await fetch(`/api/news/${encodeURIComponent(ticker)}`);
    const data = await response.json();
    renderNews(data.news || []);
  } catch (_) {
    list.innerHTML = '<p class="news-empty">Failed to load company news.</p>';
  } finally {
    spinner.classList.add('hidden');
  }
}

function renderNews(articles) {
  const list = document.getElementById('newsList');
  if (!articles.length) {
    list.innerHTML = '<p class="news-empty">No recent company news was found.</p>';
    return;
  }

  list.innerHTML = articles.map(article => `
    <a href="${escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer" class="news-item">
      <div class="news-headline">${escapeHtml(article.headline)}</div>
      <div class="news-meta">
        <span class="news-source">${escapeHtml(article.source)}</span>
        <span class="news-date">${escapeHtml(article.datetime)}</span>
      </div>
    </a>
  `).join('');
}

function showLoading(show) {
  loadingSpinner.classList.toggle('hidden', !show);
}

function showError(message) {
  errorMsg.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
}

function showMainContent() {
  mainContent.classList.remove('hidden');
}

function hideMainContent() {
  mainContent.classList.add('hidden');
}

function formatPrice(value, currency) {
  if (value == null) return '';
  const symbol = currency === 'KRW' ? 'KRW ' : '$';
  if (currency === 'KRW') return symbol + Math.round(value).toLocaleString('ko-KR');
  return symbol + Number(value).toFixed(2);
}

function formatSignal(signal) {
  switch (signal) {
    case 'BUY': return '매수 우위';
    case 'SELL': return '매도 우위';
    default: return '중립 관찰';
  }
}

function formatStrength(strength) {
  return formatLocalizedValue(strength || 'watch');
}

function formatScoreValue(value) {
  if (typeof value === 'number') return `${value}/100`;
  return formatLocalizedValue(value || 'unknown');
}

function formatSentenceCase(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLocalizedValue(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  const labels = {
    buy: '매수',
    sell: '매도',
    neutral: '중립',
    unknown: '알 수 없음',
    watch: '관찰',
    weak: '약함',
    moderate: '보통',
    strong: '강함',
    very_strong: '매우 강함',
    uptrend: '상승 추세',
    downtrend: '하락 추세',
    range: '횡보',
    bullish: '강세',
    bearish: '약세',
    high: '높음',
    low: '낮음',
    above_ema20: 'EMA20 위',
    below_ema20: 'EMA20 아래',
    below_sma200: 'SMA200 아래',
  };

  if (labels[normalized]) return labels[normalized];
  return formatSentenceCase(String(value).replace(/_/g, ' '));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  const value = String(str).trim();
  if (!/^https?:\/\//i.test(value)) return '#';
  return value.replace(/"/g, '%22');
}

function escapeAttribute(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
