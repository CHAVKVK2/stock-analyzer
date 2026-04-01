# WORKLOG

## Overview

This file summarizes the recent Codex work on the `stock-analyzer` project so the current state can be resumed quickly inside the app or from GitHub.

## Recent Progress

### 1. Financial statement fixes

- Fixed financial statement labels that were displayed like `Q3 2025` when annual labels should have shown only the year.
- Filled the short-term investments field that was previously blank in some balance sheet views.

Commit:

- `1752b71` `Fix financial statement labels`

### 2. Korean alias support

- Added early support for Korean and English stock aliases so inputs like `삼성전자`, `애플`, and `테슬라` resolve to Yahoo Finance tickers.

Commit:

- `49ec278` `Resolve Korean stock aliases`

### 3. Technical scoring engine

- Expanded technical analysis output beyond RSI, MACD, and Bollinger Bands.
- Added:
  - `EMA20`, `EMA50`, `SMA200`
  - `ATR14`
  - `ADX`, `+DI`, `-DI`
  - `OBV`
  - `Volume MA20`
  - support/resistance levels
- Added structured outputs:
  - `marketState`
  - `signalScores`
  - `signalSummary`

Commit:

- `182ebc3` `Add technical scoring engine`

### 4. Signal dashboard UI

- Added a signal overview section in the frontend.
- Added headline and strength display for `BUY / SELL / NEUTRAL`.
- Added score cards, market badges, and reason/risk panels.
- Updated charts to show moving averages, support/resistance overlays, and new technical outputs.

Commit:

- `6fe6cf6` `Add signal dashboard UI`

### 5. Autocomplete symbol bug fix

- Fixed a bug where selected stock symbols were being converted to `#` because a URL sanitizer was mistakenly used for ticker attributes.

Commit:

- `f997849` `Fix autocomplete symbol escaping`

### 6. UI localization

- Localized the signal engine area into Korean.
- Localized chart labels such as:
  - `Price Action` -> `주가 흐름`
  - `Close` -> `종가`
  - `Bollinger Bands` -> `볼린저 밴드`
  - `Support / Resistance` -> `지지선 / 저항선`

Commits:

- `f63a91e` `Localize signal engine UI`
- `3d5bcf3` `Localize chart labels`

### 7. Korean stock name search improvements

- Reworked Korean stock name search using a local alias catalog.
- Added support for searching Korean names directly instead of only English tickers or symbols.
- Fixed a suffix-handling issue where English company names like `apple` could be incorrectly turned into symbols such as `AAPL.KS`.

Commits:

- `4576a29` `Support Korean stock name search`
- `693819c` `Fix English name search suffix handling`

### 8. Expanded Korean alias coverage

- Added more frequently used Korean market names that were failing before.
- Verified and added mappings for examples such as:
  - `삼성바이오로직스`
  - `LG 전자`
  - `KB금융`
  - `한미반도체`
  - `현대모비스`
  - `두산로보틱스`

Commits:

- `8b32267` `Add more Korean stock aliases`
- `a2ee63c` `Add Hyundai short alias`

### 9. KRX fallback for Korean stock search

- Added a fallback that loads the official KRX listed-company table and uses it to search Korean stock names.
- This reduces the need to manually add every Korean stock alias one by one.
- Verified that previously failing examples now resolve correctly:
  - `현대차증권` -> `001500.KS`
  - `현대사료` -> `016790.KQ`

Commit:

- `7a522b5` `Add KRX fallback for Korean stock search`

### 10. Historical signal and backtest features

- Added Point-in-Time signal lookup for a selected historical date.
- Added a date-range backtest flow using historical daily signals and long-only trade simulation.
- Added chart marker support for backtest entry and exit points, controlled by a checkbox near the indicator toggles.

Commits:

- `fd0071b` `Add historical single-date signal lookup`
- `f577e2f` `과거 신호 조회 및 백테스트 UI 추가`
- `88289c9` `Add historical signal UI and project docs`
- `5edcaa7` `Add backtest entry exit chart markers`

## Current Status

### Search

