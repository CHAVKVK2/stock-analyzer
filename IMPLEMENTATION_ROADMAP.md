# Implementation Roadmap

## Purpose

This document turns the recent Claude Code evaluation into a practical implementation plan for the `stock-analyzer` codebase.

The core takeaway is:

- the current engine is a **trend-following, rule-based technical analysis engine**
- the next stage should move toward **backtest-driven probability and quant-style insight**
- but the codebase should be stabilized first before adding deeper quant logic

## Current Product Modes

### 1. Technical Analysis Mode

Current responsibilities:

- show current-day `BUY / SELL / HOLD` style signal output
- visualize RSI, MACD, Bollinger Bands, moving averages, support/resistance, and volume context
- explain why the signal is bullish, bearish, or neutral
- allow Point-in-Time historical inspection without future data leakage

This mode is already partly implemented.

### 2. Quant / Backtest Mode

Target responsibilities:

- show historical trade simulation results
- explain why trade count can differ from signal count
- surface conditional probability and historical outcome data
- help answer not only "what is the signal now?" but also:
  - "how did similar setups behave in the past?"
  - "what was the average 5-day / 10-day / 20-day outcome?"
  - "what was the risk profile of those setups?"

This mode has started but is not complete.

## Recommended Architecture Direction

### Backend split

Current pain point:

- `src/services/technicalService.js` currently holds too many responsibilities

Recommended split:

- `src/services/indicators.js`
  - RSI, MACD, Bollinger Bands, EMA, SMA, ATR, ADX, OBV, support/resistance
- `src/services/scorer.js`
  - buy/sell score breakdown
  - signal decision rules
- `src/services/signalSummary.js`
  - reason and risk text generation
- `src/services/backtestEngine.js`
  - historical loop
  - position state transitions
  - trades, equity curve, summary

Transition rule:

- keep the external route contract stable
- do not break `/api/stock/technical`
- use the existing `calculateTechnicalAnalysis()` API as the orchestration wrapper while moving internals out step by step

### Frontend split

Current pain point:

- `public/js/app.js` is doing too much

Recommended split:

- `public/js/search.js`
  - ticker resolution, autocomplete, search submission
- `public/js/signal-ui.js`
  - current-day signal cards, market badges, reasons, risks
- `public/js/historical-ui.js`
  - Point-in-Time UI
- `public/js/backtest-ui.js`
  - date-range backtest, summary cards, tables, marker toggles
- `public/js/charts.js`
  - chart rendering only

Transition rule:

- keep changes incremental
- do not redesign the page all at once

## Immediate Cleanup Priorities

### Priority 1. Split `technicalService.js`

Why first:

- every future quant feature depends on this file
- current concentration of logic makes mistakes easier

Definition of done:

- current routes behave the same
- current-day, Point-in-Time, and backtest outputs remain unchanged
- unit-level reasoning becomes easier because each file has one role

### Priority 2. Clean remaining encoding and broken text

Why second:

- broken text lowers product trust and makes analysis harder to interpret

Definition of done:

- no visible broken Korean labels remain in the main workflow
- UI terminology is consistent between dashboard, backtest, and chart labels

### Priority 3. Extract score weights

Why third:

- current weights are hardcoded and difficult to tune
- quant-style improvement later will require weight calibration

Recommended pattern:

```js
export const SCORE_WEIGHTS = {
  trendEmaCross: 8,
  trendSmaAlignment: 8,
  momentumMacdCross: 8,
  momentumHistogramImprove: 4,
  volumeSurge: 8,
  supportBounce: 6,
};
```

Definition of done:

- scoring logic reads from named constants rather than unexplained literals

## Product Roadmap

### Stage 1. Stabilize the current engine

Goals:

- preserve current functionality
- reduce risk before adding more complexity

Tasks:

1. Split `technicalService.js`
2. Extract scoring constants
3. Clean encoding issues in visible UI
4. Keep current and historical APIs stable
5. Verify Point-in-Time still uses only historical data

Expected output:

- safer base for experimentation
- easier debugging
- more trustworthy UI

### Stage 2. Improve backtest realism and explainability

Goals:

- make backtest output easier to trust
- make differences between signal and action more understandable

Tasks:

1. Add optional cost assumptions
   - commission
   - slippage
   - optional Korea-specific sell tax
2. Improve backtest result explanation
   - distinguish signal count from trade count
   - explain `BUY`, `SELL`, `HOLD`, `ENTER_LONG`, `EXIT_LONG`
3. Expand chart markers
   - tooltip for action date
   - display score context on marker hover
4. Improve result tables
   - include action column clearly
   - include entry/exit pairing visibility

Expected output:

- backtest becomes easier to interpret
- user confusion around zero trades vs many `SELL` signals is reduced

### Stage 3. Add quant-style probability analysis

Goals:

- move from "what is the signal?" to "how did this setup historically behave?"

Tasks:

1. Add setup outcome statistics
   - for a chosen setup condition, calculate:
     - 5-day forward return distribution
     - 10-day forward return distribution
     - 20-day forward return distribution
     - win rate
     - average return
     - downside statistics
2. Add similar setup explorer
   - show past dates where similar signal conditions appeared
3. Add regime-aware analysis
   - separate outcomes by:
     - strong trend
     - weak trend
     - high volatility
     - low volatility
4. Add a quant-focused tab in the UI
   - `기술적 분석`
   - `백테스트 / 확률`
   - `재무제표`

Expected output:

- a clearer shift from descriptive dashboard to probability-aware decision support

## Suggested UI Direction

Recommended top-level tabs:

1. `기술적 분석`
   - current signal dashboard
   - chart and indicator overlays
   - Point-in-Time lookup
2. `백테스트 / 확률`
   - date-range backtest
   - trade markers
   - equity curve
   - setup outcome stats
3. `재무제표`
   - existing financial statement view

Why this structure:

- it separates present-tense signal interpretation from historical validation
- it avoids mixing too many mental models into one panel
- it fits the current codebase without forcing a full redesign

## What Not To Do Yet

- do not add a machine-learning model before the scoring and backtest layers are easier to trust
- do not redesign the whole frontend in one pass
- do not replace the existing current-day signal flow
- do not create a second historical calculation path that duplicates the current one

## Practical Next Task

If continuing immediately from this roadmap, the best next coding task is:

1. split `src/services/technicalService.js`
2. preserve route responses
3. keep current-day and historical outputs identical

After that, move to:

4. scoring constants extraction
5. encoding cleanup
6. setup outcome statistics
