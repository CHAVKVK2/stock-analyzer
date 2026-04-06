'use strict';

const STRATEGY_LABELS = {
  balanced: '\uade0\ud615\ud615',
  trend_following: '\ucd94\uc138\ucd94\uc885\ud615',
  mean_reversion: '\ud3c9\uade0\ud68c\uadc0\ud615',
};

const PROFILE_LABELS = {
  kr_standard: 'KR \ud45c\uc900',
  us_megacap_growth: 'US \uba54\uac00\ucea1 \uc131\uc7a5',
  us_broad_large_cap: 'US \ub300\ud615\uc8fc \ud45c\uc900',
};

const state = {
  currentTicker: null,
  currentRange: '6mo',
  currentFinancialPeriod: 'annual',
  currentStrategy: 'balanced',
  technicalData: null,
  financialData: null,
  currency: 'USD',
  backtestData: null,
  backtestComparisons: [],
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
const profileBanner = document.getElementById('profileBanner');
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
const toggleSecondaryInfoSection = document.getElementById('toggleSecondaryInfoSection');
const toggleChartSection = document.getElementById('toggleChartSection');
const toggleBacktestMarkersCheckbox = document.getElementById('toggleBacktestMarkers');
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
const backtestAvgTradeReturn = document.getElementById('backtestAvgTradeReturn');
const backtestAvgHoldingDays = document.getElementById('backtestAvgHoldingDays');
const backtestAvgWinReturn = document.getElementById('backtestAvgWinReturn');
const backtestAvgLossReturn = document.getElementById('backtestAvgLossReturn');
const backtestSignalCounts = document.getElementById('backtestSignalCounts');
const backtestActionCounts = document.getElementById('backtestActionCounts');
const backtestSetupStats = document.getElementById('backtestSetupStats');
const backtestStrategyCompare = document.getElementById('backtestStrategyCompare');
const backtestTableBody = document.getElementById('backtestTableBody');
const chartSection = document.getElementById('chartSection');
const secondaryInfoSection = document.getElementById('secondaryInfoSection');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('strategySelect')?.closest('.strategy-row')?.remove();
  document.getElementById('toggleRulesSection')?.closest('.section-toggle-row')?.remove();
  document.getElementById('rulesSection')?.remove();
  applyStaticLocalization();
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
  state.currentStrategy = 'balanced';

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
  url.searchParams.delete('strategy');
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
    if (!event.target.closest('.search-wrapper')) autocomplete.classList.add('hidden');
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
    const data = await fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
    const top = (data.suggestions || [])[0];
    if (top) return { symbol: top.symbol, hasDot: top.symbol.includes('.'), resolved: true };
  } catch (_) {
    // Ignore and fall back to the raw query.
  }
  return { symbol: query, hasDot: query.includes('.'), resolved: false };
}

