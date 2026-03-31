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
const fearGreedSection = document.getElementById('fearGreedSection');
const fearGreedLabel = document.getElementById('fearGreedLabel');
const fearGreedValue = document.getElementById('fearGreedValue');
const fearGreedMeta = document.getElementById('fearGreedMeta');
const fearGreedFill = document.getElementById('fearGreedFill');
const toggleRulesSection = document.getElementById('toggleRulesSection');
const togglePointInTimeSection = document.getElementById('togglePointInTimeSection');
const toggleBacktestSection = document.getElementById('toggleBacktestSection');
const toggleFearGreedSection = document.getElementById('toggleFearGreedSection');
const toggleChartSection = document.getElementById('toggleChartSection');
const rulesSection = document.getElementById('rulesSection');
const historicalSignalSection = document.getElementById('historicalSignalSection');
const historicalDateInput = document.getElementById('historicalDateInput');
const historicalSignalBtn = document.getElementById('historicalSignalBtn');
const historicalSignalResult = document.getElementById('historicalSignalResult');
const historicalRequestedDate = document.getElementById('historicalRequestedDate');
const historicalActualDate = document.getElementById('historicalActualDate');
const historicalSignalLabel = document.getElementById('historicalSignalLabel');
const historicalScorePair = document.getElementById('historicalScorePair');
const historicalClose = document.getElementById('historicalClose');
const historicalRsi = document.getElementById('historicalRsi');
const historicalMacd = document.getElementById('historicalMacd');
const historicalMacdSignal = document.getElementById('historicalMacdSignal');
const historicalBbBands = document.getElementById('historicalBbBands');
const historicalEmaPair = document.getElementById('historicalEmaPair');
const historicalAtrAdx = document.getElementById('historicalAtrAdx');
const historicalVolumeRatio = document.getElementById('historicalVolumeRatio');
const historicalLevels = document.getElementById('historicalLevels');
const historicalBuyBreakdown = document.getElementById('historicalBuyBreakdown');
const historicalSellBreakdown = document.getElementById('historicalSellBreakdown');
const backtestSection = document.getElementById('backtestSection');
const backtestStartDate = document.getElementById('backtestStartDate');
const backtestEndDate = document.getElementById('backtestEndDate');
const backtestBtn = document.getElementById('backtestBtn');
const backtestResult = document.getElementById('backtestResult');
const backtestCumulativeReturn = document.getElementById('backtestCumulativeReturn');
const backtestTradeCount = document.getElementById('backtestTradeCount');
const backtestWinRate = document.getElementById('backtestWinRate');
const backtestMdd = document.getElementById('backtestMdd');
const backtestBuyHold = document.getElementById('backtestBuyHold');
const backtestActualRange = document.getElementById('backtestActualRange');
const backtestTableBody = document.getElementById('backtestTableBody');
const chartSection = document.getElementById('chartSection');

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
  setupTabs();
  setupRangeButtons();
  setupFinancialControls();
  setupIndicatorToggles();
  setupHistoricalSignal();
  setupBacktest();
  setupSectionToggles();
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
  history.replaceState({}, '', url);
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
      suffixSelect.value = 'none';
      state.currentRange = getActiveRange();
      search(symbol, state.currentRange);
      return;
    }
  }

  autocomplete.classList.add('hidden');
  state.currentRange = getActiveRange();

  if (/[a-zA-Z\u3131-\u318E\uAC00-\uD7A3\s]/.test(raw)) {
    const { symbol, hasDot, resolved } = await resolveToTicker(raw);
    tickerInput.value = symbol;
    if (resolved || hasDot) suffixSelect.value = 'none';
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
    if (top) return { symbol: top.symbol, hasDot: top.symbol.includes('.'), resolved: true };
  } catch (_) {
    // Fall through to raw query.
  }
  return { symbol: query, hasDot: query.includes('.'), resolved: false };
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
      suffixSelect.value = 'none';
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
  resetFearGreed();
  resetFinancialPanels();
  resetHistoricalSignal();
  resetBacktest();
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
        : '기술적 분석 데이터를 불러오지 못했습니다.';
      showError(errorText || '기술적 분석 데이터를 불러오지 못했습니다.');
      showLoading(false);
      return;
    }

    state.technicalData = technicalResult.value;
    state.currency = technicalResult.value.meta.currency || 'USD';
    renderStockHeader(technicalResult.value);
    renderSignalOverview(technicalResult.value);
    prepareHistoricalSignal(technicalResult.value);
    prepareBacktest(technicalResult.value);
    buildPriceChart(technicalResult.value);
    syncIndicatorToggleState();

    if (financialResult.status === 'fulfilled' && !financialResult.value.error) {
      state.financialData = financialResult.value;
      renderAllFinancials(financialResult.value, state.currentFinancialPeriod, state.currency);
    } else {
      state.financialData = null;
      renderFinancialFallback();
    }

    showLoading(false);
    showMainContent();
    fetchAndRenderFearGreed();
    fetchAndRenderNews(technicalResult.value.resolvedTicker);
  } catch (_) {
    showError('서버 연결에 실패했습니다. 다시 시도해 주세요.');
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
    ${renderScoreCard('매수 점수', scores.buyScore, '현재 엔진이 계산한 매수 우위 점수입니다.', 'buy')}
    ${renderScoreCard('매도 점수', scores.sellScore, '현재 엔진이 계산한 매도 우위 점수입니다.', 'sell')}
    ${renderScoreCard('추세 강도', formatLocalizedValue(marketState.trendStrength), `방향: ${formatLocalizedValue(marketState.trend)}`, 'neutral')}
    ${renderScoreCard('변동성', formatLocalizedValue(marketState.volatility), `모멘텀: ${formatLocalizedValue(marketState.momentum)}`, 'neutral')}
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

function resetFearGreed() {
  fearGreedSection.classList.add('hidden');
  fearGreedLabel.textContent = '';
  fearGreedValue.textContent = '-';
  fearGreedMeta.textContent = '';
  fearGreedFill.style.width = '0%';
}

function resetFinancialPanels() {
  ['incomeTable', 'balanceTable', 'cashflowTable'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = '';
  });
}

