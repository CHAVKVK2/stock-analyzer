'use strict';

Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#21262d';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif";

const chartInstances = {};

const PRICE_DATASET_GROUPS = {
  bollinger: ['볼린저 상단', '볼린저 중심', '볼린저 하단'],
  movingAverages: ['EMA 20', 'EMA 50', 'SMA 200', '거래량 MA20'],
  supportResistance: ['지지선 1', '지지선 2', '지지선 3', '저항선 1', '저항선 2', '저항선 3'],
  rsi: ['RSI', 'RSI 기준선 70', 'RSI 기준선 30'],
  macd: ['MACD', 'MACD 시그널', 'MACD 히스토그램'],
};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function toggleBollingerBands(show) {
  setDatasetVisibility('price', PRICE_DATASET_GROUPS.bollinger, show);
}

function toggleMovingAverages(show) {
  setDatasetVisibility('price', PRICE_DATASET_GROUPS.movingAverages, show);
}

function toggleSupportResistance(show) {
  setDatasetVisibility('price', PRICE_DATASET_GROUPS.supportResistance, show);
}

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

function setDatasetVisibility(chartId, labels, show) {
  const chart = chartInstances[chartId];
  if (!chart) return;

  chart.data.datasets.forEach((dataset, index) => {
    if (labels.includes(dataset.label)) {
      chart.getDatasetMeta(index).hidden = !show;
    }
  });

  chart.update('none');
}

