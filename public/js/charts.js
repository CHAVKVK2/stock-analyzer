'use strict';

Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#21262d';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif";

const chartInstances = {};
const PRICE_LABELS = {
  close: '\uc885\uac00',
  ema20: 'EMA 20',
  ema50: 'EMA 50',
  sma200: 'SMA 200',
  bbUpper: '\ubcfc\ub9b0\uc800 \uc0c1\ub2e8',
  bbMiddle: '\ubcfc\ub9b0\uc800 \uc911\uc2ec',
  bbLower: '\ubcfc\ub9b0\uc800 \ud558\ub2e8',
  volume: '\uac70\ub798\ub7c9',
  volumeMA20: '\uac70\ub798\ub7c9 MA20',
  rsi: 'RSI',
  rsiUpper: 'RSI 70',
  rsiLower: 'RSI 30',
  macd: 'MACD',
  macdSignal: 'MACD \uc2dc\uadf8\ub110',
  macdHistogram: 'MACD \ud788\uc2a4\ud1a0\uadf8\ub7a8',
  entry: '\ubc31\ud14c\uc2a4\ud2b8 \uc9c4\uc785',
  exit: '\ubc31\ud14c\uc2a4\ud2b8 \uccad\uc0b0',
};

const PRICE_DATASET_GROUPS = {
  bollinger: [PRICE_LABELS.bbUpper, PRICE_LABELS.bbMiddle, PRICE_LABELS.bbLower],
  movingAverages: [PRICE_LABELS.ema20, PRICE_LABELS.ema50, PRICE_LABELS.sma200, PRICE_LABELS.volumeMA20],
  supportResistance: ['\uc9c0\uc9c0\uc120 1', '\uc9c0\uc9c0\uc120 2', '\uc9c0\uc9c0\uc120 3', '\uc800\ud56d\uc120 1', '\uc800\ud56d\uc120 2', '\uc800\ud56d\uc120 3'],
  rsi: [PRICE_LABELS.rsi, PRICE_LABELS.rsiUpper, PRICE_LABELS.rsiLower],
  macd: [PRICE_LABELS.macd, PRICE_LABELS.macdSignal, PRICE_LABELS.macdHistogram],
  backtestMarkers: [PRICE_LABELS.entry, PRICE_LABELS.exit],
};

let currentPriceChartMeta = { labels: [], closes: [], currency: 'USD' };
let currentBacktestMarkers = null;

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function toggleBollingerBands(show) { setDatasetVisibility('price', PRICE_DATASET_GROUPS.bollinger, show); }
function toggleMovingAverages(show) { setDatasetVisibility('price', PRICE_DATASET_GROUPS.movingAverages, show); }
function toggleSupportResistance(show) { setDatasetVisibility('price', PRICE_DATASET_GROUPS.supportResistance, show); }

function toggleRSI(show) {
  const chart = chartInstances.price;
  if (!chart) return;
  setDatasetVisibility('price', PRICE_DATASET_GROUPS.rsi, show);
  chart.options.scales.y2.display = show;
  chart.update('none');
}

function toggleMACD(show) {
  const chart = chartInstances.price;
  if (!chart) return;
  setDatasetVisibility('price', PRICE_DATASET_GROUPS.macd, show);
  chart.options.scales.y3.display = show;
  chart.update('none');
}

function toggleBacktestMarkers(show) { setDatasetVisibility('price', PRICE_DATASET_GROUPS.backtestMarkers, show); }

function setDatasetVisibility(chartId, labels, show) {
  const chart = chartInstances[chartId];
  if (!chart) return;
  chart.data.datasets.forEach((dataset, index) => {
    if (labels.includes(dataset.label)) chart.getDatasetMeta(index).hidden = !show;
  });
  chart.update('none');
}

