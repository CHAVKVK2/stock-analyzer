'use strict';

const INCOME_FIELDS = [
  { key: 'totalRevenue', label: '총매출' },
  { key: 'grossProfit', label: '매출총이익' },
  { key: 'operatingIncome', label: '영업이익' },
  { key: 'ebit', label: 'EBIT' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'netIncome', label: '순이익' },
  { key: 'researchDevelopment', label: '연구개발비' },
  { key: 'totalOperatingExpenses', label: '총영업비용' },
  { key: 'basicEPS', label: 'EPS (기본)', noFormat: true },
  { key: 'dilutedEPS', label: 'EPS (희석)', noFormat: true },
];

const BALANCE_FIELDS = [
  { key: 'totalAssets', label: '총자산' },
  { key: 'totalCurrentAssets', label: '유동자산' },
  { key: 'cash', label: '현금 및 현금성자산' },
  { key: 'shortTermInvestments', label: '단기투자자산' },
  { key: 'netReceivables', label: '매출채권' },
  { key: 'totalLiabilities', label: '총부채' },
  { key: 'totalCurrentLiabilities', label: '유동부채' },
  { key: 'longTermDebt', label: '장기부채' },
  { key: 'shortLongTermDebt', label: '단기부채' },
  { key: 'totalStockholderEquity', label: '자기자본' },
  { key: 'retainedEarnings', label: '이익잉여금' },
];

const CASHFLOW_FIELDS = [
  { key: 'operatingCashFlow', label: '영업활동 현금흐름' },
  { key: 'capitalExpenditures', label: '자본지출(CapEx)' },
  { key: 'freeCashFlow', label: '잉여현금흐름(FCF)' },
  { key: 'totalCashFromInvestingActivities', label: '투자활동 현금흐름' },
  { key: 'totalCashFromFinancingActivities', label: '재무활동 현금흐름' },
  { key: 'dividendsPaid', label: '배당금 지급' },
  { key: 'repurchaseOfStock', label: '자사주 매입' },
  { key: 'changeInCash', label: '현금 증감' },
];

function renderFinancialTable(containerId, statements, fields, currency) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(statements) || statements.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        재무제표 데이터를 찾지 못했습니다.<br>
        종목 IR 페이지나 공시 자료를 함께 확인해 주세요.
      </div>
    `;
    return;
  }

  const sorted = [...statements].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const dates = sorted.map(statement => statement.date);

  let html = '<table class="fin-table"><thead><tr>';
  html += '<th>항목</th>';
  dates.forEach(date => {
    html += `<th>${escapeFinancialHtml(date)}</th>`;
  });
  html += '</tr></thead><tbody>';

  fields.forEach(field => {
    html += '<tr>';
    html += `<td>${escapeFinancialHtml(field.label)}</td>`;

    sorted.forEach(statement => {
      const value = statement[field.key];

      if (value == null) {
        html += '<td class="val-na">-</td>';
        return;
      }

      if (field.noFormat) {
        html += `<td>${Number(value).toFixed(2)}</td>`;
        return;
      }

      const formatted = formatFinancialNumber(value, currency);
      const cls = value > 0 ? 'val-positive' : value < 0 ? 'val-negative' : '';
      html += `<td class="${cls}">${escapeFinancialHtml(formatted)}</td>`;
    });

    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function formatFinancialNumber(value, currency) {
  if (value == null) return '-';

  const abs = Math.abs(Number(value));
  const negative = Number(value) < 0;

  if (currency === 'KRW') {
    let text;
    if (abs >= 1e12) text = `${(abs / 1e12).toFixed(2)}조`;
    else if (abs >= 1e8) text = `${(abs / 1e8).toFixed(1)}억`;
    else if (abs >= 1e4) text = `${(abs / 1e4).toFixed(1)}만`;
    else text = abs.toLocaleString('ko-KR');
    return `${negative ? '-' : ''}KRW ${text}`;
  }

  let text;
  if (abs >= 1e12) text = `${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) text = `${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) text = `${(abs / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) text = `${(abs / 1e3).toFixed(1)}K`;
  else text = abs.toFixed(2);

  return `${negative ? '-' : ''}$${text}`;
}

function renderAllFinancials(financialData, period, currency) {
  const selectedPeriod = period === 'quarterly' ? 'quarterly' : 'annual';

  renderFinancialTable('incomeTable', financialData.incomeStatement[selectedPeriod], INCOME_FIELDS, currency);
  renderFinancialTable('balanceTable', financialData.balanceSheet[selectedPeriod], BALANCE_FIELDS, currency);
  renderFinancialTable('cashflowTable', financialData.cashFlow[selectedPeriod], CASHFLOW_FIELDS, currency);
}

function escapeFinancialHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