function renderFinancialFallback() {
  ['incomeTable', 'balanceTable', 'cashflowTable'].forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.innerHTML = `
      <div class="no-data">
        재무제표 데이터를 불러오지 못했습니다.<br>
        잠시 후 다시 시도해 주세요.
      </div>
    `;
  });
}

function setupHistoricalSignal() {
  historicalSignalBtn.addEventListener('click', fetchHistoricalSignal);
  historicalDateInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') fetchHistoricalSignal();
  });
}

function setupSectionToggles() {
  bindSectionToggle(toggleRulesSection, rulesSection);
  bindSectionToggle(togglePointInTimeSection, historicalSignalSection);
  bindSectionToggle(toggleBacktestSection, backtestSection);
  bindSectionToggle(toggleFearGreedSection, fearGreedSection);
  bindSectionToggle(toggleChartSection, chartSection);
}

function bindSectionToggle(checkbox, section) {
  if (!checkbox || !section) return;
  checkbox.addEventListener('change', () => {
    section.classList.toggle('hidden', !checkbox.checked);
  });
  section.classList.toggle('hidden', !checkbox.checked);
}

function prepareHistoricalSignal(data) {
  const prices = data.prices || [];
  if (!prices.length) {
    resetHistoricalSignal();
    return;
  }

  const lastDate = prices[prices.length - 1].date;
  historicalDateInput.max = lastDate;

  if (!historicalDateInput.value) {
    historicalDateInput.value = lastDate;
  }
}

function resetHistoricalSignal() {
  historicalSignalResult.classList.add('hidden');
  historicalDateInput.value = '';
  historicalClose.textContent = '-';
  historicalBuyBreakdown.innerHTML = '';
  historicalSellBreakdown.innerHTML = '';
}

async function fetchHistoricalSignal() {
  if (!state.currentTicker || !historicalDateInput.value) return;

  historicalSignalBtn.disabled = true;
  historicalSignalBtn.textContent = '계산 중...';

  try {
    const suffix = suffixSelect.value;
    const response = await fetch(`/api/stock/historical-snapshot?ticker=${encodeURIComponent(state.currentTicker)}&target_date=${encodeURIComponent(historicalDateInput.value)}&range=5y&suffix=${suffix}`);
    const data = await response.json();

    if (data.error) {
      showError(data.error);
      return;
    }

    renderHistoricalSignal(data);
  } catch (_) {
    showError('과거 날짜 신호를 불러오지 못했습니다.');
  } finally {
    historicalSignalBtn.disabled = false;
    historicalSignalBtn.textContent = '계산';
  }
}