function buildPriceChart(data) {
  destroyChart('price');
  const canvas = document.getElementById('priceChart');
  if (!canvas) return;

  const labels = data.prices.map(item => item.date);
  const closes = data.prices.map(item => item.close);
  const volumes = data.prices.map(item => item.volume);
  const bb = data.indicators.bollingerBands;
  const movingAverages = data.indicators.movingAverages;
  const volumeIndicators = data.indicators.volumeIndicators;
  const levels = data.indicators.levels || { supports: [], resistances: [] };
  const rsiValues = data.indicators.rsi;
  const macd = data.indicators.macd;

  currentPriceChartMeta = { labels, closes, currency: data.meta.currency };

  const histogramColors = macd.histogram.map(value => {
    if (value == null) return 'transparent';
    return value >= 0 ? 'rgba(63, 185, 80, 0.5)' : 'rgba(248, 81, 73, 0.5)';
  });

  const supportDatasets = buildLevelDatasets(labels, levels.supports, '\uc9c0\uc9c0\uc120', 'rgba(63, 185, 80, 0.28)');
  const resistanceDatasets = buildLevelDatasets(labels, levels.resistances, '\uc800\ud56d\uc120', 'rgba(248, 81, 73, 0.28)');

  chartInstances.price = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        datasetLine(PRICE_LABELS.close, closes, '#58a6ff', 'y', 3, 1.8),
        datasetLine(PRICE_LABELS.ema20, movingAverages.ema20, '#f0883e', 'y', 4, 1.2),
        datasetLine(PRICE_LABELS.ema50, movingAverages.ema50, '#bc8cff', 'y', 4, 1.2),
        datasetLine(PRICE_LABELS.sma200, movingAverages.sma200, '#2ea043', 'y', 4, 1.2, [6, 4]),
        datasetLine(PRICE_LABELS.bbUpper, bb.upper, 'rgba(139, 148, 158, 0.45)', 'y', 2, 1, [4, 3]),
        datasetLine(PRICE_LABELS.bbMiddle, bb.middle, 'rgba(139, 148, 158, 0.75)', 'y', 2, 1, [2, 2]),
        datasetLine(PRICE_LABELS.bbLower, bb.lower, 'rgba(139, 148, 158, 0.45)', 'y', 2, 1, [4, 3]),
        ...supportDatasets,
        ...resistanceDatasets,
        ...buildBacktestMarkerDatasets(labels, closes),
        { label: PRICE_LABELS.volume, data: volumes, type: 'bar', backgroundColor: 'rgba(63, 185, 80, 0.18)', borderColor: 'rgba(63, 185, 80, 0.35)', borderWidth: 0, yAxisID: 'yVol', order: 10 },
        datasetLine(PRICE_LABELS.volumeMA20, volumeIndicators.volumeMA20, '#d29922', 'yVol', 9, 1),
        { ...datasetLine(PRICE_LABELS.rsi, rsiValues, '#bc8cff', 'y2', 5, 1.4), hidden: true },
        { ...datasetLine(PRICE_LABELS.rsiUpper, labels.map(() => 70), 'rgba(248, 81, 73, 0.35)', 'y2', 5, 1, [4, 4]), hidden: true, tension: 0 },
        { ...datasetLine(PRICE_LABELS.rsiLower, labels.map(() => 30), 'rgba(63, 185, 80, 0.35)', 'y2', 5, 1, [4, 4]), hidden: true, tension: 0 },
        { ...datasetLine(PRICE_LABELS.macd, macd.macdLine, '#58a6ff', 'y3', 6, 1.4), hidden: true },
        { ...datasetLine(PRICE_LABELS.macdSignal, macd.signalLine, '#f0883e', 'y3', 6, 1.4), hidden: true },
        { label: PRICE_LABELS.macdHistogram, data: macd.histogram, type: 'bar', backgroundColor: histogramColors, borderColor: histogramColors, borderWidth: 0, yAxisID: 'y3', hidden: true, order: 7 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#21262d',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label(item) {
              const label = item.dataset.label;
              const raw = item.raw;
              if (raw == null) return null;
              if (label === PRICE_LABELS.volume || label === PRICE_LABELS.volumeMA20) return `${label}: ${formatVolume(raw)}`;
              if (label === PRICE_LABELS.entry || label === PRICE_LABELS.exit) return `${label}: ${formatPrice(raw, data.meta.currency)}`;
              if (label.startsWith('RSI')) return `${label}: ${Number(raw).toFixed(2)}`;
              if (label.startsWith('MACD')) return `${label}: ${Number(raw).toFixed(4)}`;
              return `${label}: ${formatPrice(raw, data.meta.currency)}`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#8b949e', font: { size: 11 } }, grid: { color: '#21262d' } },
        y: { position: 'left', ticks: { color: '#8b949e', font: { size: 11 }, callback: value => formatPrice(value, data.meta.currency) }, grid: { color: '#21262d' } },
        yVol: { position: 'right', display: false, min: 0, max: Math.max(...volumes.filter(value => value > 0), 1) * 1.35, grid: { display: false }, ticks: { color: '#d29922', callback: value => formatVolume(value) } },
        y2: { position: 'right', display: false, min: 0, max: 100, grid: { display: false }, ticks: { color: '#bc8cff', stepSize: 20 } },
        y3: { position: 'right', display: false, grid: { display: false }, ticks: { color: '#8b949e', callback: value => Number(value).toFixed(2) } },
      },
    },
  });
}

