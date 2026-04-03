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
  indicatorSeries: {
    rsi: {},
    macd: {},
  },
  indicatorPaneOrder: [],
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
    bollinger: true,
    movingAverages: true,
    supportResistance: true,
    backtestMarkers: false,
  },
  priceData: [],
  volumeData: [],
  markerData: [],
  currency: 'USD',
  technicalData: null,
};
window.__lightweightState = lightweightState;

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

function destroyIndicatorChart(key) {
  if (!lightweightState.chart) {
    lightweightState.indicatorSeries[key] = {};
    return;
  }

  Object.values(lightweightState.indicatorSeries[key] || {}).forEach(series => {
    if (series) {
      lightweightState.chart.removeSeries(series);
    }
  });
  lightweightState.indicatorSeries[key] = {};
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
  destroyIndicatorChart('rsi');
  destroyIndicatorChart('macd');
  lightweightState.indicatorPaneOrder = [];
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
  if (!lightweightState.technicalData) return;
  syncIndicatorDock();
}

function toggleMACD(show) {
  if (!lightweightState.technicalData) return;
  syncIndicatorDock();
}

function toggleBacktestMarkers(show) {
  lightweightState.visible.backtestMarkers = show;
  syncBacktestMarkers();
}

function buildPriceChart(data) {
  destroyLightweightChart();

  const container = document.getElementById('priceChart');
  const tooltip = document.getElementById('priceChartTooltip');
  if (!container || !window.LightweightCharts) return;

  const {
    createChart,
    CrosshairMode,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    LineStyle,
  } = LightweightCharts;

  currentPriceChartMeta = {
    labels: data.prices.map(item => item.date),
    closes: data.prices.map(item => item.close),
    currency: data.meta.currency,
  };

  const chart = createChart(container, {
    layout: {
      background: { color: '#0f172a' },
      textColor: '#9fb0cb',
      fontFamily: "'Segoe UI', 'Noto Sans KR', sans-serif",
      fontSize: 12,
      panes: {
        separatorColor: 'rgba(148, 163, 184, 0.12)',
        separatorHoverColor: 'rgba(88, 166, 255, 0.28)',
        enableResize: false,
      },
    },
    grid: {
      vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
      horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
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
    autoSize: true,
  });

  lightweightState.chart = chart;
  lightweightState.container = container;
  lightweightState.tooltip = tooltip;
  lightweightState.currency = data.meta.currency;
  lightweightState.technicalData = data;

  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#3fb950',
    downColor: '#f85149',
    borderVisible: false,
    wickUpColor: '#3fb950',
    wickDownColor: '#f85149',
    priceLineColor: '#58a6ff',
  });

  const volumeSeries = chart.addSeries(HistogramSeries, {
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

  lightweightState.series.ema20 = createLineSeries(chart, '#f0883e', 2, false, 0);
  lightweightState.series.ema50 = createLineSeries(chart, '#bc8cff', 2, false, 0);
  lightweightState.series.sma200 = createLineSeries(chart, '#2ea043', 2, true, 0);
  lightweightState.series.bbUpper = createLineSeries(chart, 'rgba(139, 148, 158, 0.45)', 1, true, 0);
  lightweightState.series.bbMiddle = createLineSeries(chart, 'rgba(139, 148, 158, 0.8)', 1, true, 0);
  lightweightState.series.bbLower = createLineSeries(chart, 'rgba(139, 148, 158, 0.45)', 1, true, 0);
  lightweightState.series.volumeMA20 = chart.addSeries(LineSeries, {
    color: '#d29922',
    lineWidth: 1,
    priceScaleId: '',
    lastValueVisible: false,
    priceLineVisible: false,
  }, 0);

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
    resizeLightweightCharts();
  };

  window.addEventListener('resize', lightweightState.resizeHandler);
  syncBacktestMarkers();
  syncIndicatorDock();
  lightweightState.resizeHandler();
}

function resizeLightweightCharts() {
  if (lightweightState.container && lightweightState.chart) {
    lightweightState.chart.applyOptions({
      width: lightweightState.container.clientWidth,
      height: lightweightState.container.clientHeight || 380,
    });
  }
}

