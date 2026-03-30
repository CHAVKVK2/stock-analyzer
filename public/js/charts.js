'use strict';

// Chart.js 전역 기본 설정
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#21262d';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif";

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// ===== 지표 토글 =====

function toggleBollingerBands(show) {
  const chart = chartInstances['price'];
  if (!chart) return;
  chart.data.datasets.forEach((ds, i) => {
    if (['BB Upper', 'BB Middle', 'BB Lower'].includes(ds.label)) {
      chart.getDatasetMeta(i).hidden = !show;
    }
  });
  chart.update('none');
}

function toggleRSI(show) {
  const chart = chartInstances['price'];
  if (!chart) return;
  chart.data.datasets.forEach((ds, i) => {
    if (['RSI', 'RSI 기준 70', 'RSI 기준 30'].includes(ds.label)) {
      chart.getDatasetMeta(i).hidden = !show;
    }
  });
  chart.options.scales.y2.display = show;
  chart.update('none');
}

function toggleMACD(show) {
  const chart = chartInstances['price'];
  if (!chart) return;
  chart.data.datasets.forEach((ds, i) => {
    if (['MACD', 'MACD 시그널', '히스토그램'].includes(ds.label)) {
      chart.getDatasetMeta(i).hidden = !show;
    }
  });
  chart.options.scales.y3.display = show;
  chart.update('none');
}

// ===== 시그널 감지 =====

/**
 * RSI·MACD 기반 매수/매도 시그널 감지
 * - RSI 30 이하 진입: 매수 / RSI 70 이상 진입: 매도
 * - MACD 골든크로스: 매수 / MACD 데드크로스: 매도
 */
function detectSignals(data) {
  const signals = [];
  const rsi = data.indicators.rsi;
  const { macdLine, signalLine } = data.indicators.macd;
  const len = data.prices.length;

  for (let i = 1; i < len; i++) {
    const rsiCur = rsi[i], rsiPrev = rsi[i - 1];
    if (rsiCur != null && rsiPrev != null) {
      if (rsiPrev > 30 && rsiCur <= 30) {
        signals.push({ index: i, type: 'buy', source: 'rsi' });
      } else if (rsiPrev < 70 && rsiCur >= 70) {
        signals.push({ index: i, type: 'sell', source: 'rsi' });
      }
    }

    const macdCur = macdLine[i], macdPrev = macdLine[i - 1];
    const sigCur = signalLine[i], sigPrev = signalLine[i - 1];
    if (macdCur != null && macdPrev != null && sigCur != null && sigPrev != null) {
      if (macdPrev < sigPrev && macdCur >= sigCur) {
        signals.push({ index: i, type: 'buy', source: 'macd' });
      } else if (macdPrev > sigPrev && macdCur <= sigCur) {
        signals.push({ index: i, type: 'sell', source: 'macd' });
      }
    }
  }
  return signals;
}

/**
 * 시그널 마커용 Chart.js 데이터셋 2개(매수/매도) 반환
 */
function makeSignalDatasets(signals, count, valueGetter, sourceFilter) {
  const buyArr  = Array(count).fill(null);
  const sellArr = Array(count).fill(null);

  signals.forEach(sig => {
    if (sourceFilter && sig.source !== sourceFilter) return;
    const val = valueGetter(sig.index);
    if (val == null) return;
    if (sig.type === 'buy')  buyArr[sig.index]  = val;
    else                     sellArr[sig.index] = val;
  });

  return [
    {
      label: '매수 시그널',
      data: buyArr,
      type: 'line',
      showLine: false,
      pointStyle: 'triangle',
      pointRotation: 0,
      pointRadius: ctx => ctx.raw != null ? 8 : 0,
      pointHoverRadius: ctx => ctx.raw != null ? 10 : 0,
      backgroundColor: 'rgba(63,185,80,1)',
      borderColor: 'rgba(63,185,80,1)',
      borderWidth: 0,
      order: 0,
    },
    {
      label: '매도 시그널',
      data: sellArr,
      type: 'line',
      showLine: false,
      pointStyle: 'triangle',
      pointRotation: 180,
      pointRadius: ctx => ctx.raw != null ? 8 : 0,
      pointHoverRadius: ctx => ctx.raw != null ? 10 : 0,
      backgroundColor: 'rgba(248,81,73,1)',
      borderColor: 'rgba(248,81,73,1)',
      borderWidth: 0,
      order: 0,
    },
  ];
}