function datasetLine(label, data, borderColor, yAxisID, order, borderWidth, borderDash = []) {
  return { label, data, type: 'line', borderColor, backgroundColor: 'transparent', borderWidth, pointRadius: 0, pointHoverRadius: 4, tension: 0.15, yAxisID, order, borderDash };
}

function setBacktestMarkers(backtest) {
  currentBacktestMarkers = backtest;
  const chart = chartInstances.price;
  if (!chart) return;
  const markerDatasets = buildBacktestMarkerDatasets(currentPriceChartMeta.labels, currentPriceChartMeta.closes);
  const markerIndexes = [];
  chart.data.datasets.forEach((dataset, index) => { if (PRICE_DATASET_GROUPS.backtestMarkers.includes(dataset.label)) markerIndexes.push(index); });
  markerIndexes.sort((a, b) => b - a).forEach(index => chart.data.datasets.splice(index, 1));
  const volumeIndex = chart.data.datasets.findIndex(dataset => dataset.label === PRICE_LABELS.volume);
  const insertAt = volumeIndex === -1 ? chart.data.datasets.length : volumeIndex;
  chart.data.datasets.splice(insertAt, 0, ...markerDatasets);
  chart.update('none');
}

function buildBacktestChart(backtest) {
  destroyChart('backtest');
  const canvas = document.getElementById('backtestChart');
  if (!canvas || !backtest?.equityCurve?.length) return;
  const labels = backtest.equityCurve.map(item => item.date);
  const strategyReturns = backtest.equityCurve.map(item => item.cumulativeReturnPct);
  const buyHold = buildBuyHoldCurve(backtest.results);

  chartInstances.backtest = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '\uc120\ud0dd \uc804\ub7b5 \ub204\uc801 \uc218\uc775\ub960', data: strategyReturns, borderColor: '#58a6ff', backgroundColor: 'rgba(88, 166, 255, 0.12)', borderWidth: 2, pointRadius: 0, tension: 0.18, fill: false },
        { label: 'Buy & Hold', data: buyHold, borderColor: '#d29922', backgroundColor: 'rgba(210, 153, 34, 0.12)', borderWidth: 1.5, pointRadius: 0, tension: 0.18, borderDash: [6, 4], fill: false },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: true, labels: { usePointStyle: true, boxWidth: 10 } }, tooltip: { callbacks: { label(item) { return `${item.dataset.label}: ${Number(item.raw).toFixed(2)}%`; } } } },
      scales: {
        x: { ticks: { maxTicksLimit: 10, maxRotation: 0 }, grid: { color: '#21262d' } },
        y: { ticks: { callback: value => `${Number(value).toFixed(0)}%` }, grid: { color: '#21262d' } },
      },
    },
  });
}