function syncIndicatorDock() {
  const dock = document.getElementById('indicatorDock');
  const rsiCard = document.getElementById('rsiChartCard');
  const macdCard = document.getElementById('macdChartCard');
  if (!dock || !rsiCard || !macdCard || !lightweightState.technicalData) return;

  const showRSI = Boolean(document.getElementById('toggleRSI')?.checked);
  const showMACD = Boolean(document.getElementById('toggleMACD')?.checked);

  rsiCard.classList.toggle('hidden', !showRSI);
  macdCard.classList.toggle('hidden', !showMACD);
  dock.classList.toggle('hidden', !showRSI && !showMACD);

  if (showRSI) {
    buildRSIChartLegacy(lightweightState.technicalData);
  } else {
    destroyChart('rsi');
  }

  if (showMACD) {
    buildMACDChartLegacy(lightweightState.technicalData);
  } else {
    destroyChart('macd');
  }

  requestAnimationFrame(() => resizeLightweightCharts());
}

function createLineSeries(chart, color, lineWidth, dashed = false, paneIndex = 0) {
  return chart.addSeries(LightweightCharts.LineSeries, {
    color,
    lineWidth,
    lineStyle: dashed ? LightweightCharts.LineStyle.LargeDashed : LightweightCharts.LineStyle.Solid,
    lastValueVisible: false,
    priceLineVisible: false,
  }, paneIndex);
}

function buildLineData(prices, values) {
  return prices
    .map((item, index) => values[index] == null ? null : ({ time: toBusinessDay(item.date), value: values[index] }))
    .filter(Boolean);
}

