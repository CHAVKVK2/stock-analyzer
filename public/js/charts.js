'use strict';

if (window.Chart) {
  Chart.defaults.color = '#8b949e';
  Chart.defaults.borderColor = '#21262d';
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif";
}

const chartInstances = {};
const lightweightState = {
  chart: null,
  container: null,
  tooltip: null,
  resizeHandler: null,
  candleSeries: null,
  volumeSeries: null,
  series: {
    ema20: null,
    ema50: null,
    sma200: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    volumeMA20: null,
  },
  levelSeries: {
    supports: [],
    resistances: [],
  },
  visible: {
    bollinger: false,
    movingAverages: false,
    supportResistance: true,
    backtestMarkers: false,
  },
  priceData: [],
  volumeData: [],
  markerData: [],
  currency: 'USD',
  technicalData: null,
};

const PRICE_LABELS = {
  close: '종가',
  ema20: 'EMA 20',
  ema50: 'EMA 50',
  sma200: 'SMA 200',
  bbUpper: '볼린저 상단',
  bbMiddle: '볼린저 중심',
  bbLower: '볼린저 하단',
  volume: '거래량',
  volumeMA20: '거래량 MA20',
};

let currentPriceChartMeta = { labels: [], closes: [], currency: 'USD' };
let currentBacktestMarkers = null;

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function destroyLightweightChart() {
  if (lightweightState.resizeHandler) {
    window.removeEventListener('resize', lightweightState.resizeHandler);
    lightweightState.resizeHandler = null;
  }
  if (lightweightState.chart) {
    lightweightState.chart.remove();
  }
  lightweightState.chart = null;
  lightweightState.container = null;
  lightweightState.tooltip = null;
  lightweightState.candleSeries = null;
  lightweightState.volumeSeries = null;
  lightweightState.series = {
    ema20: null,
    ema50: null,
    sma200: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    volumeMA20: null,
  };
  lightweightState.levelSeries = { supports: [], resistances: [] };
  lightweightState.priceData = [];
  lightweightState.volumeData = [];
  lightweightState.markerData = [];
}

function toggleBollingerBands(show) {
  lightweightState.visible.bollinger = show;
  ['bbUpper', 'bbMiddle', 'bbLower'].forEach(key => {
    if (lightweightState.series[key]) {
      lightweightState.series[key].applyOptions({ visible: show });
    }
  });
}

function toggleMovingAverages(show) {
  lightweightState.visible.movingAverages = show;
  ['ema20', 'ema50', 'sma200', 'volumeMA20'].forEach(key => {
    if (lightweightState.series[key]) {
      lightweightState.series[key].applyOptions({ visible: show });
    }
  });
}

function toggleSupportResistance(show) {
  lightweightState.visible.supportResistance = show;
  [...lightweightState.levelSeries.supports, ...lightweightState.levelSeries.resistances]
    .forEach(series => series.applyOptions({ visible: show }));
}

function toggleRSI(show) {
  const card = document.getElementById('rsiChartCard');
  if (!card) return;
  card.classList.toggle('hidden', !show);
  syncIndicatorDockVisibility();
  if (show && lightweightState.technicalData) {
    buildRSIChart(lightweightState.technicalData);
  } else {
    destroyChart('rsi');
  }
}

function toggleMACD(show) {
  const card = document.getElementById('macdChartCard');
  if (!card) return;
  card.classList.toggle('hidden', !show);
  syncIndicatorDockVisibility();
  if (show && lightweightState.technicalData) {
    buildMACDChart(lightweightState.technicalData);
  } else {
    destroyChart('macd');
  }
}

function toggleBacktestMarkers(show) {
  lightweightState.visible.backtestMarkers = show;
  syncBacktestMarkers();
}

function syncIndicatorDockVisibility() {
  const dock = document.getElementById('indicatorDock');
  const rsiCard = document.getElementById('rsiChartCard');
  const macdCard = document.getElementById('macdChartCard');
  if (!dock || !rsiCard || !macdCard) return;

  const showDock = !rsiCard.classList.contains('hidden') || !macdCard.classList.contains('hidden');
  dock.classList.toggle('hidden', !showDock);
}

