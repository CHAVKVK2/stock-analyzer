---
name: stock-indicators
description: Handle stock-analyzer signal-engine work including indicators, scoring, market profiles, and technical summaries. Use when changing `src/services/indicators.js`, `signalScoring.js`, `scoreWeights.js`, `marketProfile.js`, `signalSummary.js`, or `technicalService.js`.
---

# Stock Indicators

## Focus
- Keep one explainable engine structure across present and historical analysis.
- Tune standard profiles, not individual tickers.
- Keep weight changes centralized and reviewable.

## Read First
- `DECISIONS.md`
- `CURRENT_STATE.md`
- `src/services/technicalService.js`
- `src/services/signalScoring.js`
- `src/services/scoreWeights.js`
- `src/services/marketProfile.js`

## Workflow
1. Identify whether the change is:
   - indicator calculation
   - score weighting
   - profile resolution
   - summary/explanation output
2. Apply the smallest change at the right layer.
3. Keep weight tuning centralized in `scoreWeights.js`.
4. If profile behavior changes, expose the minimum metadata needed for the UI and API consumers.

## Guardrails
- Do not drift into ticker-specific optimization.
- Keep the current standard profile split:
  - `kr_standard`
  - `us_megacap_growth`
  - `us_broad_large_cap`
- Keep the Korean profile conservative and anchored through `2025-04-30` unless a new decision explicitly replaces it.
- Preserve explainability; avoid opaque heuristics with no surfaced rationale.

## Validation
- Run `node --test`.
- Verify at minimum:
  - `005930` -> `kr_standard`
  - `AAPL` -> `us_megacap_growth`
- If score behavior changed materially, add or update a focused regression test.
