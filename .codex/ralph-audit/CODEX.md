# Ralph Audit Contract for `stock-analyzer`

You are auditing or repairing a rule-based stock analysis web app.

## Project Reality

- The app serves Korean and US stock analysis.
- The core engine is rule-based and explainable.
- Do not describe the engine as AI forecasting or machine-learning prediction.

## Non-Negotiable Rules

- Do not break `/api/stock/technical`.
- Historical snapshot and backtest must never use future data beyond the selected date.
- Canonical API params must remain:
  - `snapshot_date`
  - `start_date`
  - `end_date`
- Deprecated `/api/stock/signal-date` must stay `410 DEPRECATED_ENDPOINT` unless the task explicitly removes it.
- Market profiles are standard profiles, not per-ticker optimization:
  - `kr_standard`
  - `us_megacap_growth`
  - `us_broad_large_cap`

## Audit Expectations

- Prefer repo evidence over assumptions.
- When auditing UI, inspect both markup and browser-side wiring.
- If the task mentions visual integrity, call out mojibake, duplicated controls, hidden-but-required elements, and misleading default states.
- If the task mentions charts, verify actual render preconditions, not just API data.
- If a failure cannot be proven locally, say what evidence is missing.

## Audit Output Format

Each audit report must include:

1. `Status`
2. `What I Checked`
3. `Findings`
4. `Repro Steps`
5. `Likely Files`
6. `Recommended Fix`
7. `Verification`

If there are no findings, say so clearly.

## Fix Expectations

- Make the smallest reliable fix that resolves the specific story.
- Do not redesign unrelated UI.
- Preserve Korean-first visible wording.
- When touching broken text, fix the visible copy instead of leaving mojibake behind.
- Run local verification before claiming success.

## Minimum Verification

- `node --test`
- `node --check public/js/app.js` if browser logic changed
- `node --check public/js/charts.js` if chart logic changed
- `http://localhost:3000` responds successfully if the server is running

If you cannot run one of these checks, say exactly why.