function renderHistoricalSignal(data) {
  const snapshot = data.snapshot || {};
  const indicators = data.indicators || {};
  const breakdowns = data.signalScores || {};

  historicalSignalResult.classList.remove('hidden');
  historicalRequestedDate.textContent = data.requestedDate || '-';
  historicalActualDate.textContent = data.actualDate || '-';
  historicalSignalLabel.textContent = data.signalSummary?.signal || '-';
  historicalSignalLabel.className = `historical-signal-badge signal-${String((data.signalSummary?.signal || 'hold')).toLowerCase()}`;
  historicalScorePair.textContent = `${data.signalScores?.buyScore ?? '-'} / ${data.signalScores?.sellScore ?? '-'}`;
  historicalClose.textContent = formatMaybePrice(data.price?.close ?? snapshot.close);
  historicalRsi.textContent = formatMaybeNumber(indicators.rsi ?? snapshot.rsi, 2);
  historicalMacd.textContent = formatMaybeNumber(indicators.macd ?? snapshot.macd, 4);
  historicalMacdSignal.textContent = formatMaybeNumber(indicators.macdSignal ?? snapshot.macdSignal, 4);
  historicalBbBands.textContent = formatBollingerBands(indicators, snapshot);
  historicalEmaPair.textContent = `${formatMaybePrice(snapshot.ema20)} / ${formatMaybePrice(snapshot.ema50)}`;
  historicalAtrAdx.textContent = `${formatMaybeNumber(snapshot.atr14, 2)} / ${formatMaybeNumber(snapshot.adx14, 2)}`;
  historicalVolumeRatio.textContent = formatMaybeNumber(snapshot.volumeRatio, 2);
  historicalLevels.textContent = `${formatMaybePrice(snapshot.nearestSupport)} / ${formatMaybePrice(snapshot.nearestResistance)}`;
  historicalBuyBreakdown.innerHTML = renderBreakdown(breakdowns.buyBreakdown);
  historicalSellBreakdown.innerHTML = renderBreakdown(breakdowns.sellBreakdown);
}

function renderBreakdown(breakdown) {
  if (!breakdown) return '<div class="breakdown-item">데이터 없음</div>';
  return Object.entries(breakdown).map(([key, value]) => `
    <div class="breakdown-item">
      <span>${escapeHtml(localizeBreakdownKey(key))}</span>
      <strong>${escapeHtml(String(value ?? '-'))}</strong>
    </div>
  `).join('');
}

function localizeBreakdownKey(key) {
  const labels = {
    trend: '추세',
    momentum: '모멘텀',
    volume: '거래량',
    location: '가격 위치',
    risk: '리스크',
  };
  return labels[key] || key;
}

function setupBacktest() {
  backtestBtn.addEventListener('click', fetchBacktest);
}

function prepareBacktest(data) {
  const prices = data.prices || [];
  if (!prices.length) {
    resetBacktest();
    return;
  }

  const lastDate = prices[prices.length - 1].date;
  const defaultStart = prices[Math.max(0, prices.length - 120)]?.date || prices[0].date;

  backtestStartDate.max = lastDate;
  backtestEndDate.max = lastDate;

  if (!backtestEndDate.value) backtestEndDate.value = lastDate;
  if (!backtestStartDate.value) backtestStartDate.value = defaultStart;
}

function resetBacktest() {
  backtestResult.classList.add('hidden');
  backtestTableBody.innerHTML = '';
  backtestStartDate.value = '';
  backtestEndDate.value = '';
  if (typeof buildBacktestChart === 'function') buildBacktestChart({ equityCurve: [], results: [] });
}

async function fetchBacktest() {
  if (!state.currentTicker || !backtestStartDate.value || !backtestEndDate.value) return;

  backtestBtn.disabled = true;
  backtestBtn.textContent = '실행 중...';

  try {
    const suffix = suffixSelect.value;
    const response = await fetch(`/api/stock/backtest?ticker=${encodeURIComponent(state.currentTicker)}&startDate=${encodeURIComponent(backtestStartDate.value)}&endDate=${encodeURIComponent(backtestEndDate.value)}&range=5y&suffix=${suffix}`);
    const data = await response.json();

    if (data.error) {
      showError(data.error);
      return;
    }

    renderBacktest(data);
  } catch (_) {
    showError('백테스트를 실행하지 못했습니다.');
  } finally {
    backtestBtn.disabled = false;
    backtestBtn.textContent = '실행';
  }
}