function buildStrategyCompareChart(comparisons) {
  destroyChart('strategyCompare');
  const canvas = document.getElementById('strategyCompareChart');
  if (!canvas || !Array.isArray(comparisons) || !comparisons.length) return;

  const labels = comparisons.map(item => formatStrategyLabel(item.strategy));
  const values = comparisons.map(item => item.summary?.cumulativeReturnPct ?? 0);
  const colors = comparisons.map(item => {
    if ((item.summary?.cumulativeReturnPct ?? 0) >= 0) return 'rgba(63, 185, 80, 0.65)';
    return 'rgba(248, 81, 73, 0.65)';
  });

  chartInstances.strategyCompare = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '누적 수익률',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.65', '1')),
          borderWidth: 1.2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(item) {
              return `누적 수익률: ${Number(item.raw).toFixed(2)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          grid: { color: '#21262d' },
          ticks: {
            callback: value => `${Number(value).toFixed(0)}%`,
          },
        },
      },
    },
  });
}

function buildBuyHoldCurve(results) { if (!Array.isArray(results) || !results.length) return []; const firstClose = results[0].close; if (firstClose == null || firstClose === 0) return results.map(() => null); return results.map(item => ((item.close / firstClose) - 1) * 100); }
function buildLevelDatasets(labels, levels, prefix, color) { return (levels || []).map((level, index) => ({ label: `${prefix} ${index + 1}`, data: labels.map(() => level), borderColor: color, backgroundColor: 'transparent', borderWidth: 1, pointRadius: 0, borderDash: [6, 6], tension: 0, yAxisID: 'y', order: 1 })); }

function buildBacktestMarkerDatasets(labels, closes) {
  const markerMap = buildBacktestMarkerMap(labels, closes);
  return [
    { label: PRICE_LABELS.entry, data: markerMap.entries, type: 'line', borderColor: 'transparent', backgroundColor: '#3fb950', pointBackgroundColor: '#3fb950', pointBorderColor: '#0b1220', pointBorderWidth: 1.5, pointRadius: 6, pointHoverRadius: 7, pointStyle: 'triangle', pointRotation: 0, showLine: false, yAxisID: 'y', hidden: true, order: 0 },
    { label: PRICE_LABELS.exit, data: markerMap.exits, type: 'line', borderColor: 'transparent', backgroundColor: '#f85149', pointBackgroundColor: '#f85149', pointBorderColor: '#0b1220', pointBorderWidth: 1.5, pointRadius: 6, pointHoverRadius: 7, pointStyle: 'triangle', pointRotation: 180, showLine: false, yAxisID: 'y', hidden: true, order: 0 },
  ];
}

function buildBacktestMarkerMap(labels, closes) {
  const entries = labels.map(() => null);
  const exits = labels.map(() => null);
  const results = currentBacktestMarkers?.results || [];
  if (!Array.isArray(results) || !results.length) return { entries, exits };
  const closeByDate = new Map(labels.map((label, index) => [label, closes[index]]));
  results.forEach(item => { const index = labels.indexOf(item.date); if (index === -1) return; const close = closeByDate.get(item.date); if (item.action === 'ENTER_LONG') entries[index] = close; if (item.action === 'EXIT_LONG') exits[index] = close; });
  return { entries, exits };
}

function formatPrice(value, currency) { if (value == null) return 'N/A'; if (currency === 'KRW') return `KRW ${Math.round(value).toLocaleString('ko-KR')}`; return `$${Number(value).toFixed(2)}`; }
function formatVolume(value) { if (value == null) return 'N/A'; if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`; if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`; if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`; return String(Math.round(value)); }
function formatStrategyLabel(strategy) { return ({ balanced: '균형형', trend_following: '추세추종형', mean_reversion: '평균회귀형' })[strategy] || strategy; }
