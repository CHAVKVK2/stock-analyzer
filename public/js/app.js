'use strict';

// ===== 상태 =====
const state = {
  currentTicker: null,
  currentRange: '6mo',
  currentFinancialPeriod: 'annual',
  technicalData: null,
  financialData: null,
  currency: 'USD',
};

// ===== DOM 참조 =====
const tickerInput   = document.getElementById('tickerInput');
const suffixSelect  = document.getElementById('suffixSelect');
const searchBtn     = document.getElementById('searchBtn');
const autocomplete  = document.getElementById('autocomplete');
const errorBanner   = document.getElementById('errorBanner');
const errorMsg      = document.getElementById('errorMsg');
const stockHeader   = document.getElementById('stockHeader');
const loadingSpinner = document.getElementById('loadingSpinner');
const mainContent   = document.getElementById('mainContent');

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
  setupTabs();
  setupRangeButtons();
  setupFinancialControls();
  setupIndicatorToggles();
  loadFromURL();
});

// ===== URL 상태 =====
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const ticker = params.get('ticker');
  const range  = params.get('range') || '6mo';
  if (ticker) {
    tickerInput.value = ticker;
    state.currentRange = range;
    document.querySelectorAll('.range-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.range === range);
    });
    search(ticker, range);
  }
}

function pushURL(ticker, range) {
  const url = new URL(window.location);
  url.searchParams.set('ticker', ticker);
  url.searchParams.set('range', range);
  history.pushState({}, '', url);
}

// ===== 검색 기능 =====
function setupSearch() {
  searchBtn.addEventListener('click', triggerSearch);
  tickerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerSearch();
  });

  // 자동완성
  let debounceTimer;
  tickerInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = tickerInput.value.trim();
    if (q.length < 1) {
      autocomplete.classList.add('hidden');
      return;
    }
    debounceTimer = setTimeout(() => fetchAutocomplete(q), 300);
  });

  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) {
      autocomplete.classList.add('hidden');
    }
  });
}

async function triggerSearch() {
  const raw = tickerInput.value.trim();
  if (!raw) return;

  // 자동완성이 열려 있으면 첫 번째 항목 자동 선택
  if (!autocomplete.classList.contains('hidden')) {
    const firstItem = autocomplete.querySelector('.autocomplete-item');
    if (firstItem) {
      const sym = firstItem.dataset.symbol;
      tickerInput.value = sym;
      autocomplete.classList.add('hidden');
      if (sym.includes('.')) suffixSelect.value = 'none';
      state.currentRange = getActiveRange();
      search(sym, state.currentRange);
      return;
    }
  }

  autocomplete.classList.add('hidden');
  state.currentRange = getActiveRange();

  // 소문자·공백·한글이 포함되면 회사명으로 판단 → 검색 API로 티커 변환
  if (/[a-z\s가-힣]/.test(raw)) {
    const { symbol, hasDot } = await resolveToTicker(raw);
    tickerInput.value = symbol;
    if (hasDot) suffixSelect.value = 'none';
    search(symbol, state.currentRange);
  } else {
    search(raw, state.currentRange);
  }
}

// 회사명 → 티커 변환 (검색 API 첫 번째 결과 사용)
async function resolveToTicker(query) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const top = (data.suggestions || [])[0];
    if (top) return { symbol: top.symbol, hasDot: top.symbol.includes('.') };
  } catch {}
  return { symbol: query, hasDot: query.includes('.') };
}

async function fetchAutocomplete(q) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderAutocomplete(data.suggestions || []);
  } catch (e) {
    autocomplete.classList.add('hidden');
  }
}

function renderAutocomplete(suggestions) {
  if (!suggestions.length) {
    autocomplete.classList.add('hidden');
    return;
  }
  autocomplete.innerHTML = suggestions.map(s => `
    <div class="autocomplete-item" data-symbol="${s.symbol}">
      <span class="autocomplete-symbol">${s.symbol}</span>
      <span class="autocomplete-name">${s.name}</span>
      <span class="autocomplete-exchange">${s.exchange}</span>
    </div>
  `).join('');

  autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const sym = item.dataset.symbol;
      tickerInput.value = sym;
      autocomplete.classList.add('hidden');
      // 접미사가 이미 포함된 경우 'none'으로
      if (sym.includes('.')) suffixSelect.value = 'none';
      triggerSearch();
    });
  });

  autocomplete.classList.remove('hidden');
}

// ===== 메인 검색 실행 =====
async function search(ticker, range) {
  state.currentTicker = ticker;
  state.currentRange = range;

  showLoading(true);
  hideError();
  hideMainContent();
  document.getElementById('newsSection').classList.add('hidden');

  pushURL(ticker, range);

  try {
    const suffix = suffixSelect.value;
    const [techRes, finRes] = await Promise.allSettled([
      fetch(`/api/stock/technical?ticker=${encodeURIComponent(ticker)}&range=${range}&suffix=${suffix}`).then(r => r.json()),
      fetch(`/api/stock/financials?ticker=${encodeURIComponent(ticker)}&suffix=${suffix}`).then(r => r.json()),
    ]);

    // 기술적 분석 처리
    if (techRes.status === 'fulfilled' && !techRes.value.error) {
      state.technicalData = techRes.value;
      state.currency = techRes.value.meta.currency || 'USD';
      renderStockHeader(techRes.value);
      buildPriceChart(techRes.value);
      toggleBollingerBands(document.getElementById('toggleBB').checked);
      toggleRSI(document.getElementById('toggleRSI').checked);
      toggleMACD(document.getElementById('toggleMACD').checked);
    } else {
      const errMsg = (techRes.value && techRes.value.error) || '기술적 분석 데이터를 불러오지 못했습니다.';
      showError(errMsg);
      showLoading(false);
      return;
    }

    // 재무제표 처리
    if (finRes.status === 'fulfilled' && !finRes.value.error) {
      state.financialData = finRes.value;
      renderAllFinancials(finRes.value, state.currentFinancialPeriod, state.currency);
    }
    // 재무제표는 없어도 기술적 분석은 표시

    showLoading(false);
    showMainContent();

    // 뉴스는 메인 콘텐츠 표시 후 비동기 로드
    fetchAndRenderNews(techRes.value.resolvedTicker);
  } catch (err) {
    showError('서버 연결에 실패했습니다. 네트워크를 확인해주세요.');
    showLoading(false);
  }
}