/**
 * 주가 차트 (볼린저밴드 + RSI 오버레이 + MACD 오버레이 + 거래량)
 * y  (왼쪽): 주가
 * y2 (오른쪽): RSI 0~100
 * y3 (오른쪽): MACD 자동 스케일
 * yVol (숨김): 거래량
 */
function buildPriceChart(data) {
  destroyChart('price');
  const canvas = document.getElementById('priceChart');
  const ctx = canvas.getContext('2d');

  const labels  = data.prices.map(p => p.date);
  const closes  = data.prices.map(p => p.close);
  const volumes = data.prices.map(p => p.volume);
  const bb      = data.indicators.bollingerBands;
  const rsiValues = data.indicators.rsi;
  const { macdLine, signalLine: macdSignal, histogram } = data.indicators.macd;

  const signals  = detectSignals(data);
  const signalDs = makeSignalDatasets(signals, labels.length, i => closes[i], null)
    .map(ds => ({ ...ds, yAxisID: 'y' }));

  const histColors = histogram.map(v => {
    if (v == null) return 'transparent';
    return v >= 0 ? 'rgba(63,185,80,0.55)' : 'rgba(248,81,73,0.55)';
  });

  // RSI 기준선 데이터
  const rsiRef70 = labels.map(() => 70);
  const rsiRef30 = labels.map(() => 30);

  // 볼린저밴드 fill 플러그인
  const bbFillPlugin = {
    id: 'bbFill',
    beforeDatasetsDraw(chart) {
      const { ctx: c } = chart;
      const upperDs = chart.data.datasets.find(d => d.label === 'BB Upper');
      const lowerDs = chart.data.datasets.find(d => d.label === 'BB Lower');
      if (!upperDs || !lowerDs) return;
      const upperMeta = chart.getDatasetMeta(chart.data.datasets.indexOf(upperDs));
      const lowerMeta = chart.getDatasetMeta(chart.data.datasets.indexOf(lowerDs));
      if (!upperMeta.data.length || !lowerMeta.data.length) return;
      // BB 밴드가 숨겨진 경우 fill도 숨김
      if (upperMeta.hidden || lowerMeta.hidden) return;
      c.save();
      c.beginPath();
      upperMeta.data.forEach((pt, i) => {
        if (i === 0) c.moveTo(pt.x, pt.y);
        else c.lineTo(pt.x, pt.y);
      });
      for (let i = lowerMeta.data.length - 1; i >= 0; i--) {
        c.lineTo(lowerMeta.data[i].x, lowerMeta.data[i].y);
      }
      c.closePath();
      c.fillStyle = 'rgba(139,148,158,0.08)';
      c.fill();
      c.restore();
    }
  };

  chartInstances['price'] = new Chart(ctx, {
    type: 'line',
    plugins: [bbFillPlugin],
    data: {
      labels,
      datasets: [
        // ── 주가 ──
        {
          label: '종가',
          data: closes,
          borderColor: '#388bfd',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          yAxisID: 'y',
          order: 1,
        },
        {
          label: 'BB Upper',
          data: bb.upper,
          borderColor: 'rgba(139,148,158,0.4)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 3],
          pointRadius: 0,
          tension: 0.1,
          yAxisID: 'y',
          order: 2,
        },
        {
          label: 'BB Middle',
          data: bb.middle,
          borderColor: 'rgba(139,148,158,0.6)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [2, 2],
          pointRadius: 0,
          tension: 0.1,
          yAxisID: 'y',
          order: 3,
        },
        {
          label: 'BB Lower',
          data: bb.lower,
          borderColor: 'rgba(139,148,158,0.4)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 3],
          pointRadius: 0,
          tension: 0.1,
          yAxisID: 'y',
          order: 4,
        },
        {
          label: '거래량',
          data: volumes,
          type: 'bar',
          backgroundColor: 'rgba(63,185,80,0.25)',
          borderColor: 'rgba(63,185,80,0.4)',
          borderWidth: 0,
          yAxisID: 'yVol',
          order: 10,
        },
        ...signalDs,
        // ── RSI 오버레이 (초기 hidden) ──
        {
          label: 'RSI',
          data: rsiValues,
          type: 'line',
          borderColor: '#bc8cff',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          spanGaps: false,
          yAxisID: 'y2',
          order: 5,
          hidden: true,
        },
        {
          label: 'RSI 기준 70',
          data: rsiRef70,
          type: 'line',
          borderColor: 'rgba(248,81,73,0.35)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
          spanGaps: true,
          yAxisID: 'y2',
          order: 6,
          hidden: true,
        },
        {
          label: 'RSI 기준 30',
          data: rsiRef30,
          type: 'line',
          borderColor: 'rgba(63,185,80,0.35)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
          spanGaps: true,
          yAxisID: 'y2',
          order: 7,
          hidden: true,
        },
        // ── MACD 오버레이 (초기 hidden) ──
        {
          label: 'MACD',
          data: macdLine,
          type: 'line',
          borderColor: '#388bfd',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          spanGaps: false,
          yAxisID: 'y3',
          order: 8,
          hidden: true,
        },
        {
          label: 'MACD 시그널',
          data: macdSignal,
          type: 'line',
          borderColor: '#f0883e',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          spanGaps: false,
          yAxisID: 'y3',
          order: 9,
          hidden: true,
        },
        {
          label: '히스토그램',
          data: histogram,
          type: 'bar',
          backgroundColor: histColors,
          borderColor: histColors,
          borderWidth: 0,
          yAxisID: 'y3',
          order: 11,
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
          backgroundColor: '#21262d',
          borderColor: '#30363d',
          borderWidth: 1,
          callbacks: {
            label(ctx) {
              const lbl = ctx.dataset.label;
              const v   = ctx.raw;
              if (lbl === '매수 시그널')  return v != null ? '▲ 매수 시그널' : null;
              if (lbl === '매도 시그널')  return v != null ? '▼ 매도 시그널' : null;
              if (lbl === '거래량')       return v != null ? `거래량: ${formatVolume(v)}` : null;
              if (lbl.startsWith('BB'))  return v != null ? `${lbl}: ${formatPrice(v, data.meta.currency)}` : null;
              if (lbl === 'RSI') {
                if (v == null) return null;
                const note = v >= 70 ? ' (과매수)' : v <= 30 ? ' (과매도)' : '';
                return `RSI: ${v.toFixed(2)}${note}`;
              }
              if (lbl.startsWith('RSI 기준')) return null; // 기준선은 툴팁 숨김
              if (lbl === 'MACD')        return v != null ? `MACD: ${v.toFixed(4)}` : null;
              if (lbl === 'MACD 시그널') return v != null ? `MACD 시그널: ${v.toFixed(4)}` : null;
              if (lbl === '히스토그램')  return v != null ? `히스토그램: ${v.toFixed(4)}` : null;
              return v != null ? `${lbl}: ${formatPrice(v, data.meta.currency)}` : null;
            }
          }
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
        },
        // 주가 (왼쪽)
        y: {
          position: 'left',
          ticks: {
            color: '#8b949e',
            font: { size: 11 },
            callback: v => formatPrice(v, data.meta.currency),
          },
          grid: { color: '#21262d' },
        },
        // 거래량 (숨김, 비율 조정용)
        yVol: {
          position: 'right',
          display: false,
          max: Math.max(...volumes.filter(v => v > 0)) * 6,
          min: 0,
          grid: { display: false },
        },
        // RSI (오른쪽, 초기 숨김)
        y2: {
          position: 'right',
          display: false,
          min: 0,
          max: 100,
          ticks: {
            color: '#bc8cff',
            font: { size: 10 },
            stepSize: 20,
            callback: v => v,
          },
          grid: { display: false },
        },
        // MACD (오른쪽, 초기 숨김)
        y3: {
          position: 'right',
          display: false,
          ticks: {
            color: '#8b949e',
            font: { size: 10 },
            maxTicksLimit: 5,
            callback: v => v.toFixed(2),
          },
          grid: { display: false },
        },
      },
    },
  });
}

// ===== 포맷 헬퍼 =====

function formatPrice(v, currency) {
  if (v == null) return 'N/A';
  const symbol = currency === 'KRW' ? '₩' : '$';
  if (currency === 'KRW') {
    return symbol + Math.round(v).toLocaleString('ko-KR');
  }
  return symbol + v.toFixed(2);
}

function formatVolume(v) {
  if (v == null) return 'N/A';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toString();
}
