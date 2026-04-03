# WORKLOG

## Purpose

This file records the main implementation history of `stock-analyzer` so a new session can quickly understand what was built and in what order.

## Core Build History

### 1. Base technical analysis dashboard

- Added current-day signal analysis around:
  - RSI
  - MACD
  - Bollinger Bands
- Added structured signal output:
  - market state
  - buy / sell scores
  - signal summary

Related commits:

- `182ebc3` `Add technical scoring engine`
- `6fe6cf6` `Add signal dashboard UI`

### 2. Financial statement improvements

- Fixed annual financial labels that were showing quarter-style text.
- Filled missing short-term investment field in balance sheet output.
- Stabilized financial table rendering in the frontend.

Related commits:

- `1752b71` `Fix financial statement labels`
- `9ce899a` `Fix financial table rendering`

### 3. Korean stock search support

- Added local Korean alias support.
- Added more Korean company-name mappings.
- Added KRX fallback search so Korean names do not rely only on manual aliases.
- Fixed suffix handling so English names like `apple` do not become `AAPL.KS`.

Related commits:

- `49ec278` `Resolve Korean stock aliases`
- `4576a29` `Support Korean stock name search`
- `693819c` `Fix English name search suffix handling`
- `8b32267` `Add more Korean stock aliases`
- `a2ee63c` `Add Hyundai short alias`
- `7a522b5` `Add KRX fallback for Korean stock search`

### 4. Historical signal and backtest features

- Added Point-in-Time signal lookup for a selected date.
- Added date-range backtesting.
- Added backtest entry / exit markers.
- Added strategy comparison:
  - balanced
  - trend-following
  - mean-reversion

Related commits:

- `fd0071b` `Add historical single-date signal lookup`
- `5edcaa7` `Add backtest entry exit chart markers`
- `af16de5` `Add strategy modes and backtest statistics`
- `64d638d` `Polish Korean UI and compare strategies`

### 5. Refactor and architecture cleanup

- Split technical-analysis logic into smaller services:
  - indicators
  - signal scoring
  - signal summary
  - backtest engine
  - score weights
- Reduced the role of `technicalService.js` to orchestration.

Related commits:

- `6eefe51` `Split technical analysis services`
- `599925a` `Extract signal scoring weights`

### 6. Documentation and state-tracking docs

- Added project state and decision docs so future sessions do not need full chat history.
- Added Render deployment setup docs.

Related commits:

- `16e7ee3` `Add project state docs and Render deployment setup`

### 7. Sharing and deployment

- Set up temporary sharing with ngrok free tunnel.
- Set up persistent hosted sharing with Render free web service.
- Verified public Render site:
  - `https://stock-analyzer-gfac.onrender.com/`

Notes:

- ngrok is temporary and depends on the local PC staying on.
- Render free is more durable but can sleep after inactivity.

### 8. Chart system upgrade

- Replaced the main price chart with `Lightweight Charts` for a more trading-style feel.
- Kept supporting charts on `Chart.js` where it was still practical.
- Restored RSI / MACD side panels after the first chart migration.
- Fixed range-button behavior so period switching does not unnecessarily hide the whole screen.

Related commits:

- `ed5156e` `Adopt lightweight charts for price view`

### 9. API contract and smoke-test stabilization

- Standardized API success and error envelopes.
- Fixed canonical date parameter names:
  - `snapshot_date`
  - `start_date`
  - `end_date`
- Removed legacy date parameter aliases.
- Changed `/api/stock/signal-date` into a deprecated 410 endpoint with a migration message.
- Added minimum smoke tests for:
  - Korean search resolution
  - invalid ticker JSON error
  - historical snapshot no-future-data behavior
  - backtest response shape
- Reduced main-screen density so the default flow is easier to follow:
  - stock search
  - current signal
  - point-in-time
  - backtest
  - chart
  - secondary info

### 10. Standard market-profile baseline

- Added automatic profile selection:
  - `kr_standard`
  - `us_megacap_growth`
  - `us_broad_large_cap`
- Anchored the Korean profile to backtest baseline assumptions through:
  - `2025-04-30`
- Exposed profile metadata in API responses so the UI can explain which logic family is active.

## Important Review Feedback Recorded

Claude Code review summary:

- The current engine should be described as:
  - trend-following
  - rule-based
  - technical-analysis driven
- It should not yet be described as:
  - a quant prediction engine
  - a machine-learning model
- Recommended direction:
  - separate technical analysis from quant / probability views
  - keep using backtest results as the path toward probability-style features

## Current Product Scope

The app currently supports:

- Korean and US stock search
- current-day technical dashboard
- historical Point-in-Time analysis
- date-range backtest
- strategy comparison
- financial statements
- fear and greed index
- Render deployment

## Current Open Problems

- Some Korean text / encoding cleanup still remains.
- Backtest realism is still limited:
  - no slippage
  - no commission
  - no tax modeling
- `public/js/app.js` is still larger than ideal.
- `Lightweight Charts` migration is only partial:
  - main price chart migrated
  - not every sub-indicator is yet fully moved into the new chart system

## Recent Exploration Notes

- `Lightweight Charts` is a good free path toward a TradingView-like feel.
- Naver Finance appears usable only through non-official web-data style integration.
- Kiwoom is the better official Korean-market direction, especially:
  - Kiwoom REST API
- Kiwoom OpenAPI+ is less suitable for this project because it is more Windows desktop oriented.

## Best Next Steps

1. Finish chart stabilization after the `Lightweight Charts` migration
2. Clean remaining broken text and mixed encoding
3. Add setup outcome statistics for 5 / 10 / 20 day forward results
4. Improve backtest realism with cost assumptions