- English ticker search works.
- English company-name search works.
- Korean company-name search works for:
  - manual aliases in the local catalog
  - KRX-listed Korean names through the KRX fallback

### Technical analysis

- `/api/stock/technical` returns technical indicators, market state, scoring, and summary text.

### Historical analysis

- `/api/stock/historical-snapshot` returns a Point-in-Time signal using only data up to the selected date.
- `/api/stock/backtest` runs a date-range backtest using daily historical signal evaluation.
- Backtest entry and exit points can now be overlaid on the main price chart.

### Frontend

- Signal dashboard is visible in Korean.
- Chart labels are mostly localized into Korean.
- Some text encoding cleanup is still needed in parts of the page.

### Remote backup

- All recent work has been pushed to GitHub.
- Remote repository:
  - `https://github.com/CHAVKVK2/stock-analyzer`

## Recent Commit History

- `5edcaa7` `Add backtest entry exit chart markers`
- `88289c9` `Add historical signal UI and project docs`
- `f577e2f` `과거 신호 조회 및 백테스트 UI 추가`
- `fd0071b` `Add historical single-date signal lookup`
- `c40bf44` `Refresh asset cache version`
- `81fbf95` `Fix financial tab visibility`
- `fb9a6ea` `Bust frontend cache for financials`
- `9ce899a` `Fix financial table rendering`
- `02ded7a` `Add fear and greed index card`
- `7a522b5` `Add KRX fallback for Korean stock search`

## Latest Evaluation

### Claude Code review summary

- Claude Code reviewed the current project state, recent commits, local dev status, and the project documents `AGENTS.md`, `WORKLOG.md`, and `LESSONS.md`.
- The review conclusion was that the current direction is strong, but the existing signal engine should be understood as a trend-following and rule-based technical engine rather than a true quant prediction engine.

### Main strengths called out in the review

- Reusing the same analysis path for current-day and historical calculations was considered a strong architectural decision.
- The current Point-in-Time flow correctly avoids future data leakage by slicing historical data before signal calculation.
- The 5-part scoring structure (`trend`, `momentum`, `volume`, `location`, `risk`) was considered explainable and extensible.
- The current product direction was viewed as a good base for later quant-style features.

### Main risks called out in the review

- `src/services/technicalService.js` is too large and currently mixes indicators, scoring, backtest logic, and summary generation.
- `public/js/app.js` is also growing too large as a single orchestration file.
- Score weights are hardcoded and are not yet backed by statistical validation.
- The current backtest logic does not yet include slippage, taxes, or transaction costs.
- Encoding issues in some UI strings still reduce clarity and product trust.

### Product interpretation from the review

- The current engine is fundamentally **trend-following**:
  - it uses moving averages, MACD, ADX, RSI behavior, and volume confirmation to judge current direction and setup quality
  - it does not yet estimate future return distributions or conditional historical probabilities
- Because of that, the review recommended separating the product conceptually into:
  - a **real-time technical analysis** area
  - a **backtest / quant / probability** area

### Most important recommendation

- Before adding more advanced quant features, the codebase should first be stabilized by:
  1. splitting `technicalService.js`
  2. cleaning broken UI text and encoding issues
  3. extracting score weights into constants or config
  4. separating the UI into clearer product areas

### Recommended next technical direction

- The review suggested that the best next step toward predictive usefulness is not adding a new model first.
- Instead, it recommended extending the existing backtest loop to produce **pattern frequency and outcome statistics**, such as:
  - how often a specific setup led to gains after 5, 10, or 20 trading days
  - what the average return and downside looked like after a setup
  - how results changed by market regime

### Recommended next product direction

- Treat the current UI as the beginning of a dual-mode product:
  - **technical analysis / signal dashboard**
  - **quant / backtest / probability analysis**
- This should be done incrementally through tabs or sections, not a full redesign.

## Suggested Next Steps

1. Split `src/services/technicalService.js` into smaller backend modules without breaking current routes.
2. Clean remaining broken UI text and encoding issues.
3. Extract score weights into constants for later calibration.
4. Add setup outcome statistics using the existing backtest loop before adding more complex predictive features.