function buildPriceChart(data) {
  destroyChart('price');

  const canvas = document.getElementById('priceChart');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const labels = data.prices.map(item => item.date);
  const closes = data.prices.map(item => item.close);
  const volumes = data.prices.map(item => item.volume);
  const bb = data.indicators.bollingerBands;
  const movingAverages = data.indicators.movingAverages;
  const volumeIndicators = data.indicators.volumeIndicators;
  const levels = data.indicators.levels || { supports: [], resistances: [] };
  const rsiValues = data.indicators.rsi;
  const macd = data.indicators.macd;

  const histogramColors = macd.histogram.map(value => {
    if (value == null) return 'transparent';
    return value >= 0 ? 'rgba(63, 185, 80, 0.5)' : 'rgba(248, 81, 73, 0.5)';
  });

  const supportDatasets = buildLevelDatasets(labels, levels.supports, '지지선', 'rgba(63, 185, 80, 0.28)');
  const resistanceDatasets = buildLevelDatasets(labels, levels.resistances, '저항선', 'rgba(248, 81, 73, 0.28)');

  chartInstances.price = new Chart(context, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '종가',
          data: closes,
          borderColor: '#58a6ff',
          backgroundColor: 'transparent',
          borderWidth: 1.8,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.15,
          yAxisID: 'y',
          order: 3,
        },
        {
          label: 'EMA 20',
          data: movingAverages.ema20,
          borderColor: '#f0883e',
          backgroundColor: 'transparent',
          borderWidth: 1.2,
          pointRadius: 0,
          tension: 0.15,
          yAxisID: 'y',
          order: 4,
        },
        {
          label: 'EMA 50',
          data: movingAverages.ema50,
          borderColor: '#bc8cff',
          backgroundColor: 'transparent',
          borderWidth: 1.2,
          pointRadius: 0,
          tension: 0.15,
          yAxisID: 'y',
          order: 4,
        },
        {
          label: 'SMA 200',
          data: movingAverages.sma200,
          borderColor: '#2ea043',
          backgroundColor: 'transparent',
          borderWidth: 1.2,
          pointRadius: 0,
          borderDash: [6, 4],
          tension: 0.15,
          yAxisID: 'y',
          order: 4,
        },
        {
          label: '볼린저 상단',
          data: bb.upper,
          borderColor: 'rgba(139, 148, 158, 0.45)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [4, 3],
          tension: 0.15,
          yAxisID: 'y',
          order: 2,
        },
        {
          label: '볼린저 중심',
          data: bb.middle,
          borderColor: 'rgba(139, 148, 158, 0.75)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [2, 2],
          tension: 0.15,
          yAxisID: 'y',
          order: 2,
        },
        {
          label: '볼린저 하단',
          data: bb.lower,
          borderColor: 'rgba(139, 148, 158, 0.45)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [4, 3],
          tension: 0.15,
          yAxisID: 'y',
          order: 2,
        },
        ...supportDatasets,
        ...resistanceDatasets,
        {
          label: '거래량',
          data: volumes,
          type: 'bar',
          backgroundColor: 'rgba(63, 185, 80, 0.18)',
          borderColor: 'rgba(63, 185, 80, 0.35)',
          borderWidth: 0,
          yAxisID: 'yVol',
          order: 10,
        },
        {
          label: '거래량 MA20',
          data: volumeIndicators.volumeMA20,
          borderColor: '#d29922',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.15,
          yAxisID: 'yVol',
          order: 9,
        },
        {
          label: 'RSI',
          data: rsiValues,
          type: 'line',
          borderColor: '#bc8cff',
          backgroundColor: 'transparent',
          borderWidth: 1.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          yAxisID: 'y2',
          hidden: true,
          order: 5,
        },
        {
          label: 'RSI 기준선 70',
          data: labels.map(() => 70),
          type: 'line',
          borderColor: 'rgba(248, 81, 73, 0.35)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [4, 4],
          tension: 0,
          yAxisID: 'y2',
          hidden: true,
          order: 5,
        },
        {
          label: 'RSI 기준선 30',
          data: labels.map(() => 30),
          type: 'line',
          borderColor: 'rgba(63, 185, 80, 0.35)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [4, 4],
          tension: 0,
          yAxisID: 'y2',
          hidden: true,
          order: 5,
        },
        {
          label: 'MACD',
          data: macd.macdLine,
          type: 'line',
          borderColor: '#58a6ff',
          backgroundColor: 'transparent',
          borderWidth: 1.4,
          pointRadius: 0,
          tension: 0.1,
          yAxisID: 'y3',
          hidden: true,
          order: 6,
        },
        {
          label: 'MACD 시그널',
          data: macd.signalLine,
          type: 'line',
          borderColor: '#f0883e',
          backgroundColor: 'transparent',
          borderWidth: 1.4,
          pointRadius: 0,
          tension: 0.1,
          yAxisID: 'y3',
          hidden: true,
          order: 6,
        },
        {
          label: 'MACD 히스토그램',
          data: macd.histogram,
          type: 'bar',
          backgroundColor: histogramColors,
          borderColor: histogramColors,
          borderWidth: 0,
          yAxisID: 'y3',
          hidden: true,
          order: 7,
        },
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
              if (label === '거래량' || label === '거래량 MA20') return `${label}: ${formatVolume(raw)}`;
              if (label.startsWith('RSI')) return `${label}: ${Number(raw).toFixed(2)}`;
              if (label.startsWith('MACD')) return `${label}: ${Number(raw).toFixed(4)}`;
              return `${label}: ${formatPrice(raw, data.meta.currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
        },
        y: {
          position: 'left',
          ticks: {
            color: '#8b949e',
            font: { size: 11 },
            callback: value => formatPrice(value, data.meta.currency),
          },
          grid: { color: '#21262d' },
        },
        yVol: {
          position: 'right',
          display: false,
          min: 0,
          max: Math.max(...volumes.filter(value => value > 0), 1) * 1.35,
          grid: { display: false },
          ticks: {
            color: '#d29922',
            callback: value => formatVolume(value),
          },
        },
        y2: {
          position: 'right',
          display: false,
          min: 0,
          max: 100,
          grid: { display: false },
          ticks: {
            color: '#bc8cff',
            stepSize: 20,
          },
        },
        y3: {
          position: 'right',
          display: false,
          grid: { display: false },
          ticks: {
            color: '#8b949e',
            callback: value => Number(value).toFixed(2),
          },
        },
      },
    },
  });
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
        {
          label: '전략 누적 수익률',
          data: strategyReturns,
          borderColor: '#58a6ff',
          backgroundColor: 'rgba(88, 166, 255, 0.12)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.18,
          fill: false,
        },
        {
          label: 'Buy & Hold',
          data: buyHold,
          borderColor: '#d29922',
          backgroundColor: 'rgba(210, 153, 34, 0.12)',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.18,
          borderDash: [6, 4],
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { usePointStyle: true, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label(item) {
              return `${item.dataset.label}: ${Number(item.raw).toFixed(2)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 10, maxRotation: 0 },
          grid: { color: '#21262d' },
        },
        y: {
          ticks: {
            callback: value => `${Number(value).toFixed(0)}%`,
          },
          grid: { color: '#21262d' },
        },
      },
    },
  });
}

function buildBuyHoldCurve(results) {
  if (!Array.isArray(results) || results.length === 0) return [];
  const firstClose = results[0].close;
  if (firstClose == null || firstClose === 0) return results.map(() => null);
  return results.map(item => ((item.close / firstClose) - 1) * 100);
}

function buildLevelDatasets(labels, levels, prefix, color) {
  return (levels || []).map((level, index) => ({
    label: `${prefix} ${index + 1}`,
    data: labels.map(() => level),
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 1,
    pointRadius: 0,
    borderDash: [6, 6],
    tension: 0,
    yAxisID: 'y',
    order: 1,
  }));
}

function formatPrice(value, currency) {
  if (value == null) return 'N/A';
  if (currency === 'KRW') return `KRW ${Math.round(value).toLocaleString('ko-KR')}`;
  return `$${Number(value).toFixed(2)}`;
}

function formatVolume(value) {
  if (value == null) return 'N/A';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}
