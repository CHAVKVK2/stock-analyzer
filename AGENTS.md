# AGENTS

## Purpose
- Keep `stock-analyzer` honest, explainable, and stable as a rule-based technical-analysis web app.
- Prefer small, reversible changes over wide refactors.
- Preserve compatibility for the main public flows unless a change is explicitly planned.

## Project Identity
- Primary product:
  - Korean and US stock analysis dashboard
  - current-day technical signal analysis
  - Point-in-Time historical snapshot
  - date-range backtest
  - financial statements
  - news and fear-greed display
- Main public URL:
  - `https://stock-analyzer-gfac.onrender.com/`
- Engine framing:
  - trend-following
  - rule-based
  - explainable technical-analysis engine
- Do not describe it as:
  - AI forecasting
  - machine-learning prediction
  - validated probability model

## Current Non-Negotiable Rules
- Do not break `/api/stock/technical`.
- Historical snapshot and backtest must never use future data beyond the selected date.
- Keep canonical API parameters:
  - `snapshot_date`
  - `start_date`
  - `end_date`
- Keep deprecated `/api/stock/signal-date` behavior unchanged unless the work is explicitly about removing it.
  - Current behavior: `410 DEPRECATED_ENDPOINT`
- Use market/style standard profiles, not per-ticker optimization.
  - `kr_standard`
  - `us_megacap_growth`
  - `us_broad_large_cap`
- Keep the Korean profile conservative and anchored through `2025-04-30`.

## Folder Guide
- `src/routes/`
  - Express route contracts and request validation
- `src/services/`
  - technical-analysis engine
  - market-profile logic
  - data-source integration
- `src/middleware/`
  - error handling
- `src/utils/`
  - API envelope helpers
- `public/`
  - UI markup, styles, browser logic
- `test/`
  - smoke and targeted regression tests
- state docs at repo root:
  - `CURRENT_STATE.md`
  - `WORKLOG.md`
  - `DECISIONS.md`
  - `LESSONS.md`
  - `API_CONTRACT.md`

## Files To Read First
- Always read these before substantial work:
  - `CURRENT_STATE.md`
  - `DECISIONS.md`
  - `WORKLOG.md`
- Read these when the task touches contracts or legacy cleanup:
  - `API_CONTRACT.md`
  - `LEGACY_API_CLEANUP_PLAN.md`
- If the task is scoped, read only the matching repo-local skill under `skills/`.

## Repo-Local Skills
- `skills/frontend-ui/SKILL.md`
  - use for signal header, badge, chart, layout, and browser-side rendering work
- `skills/backend-api/SKILL.md`
  - use for route contract, request validation, response envelope, and API integration work
- `skills/stock-indicators/SKILL.md`
  - use for indicator, score, market profile, and signal engine work
- `skills/backtest-debug/SKILL.md`
  - use for Point-in-Time, backtest, and no-lookahead regression work

## Areas That Need Extra Care
- `src/services/technicalService.js`
  - orchestration layer for present and historical analysis
- `src/services/signalScoring.js`
  - score composition logic
- `src/services/scoreWeights.js`
  - centralized weighting logic
- `src/services/marketProfile.js`
  - profile selection and calibration metadata
- `src/routes/stockRoutes.js`
  - public stock API contract
- `public/js/app.js`
  - large file; avoid casual churn

## Preferred Change Style
- Keep backend changes modular and close to existing service boundaries.
- Reuse existing analysis paths instead of creating duplicate logic.
- Keep route shapes stable while refactoring internals.
- Keep UI changes incremental; avoid redesigning the whole app during feature work.
- Preserve Korean-first visible wording where possible.
- Fix encoding problems when touching affected UI text.

## Commands
- Install:
  - `npm install`
- Local server:
  - `npm start`
- Dev server:
  - `npm run dev`
- Full tests:
  - `node --test`
- Smoke tests only:
  - `npm run test:smoke`

## Validation After Every Meaningful Change
- Run `node --test` when backend logic, API contract, or UI wiring changes.
- If only one narrow area changed, still run at least the nearest targeted test plus a relevant smoke path.
- For API changes, manually verify the affected endpoint shape.
- For UI changes, check whether asset cache busting is needed in `public/index.html`.
- If profile logic changes, confirm at minimum:
  - `005930` resolves to `kr_standard`
  - `AAPL` resolves to `us_megacap_growth`

## Documentation Update Rules
- Update `CURRENT_STATE.md` when the live product state changes.
- Update `DECISIONS.md` when a rule becomes intentional.
- Update `WORKLOG.md` only for meaningful milestones.
- Update `API_CONTRACT.md` when public request or response shape changes.

## Planning Rule
- For non-trivial work, create or update an entry in `PLANS.md` before coding.
- The plan should define:
  - scope
  - files to read
  - files expected to change
  - tests to run
  - done criteria

## Review Checklist
- Is the public API shape preserved?
- Is there any future-data leakage?
- Is the profile logic still standard-profile based rather than ticker-specific?
- Did the UI remain understandable and visually obvious?
- Were docs updated if behavior changed?
