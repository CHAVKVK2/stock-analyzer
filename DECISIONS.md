# DECISIONS

## Purpose

This file records the main product and architecture decisions so future sessions do not have to rediscover them from chat history.

## Product Decisions

### 1. Describe the engine honestly

Decision:

- The current signal engine is a trend-following, rule-based technical engine.

Why:

- It combines known indicators with custom scoring rules.
- It is explainable.
- It is not yet statistically calibrated enough to call a quant prediction model.

### 2. Separate technical analysis from quant-style analysis

Decision:

- The product should gradually separate:
  - real-time technical analysis
  - backtest / probability / quant-style analysis

Why:

- These are different user questions.
- The current UI mixes present-tense signal interpretation with historical validation.

### 3. Reuse the same engine for present and historical snapshots

Decision:

- Historical Point-in-Time signals should reuse the same logic as current-day signals.

Why:

- This keeps interpretation aligned.
- It avoids drift between “today’s signal” and “past-date signal.”

### 4. Never allow future-data leakage

Decision:

- Historical calculations must use only data available up to that date.

Why:

- This is a core trust requirement for historical analysis and backtests.

## Backend Decisions

### 5. Split technical logic into smaller services

Decision:

- Keep technical-analysis responsibilities separated across focused files.

Current structure:

- `indicators.js`
- `signalScoring.js`
- `signalSummary.js`
- `scoreWeights.js`
- `backtestEngine.js`
- `technicalService.js` as orchestration layer

Why:

- Easier maintenance
- Easier testing
- Easier reasoning

### 6. Keep route contracts stable while refactoring

Decision:

- Internal cleanup should not casually break route shapes.

Why:

- Frontend stability matters more than perfect backend purity during this phase.

### 7. Keep weights centralized

Decision:

- Score weights should live in one dedicated location.

Why:

- Easier tuning
- Easier strategy comparison
- Easier future calibration

## Frontend Decisions

### 8. Evolve the UI incrementally

Decision:

- Avoid a full redesign while product direction is still moving.

Why:

- Small iterations are safer.
- The product is still deciding how far toward quant tooling it will go.

### 9. Use chart markers to explain backtest actions

Decision:

- Entry / exit markers are not just decoration.

Why:

- They help users understand the difference between:
  - signal
  - actual backtest action

### 10. Move toward a more trading-style chart feel

Decision:

- The main price chart should move closer to a trading platform feel.

Current direction:

- Adopt `Lightweight Charts` for the main price view
- Keep some supporting charts on `Chart.js` during transition

Why:

- `Chart.js` was workable, but it felt more dashboard-like than trading-like.
- `Lightweight Charts` offers a better candlestick experience without introducing paid chart licensing by default.

### 11. Prioritize Korean-first clarity in visible UI

Decision:

- Visible product text should prioritize clear Korean wording.

Why:

- Broken encoding or mixed-language UI hurts trust quickly.

## Backtest Decisions

### 12. Keep signal distinct from action

Decision:

- Keep a clear separation between:
  - signal: `BUY / SELL / HOLD`
  - action: `ENTER_LONG / EXIT_LONG / HOLD`

Why:

- A `SELL` signal does not always mean an actual trade occurred.

### 13. Keep the first backtest model simple

Decision:

- Use a simpler long-only backtest first, then add realism later.

Current simplifications:

- long-only
- no slippage
- no commission
- no tax modeling

Why:

- Faster iteration
- Easier debugging

## Data Source Decisions

### 14. Keep Yahoo as the current live backbone

Decision:

- Continue using Yahoo-based flows for the current baseline until a better official Korean-market source is integrated.

Why:

- It already powers the working app.
- Replacing all data flows at once would add too much risk.

### 15. Do not rely on Naver Finance as the main official backend

Decision:

- Naver may be useful for exploration, but it is not the preferred long-term backend source.

Why:

- It appears closer to unofficial web-data style integration than an officially supported developer API for this use case.

### 16. Prefer Kiwoom REST API for future Korean-market official integration

Decision:

- If we add an official Korean stock data source, prefer `Kiwoom REST API`.

Why:

- It is official.
- It matches the current web backend architecture better than `Kiwoom OpenAPI+`.
- `OpenAPI+` is more Windows desktop oriented.

## Sharing / Deployment Decisions

### 17. Use Render as the main shareable site

Decision:

- The public site should be shared primarily through Render.

Why:

- It is more durable than a local tunnel.
- It does not require the local PC to stay on.

### 18. Use ngrok only for temporary demos

Decision:

- ngrok is acceptable only as a temporary tunnel.

Why:

- It is session-based and depends on the local environment staying alive.

## Next Decisions Likely Needed

- Whether to fully migrate sub-indicator panels off `Chart.js`
- When to add setup outcome statistics into the main UI
- Whether to add backtest costs as fixed defaults or user inputs
- When to begin the first Kiwoom REST integration slice
