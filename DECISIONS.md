# Decisions

## Purpose

This file records important product and architecture decisions so future sessions do not have to re-derive them from long chat history.

## Product Decisions

### 1. Keep the current engine as a rule-based technical engine

Decision:
- The current signal engine should be treated as a trend-following, rule-based technical analysis engine.

Why:
- It uses traditional indicators and handcrafted scoring rules.
- It is explainable and practical for current dashboard use.
- It is not yet backed by probability modeling or statistical validation.

Implication:
- Avoid presenting it as a full predictive quant model.

### 2. Separate real-time analysis from quant-style analysis

Decision:
- The product should evolve toward separate areas for:
  - real-time technical analysis
  - backtest / probability / quant-style analysis

Why:
- These modes answer different questions.
- Real-time analysis asks:
  - what is the setup now?
- Quant analysis asks:
  - how did similar setups perform historically?

Implication:
- Future UI should separate these concepts more clearly.

### 3. Reuse one analysis path for current and historical signals

Decision:
- Historical Point-in-Time signals should reuse the same engine as current signals, but only with data up to the selected date.

Why:
- This keeps current and historical interpretations aligned.
- It reduces drift between today's signal logic and past-date signal logic.

Implication:
- No separate historical scoring engine unless there is a strong reason.

### 4. Avoid future-data leakage

Decision:
- Any historical snapshot or backtest calculation must only use price data available up to that date.

Why:
- This is required for trustworthy historical analysis.

Implication:
- Any feature that uses future candles in a historical calculation is invalid and should be rejected.

## Backend Decisions

### 5. Split technical logic into focused services

Decision:
- Large technical-analysis logic should be split into focused modules.

Current direction:
- `indicators.js`
- `signalScoring.js`
- `signalSummary.js`
- `scoreWeights.js`
- `backtestEngine.js`
- `technicalService.js` as orchestration

Why:
- Easier maintenance
- Easier testing
- Safer iteration

### 6. Keep route contracts stable while refactoring internals

Decision:
- Refactors should preserve existing route behavior whenever possible.

Why:
- Frontend depends on current response shapes.
- Stable routes reduce accidental UI breakage.

Implication:
- Prefer internal service refactors before API redesigns.

### 7. Extract scoring weights into configuration-style constants

Decision:
- Signal scoring numbers should live in a dedicated weight map instead of being scattered magic numbers.

Why:
- Easier tuning
- Easier comparison between strategies
- Better readability

Implication:
- Future strategy calibration should modify weights centrally.

## Frontend Decisions

### 8. Keep UI changes incremental

Decision:
- Avoid full redesigns while the product model is still evolving.

Why:
- Smaller changes are easier to validate.
- The project is still exploring the right product split.

Implication:
- Add sections, cards, toggles, and comparison views incrementally.

### 9. Use chart overlays to explain backtest behavior

Decision:
- Chart-level entry and exit markers are worth keeping and expanding.

Why:
- They help users understand where trades actually happened.
- They reduce confusion between:
  - signal output
  - actual backtest action

Implication:
- Marker-based explanation is part of the product, not just debugging.

### 10. Favor Korean-first UI polish for visible user-facing text

Decision:
- The visible product should prioritize clear Korean wording.

Why:
- This is the primary user experience today.
- Encoding or mixed-language issues reduce trust quickly.

Implication:
- Cleanup of broken strings is product work, not cosmetic cleanup.

## Backtest Decisions

### 11. Distinguish signal from action

Decision:
- The system should keep a clear distinction between:
  - signal: `BUY / SELL / HOLD`
  - action: `ENTER_LONG / EXIT_LONG / HOLD`

Why:
- A `SELL` signal does not always mean a trade happened.
- Users were confused when many `SELL` signals produced zero trades.

Implication:
- UI and docs should continue to explain this difference.

### 12. Keep first backtest implementation simple, then add realism

Decision:
- Start with a simpler backtest engine, then improve realism in later steps.

Current simplifications:
- long-only
- no slippage
- no commission
- no tax modeling

Why:
- Faster iteration
- Easier debugging

Implication:
- Report these limits clearly.
- Add costs before calling results realistic.

## Sharing And Deployment Decisions

### 13. Use temporary tunnels for quick demos

Decision:
- Temporary public URLs via local tunneling are acceptable for quick sharing.

Current option in use:
- ngrok free tunnel

Why:
- Fastest path to showing the project to others
- Good enough for temporary demo use

Implication:
- For durable sharing, move later to hosted deployment.

## Next Decisions Likely Needed

- When to introduce setup outcome statistics into the main UI
- Whether to add commission / slippage defaults globally or as user inputs
- How to split top-level navigation between:
  - technical analysis
  - backtest / probability
  - financial statements