async function fetchAutocomplete(query) {
  try {
    const data = await fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
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
  state.currentStrategy = 'balanced';

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
    const strategy = state.currentStrategy;
    const [technicalResult, financialResult] = await Promise.allSettled([
      fetchJson(`/api/stock/technical?ticker=${encodeURIComponent(ticker)}&range=${range}&suffix=${suffix}&strategy=${strategy}`),
      fetchJson(`/api/stock/financials?ticker=${encodeURIComponent(ticker)}&suffix=${suffix}`),
    ]);

    if (technicalResult.status !== 'fulfilled') {
      const message = technicalResult.reason?.message || '\uae30\uc220\uc801 \ubd84\uc11d \ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.';
      showError(message);
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

    if (financialResult.status === 'fulfilled') {
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
    showError('\uc11c\ubc84 \uc5f0\uacb0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.');
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
  const profile = data.profile || {};
  const profileMeta = [
    profile.market ? formatLocalizedValue(profile.market) : '',
    profile.style ? formatProfileStyle(profile.style) : '',
    profile.calibration?.calibratedThrough ? `KR 기준 ${profile.calibration.calibratedThrough}` : '',
  ].filter(Boolean).join(' · ');

  signalOverview.classList.remove('hidden');
  signalHeadline.textContent = formatSignal(summary.signal);
  signalHeadline.className = `signal-headline signal-${String(summary.signal || 'neutral').toLowerCase()}`;
  signalStrength.textContent = `${formatStrength(summary.strength)} · ${formatProfile(profile.key)}`;
  renderProfileBanner(profile, profileMeta);

  signalReasons.innerHTML = (summary.reasons || []).map(reason => `<li>${escapeHtml(reason)}</li>`).join('');
  signalRisks.innerHTML = (summary.risks || []).map(risk => `<li>${escapeHtml(risk)}</li>`).join('');

  scoreCards.innerHTML = `
    ${renderScoreCard('\ub9e4\uc218 \uc810\uc218', scores.buyScore, '\ud604\uc7ac \uc5d4\uc9c4 \uae30\uc900 \ub9e4\uc218 \uc6b0\uc704 \uc810\uc218\uc785\ub2c8\ub2e4.', 'buy')}
    ${renderScoreCard('\ub9e4\ub3c4 \uc810\uc218', scores.sellScore, '\ud604\uc7ac \uc5d4\uc9c4 \uae30\uc900 \ub9e4\ub3c4 \uc6b0\uc704 \uc810\uc218\uc785\ub2c8\ub2e4.', 'sell')}
    ${renderScoreCard('\ucd94\uc138 \uac15\ub3c4', formatLocalizedValue(marketState.trendStrength), `\ubc29\ud5a5: ${formatLocalizedValue(marketState.trend)}`, 'neutral')}
    ${renderScoreCard('\ubcc0\ub3d9\uc131', formatLocalizedValue(marketState.volatility), `\ubaa8\uba58\ud140: ${formatLocalizedValue(marketState.momentum)}`, 'neutral')}
  `;

  marketBadges.innerHTML = [
    profile.market ? renderBadge(profile.market) : '',
    profile.style ? renderBadge(formatProfileStyle(profile.style)) : '',
    profile.calibration?.calibratedThrough ? renderBadge(`KR 기준 ${profile.calibration.calibratedThrough}`) : '',
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

function renderProfileBanner(profile, profileMeta) {
  if (!profileBanner) return;

  if (!profile?.key) {
    profileBanner.classList.add('hidden');
    profileBanner.innerHTML = '';
    return;
  }

  profileBanner.innerHTML = `
    <div class="signal-profile-eyebrow">활성 프로필</div>
    <div class="signal-profile-name">${escapeHtml(profile.label || formatProfile(profile.key))}</div>
    <div class="signal-profile-meta">${escapeHtml(profileMeta || '기본 기준선')}</div>
  `;
  profileBanner.classList.remove('hidden');
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
  if (profileBanner) {
    profileBanner.classList.add('hidden');
    profileBanner.innerHTML = '';
  }
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
        \uc7ac\ubb34\uc81c\ud45c \ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.<br>
        \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.
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
  bindSectionToggle(toggleChartSection, chartSection);
  bindSectionToggle(toggleSecondaryInfoSection, secondaryInfoSection);
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
  if (!historicalDateInput.value) historicalDateInput.value = lastDate;
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
  historicalSignalBtn.textContent = '\uacc4\uc0b0 \uc911...';

  try {
    const suffix = suffixSelect.value;
    const strategy = state.currentStrategy;
    const data = await fetchJson(`/api/stock/historical-snapshot?ticker=${encodeURIComponent(state.currentTicker)}&snapshot_date=${encodeURIComponent(historicalDateInput.value)}&range=5y&suffix=${suffix}&strategy=${strategy}`);

    renderHistoricalSignal(data);
  } catch (error) {
    showError(error.message || '\uacfc\uac70 \ub0a0\uc9dc \uc2e0\ud638\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.');
  } finally {
    historicalSignalBtn.disabled = false;
    historicalSignalBtn.textContent = '\uacc4\uc0b0';
  }
}

function renderHistoricalSignal(data) {
  const snapshot = data.snapshot || {};
  const indicators = data.indicators || {};
  const breakdowns = data.signalScores || {};

  historicalSignalResult.classList.remove('hidden');
  historicalRequestedDate.textContent = data.requestedDate || '-';
  historicalActualDate.textContent = data.actualDate || '-';
  historicalSignalLabel.textContent = formatSignal(data.signalSummary?.signal);
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
  if (!breakdown) return '<div class="breakdown-item">\ub370\uc774\ud130 \uc5c6\uc74c</div>';
  return Object.entries(breakdown).map(([key, value]) => `
    <div class="breakdown-item">
      <span>${escapeHtml(localizeBreakdownKey(key))}</span>
      <strong>${escapeHtml(String(value ?? '-'))}</strong>
    </div>
  `).join('');
}

function localizeBreakdownKey(key) {
  const labels = {
    trend: '\ucd94\uc138',
    momentum: '\ubaa8\uba58\ud140',
    volume: '\uac70\ub798\ub7c9',
    location: '\uac00\uaca9 \uc704\uce58',
    risk: '\ub9ac\uc2a4\ud06c',
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
  state.backtestData = null;
  state.backtestComparisons = [];
  backtestResult.classList.add('hidden');
  backtestTableBody.innerHTML = '';
  backtestSignalCounts.innerHTML = '';
  backtestActionCounts.innerHTML = '';
  backtestSetupStats.innerHTML = '';
  backtestStrategyCompare.innerHTML = '';
  backtestStartDate.value = '';
  backtestEndDate.value = '';
  backtestAvgTradeReturn.textContent = '-';
  backtestAvgHoldingDays.textContent = '-';
  backtestAvgWinReturn.textContent = '-';
  backtestAvgLossReturn.textContent = '-';
  if (toggleBacktestMarkersCheckbox) toggleBacktestMarkersCheckbox.checked = false;
  if (typeof buildBacktestChart === 'function') buildBacktestChart({ equityCurve: [], results: [] });
  if (typeof setBacktestMarkers === 'function') setBacktestMarkers(null);
}

async function fetchBacktest() {
  if (!state.currentTicker || !backtestStartDate.value || !backtestEndDate.value) return;

  backtestBtn.disabled = true;
  backtestBtn.textContent = '\uc2e4\ud589 \uc911...';

  try {
    const comparisons = await fetchBacktestComparisons();
    const primary = comparisons.find(item => item.strategy === state.currentStrategy) || comparisons[0];
    if (!primary) throw new Error('백테스트 결과가 없습니다.');
    renderBacktest(primary, comparisons);
  } catch (_) {
    showError('\ubc31\ud14c\uc2a4\ud2b8\ub97c \uc2e4\ud589\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.');
  } finally {
    backtestBtn.disabled = false;
    backtestBtn.textContent = '\uc2e4\ud589';
  }
}

async function fetchBacktestComparisons() {
  const suffix = suffixSelect.value;
  const strategies = Object.keys(STRATEGY_LABELS);
  const requests = strategies.map(async strategy => {
    const data = await fetchJson(`/api/stock/backtest?ticker=${encodeURIComponent(state.currentTicker)}&start_date=${encodeURIComponent(backtestStartDate.value)}&end_date=${encodeURIComponent(backtestEndDate.value)}&range=5y&suffix=${suffix}&strategy=${strategy}`);
    return data;
  });
  return Promise.all(requests);
}

function renderBacktest(data, comparisons) {
  state.backtestData = data;
  state.backtestComparisons = comparisons;
  const summary = data.summary || {};
  const actualRange = data.actualRange || {};
  const statistics = data.statistics || {};
  const tradeStats = statistics.tradeStats || {};
  const results = data.results || [];

  backtestResult.classList.remove('hidden');
  backtestCumulativeReturn.textContent = formatPercent(summary.cumulativeReturnPct);
  backtestTradeCount.textContent = String(summary.tradeCount ?? 0);
  backtestWinRate.textContent = formatPercent(summary.winRatePct);
  backtestMdd.textContent = formatPercent(summary.maxDrawdownPct);
  backtestBuyHold.textContent = formatPercent(summary.buyHoldReturnPct);
  backtestActualRange.textContent = `${actualRange.startDate || '-'} ~ ${actualRange.endDate || '-'} (${actualRange.tradingDays || 0}\uc77c)`;
  backtestAvgTradeReturn.textContent = formatPercent(tradeStats.avgTradeReturnPct);
  backtestAvgHoldingDays.textContent = tradeStats.avgHoldingDays == null ? '-' : `${tradeStats.avgHoldingDays.toFixed(1)}\uc77c`;
  backtestAvgWinReturn.textContent = formatPercent(tradeStats.avgWinReturnPct);
  backtestAvgLossReturn.textContent = formatPercent(tradeStats.avgLossReturnPct);
  backtestSignalCounts.innerHTML = renderCountBreakdown(statistics.signalCounts, { BUY: '\ub9e4\uc218 \uc2e0\ud638', SELL: '\ub9e4\ub3c4 \uc2e0\ud638', HOLD: '\uad00\ub9dd \uc2e0\ud638' });
  backtestActionCounts.innerHTML = renderCountBreakdown(statistics.actionCounts, { ENTER_LONG: '\uc9c4\uc785', EXIT_LONG: '\uccad\uc0b0', HOLD: '\uc720\uc9c0' });
  backtestSetupStats.innerHTML = renderSetupStats(statistics.setupStats || {});
  backtestStrategyCompare.innerHTML = renderStrategyComparison(comparisons);

  backtestTableBody.innerHTML = results.map(item => `
    <tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${escapeHtml(formatMaybePrice(item.close))}</td>
      <td>${escapeHtml(String(item.buyScore ?? '-'))}</td>
      <td>${escapeHtml(String(item.sellScore ?? '-'))}</td>
      <td>${escapeHtml(formatSignal(item.signal))}</td>
      <td>${escapeHtml(formatLocalizedValue(item.position || '-'))}</td>
      <td>${escapeHtml(formatAction(item.action))}</td>
      <td>${escapeHtml(formatPercent(item.cumulativeReturnPct))}</td>
    </tr>
  `).join('');

  if (typeof buildBacktestChart === 'function') buildBacktestChart(data);
  if (typeof buildStrategyCompareChart === 'function') buildStrategyCompareChart(comparisons);
  if (typeof setBacktestMarkers === 'function') setBacktestMarkers(data);
  if (typeof toggleBacktestMarkers === 'function') toggleBacktestMarkers(Boolean(toggleBacktestMarkersCheckbox?.checked));
}

function renderCountBreakdown(counts, labels) {
  if (!counts) return '<div class="breakdown-item">\ub370\uc774\ud130 \uc5c6\uc74c</div>';
  return Object.entries(labels).map(([key, label]) => `
    <div class="breakdown-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(counts[key] ?? 0))}</strong>
    </div>
  `).join('');
}

function renderSetupStats(setupStats) {
  const cards = [];
  if (setupStats.buySignals) cards.push(buildSetupStatCard('\ub9e4\uc218 \uc2e0\ud638 \uc774\ud6c4', setupStats.buySignals));
  if (setupStats.sellSignals) cards.push(buildSetupStatCard('\ub9e4\ub3c4 \uc2e0\ud638 \uc774\ud6c4', setupStats.sellSignals));
  return cards.join('');
}

function buildSetupStatCard(title, stats) {
  const lines = Object.entries(stats).map(([horizon, value]) => `
    <div class="setup-stat-line">
      <span>${escapeHtml(horizon)}</span>
      <strong>${escapeHtml(formatSetupValue(value))}</strong>
    </div>
  `).join('');
  return `<div class="setup-stat-card"><div class="setup-stat-title">${escapeHtml(title)}</div><div class="setup-stat-lines">${lines}</div></div>`;
}

function formatSetupValue(value) {
  if (!value || !value.count) return '\ud45c\ubcf8 \uc5c6\uc74c';
  return `\uc2b9\ub960 ${formatPercent(value.winRatePct)} / \ud3c9\uade0 ${formatPercent(value.avgReturnPct)}`;
}

function renderStrategyComparison(comparisons) {
  if (!comparisons?.length) return '';
  const bestReturn = [...comparisons].sort((a, b) => (b.summary?.cumulativeReturnPct ?? -Infinity) - (a.summary?.cumulativeReturnPct ?? -Infinity))[0];
  const bestWinRate = [...comparisons].sort((a, b) => (b.summary?.winRatePct ?? -Infinity) - (a.summary?.winRatePct ?? -Infinity))[0];
  const lowestMdd = [...comparisons].sort((a, b) => Math.abs(a.summary?.maxDrawdownPct ?? Infinity) - Math.abs(b.summary?.maxDrawdownPct ?? Infinity))[0];
  const badge = (label, value) => `<span class="strategy-compare-badge">${label} <strong>${escapeHtml(value)}</strong></span>`;
  const rows = comparisons.map(item => `
    <tr class="${item.strategy === state.currentStrategy ? 'is-selected' : ''}">
      <td><strong>${escapeHtml(formatStrategy(item.strategy))}</strong>${item.strategy === state.currentStrategy ? ' (\uc120\ud0dd \uc911)' : ''}</td>
      <td>${escapeHtml(formatPercent(item.summary?.cumulativeReturnPct))}</td>
      <td>${escapeHtml(formatPercent(item.summary?.winRatePct))}</td>
      <td>${escapeHtml(String(item.summary?.tradeCount ?? 0))}</td>
      <td>${escapeHtml(formatPercent(item.summary?.maxDrawdownPct))}</td>
      <td>${escapeHtml(formatPercent(item.summary?.buyHoldReturnPct))}</td>
    </tr>
  `).join('');

  return `
    <div class="strategy-compare-panel">
      <div class="strategy-compare-header">
        <div class="signal-panel-title">\uc804\ub7b5\ubcc4 \ubc31\ud14c\uc2a4\ud2b8 \ube44\uad50</div>
        <div class="strategy-compare-badges">
          ${badge('\ucd5c\uace0 \uc218\uc775\ub960', formatStrategy(bestReturn.strategy))}
          ${badge('\ucd5c\uace0 \uc2b9\ub960', formatStrategy(bestWinRate.strategy))}
          ${badge('\uac00\uc7a5 \uc791\uc740 MDD', formatStrategy(lowestMdd.strategy))}
        </div>
      </div>
      <div class="table-container">
        <table class="fin-table strategy-compare-table">
          <thead>
            <tr>
              <th>\uc804\ub7b5</th>
              <th>\ub204\uc801 \uc218\uc775\ub960</th>
              <th>\uc2b9\ub960</th>
              <th>\ub9e4\ub9e4 \ud69f\uc218</th>
              <th>MDD</th>
              <th>Buy & Hold</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
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
    button.addEventListener('click', event => {
      event.preventDefault();
      if (!state.currentTicker) return;
      if (button.dataset.range === state.currentRange) return;
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
  const scrollY = window.scrollY;
  showLoading(true);

  try {
    const suffix = suffixSelect.value;
    const strategy = state.currentStrategy;
    const data = await fetchJson(`/api/stock/technical?ticker=${encodeURIComponent(state.currentTicker)}&range=${state.currentRange}&suffix=${suffix}&strategy=${strategy}`);

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
    window.scrollTo({ top: scrollY, behavior: 'auto' });
  } catch (_) {
    showError('\uae30\uc220\uc801 \ubd84\uc11d \ub370\uc774\ud130\ub97c \ub2e4\uc2dc \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.');
    showLoading(false);
    showMainContent();
    window.scrollTo({ top: scrollY, behavior: 'auto' });
  }
}

function setupIndicatorToggles() {
  document.getElementById('toggleBB').addEventListener('change', event => toggleBollingerBands(event.target.checked));
  document.getElementById('toggleMA').addEventListener('change', event => toggleMovingAverages(event.target.checked));
  document.getElementById('toggleLevels').addEventListener('change', event => toggleSupportResistance(event.target.checked));
  document.getElementById('toggleRSI').addEventListener('change', event => toggleRSI(event.target.checked));
  document.getElementById('toggleMACD').addEventListener('change', event => toggleMACD(event.target.checked));
  if (toggleBacktestMarkersCheckbox) {
    toggleBacktestMarkersCheckbox.addEventListener('change', event => {
      if (typeof toggleBacktestMarkers === 'function') toggleBacktestMarkers(event.target.checked);
    });
  }
}

function syncIndicatorToggleState() {
  toggleBollingerBands(document.getElementById('toggleBB').checked);
  toggleMovingAverages(document.getElementById('toggleMA').checked);
  toggleSupportResistance(document.getElementById('toggleLevels').checked);
  toggleRSI(document.getElementById('toggleRSI').checked);
  toggleMACD(document.getElementById('toggleMACD').checked);
  if (typeof setBacktestMarkers === 'function') setBacktestMarkers(state.backtestData);
  if (typeof toggleBacktestMarkers === 'function') toggleBacktestMarkers(Boolean(toggleBacktestMarkersCheckbox?.checked));
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
      if (state.financialData) renderAllFinancials(state.financialData, state.currentFinancialPeriod, state.currency);
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
    const response = await fetchJson(`/api/news/${encodeURIComponent(ticker)}`);
    renderNews(response.news || []);
  } catch (_) {
    list.innerHTML = '<p class="news-empty">\uad00\ub828 \ub274\uc2a4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.</p>';
  } finally {
    spinner.classList.add('hidden');
  }
}

async function fetchAndRenderFearGreed() {
  try {
    const data = await fetchJson('/api/market/fear-greed');
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

  fearGreedSection.classList.remove('hidden');
  fearGreedValue.textContent = String(value);
  fearGreedLabel.textContent = formatFearGreedLabel(data.classification);
  fearGreedLabel.className = `fear-greed-label ${fearGreedToneClass(value)}`;
  fearGreedMeta.textContent = buildFearGreedMeta(data);
  fearGreedFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  fearGreedFill.className = `fear-greed-scale-fill ${fearGreedToneClass(value)}`;
}

function buildFearGreedMeta(data) {
  const source = data.source ? `\ucd9c\ucc98: ${data.source}` : '';
  const nextUpdate = Number.isFinite(data.timeUntilUpdate) ? `\ub2e4\uc74c \uc5c5\ub370\uc774\ud2b8\uae4c\uc9c0 \uc57d ${Math.max(1, Math.round(data.timeUntilUpdate / 3600))}\uc2dc\uac04` : '';
  return [source, nextUpdate].filter(Boolean).join(' · ');
}

function fearGreedToneClass(value) {
  if (value <= 25) return 'tone-fear';
  if (value >= 75) return 'tone-greed';
  return 'tone-neutral';
}

function formatFearGreedLabel(classification) {
  const labels = {
    'Extreme Fear': '\uadf9\ub3c4\uc758 \uacf5\ud3ec',
    Fear: '\uacf5\ud3ec',
    Neutral: '\uc911\ub9bd',
    Greed: '\ud0d0\uc695',
    'Extreme Greed': '\uadf9\ub3c4\uc758 \ud0d0\uc695',
  };
  return labels[classification] || classification || '\uc911\ub9bd';
}

function renderNews(articles) {
  const list = document.getElementById('newsList');
  if (!articles.length) {
    list.innerHTML = '<p class="news-empty">\uad00\ub828 \ub274\uc2a4\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.</p>';
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

function showLoading(show) { loadingSpinner.classList.toggle('hidden', !show); }
function showError(message) { errorMsg.textContent = message; errorBanner.classList.remove('hidden'); }
function hideError() { errorBanner.classList.add('hidden'); }
function showMainContent() { mainContent.classList.remove('hidden'); }
function hideMainContent() { mainContent.classList.add('hidden'); }

function formatPrice(value, currency) {
  if (value == null) return '';
  if (currency === 'KRW') return `KRW ${Math.round(value).toLocaleString('ko-KR')}`;
  return `$${Number(value).toFixed(2)}`;
}

function formatSignal(signal) {
  if (signal === 'BUY') return '\ub9e4\uc218 \uc6b0\uc704';
  if (signal === 'SELL') return '\ub9e4\ub3c4 \uc6b0\uc704';
  if (signal === 'HOLD') return '\uad00\ub9dd';
  return '\uc911\ub9bd / \uad00\ub9dd';
}

function formatStrength(strength) { return formatLocalizedValue(strength || 'watch'); }
function formatStrategy(strategy) { return STRATEGY_LABELS[strategy] || strategy || STRATEGY_LABELS.balanced; }
function formatProfile(profile) { return PROFILE_LABELS[profile] || profile || PROFILE_LABELS.us_broad_large_cap; }
function formatScoreValue(value) { return typeof value === 'number' ? `${value}/100` : formatLocalizedValue(value || 'unknown'); }
function formatProfileStyle(style) { return formatLocalizedValue(style || 'unknown'); }

function formatLocalizedValue(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  const labels = {
    buy: '\ub9e4\uc218',
    sell: '\ub9e4\ub3c4',
    neutral: '\uc911\ub9bd',
    hold: '\uad00\ub9dd',
    unknown: '\uc815\ubcf4 \uc5c6\uc74c',
    watch: '\uad00\ucc30',
    weak: '\uc57d\ud568',
    moderate: '\ubcf4\ud1b5',
    strong: '\uac15\ud568',
    very_strong: '\ub9e4\uc6b0 \uac15\ud568',
    uptrend: '\uc0c1\uc2b9 \ucd94\uc138',
    downtrend: '\ud558\ub77d \ucd94\uc138',
    range: '\ud6a1\ubcf4',
    bullish: '\uac15\uc138',
    bearish: '\uc57d\uc138',
    high: '\ub192\uc74c',
    low: '\ub0ae\uc74c',
    above_ema20: 'EMA20 \uc704',
    below_ema20: 'EMA20 \uc544\ub798',
    above_sma200: 'SMA200 \uc704',
    below_sma200: 'SMA200 \uc544\ub798',
    kr: 'KR',
    us: 'US',
    broad_large_cap: '\ub300\ud615\uc8fc',
    megacap_growth: '\uba54\uac00\ucea1 \uc131\uc7a5',
    long: '\ubcf4\uc720 \uc911',
    cash: '\ud604\uae08',
  };
  return labels[normalized] || String(value).replace(/_/g, ' ');
}

function formatAction(action) {
  const labels = { ENTER_LONG: '\uc9c4\uc785', EXIT_LONG: '\uccad\uc0b0', HOLD: '\uc720\uc9c0' };
  return labels[action] || action || '-';
}

function formatMaybeNumber(value, digits = 2) { return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-'; }
function formatMaybePrice(value) { return typeof value === 'number' && Number.isFinite(value) ? formatPrice(value, state.currency) : '-'; }
function formatPercent(value) { if (typeof value !== 'number' || !Number.isFinite(value)) return '-'; const sign = value > 0 ? '+' : ''; return `${sign}${value.toFixed(2)}%`; }

function formatBollingerBands(indicators, snapshot) {
  const upper = indicators.bollingerUpper ?? snapshot.bollingerUpper;
  const middle = indicators.bollingerMiddle ?? snapshot.bollingerMiddle;
  const lower = indicators.bollingerLower ?? snapshot.bollingerLower;
  return `${formatMaybePrice(upper)} / ${formatMaybePrice(middle)} / ${formatMaybePrice(lower)}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload?.ok === false) {
    const message = payload?.error?.message || '\uc694\uccad\uc744 \ucc98\ub9ac\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.';
    const error = new Error(message);
    error.status = payload?.error?.status || response.status;
    error.code = payload?.error?.code || 'REQUEST_FAILED';
    throw error;
  }

  return payload?.data ?? payload;
}

function escapeHtml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escapeAttr(str) { const value = String(str).trim(); if (!/^https?:\/\//i.test(value)) return '#'; return value.replace(/"/g, '%22'); }
function escapeAttribute(str) { return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function applyStaticLocalization() {
  tickerInput.placeholder = '\uc608: \uc0bc\uc131\uc804\uc790, Apple, AAPL, 005930';
  setOptionText(suffixSelect, ['\uc790\ub3d9', 'KOSPI (.KS)', 'KOSDAQ (.KQ)', '\uc811\ubbf8\uc0ac \uc5c6\uc74c']);
  setButtonText(searchBtn, '\uc870\ud68c');
  setText('#loadingSpinner p', '\ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4.');
  setText('.tab-btn[data-tab="technical"]', '\uae30\uc220\uc801 \ubd84\uc11d');
  setText('.tab-btn[data-tab="financials"]', '\uc7ac\ubb34\uc81c\ud45c');
  setText('.eyebrow', '\uc2e4\uc2dc\uac04 \uc2e0\ud638 \uc5d4\uc9c4');
  setPanelTitles();
}

function setPanelTitles() {
  const toggleTexts = ['\uc2e0\ud638 \uacc4\uc0b0 \uc124\uba85', 'Point-in-Time', 'Backtest', '\ucc28\ud2b8\uc640 \uc9c0\ud45c', '\ubcf4\uc870 \uc815\ubcf4'];
  document.querySelectorAll('.section-toggle-text').forEach((node, index) => { if (toggleTexts[index]) node.textContent = toggleTexts[index]; });
  const titles = document.querySelectorAll('.historical-signal-title');
  if (titles[0]) titles[0].textContent = '\ud604\uc7ac \uc810\uc218\ub97c \uacc4\uc0b0\ud558\ub294 \ud575\uc2ec \uae30\uc900';
  if (titles[1]) titles[1].textContent = '\uacfc\uac70 \ud2b9\uc815 \ub0a0\uc9dc \uc2e0\ud638 \uc870\ud68c';
  if (titles[2]) titles[2].textContent = '\ub0a0\uc9dc \uad6c\uac04 \ubc31\ud14c\uc2a4\ud2b8';
  const notes = document.querySelectorAll('.historical-signal-note');
  if (notes[0]) notes[0].textContent = '\uc120\ud0dd\ud55c \ub0a0\uc9dc\uae4c\uc9c0\uc758 \uacfc\uac70 \ub370\uc774\ud130\ub9cc \uc0ac\uc6a9\ud574\uc11c \uadf8 \uc2dc\uc810\uc758 \uc810\uc218\uc640 \uc2e0\ud638\ub97c \uacc4\uc0b0\ud569\ub2c8\ub2e4.';
  if (notes[1]) notes[1].textContent = '\uc120\ud0dd\ud55c \uc804\ub7b5 \uae30\uc900\uc73c\ub85c \uad6c\uac04\ubcc4 \uc2e0\ud638\ub97c \uacc4\uc0b0\ud558\uace0 \uc2e4\uc81c \uc9c4\uc785/\uccad\uc0b0 \uae30\ub85d\uc744 \uc694\uc57d\ud569\ub2c8\ub2e4.';
  setButtonText(historicalSignalBtn, '\uacc4\uc0b0');
  setButtonText(backtestBtn, '\uc2e4\ud589');
  const signalPanelTitles = document.querySelectorAll('.signal-panel-title');
  if (signalPanelTitles[0]) signalPanelTitles[0].textContent = '\ub9e4\uc218 \uc810\uc218';
  if (signalPanelTitles[1]) signalPanelTitles[1].textContent = '\ub9e4\ub3c4 \uc810\uc218';
  if (signalPanelTitles[2]) signalPanelTitles[2].textContent = '\uc804\ub7b5 \ubaa8\ub4dc \ucc28\uc774';
  if (signalPanelTitles[3]) signalPanelTitles[3].textContent = '\ub9e4\uc218 \uc810\uc218 \uad6c\uc131';
  if (signalPanelTitles[4]) signalPanelTitles[4].textContent = '\ub9e4\ub3c4 \uc810\uc218 \uad6c\uc131';
  if (signalPanelTitles[5]) signalPanelTitles[5].textContent = '\uc2e0\ud638 \ubc1c\uc0dd \ud69f\uc218';
  if (signalPanelTitles[6]) signalPanelTitles[6].textContent = '\uc2e4\uc81c \ud589\ub3d9 \ud69f\uc218';
  if (signalPanelTitles[7]) signalPanelTitles[7].textContent = '\uc2e0\ud638 \uc774\ud6c4 \ud3c9\uade0 \uc131\uacfc';
  const summaryLabels = document.querySelectorAll('.historical-label');
  const labelTexts = ['\uc120\ud0dd\ud55c \ub0a0\uc9dc', '\uc2e4\uc81c \uacc4\uc0b0 \uae30\uc900\uc77c', '\ucd5c\uc885 \uc2e0\ud638', '\ub9e4\uc218 / \ub9e4\ub3c4 \uc810\uc218', '\ub204\uc801 \uc218\uc775\ub960', '\ub9e4\ub9e4 \ud69f\uc218', '\uc2b9\ub960', 'MDD', 'Buy & Hold', '\uc2e4\uc81c \uae30\uac04'];
  summaryLabels.forEach((node, index) => { if (labelTexts[index]) node.textContent = labelTexts[index]; });
  const indicatorLabels = document.querySelectorAll('.historical-indicator-item span');
  const indicatorTexts = ['\uc885\uac00', 'RSI', 'MACD', 'MACD \uc2dc\uadf8\ub110', '\ubcfc\ub9b0\uc800 \ubc34\ub4dc', 'EMA20 / EMA50', 'ATR14 / ADX14', '\uac70\ub798\ub7c9 \ube44\uc728', '\uc9c0\uc9c0\uc120 / \uc800\ud56d\uc120', '\ud3c9\uade0 \uac70\ub798 \uc218\uc775\ub960', '\ud3c9\uade0 \ubcf4\uc720 \uc77c\uc218', '\ud3c9\uade0 \uc2b9\ub9ac \uc218\uc775\ub960', '\ud3c9\uade0 \uc190\uc2e4 \uc218\uc775\ub960'];
  indicatorLabels.forEach((node, index) => { if (indicatorTexts[index]) node.textContent = indicatorTexts[index]; });
  setText('.fear-greed-eyebrow', '\uc2dc\uc7a5 \uc2ec\ub9ac');
  setText('.fear-greed-title', '\uacf5\ud3ec\ud0d0\uc695\uc9c0\uc218');
  document.querySelectorAll('.fear-greed-scale-labels span').forEach((node, index) => {
    node.textContent = ['\uadf9\ub3c4\uc758 \uacf5\ud3ec', '\uc911\ub9bd', '\uadf9\ub3c4\uc758 \ud0d0\uc695'][index];
  });
  setText('.news-title', '\uad00\ub828 \ub274\uc2a4');
  setText('.range-label', '\ucc28\ud2b8 \uae30\uac04:');
  setText('.chart-title', '\uc8fc\uac00 \ud750\ub984');
  document.querySelectorAll('.legend-item').forEach((node, index) => {
    node.lastChild.nodeValue = ['\uc885\uac00', '\uc774\ub3d9\ud3c9\uade0\uc120', '\ubcfc\ub9b0\uc800 \ubc34\ub4dc', '\uac70\ub798\ub7c9 MA20'][index] ? ` ${['\uc885\uac00', '\uc774\ub3d9\ud3c9\uade0\uc120', '\ubcfc\ub9b0\uc800 \ubc34\ub4dc', '\uac70\ub798\ub7c9 MA20'][index]}` : node.lastChild.nodeValue;
  });
  setText('.indicator-toggles-label', '\uc9c0\ud45c \ud1a0\uae00');
  const indicatorToggles = document.querySelectorAll('.indicator-toggle');
  ['EMA / SMA', '\ubcfc\ub9b0\uc800 \ubc34\ub4dc', '\uc9c0\uc9c0\uc120 / \uc800\ud56d\uc120', 'RSI', 'MACD', '\ubc31\ud14c\uc2a4\ud2b8 \uc9c4\uc785/\uccad\uc0b0'].forEach((text, index) => {
    if (indicatorToggles[index]) indicatorToggles[index].lastChild.nodeValue = ` ${text}`;
  });
  const finTabs = document.querySelectorAll('.fin-tab-btn');
  ['\uc190\uc775\uacc4\uc0b0\uc11c', '\uc7ac\ubb34\uc0c1\ud0dc\ud45c', '\ud604\uae08\ud750\ub984\ud45c'].forEach((text, index) => { if (finTabs[index]) finTabs[index].textContent = text; });
  const periodTabs = document.querySelectorAll('.period-btn');
  ['\uc5f0\uac04', '\ubd84\uae30'].forEach((text, index) => { if (periodTabs[index]) periodTabs[index].textContent = text; });
}

function setText(selector, text) { const node = document.querySelector(selector); if (node) node.textContent = text; }
function setOptionText(select, labels) { if (!select) return; Array.from(select.options).forEach((option, index) => { if (labels[index]) option.textContent = labels[index]; }); }
function setButtonText(button, text) { if (!button) return; const textNode = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE); if (textNode) textNode.nodeValue = ` ${text}`; else button.append(` ${text}`); }

