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

## Current Status

### Search

- English ticker search works.
- English company-name search works.
- Korean company-name search works for:
  - manual aliases in the local catalog
  - KRX-listed Korean names through the KRX fallback

### Technical analysis

- `/api/stock/technical` returns technical indicators, market state, scoring, and summary text.

### Frontend

- Signal dashboard is visible in Korean.
- Chart labels are mostly localized into Korean.

### Remote backup

- All recent work has been pushed to GitHub.
- Remote repository:
  - `https://github.com/CHAVKVK2/stock-analyzer`

## Recent Commit History

- `7a522b5` `Add KRX fallback for Korean stock search`
- `a2ee63c` `Add Hyundai short alias`
- `8b32267` `Add more Korean stock aliases`
- `693819c` `Fix English name search suffix handling`
- `4576a29` `Support Korean stock name search`
- `3d5bcf3` `Localize chart labels`
- `f63a91e` `Localize signal engine UI`
- `f997849` `Fix autocomplete symbol escaping`
- `6fe6cf6` `Add signal dashboard UI`
- `182ebc3` `Add technical scoring engine`
- `49ec278` `Resolve Korean stock aliases`
- `1752b71` `Fix financial statement labels`

## Suggested Next Steps

1. Expand Korean localization for the remaining UI text that still appears garbled or partially untranslated.
2. Add more technical panels such as ATR, ADX, and OBV to the visible frontend instead of only using them in scoring.
3. Improve search ranking for short ambiguous inputs like `현대`, `삼성`, or `증권`.
4. Add a small admin script to refresh and cache the KRX company list on a schedule instead of fetching it only on demand.
