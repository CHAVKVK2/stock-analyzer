---
name: backend-api
description: Handle stock-analyzer backend API work in `src/routes/`, `src/services/`, and `src/utils/` with emphasis on stable route contracts, canonical parameters, and consistent JSON success/error envelopes. Use when changing public endpoints or request validation.
---

# Backend API

## Focus
- Preserve route stability while improving internals.
- Keep request validation explicit and errors machine-readable.
- Reuse the shared success/error envelope helpers.

## Read First
- `API_CONTRACT.md`
- `src/routes/stockRoutes.js`
- `src/utils/apiResponse.js`
- `src/middleware/errorHandler.js`

## Workflow
1. Confirm the endpoint's canonical parameters and expected response fields.
2. Check whether the change belongs in route validation, service logic, or shared error handling.
3. Prefer extending existing services over creating duplicate calculation paths.
4. If an endpoint is deprecated, preserve the current behavior unless the task explicitly removes it.

## Guardrails
- Do not reintroduce legacy date aliases.
- Do not break `/api/stock/technical`.
- Keep `/api/stock/signal-date` returning `410 DEPRECATED_ENDPOINT` unless removal is explicitly planned.
- Return `404 NO_DATA_IN_RANGE` for out-of-range snapshot/backtest requests, not `500`.

## Validation
- Run `node --test`.
- Manually inspect the changed endpoint response shape.
- Update `API_CONTRACT.md` if request or response fields change.
