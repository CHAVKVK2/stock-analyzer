'use strict';

const INCOME_FIELDS = [
  { key: 'totalRevenue', label: '\ucd1d\ub9e4\ucd9c' },
  { key: 'grossProfit', label: '\ub9e4\ucd9c\ucd1d\uc774\uc775' },
  { key: 'operatingIncome', label: '\uc601\uc5c5\uc774\uc775' },
  { key: 'ebit', label: 'EBIT' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'netIncome', label: '\uc21c\uc774\uc775' },
  { key: 'researchDevelopment', label: '\uc5f0\uad6c\uac1c\ubc1c\ube44' },
  { key: 'totalOperatingExpenses', label: '\ucd1d\uc601\uc5c5\ube44\uc6a9' },
  { key: 'basicEPS', label: 'EPS (\uae30\ubcf8)', noFormat: true },
  { key: 'dilutedEPS', label: 'EPS (\ud76c\uc11d)', noFormat: true },
];

const BALANCE_FIELDS = [
  { key: 'totalAssets', label: '\ucd1d\uc790\uc0b0' },
  { key: 'totalCurrentAssets', label: '\uc720\ub3d9\uc790\uc0b0' },
  { key: 'cash', label: '\ud604\uae08 \ubc0f \ud604\uae08\uc131\uc790\uc0b0' },
  { key: 'shortTermInvestments', label: '\ub2e8\uae30\ud22c\uc790\uc790\uc0b0' },
  { key: 'netReceivables', label: '\ub9e4\ucd9c\ucc44\uad8c' },
  { key: 'totalLiabilities', label: '\ucd1d\ubd80\ucc44' },
  { key: 'totalCurrentLiabilities', label: '\uc720\ub3d9\ubd80\ucc44' },
  { key: 'longTermDebt', label: '\uc7a5\uae30\ubd80\ucc44' },
  { key: 'shortLongTermDebt', label: '\ub2e8\uae30\ubd80\ucc44' },
  { key: 'totalStockholderEquity', label: '\uc790\uae30\uc790\ubcf8' },
  { key: 'retainedEarnings', label: '\uc774\uc775\uc789\uc5ec\uae08' },
];

const CASHFLOW_FIELDS = [
  { key: 'operatingCashFlow', label: '\uc601\uc5c5\ud65c\ub3d9 \ud604\uae08\ud750\ub984' },
  { key: 'capitalExpenditures', label: '\uc790\ubcf8\uc9c0\ucd9c(CapEx)' },
  { key: 'freeCashFlow', label: '\uc789\uc5ec\ud604\uae08\ud750\ub984(FCF)' },
  { key: 'totalCashFromInvestingActivities', label: '\ud22c\uc790\ud65c\ub3d9 \ud604\uae08\ud750\ub984' },
  { key: 'totalCashFromFinancingActivities', label: '\uc7ac\ubb34\ud65c\ub3d9 \ud604\uae08\ud750\ub984' },
  { key: 'dividendsPaid', label: '\ubc30\ub2f9\uae08 \uc9c0\uae09' },
  { key: 'repurchaseOfStock', label: '\uc790\uc0ac\uc8fc \ub9e4\uc785' },
  { key: 'changeInCash', label: '\ud604\uae08 \uc99d\uac10' },
];

function renderFinancialTable(containerId, statements, fields, currency) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!Array.isArray(statements) || statements.length === 0) {
    container.innerHTML = `<div class="no-data">\uc7ac\ubb34\uc81c\ud45c \ub370\uc774\ud130\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.<br>\uc885\ubaa9 IR \ud398\uc774\uc9c0\ub098 \uacf5\uc2dc \uc790\ub8cc\ub97c \ud568\uaed8 \ud655\uc778\ud574 \uc8fc\uc138\uc694.</div>`;
    return;
  }

  const sorted = [...statements].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const dates = sorted.map(statement => statement.date);
  let html = '<table class="fin-table"><thead><tr><th>\ud56d\ubaa9</th>';
  dates.forEach(date => { html += `<th>${escapeFinancialHtml(date)}</th>`; });
  html += '</tr></thead><tbody>';

  fields.forEach(field => {
    html += `<tr><td>${escapeFinancialHtml(field.label)}</td>`;
    sorted.forEach(statement => {
      const value = statement[field.key];
      if (value == null) {
        html += '<td class="val-na">-</td>';
      } else if (field.noFormat) {
        html += `<td>${Number(value).toFixed(2)}</td>`;
      } else {
        const formatted = formatFinancialNumber(value, currency);
        const cls = value > 0 ? 'val-positive' : value < 0 ? 'val-negative' : '';
        html += `<td class="${cls}">${escapeFinancialHtml(formatted)}</td>`;
      }
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
    if (abs >= 1e12) text = `${(abs / 1e12).toFixed(2)}\uc870`;
    else if (abs >= 1e8) text = `${(abs / 1e8).toFixed(1)}\uc5b5`;
    else if (abs >= 1e4) text = `${(abs / 1e4).toFixed(1)}\ub9cc`;
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
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