// ===== 종목 헤더 렌더링 =====
function renderStockHeader(data) {
  document.getElementById('stockName').textContent   = data.meta.longName || data.ticker;
  document.getElementById('stockTicker').textContent = data.resolvedTicker;
  document.getElementById('stockExchange').textContent = data.meta.exchangeName || '';

  const price = data.meta.regularMarketPrice;
  const change = data.meta.regularMarketChangePercent;
  const currency = data.meta.currency || 'USD';
  const symbol = currency === 'KRW' ? '₩' : '$';

  if (price != null) {
    document.getElementById('stockPrice').textContent =
      currency === 'KRW'
        ? symbol + Math.round(price).toLocaleString('ko-KR')
        : symbol + price.toFixed(2);
  } else {
    // 최신 종가 사용
    const last = data.prices[data.prices.length - 1];
    if (last) {
      document.getElementById('stockPrice').textContent =
        currency === 'KRW'
          ? symbol + Math.round(last.close).toLocaleString('ko-KR')
          : symbol + last.close.toFixed(2);
    }
  }

  const changeEl = document.getElementById('stockChange');
  if (change != null) {
    const sign = change >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${change.toFixed(2)}%`;
    changeEl.className = 'stock-change ' + (change >= 0 ? 'positive' : 'negative');
  } else {
    changeEl.textContent = '';
  }

  document.getElementById('stockCurrency').textContent = currency;
  stockHeader.classList.remove('hidden');
}

// ===== 탭 전환 =====
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

// ===== 기간 버튼 =====
function setupRangeButtons() {
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.currentTicker) return;
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentRange = btn.dataset.range;
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
    const res = await fetch(
      `/api/stock/technical?ticker=${encodeURIComponent(state.currentTicker)}&range=${state.currentRange}&suffix=${suffix}`
    );
    const data = await res.json();

    if (data.error) {
      showError(data.error);
      showLoading(false);
      return;
    }

    state.technicalData = data;
    renderStockHeader(data);
    buildPriceChart(data);
    toggleBollingerBands(document.getElementById('toggleBB').checked);
    toggleRSI(document.getElementById('toggleRSI').checked);
    toggleMACD(document.getElementById('toggleMACD').checked);
    pushURL(state.currentTicker, state.currentRange);
    showLoading(false);
    showMainContent();
  } catch (err) {
    showError('데이터를 불러오지 못했습니다.');
    showLoading(false);
  }
}

// ===== 지표 토글 =====
function setupIndicatorToggles() {
  document.getElementById('toggleBB').addEventListener('change', e => {
    toggleBollingerBands(e.target.checked);
  });
  document.getElementById('toggleRSI').addEventListener('change', e => {
    toggleRSI(e.target.checked);
  });
  document.getElementById('toggleMACD').addEventListener('change', e => {
    toggleMACD(e.target.checked);
  });
}

// ===== 재무제표 컨트롤 =====
function setupFinancialControls() {
  // 서브탭
  document.querySelectorAll('.fin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.fintab;
      document.querySelectorAll('.fin-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`fin-${tab}`).classList.add('active');
    });
  });

  // 연간/분기 토글
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFinancialPeriod = btn.dataset.period;
      if (state.financialData) {
        renderAllFinancials(state.financialData, state.currentFinancialPeriod, state.currency);
      }
    });
  });
}

// ===== 뉴스 =====

async function fetchAndRenderNews(ticker) {
  const section  = document.getElementById('newsSection');
  const list     = document.getElementById('newsList');
  const spinner  = document.getElementById('newsLoading');

  section.classList.remove('hidden');
  spinner.classList.remove('hidden');
  list.innerHTML = '';

  try {
    const res  = await fetch(`/api/news/${encodeURIComponent(ticker)}`);
    const data = await res.json();
    renderNews(data.news || []);
  } catch {
    list.innerHTML = '<p class="news-empty">뉴스를 불러오지 못했습니다.</p>';
  } finally {
    spinner.classList.add('hidden');
  }
}

function renderNews(articles) {
  const list = document.getElementById('newsList');
  if (!articles.length) {
    list.innerHTML = '<p class="news-empty">관련 뉴스가 없습니다.</p>';
    return;
  }
  list.innerHTML = articles.map(a => `
    <a href="${escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer" class="news-item">
      <div class="news-headline">${escapeHtml(a.headline)}</div>
      <div class="news-meta">
        <span class="news-source">${escapeHtml(a.source)}</span>
        <span class="news-date">${escapeHtml(a.datetime)}</span>
      </div>
    </a>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  // URL은 http/https만 허용
  const s = String(str).trim();
  if (!/^https?:\/\//i.test(s)) return '#';
  return s.replace(/"/g, '%22');
}

// ===== UI 헬퍼 =====
function showLoading(show) {
  loadingSpinner.classList.toggle('hidden', !show);
}
function showError(msg) {
  errorMsg.textContent = msg;
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
