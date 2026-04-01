# Current State

## Purpose

This file is the fastest way to resume work on `stock-analyzer` in a new Codex session.
Read this first before opening longer documents.

## Current Product Snapshot

- The app is a stock analysis dashboard with:
  - real-time technical signal analysis
  - historical Point-in-Time signal lookup
  - date-range backtesting
  - Korean and US stock search
  - financial statements
  - fear and greed index
- The current signal engine is best understood as:
  - a trend-following, rule-based technical engine
  - not yet a true quant prediction engine

## What Works Now

- Korean stock-name search
  - local alias catalog
  - KRX fallback lookup
- US stock ticker and company-name search
- Current-day signal dashboard
  - RSI
  - MACD
  - Bollinger Bands
  - moving averages
  - support / resistance
  - buy / sell scores
  - reason / risk summary
- Historical single-date signal lookup
  - no future-data leakage
- Date-range backtest
  - long-only trade simulation
  - strategy modes
  - backtest statistics
  - entry / exit markers on chart
- Strategy comparison UI
  - balanced
  - trend-following
  - mean-reversion
- Financial statement view
- Temporary public sharing
  - localhost
  - ngrok free URL
- Persistent hosted sharing
  - Render web service

## Current URLs

- Local: `http://localhost:3000`
- Current ngrok tunnel:
  - `https://dicrotic-gastrotomic-miranda.ngrok-free.dev`
- Current Render service:
  - `https://stock-analyzer-gfac.onrender.com/`

Note:
- The ngrok URL is temporary.
- It only works while this PC, the local server, and ngrok are running.
- The Render URL is more durable, but the free plan may sleep after inactivity.

## Current Important Files

- `src/services/technicalService.js`
- `src/services/indicators.js`
- `src/services/signalScoring.js`
- `src/services/signalSummary.js`
- `src/services/scoreWeights.js`
- `src/services/backtestEngine.js`
- `src/routes/stockRoutes.js`
- `public/index.html`
- `public/js/app.js`
- `public/js/charts.js`
- `public/js/financials.js`
- `public/css/styles.css`
- `render.yaml`
- `RENDER_DEPLOY.md`

## Current Architecture Summary

- Backend
  - indicators are calculated in dedicated service files
  - scoring weights are extracted into constants
  - backtest engine is split out from the main technical service
- Frontend
  - still mostly orchestrated by `public/js/app.js`
  - chart rendering lives in `public/js/charts.js`
- Product shape
  - technical analysis mode is the strongest area today
  - backtest mode is working but still needs better explanation and realism

## Known Gaps

- Some Korean text and encoding cleanup may still be incomplete in edge UI areas.
- Backtest is still simplified:
  - no slippage
  - no commission
  - no taxes
- The engine explains current signal conditions well, but does not yet show:
  - setup probability
  - forward return distribution
  - regime-based outcome stats
- `public/js/app.js` is still larger than ideal.
- Render free can sleep after inactivity, so the first response may be slow.

## Current Product Interpretation

- Use the current engine for:
  - signal reading
  - trend-following interpretation
  - historical inspection
  - basic strategy comparison
- Do not describe it as:
  - AI prediction
  - machine-learning forecasting
  - statistically validated quant model

## Best Next Steps

1. Add setup outcome statistics
   - 5-day / 10-day / 20-day forward outcome stats after selected signal conditions
2. Improve backtest realism
   - commission
   - slippage
   - optional sell tax
3. Split the UI more clearly into:
   - technical analysis
   - backtest / probability
   - financial statements
4. Continue cleaning remaining text and encoding issues

## If Starting Fresh In A New Session

Suggested prompt:

`stock-analyzer latest state 기준으로 이어서 작업해줘. 먼저 CURRENT_STATE.md, DECISIONS.md, WORKLOG.md를 읽고 다음 작업부터 진행해줘.`
