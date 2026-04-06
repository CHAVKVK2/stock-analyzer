---
name: backtest-debug
description: Handle stock-analyzer Point-in-Time and backtest debugging with emphasis on no-lookahead behavior, date-range correctness, and regression coverage. Use when changing historical snapshot logic, backtest flow, or range/date error handling.
---

# Backtest Debug

## Focus
- Protect trust in historical analysis.
- Treat no-lookahead behavior as a hard requirement.
- Prefer targeted regressions over broad assumptions.

## Read First
- `DECISIONS.md`
- `API_CONTRACT.md`
- `src/services/backtestEngine.js`
- `src/services/technicalService.js`
- `src/routes/stockRoutes.js`
- `test/smoke.test.js`

## Workflow
1. Reproduce the issue with the narrowest failing request or date range.
2. Decide whether the fix belongs in:
   - route validation
   - target date selection
   - price slicing
   - backtest range calculation
   - shared error handling
3. Add or update a regression test before closing the task.

## Guardrails
- Historical snapshot must use only data available on or before the requested date.
- Backtest must clearly distinguish:
  - signal
  - action
- Out-of-range requests should fail explicitly, not as server errors.

## Validation
- Run `node --test`.
- Check at least one success case and one out-of-range case.
- If the issue touched dates or slicing, inspect resolved dates in the response payload.