function renderBacktest(data) {
  const summary = data.summary || {};
  const actualRange = data.actualRange || {};
  const results = data.results || [];

  backtestResult.classList.remove('hidden');
  backtestCumulativeReturn.textContent = formatPercent(summary.cumulativeReturnPct);
  backtestTradeCount.textContent = String(summary.tradeCount ?? 0);
  backtestWinRate.textContent = formatPercent(summary.winRatePct);
  backtestMdd.textContent = formatPercent(summary.maxDrawdownPct);
  backtestBuyHold.textContent = formatPercent(summary.buyHoldReturnPct);
  backtestActualRange.textContent = `${actualRange.startDate || '-'} ~ ${actualRange.endDate || '-'} (${actualRange.tradingDays || 0}일)`;

  backtestTableBody.innerHTML = results.map(item => `
    <tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${escapeHtml(formatMaybePrice(item.close))}</td>
      <td>${escapeHtml(String(item.buyScore ?? '-'))}</td>
      <td>${escapeHtml(String(item.sellScore ?? '-'))}</td>
      <td>${escapeHtml(item.signal || '-')}</td>
      <td>${escapeHtml(item.position || '-')}</td>
      <td>${escapeHtml(formatPercent(item.cumulativeReturnPct))}</td>
    </tr>
  `).join('');

  if (typeof buildBacktestChart === 'function') {
    buildBacktestChart(data);
  }
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const tab = button.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
      });
      const target = document.getElementById(`tab-${tab}`);
      target.classList.remove('hidden');
      target.classList.add('active');
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
    prepareHistoricalSignal(data);
    prepareBacktest(data);
    buildPriceChart(data);
    syncIndicatorToggleState();
    pushURL(state.currentTicker, state.currentRange);
    showLoading(false);
    showMainContent();
  } catch (_) {
    showError('기술적 분석 데이터를 다시 불러오지 못했습니다.');
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
      document.querySelectorAll('.fin-content').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
      });
      const target = document.getElementById(`fin-${tab}`);
      target.classList.remove('hidden');
      target.classList.add('active');
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
    list.innerHTML = '<p class="news-empty">관련 뉴스를 불러오지 못했습니다.</p>';
  } finally {
    spinner.classList.add('hidden');
  }
}

async function fetchAndRenderFearGreed() {
  try {
    const response = await fetch('/api/market/fear-greed');
    const data = await response.json();
    renderFearGreed(data);
  } catch (_) {
    resetFearGreed();
  }
}

function renderFearGreed(data) {
  const value = Number(data.value);
  if (!Number.isFinite(value)) {
    resetFearGreed();
    return;
  }

  fearGreedSection.classList.toggle('hidden', !toggleFearGreedSection.checked);
  fearGreedValue.textContent = String(value);
  fearGreedLabel.textContent = formatFearGreedLabel(data.classification);
  fearGreedLabel.className = `fear-greed-label ${fearGreedToneClass(value)}`;
  fearGreedMeta.textContent = buildFearGreedMeta(data);
  fearGreedFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  fearGreedFill.className = `fear-greed-scale-fill ${fearGreedToneClass(value)}`;
}

function buildFearGreedMeta(data) {
  const source = data.source ? `출처: ${data.source}` : '';
  const nextUpdate = Number.isFinite(data.timeUntilUpdate)
    ? `업데이트까지 약 ${Math.max(1, Math.round(data.timeUntilUpdate / 3600))}시간`
    : '';
  return [source, nextUpdate].filter(Boolean).join(' · ');
}

function fearGreedToneClass(value) {
  if (value <= 25) return 'tone-fear';
  if (value >= 75) return 'tone-greed';
  return 'tone-neutral';
}

function formatFearGreedLabel(classification) {
  const labels = {
    'Extreme Fear': '극도의 공포',
    Fear: '공포',
    Neutral: '중립',
    Greed: '탐욕',
    'Extreme Greed': '극도의 탐욕',
  };
  return labels[classification] || classification || '중립';
}

function renderNews(articles) {
  const list = document.getElementById('newsList');
  if (!articles.length) {
    list.innerHTML = '<p class="news-empty">관련 뉴스를 찾지 못했습니다.</p>';
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
  if (currency === 'KRW') return `KRW ${Math.round(value).toLocaleString('ko-KR')}`;
  return `$${Number(value).toFixed(2)}`;
}

function formatSignal(signal) {
  switch (signal) {
    case 'BUY': return '매수 우위';
    case 'SELL': return '매도 우위';
    default: return '중립 / 관망';
  }
}

function formatStrength(strength) {
  return formatLocalizedValue(strength || 'watch');
}

function formatScoreValue(value) {
  if (typeof value === 'number') return `${value}/100`;
  return formatLocalizedValue(value || 'unknown');
}

function formatLocalizedValue(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  const labels = {
    buy: '매수',
    sell: '매도',
    neutral: '중립',
    hold: '보유',
    unknown: '정보 없음',
    watch: '관망',
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
    above_sma200: 'SMA200 위',
    below_sma200: 'SMA200 아래',
    long: '보유 중',
    cash: '현금',
  };

  return labels[normalized] || String(value).replace(/_/g, ' ');
}

function formatMaybeNumber(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function formatMaybePrice(value) {
  return typeof value === 'number' && Number.isFinite(value) ? formatPrice(value, state.currency) : '-';
}

function formatPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatBollingerBands(indicators, snapshot) {
  const upper = indicators.bollingerUpper ?? snapshot.bollingerUpper;
  const middle = indicators.bollingerMiddle ?? snapshot.bollingerMiddle;
  const lower = indicators.bollingerLower ?? snapshot.bollingerLower;
  return `${formatMaybePrice(upper)} / ${formatMaybePrice(middle)} / ${formatMaybePrice(lower)}`;
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