function buildPriceChart(data) {
  destroyLightweightChart();
  destroyChart('priceFallback');

  const container = document.getElementById('priceChart');
  const tooltip = document.getElementById('priceChartTooltip');
  if (!container) return;
  if (!window.LightweightCharts) {
    buildPriceChartFallback(data, container);
    return;
  }

  try {
    currentPriceChartMeta = {
      labels: data.prices.map(item => item.date),
      closes: data.prices.map(item => item.close),
      currency: data.meta.currency,
    };

    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#9fb0cb',
        fontFamily: "'Segoe UI', 'Noto Sans KR', sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(88, 166, 255, 0.4)',
          labelBackgroundColor: '#1f2937',
        },
        horzLine: {
          color: 'rgba(88, 166, 255, 0.35)',
          labelBackgroundColor: '#1f2937',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.18)',
        scaleMargins: { top: 0.08, bottom: 0.3 },
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.18)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: value => formatPrice(value, data.meta.currency),
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    lightweightState.chart = chart;
    lightweightState.container = container;
    lightweightState.tooltip = tooltip;
    lightweightState.currency = data.meta.currency;
    lightweightState.technicalData = data;

    const candleSeries = chart.addCandlestickSeries({
    upColor: '#3fb950',
    downColor: '#f85149',
    borderVisible: false,
    wickUpColor: '#3fb950',
    wickDownColor: '#f85149',
    priceLineColor: '#58a6ff',
  });

    const volumeSeries = chart.addHistogramSeries({
    color: 'rgba(88, 166, 255, 0.35)',
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    scaleMargins: { top: 0.78, bottom: 0 },
  });

    chart.priceScale('').applyOptions({
    scaleMargins: { top: 0.78, bottom: 0 },
    borderVisible: false,
  });

    const priceData = data.prices.map(item => ({
    time: toBusinessDay(item.date),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
  }));

    const volumeData = data.prices.map(item => ({
    time: toBusinessDay(item.date),
    value: item.volume,
    color: item.close >= item.open ? 'rgba(63, 185, 80, 0.45)' : 'rgba(248, 81, 73, 0.45)',
  }));

    candleSeries.setData(priceData);
    volumeSeries.setData(volumeData);

    lightweightState.candleSeries = candleSeries;
    lightweightState.volumeSeries = volumeSeries;
    lightweightState.priceData = priceData;
    lightweightState.volumeData = volumeData;

    lightweightState.series.ema20 = createLineSeries(chart, '#f0883e', 2);
  lightweightState.series.ema50 = createLineSeries(chart, '#bc8cff', 2);
  lightweightState.series.sma200 = createLineSeries(chart, '#2ea043', 2, [6, 4]);
  lightweightState.series.bbUpper = createLineSeries(chart, 'rgba(139, 148, 158, 0.45)', 1, [4, 4]);
  lightweightState.series.bbMiddle = createLineSeries(chart, 'rgba(139, 148, 158, 0.8)', 1, [2, 2]);
  lightweightState.series.bbLower = createLineSeries(chart, 'rgba(139, 148, 158, 0.45)', 1, [4, 4]);
    lightweightState.series.volumeMA20 = chart.addLineSeries({
    color: '#d29922',
    lineWidth: 1,
    priceScaleId: '',
    lastValueVisible: false,
    priceLineVisible: false,
  });

    lightweightState.series.ema20.setData(buildLineData(data.prices, data.indicators.movingAverages.ema20));
  lightweightState.series.ema50.setData(buildLineData(data.prices, data.indicators.movingAverages.ema50));
  lightweightState.series.sma200.setData(buildLineData(data.prices, data.indicators.movingAverages.sma200));
  lightweightState.series.bbUpper.setData(buildLineData(data.prices, data.indicators.bollingerBands.upper));
  lightweightState.series.bbMiddle.setData(buildLineData(data.prices, data.indicators.bollingerBands.middle));
  lightweightState.series.bbLower.setData(buildLineData(data.prices, data.indicators.bollingerBands.lower));
  lightweightState.series.volumeMA20.setData(buildLineData(data.prices, data.indicators.volumeIndicators.volumeMA20));

    buildLevelSeries(chart, data.prices, data.indicators.levels || { supports: [], resistances: [] });
    updateLightweightVisibility();
    chart.timeScale().fitContent();
    attachPriceTooltip(data.prices);

    lightweightState.resizeHandler = () => {
      if (!lightweightState.container || !lightweightState.chart) return;
      const width = lightweightState.container.clientWidth;
      const height = lightweightState.container.clientHeight || 360;
      lightweightState.chart.applyOptions({ width, height });
    };

    window.addEventListener('resize', lightweightState.resizeHandler);
    lightweightState.resizeHandler();
    syncBacktestMarkers();
    toggleRSI(Boolean(document.getElementById('toggleRSI')?.checked));
    toggleMACD(Boolean(document.getElementById('toggleMACD')?.checked));
  } catch (error) {
    console.error('Lightweight chart failed, using fallback chart.', error);
    destroyLightweightChart();
    buildPriceChartFallback(data, container);
  }
}

