# CURRENT STATE

## Purpose

This file is the quickest way to understand the live state of `stock-analyzer` without reading long chat history.

## Current Product Summary

- The app is a stock analysis web dashboard.
- Main supported areas:
  - current-day technical signal analysis
  - historical Point-in-Time signal lookup
  - date-range backtesting
  - strategy comparison
  - financial statements
  - sentiment / fear-greed display

## Current Public URLs

- Local:
  - `http://localhost:3000`
- Render:
  - `https://stock-analyzer-gfac.onrender.com/`
- ngrok:
  - temporary only
  - depends on local PC / local server / tunnel process

## Current Engine Interpretation

- Treat the engine as:
  - trend-following
  - rule-based
  - explainable technical-analysis engine
- Do not treat it as:
  - AI forecasting engine
  - full quant prediction model
  - statistically validated probability model

## Current Features That Work

- Korean stock search
  - local aliases
  - KRX fallback
- US stock search
- technical indicators
  - RSI
  - MACD
  - Bollinger Bands
  - EMA20 / EMA50 / SMA200
  - ATR / ADX / OBV / volume ratio
  - support / resistance
- current-day buy / sell scoring
- historical single-date signal lookup
- backtest
  - long-only
  - strategy modes
  - entry / exit markers
- financial statement view
- Render deployment

## Current Chart State

- Main price chart:
  - `Lightweight Charts`
- Supporting charts:
  - some still use `Chart.js`
- Current chart direction:
  - move toward a more trading-style chart feel
  - avoid replacing everything at once

## Current Important Files

- `src/services/technicalService.js`
- `src/services/indicators.js`
- `src/services/signalScoring.js`
- `src/services/signalSummary.js`
- `src/services/backtestEngine.js`
- `src/services/scoreWeights.js`
- `src/services/yahooFinanceService.js`
- `src/routes/stockRoutes.js`
- `public/index.html`
- `public/js/app.js`
- `public/js/charts.js`
- `public/js/financials.js`
- `public/css/styles.css`
- `render.yaml`
- `RENDER_DEPLOY.md`

## Current Known Issues

- Some visible text still has encoding cleanup left.
- Range switching and chart migration need continued stabilization after the `Lightweight Charts` move.
- Backtest is still simplified:
  - no slippage
  - no commission
  - no taxes
- `public/js/app.js` is still large.

## Current Sharing / Deployment Reality

- Render is the main shareable URL.
- Render free can sleep after inactivity, so the first request can be slow.
- ngrok is only for temporary local demos.

## Current External Data Direction

- US / general data source:
  - Yahoo Finance
- Korean stock-name resolution:
  - local aliases + KRX fallback
- Korean chart-data direction under consideration:
  - Kiwoom REST API
- Naver Finance is not the preferred long-term backend because it is closer to non-official web-data usage.

## Best Next Steps

1. Finish stabilizing the chart migration
2. Clean remaining broken UI text
3. Add setup outcome statistics
4. Improve backtest realism
5. If Korean-market data quality becomes a priority, design Kiwoom REST API integration

## Suggested Resume Prompt

`stock-analyzer latest state 기준으로 이어서 작업해줘. 먼저 CURRENT_STATE.md, DECISIONS.md, WORKLOG.md를 읽고 다음 작업부터 진행해줘.`
