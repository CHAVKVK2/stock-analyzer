'use strict';

const INCOME_FIELDS = [
  { key: 'totalRevenue',           label: '총 매출액' },
  { key: 'grossProfit',            label: '매출총이익' },
  { key: 'operatingIncome',        label: '영업이익' },
  { key: 'ebit',                   label: 'EBIT' },
  { key: 'ebitda',                 label: 'EBITDA' },
  { key: 'netIncome',              label: '순이익' },
  { key: 'researchDevelopment',    label: '연구개발비' },
  { key: 'totalOperatingExpenses', label: '총 영업비용' },
  { key: 'basicEPS',               label: 'EPS (기본)', noFormat: true },
  { key: 'dilutedEPS',             label: 'EPS (희석)', noFormat: true },
];

const BALANCE_FIELDS = [
  { key: 'totalAssets',             label: '총 자산' },
  { key: 'totalCurrentAssets',      label: '유동자산' },
  { key: 'cash',                    label: '현금 및 현금성자산' },
  { key: 'shortTermInvestments',    label: '단기투자자산' },
  { key: 'netReceivables',          label: '매출채권' },
  { key: 'totalLiabilities',        label: '총 부채' },
  { key: 'totalCurrentLiabilities', label: '유동부채' },
  { key: 'longTermDebt',            label: '장기부채' },
  { key: 'shortLongTermDebt',       label: '단기부채' },
  { key: 'totalStockholderEquity',  label: '자기자본' },
  { key: 'retainedEarnings',        label: '이익잉여금' },
];

const CASHFLOW_FIELDS = [
  { key: 'operatingCashFlow',                  label: '영업활동 현금흐름' },
  { key: 'capitalExpenditures',                label: '자본지출 (CapEx)' },
  { key: 'freeCashFlow',                       label: '잉여현금흐름 (FCF)' },
  { key: 'totalCashFromInvestingActivities',   label: '투자활동 현금흐름' },
  { key: 'totalCashFromFinancingActivities',   label: '재무활동 현금흐름' },
  { key: 'dividendsPaid',                      label: '배당금 지급' },
  { key: 'repurchaseOfStock',                  label: '자사주 매입' },
  { key: 'changeInCash',                       label: '현금 순변동' },
];

/**
 * 재무제표 테이블 렌더링
 * @param {string} containerId  - 컨테이너 요소 id
 * @param {Array}  statements   - 재무 데이터 배열 (최신순 정렬)
 * @param {Array}  fields       - { key, label, noFormat? } 배열
 * @param {string} currency     - 'KRW' | 'USD' 등
 */
function renderFinancialTable(containerId, statements, fields, currency) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!statements || statements.length === 0) {
    container.innerHTML = `<div class="no-data">Yahoo Finance에서 해당 종목의 재무데이터를 제공하지 않습니다.<br>종목 IR 페이지를 직접 확인해주세요.</div>`;
    return;
  }

  // 최신순 정렬
  const sorted = [...statements].sort((a, b) => b.date - a.date || b.date.localeCompare(a.date));
  const dates = sorted.map(s => s.date);

  let html = '<table class="fin-table"><thead><tr>';
  html += '<th>항목</th>';
  dates.forEach(d => { html += `<th>${d}</th>`; });
  html += '</tr></thead><tbody>';

  fields.forEach(field => {
    html += '<tr>';
    html += `<td>${field.label}</td>`;
    sorted.forEach((stmt, colIdx) => {
      const val = stmt[field.key];
      if (val == null) {
        html += '<td class="val-na">—</td>';
        return;
      }
      if (field.noFormat) {
        // EPS 등 작은 숫자
        html += `<td>${val.toFixed(2)}</td>`;
        return;
      }
      const formatted = formatFinancialNumber(val, currency);
      const cls = val > 0 ? 'val-positive' : val < 0 ? 'val-negative' : '';
      html += `<td class="${cls}">${formatted}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function formatFinancialNumber(v, currency) {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const neg = v < 0;
  const symbol = currency === 'KRW' ? '₩' : '$';
  let str;

  if (currency === 'KRW') {
    if (abs >= 1e12)      str = (abs / 1e12).toFixed(2) + '조';
    else if (abs >= 1e8)  str = (abs / 1e8).toFixed(1) + '억';
    else if (abs >= 1e4)  str = (abs / 1e4).toFixed(1) + '만';
    else                  str = abs.toLocaleString('ko-KR');
    return (neg ? '-' : '') + symbol + str;
  } else {
    if (abs >= 1e9)      str = (abs / 1e9).toFixed(2) + 'B';
    else if (abs >= 1e6) str = (abs / 1e6).toFixed(2) + 'M';
    else if (abs >= 1e3) str = (abs / 1e3).toFixed(1) + 'K';
    else                 str = abs.toFixed(2);
    return (neg ? '-' : '') + symbol + str;
  }
}

/**
 * 모든 재무제표 탭 렌더링
 */
function renderAllFinancials(financialData, period, currency) {
  const p = period; // 'annual' | 'quarterly'

  renderFinancialTable('incomeTable',  financialData.incomeStatement[p], INCOME_FIELDS,   currency);
  renderFinancialTable('balanceTable', financialData.balanceSheet[p],    BALANCE_FIELDS,  currency);
  renderFinancialTable('cashflowTable',financialData.cashFlow[p],        CASHFLOW_FIELDS, currency);
}