function buildPriceChartFallback(data, container) {
  if (!window.Chart || !container) return;

  container.innerHTML = '<canvas id="priceChartFallbackCanvas"></canvas>';
  const canvas = document.getElementById('priceChartFallbackCanvas');
  if (!canvas) return;

  const labels = data.prices.map(item => item.date);
  const closes = data.prices.map(item => item.close);
  const movingAverages = data.indicators.movingAverages || {};
  const bollinger = data.indicators.bollingerBands || {};
  const volumeMA20 = data.indicators.volumeIndicators?.volumeMA20 || [];

  chartInstances.priceFallback = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '종가',
          data: closes,
          borderColor: '#58a6ff',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: 'EMA 20',
          data: movingAverages.ema20 || [],
          borderColor: '#f0883e',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: 'EMA 50',
          data: movingAverages.ema50 || [],
          borderColor: '#bc8cff',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: 'SMA 200',
          data: movingAverages.sma200 || [],
          borderColor: '#2ea043',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: '볼린저 상단',
          data: bollinger.upper || [],
          borderColor: 'rgba(139, 148, 158, 0.45)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.1,
        },
        {
          label: '볼린저 하단',
          data: bollinger.lower || [],
          borderColor: 'rgba(139, 148, 158, 0.45)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.1,
        },
        {
          label: '거래량 MA20',
          data: volumeMA20,
          borderColor: '#d29922',
          backgroundColor: 'transparent',
          borderWidth: 1.2,
          pointRadius: 0,
          tension: 0.15,
          hidden: true,
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
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatPrice(context.raw, data.meta.currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, maxRotation: 0 },
          grid: { color: '#21262d' },
        },
        y: {
          grid: { color: '#21262d' },
          ticks: {
            callback: value => formatPrice(value, data.meta.currency),
          },
        },
      },
    },
  });
}

function createLineSeries(chart, color, lineWidth, lineStyle) {
  return chart.addLineSeries({
    color,
    lineWidth,
    lineStyle: lineStyle ? LightweightCharts.LineStyle.LargeDashed : LightweightCharts.LineStyle.Solid,
    lastValueVisible: false,
    priceLineVisible: false,
  });
}

function buildLineData(prices, values) {
  return prices
    .map((item, index) => values[index] == null ? null : ({ time: toBusinessDay(item.date), value: values[index] }))
    .filter(Boolean);
}