function buildLevelSeries(chart, prices, levels) {
  lightweightState.levelSeries.supports = (levels.supports || []).map(level => {
    const series = chart.addSeries(LightweightCharts.LineSeries, {
      color: 'rgba(63, 185, 80, 0.35)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    }, 0);
    series.setData(prices.map(item => ({ time: toBusinessDay(item.date), value: level })));
    return series;
  });

  lightweightState.levelSeries.resistances = (levels.resistances || []).map(level => {
    const series = chart.addSeries(LightweightCharts.LineSeries, {
      color: 'rgba(248, 81, 73, 0.35)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
    }, 0);
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
  const markerApi = LightweightCharts.createSeriesMarkers;
  if (typeof markerApi !== 'function') {
    if (typeof lightweightState.candleSeries.setMarkers === 'function') {
      lightweightState.candleSeries.setMarkers(
        lightweightState.visible.backtestMarkers ? lightweightState.markerData : []
      );
    }
    return;
  }
  if (!lightweightState.visible.backtestMarkers || !lightweightState.markerData.length) {
    markerApi(lightweightState.candleSeries, []);
    return;
  }
  markerApi(lightweightState.candleSeries, lightweightState.markerData);
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

function buildRSIChartLegacy(data) {
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

function buildMACDChartLegacy(data) {
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

function rebuildIndicatorPanes() {
  if (!lightweightState.chart || !lightweightState.technicalData) return;

  destroyIndicatorChart('rsi');
  destroyIndicatorChart('macd');
  lightweightState.indicatorPaneOrder = [];

  let nextPaneIndex = 1;
  if (document.getElementById('toggleRSI')?.checked) {
    buildRSIChart(lightweightState.technicalData, nextPaneIndex);
    lightweightState.indicatorPaneOrder.push('rsi');
    nextPaneIndex += 1;
  }

  if (document.getElementById('toggleMACD')?.checked) {
    buildMACDChart(lightweightState.technicalData, nextPaneIndex);
    lightweightState.indicatorPaneOrder.push('macd');
  }

  syncPaneLayout();
  lightweightState.chart.timeScale().fitContent();
  requestAnimationFrame(syncPaneLayout);
  window.setTimeout(syncPaneLayout, 60);
}

function syncPaneLayout() {
  const chartWrap = document.getElementById('priceChart')?.closest('.chart-wrap');
  if (!chartWrap || !lightweightState.chart) return;

  const mobile = window.innerWidth <= 720;
  const totalHeight = mobile ? 420 : 520;
  let paneHeights = [totalHeight];

  if (lightweightState.indicatorPaneOrder.length === 1) {
    paneHeights = lightweightState.indicatorPaneOrder[0] === 'rsi'
      ? (mobile ? [272, 118] : [334, 156])
      : (mobile ? [258, 132] : [318, 172]);
  }

  if (lightweightState.indicatorPaneOrder.length === 2) {
    paneHeights = mobile ? [202, 82, 106] : [248, 96, 146];
  }

  chartWrap.style.height = `${totalHeight}px`;
  chartWrap.style.minHeight = `${totalHeight}px`;

  const panes = lightweightState.chart.panes?.() || [];
  paneHeights.forEach((height, index) => {
    panes[index]?.setHeight(height);
  });
}

function buildRSIChart(data, paneIndex) {
  const rsiSeries = lightweightState.chart.addSeries(LightweightCharts.LineSeries, {
    color: '#bc8cff',
    lineWidth: 2,
    lastValueVisible: false,
    priceLineVisible: false,
    title: 'RSI',
  });
  const upperSeries = lightweightState.chart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(248, 81, 73, 0.42)',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  const lowerSeries = lightweightState.chart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(63, 185, 80, 0.42)',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    lastValueVisible: false,
    priceLineVisible: false,
  });

  rsiSeries.moveToPane(paneIndex);
  upperSeries.moveToPane(paneIndex);
  lowerSeries.moveToPane(paneIndex);

  rsiSeries.applyOptions({
    priceFormat: {
      type: 'price',
      precision: 1,
      minMove: 0.1,
    },
  });

  rsiSeries.setData(buildLineData(data.prices, data.indicators.rsi || []));
  upperSeries.setData(data.prices.map(item => ({ time: toBusinessDay(item.date), value: 70 })));
  lowerSeries.setData(data.prices.map(item => ({ time: toBusinessDay(item.date), value: 30 })));

  lightweightState.indicatorSeries.rsi = { rsiSeries, upperSeries, lowerSeries };
}

function buildMACDChart(data, paneIndex) {
  const macd = data.indicators.macd || { macdLine: [], signalLine: [], histogram: [] };
  const histogramSeries = lightweightState.chart.addSeries(LightweightCharts.HistogramSeries, {
    lastValueVisible: false,
    priceLineVisible: false,
    title: 'MACD Hist',
  });
  const macdSeries = lightweightState.chart.addSeries(LightweightCharts.LineSeries, {
    color: '#58a6ff',
    lineWidth: 2,
    lastValueVisible: false,
    priceLineVisible: false,
    title: 'MACD',
  });
  const signalSeries = lightweightState.chart.addSeries(LightweightCharts.LineSeries, {
    color: '#f0883e',
    lineWidth: 2,
    lastValueVisible: false,
    priceLineVisible: false,
    title: 'Signal',
  });

  histogramSeries.moveToPane(paneIndex);
  macdSeries.moveToPane(paneIndex);
  signalSeries.moveToPane(paneIndex);

  histogramSeries.applyOptions({
    priceFormat: {
      type: 'price',
      precision: 3,
      minMove: 0.001,
    },
  });

  histogramSeries.setData(buildHistogramData(data.prices, macd.histogram || []));
  macdSeries.setData(buildLineData(data.prices, macd.macdLine || []));
  signalSeries.setData(buildLineData(data.prices, macd.signalLine || []));

  lightweightState.indicatorSeries.macd = { histogramSeries, macdSeries, signalSeries };
}

function buildHistogramData(prices, values) {
  return prices
    .map((item, index) => {
      const value = values[index];
      if (value == null) return null;
      return {
        time: toBusinessDay(item.date),
        value,
        color: value >= 0 ? 'rgba(63, 185, 80, 0.55)' : 'rgba(248, 81, 73, 0.55)',
      };
    })
    .filter(Boolean);
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
