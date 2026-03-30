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

/**
 * 가격 차트 + 볼린저밴드 + 거래량
 */
function buildPriceChart(data) {
  destroyChart('price');
  const canvas = document.getElementById('priceChart');
  const ctx = canvas.getContext('2d');

  const labels = data.prices.map(p => p.date);
  const closes = data.prices.map(p => p.close);
  const volumes = data.prices.map(p => p.volume);
  const bb = data.indicators.bollingerBands;

  // 볼린저밴드 fill 그라데이션
  const bbFillPlugin = {
    id: 'bbFill',
    beforeDatasetsDraw(chart) {
      const { ctx, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;

      const upperDs = chart.data.datasets.find(d => d.label === 'BB Upper');
      const lowerDs = chart.data.datasets.find(d => d.label === 'BB Lower');
      if (!upperDs || !lowerDs) return;

      const upperIdx = chart.data.datasets.indexOf(upperDs);
      const lowerIdx = chart.data.datasets.indexOf(lowerDs);
      const upperMeta = chart.getDatasetMeta(upperIdx);
      const lowerMeta = chart.getDatasetMeta(lowerIdx);

      if (!upperMeta.data.length || !lowerMeta.data.length) return;

      ctx.save();
      ctx.beginPath();
      upperMeta.data.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      for (let i = lowerMeta.data.length - 1; i >= 0; i--) {
        ctx.lineTo(lowerMeta.data[i].x, lowerMeta.data[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(139,148,158,0.08)';
      ctx.fill();
      ctx.restore();
    }
  };

  chartInstances['price'] = new Chart(ctx, {
    type: 'line',
    plugins: [bbFillPlugin],
    data: {
      labels,
      datasets: [
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
          yAxisID: 'y2',
          order: 10,
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
              if (ctx.dataset.label === '거래량') {
                return `거래량: ${formatVolume(ctx.raw)}`;
              }
              if (ctx.dataset.label.startsWith('BB')) {
                return `${ctx.dataset.label}: ${formatPrice(ctx.raw, data.meta.currency)}`;
              }
              return `${ctx.dataset.label}: ${formatPrice(ctx.raw, data.meta.currency)}`;
            }
          }
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
            callback: v => formatPrice(v, data.meta.currency),
          },
          grid: { color: '#21262d' },
        },
        y2: {
          position: 'right',
          display: false,
          max: Math.max(...volumes.filter(v => v > 0)) * 6,
          min: 0,
          grid: { display: false },
        },
      },
    },
  });
}

/**
 * RSI 차트
 */
function buildRSIChart(data) {
  destroyChart('rsi');
  const canvas = document.getElementById('rsiChart');
  const ctx = canvas.getContext('2d');

  const labels = data.prices.map(p => p.date);
  const rsiValues = data.indicators.rsi;

  // 과매수/과매도 배경색 플러그인
  const rsiZonePlugin = {
    id: 'rsiZone',
    beforeDatasetsDraw(chart) {
      const { ctx: c, scales, chartArea } = chart;
      const yScale = scales.y;
      if (!chartArea) return;

      const y70 = yScale.getPixelForValue(70);
      const y30 = yScale.getPixelForValue(30);
      const y100 = yScale.getPixelForValue(100);
      const y0 = yScale.getPixelForValue(0);

      c.save();
      // 과매수 영역 (70~100)
      c.fillStyle = 'rgba(248,81,73,0.07)';
      c.fillRect(chartArea.left, y100, chartArea.width, y70 - y100);
      // 과매도 영역 (0~30)
      c.fillStyle = 'rgba(63,185,80,0.07)';
      c.fillRect(chartArea.left, y30, chartArea.width, y0 - y30);
      c.restore();
    }
  };

  chartInstances['rsi'] = new Chart(ctx, {
    type: 'line',
    plugins: [rsiZonePlugin],
    data: {
      labels,
      datasets: [
        {
          label: 'RSI',
          data: rsiValues,
          borderColor: '#bc8cff',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          spanGaps: false,
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
              const v = ctx.raw;
              if (v == null) return null;
              let note = '';
              if (v >= 70) note = ' (과매수)';
              else if (v <= 30) note = ' (과매도)';
              return `RSI: ${v.toFixed(2)}${note}`;
            }
          }
        },
        annotation: {
          annotations: {
            line70: {
              type: 'line',
              yMin: 70, yMax: 70,
              borderColor: 'rgba(248,81,73,0.5)',
              borderWidth: 1,
              borderDash: [4, 4],
            },
            line30: {
              type: 'line',
              yMin: 30, yMax: 30,
              borderColor: 'rgba(63,185,80,0.5)',
              borderWidth: 1,
              borderDash: [4, 4],
            },
          }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6, maxRotation: 0, color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: '#8b949e',
            font: { size: 11 },
            stepSize: 20,
          },
          grid: { color: '#21262d' },
        },
      },
    },
  });
}

/**
 * MACD 차트
 */
function buildMACDChart(data) {
  destroyChart('macd');
  const canvas = document.getElementById('macdChart');
  const ctx = canvas.getContext('2d');

  const labels = data.prices.map(p => p.date);
  const { macdLine, signalLine, histogram } = data.indicators.macd;

  // 히스토그램 동적 색상
  const histColors = histogram.map(v => {
    if (v == null) return 'transparent';
    return v >= 0 ? 'rgba(63,185,80,0.7)' : 'rgba(248,81,73,0.7)';
  });

  chartInstances['macd'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
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
          order: 1,
        },
        {
          label: '시그널',
          data: signalLine,
          type: 'line',
          borderColor: '#f0883e',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
          spanGaps: false,
          order: 2,
        },
        {
          label: '히스토그램',
          data: histogram,
          type: 'bar',
          backgroundColor: histColors,
          borderColor: histColors,
          borderWidth: 0,
          order: 3,
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
              const v = ctx.raw;
              if (v == null) return null;
              return `${ctx.dataset.label}: ${v.toFixed(4)}`;
            }
          }
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6, maxRotation: 0, color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
        },
        y: {
          ticks: { color: '#8b949e', font: { size: 11 } },
          grid: { color: '#21262d' },
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