function buildLevelSeries(chart, prices, levels) {
  lightweightState.levelSeries.supports = (levels.supports || []).map(level => {
    const series = chart.addLineSeries({
      color: 'rgba(63, 185, 80, 0.35)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    series.setData(prices.map(item => ({ time: toBusinessDay(item.date), value: level })));
    return series;
  });

  lightweightState.levelSeries.resistances = (levels.resistances || []).map(level => {
    const series = chart.addLineSeries({
      color: 'rgba(248, 81, 73, 0.35)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    series.setData(prices.map(item => ({ time: toBusinessDay(item.date), value: level })));
    return series;
  });
}

function updateLightweightVisibility() {
  toggleBollingerBands(lightweightState.visible.bollinger);
  toggleMovingAverages(lightweightState.visible.movingAverages);
  toggleSupportResistance(lightweightState.visible.supportResistance);
}

function syncBacktestMarkers() {
  if (!lightweightState.candleSeries) return;
  if (!lightweightState.visible.backtestMarkers || !lightweightState.markerData.length) {
    lightweightState.candleSeries.setMarkers([]);
    return;
  }
  lightweightState.candleSeries.setMarkers(lightweightState.markerData);
}

function setBacktestMarkers(backtest) {
  currentBacktestMarkers = backtest;
  const results = backtest?.results || [];
  lightweightState.markerData = results
    .filter(item => item.action === 'ENTER_LONG' || item.action === 'EXIT_LONG')
    .map(item => ({
      time: toBusinessDay(item.date),
      position: item.action === 'ENTER_LONG' ? 'belowBar' : 'aboveBar',
      color: item.action === 'ENTER_LONG' ? '#3fb950' : '#f85149',
      shape: item.action === 'ENTER_LONG' ? 'arrowUp' : 'arrowDown',
      text: item.action === 'ENTER_LONG' ? '진입' : '청산',
    }));
  syncBacktestMarkers();
}

function attachPriceTooltip(prices) {
  if (!lightweightState.chart || !lightweightState.tooltip || !lightweightState.container) return;
  const tooltip = lightweightState.tooltip;
  const closeByDate = new Map(prices.map(item => [item.date, item]));

  lightweightState.chart.subscribeCrosshairMove(param => {
    if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
      tooltip.classList.add('hidden');
      return;
    }

    const date = businessDayToString(param.time);
    const candle = closeByDate.get(date);
    if (!candle) {
      tooltip.classList.add('hidden');
      return;
    }

    tooltip.innerHTML = `
      <div class="lw-tooltip-date">${escapeHtml(date)}</div>
      <div>시가 <strong>${escapeHtml(formatPrice(candle.open, lightweightState.currency))}</strong></div>
      <div>고가 <strong>${escapeHtml(formatPrice(candle.high, lightweightState.currency))}</strong></div>
      <div>저가 <strong>${escapeHtml(formatPrice(candle.low, lightweightState.currency))}</strong></div>
      <div>종가 <strong>${escapeHtml(formatPrice(candle.close, lightweightState.currency))}</strong></div>
      <div>거래량 <strong>${escapeHtml(formatVolume(candle.volume))}</strong></div>
    `;

    const width = tooltip.offsetWidth || 180;
    const height = tooltip.offsetHeight || 110;
    const containerRect = lightweightState.container.getBoundingClientRect();
    const left = Math.min(Math.max(param.point.x + 14, 8), containerRect.width - width - 8);
    const top = Math.min(Math.max(param.point.y + 14, 8), containerRect.height - height - 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.remove('hidden');
  });
}

function buildBacktestChart(backtest) {
  destroyChart('backtest');
  const canvas = document.getElementById('backtestChart');
  if (!canvas || !backtest?.equityCurve?.length || !window.Chart) return;
  const labels = backtest.equityCurve.map(item => item.date);
  const strategyReturns = backtest.equityCurve.map(item => item.cumulativeReturnPct);
  const buyHold = buildBuyHoldCurve(backtest.results);

  chartInstances.backtest = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '선택 전략 누적 수익률', data: strategyReturns, borderColor: '#58a6ff', backgroundColor: 'rgba(88, 166, 255, 0.12)', borderWidth: 2, pointRadius: 0, tension: 0.18, fill: false },
        { label: 'Buy & Hold', data: buyHold, borderColor: '#d29922', backgroundColor: 'rgba(210, 153, 34, 0.12)', borderWidth: 1.5, pointRadius: 0, tension: 0.18, borderDash: [6, 4], fill: false },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { usePointStyle: true, boxWidth: 10 } },
        tooltip: { callbacks: { label(item) { return `${item.dataset.label}: ${Number(item.raw).toFixed(2)}%`; } } },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 10, maxRotation: 0 }, grid: { color: '#21262d' } },
        y: { ticks: { callback: value => `${Number(value).toFixed(0)}%` }, grid: { color: '#21262d' } },
      },
    },
  });
}

