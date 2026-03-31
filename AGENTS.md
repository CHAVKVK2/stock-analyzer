# AGENTS

## Purpose
- Keep changes small and safe.
- Preserve the existing current-day signal flow.
- Add new features behind clear API and UI boundaries.

## Working Rules
- Do not break `/api/stock/technical`.
- For historical features, use only data up to the selected date.
- Prefer reusing service logic before adding new calculation paths.
- Keep frontend changes incremental and avoid full-page redesigns.

## Key Areas
- Backend routes: `src/routes/`
- Technical analysis logic: `src/services/technicalService.js`
- Frontend UI: `public/index.html`, `public/js/app.js`, `public/css/styles.css`

## Current Priorities
- Historical signal reliability
- Frontend stability
- Cleanup of remaining text/encoding issues