function buildRSIChart(data) {
  destroyChart('rsi');
  const canvas = document.getElementById('rsiChart');
  if (!canvas || !window.Chart) return;
  const labels = data.prices.map(item => item.date);
  const rsi = data.indicators.rsi || [];

  chartInstances.rsi = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'RSI',
          data: rsi,
          borderColor: '#bc8cff',
          backgroundColor: 'rgba(188, 140, 255, 0.08)',
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.18,
        },
        {
          label: 'RSI 70',
          data: labels.map(() => 70),
          borderColor: 'rgba(248, 81, 73, 0.45)',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [6, 4],
        },
        {
          label: 'RSI 30',
          data: labels.map(() => 30),
          borderColor: 'rgba(63, 185, 80, 0.45)',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [6, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label(item) { return `${item.dataset.label}: ${Number(item.raw).toFixed(2)}`; } } },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 8, maxRotation: 0 }, grid: { color: '#21262d' } },
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 },
          grid: { color: '#21262d' },
        },
      },
    },
  });
}

function buildMACDChart(data) {
  destroyChart('macd');
  const canvas = document.getElementById('macdChart');
  if (!canvas || !window.Chart) return;
  const labels = data.prices.map(item => item.date);
  const macd = data.indicators.macd || { macdLine: [], signalLine: [], histogram: [] };
  const histogramColors = (macd.histogram || []).map(value => {
    if (value == null) return 'transparent';
    return value >= 0 ? 'rgba(63, 185, 80, 0.5)' : 'rgba(248, 81, 73, 0.5)';
  });

  chartInstances.macd = new Chart(canvas.getContext('2d'), {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'MACD 히스토그램',
          data: macd.histogram,
          backgroundColor: histogramColors,
          borderColor: histogramColors,
          borderWidth: 0,
          order: 3,
        },
        {
          type: 'line',
          label: 'MACD',
          data: macd.macdLine,
          borderColor: '#58a6ff',
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.18,
          order: 1,
        },
        {
          type: 'line',
          label: 'MACD 시그널',
          data: macd.signalLine,
          borderColor: '#f0883e',
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.18,
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label(item) { return `${item.dataset.label}: ${Number(item.raw).toFixed(4)}`; } } },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 8, maxRotation: 0 }, grid: { color: '#21262d' } },
        y: { grid: { color: '#21262d' }, ticks: { callback: value => Number(value).toFixed(2) } },
      },
    },
  });
}

function buildStrategyCompareChart(comparisons) {
  destroyChart('strategyCompare');
  const canvas = document.getElementById('strategyCompareChart');
  if (!canvas || !Array.isArray(comparisons) || !comparisons.length || !window.Chart) return;

  const labels = comparisons.map(item => formatStrategyLabel(item.strategy));
  const values = comparisons.map(item => item.summary?.cumulativeReturnPct ?? 0);
  const colors = comparisons.map(item => (item.summary?.cumulativeReturnPct ?? 0) >= 0
    ? 'rgba(63, 185, 80, 0.65)'
    : 'rgba(248, 81, 73, 0.65)');

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
        tooltip: { callbacks: { label(item) { return `누적 수익률 ${Number(item.raw).toFixed(2)}%`; } } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: '#21262d' },
          ticks: { callback: value => `${Number(value).toFixed(0)}%` },
        },
      },
    },
  });
}

function buildBuyHoldCurve(results) {
  if (!Array.isArray(results) || !results.length) return [];
  const firstClose = results[0].close;
  if (firstClose == null || firstClose === 0) return results.map(() => null);
  return results.map(item => ((item.close / firstClose) - 1) * 100);
}

function toBusinessDay(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return { year, month, day };
}

function businessDayToString(time) {
  if (typeof time === 'string') return time;
  if (!time || typeof time !== 'object') return '';
  const month = String(time.month).padStart(2, '0');
  const day = String(time.day).padStart(2, '0');
  return `${time.year}-${month}-${day}`;
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

function formatStrategyLabel(strategy) {
  return ({
    balanced: '균형형',
    trend_following: '추세추종형',
    mean_reversion: '평균회귀형',
  })[strategy] || strategy;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
