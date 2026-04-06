---
name: frontend-ui
description: Handle stock-analyzer frontend UI work in `public/` including signal header visibility, profile badges, chart-area presentation, form wiring, and browser-side rendering. Use when changing `public/index.html`, `public/js/app.js`, or `public/css/styles.css`.
---

# Frontend UI

## Focus
- Keep the current information architecture recognizable.
- Make important state obvious without turning the page into a redesign.
- Prefer surgical changes in:
  - `public/index.html`
  - `public/js/app.js`
  - `public/css/styles.css`

## Workflow
1. Read the relevant UI section in `public/index.html`.
2. Read only the matching rendering and event logic in `public/js/app.js`.
3. Check `public/css/styles.css` for the existing visual pattern before adding new classes.
4. If the change affects API fields, verify the payload shape in `API_CONTRACT.md` and the related backend route.
5. If browser caching could hide the change, bump the asset version query strings in `public/index.html`.

## Guardrails
- Do not casually redesign the whole page.
- Keep profile/status information visible near the signal summary if it affects interpretation.
- Preserve Korean-first visible wording where possible.
- If text already looks broken from encoding, do not spread that pattern into new UI strings.
- `public/js/app.js` is large; prefer small additions over broad rewrites.

## Validation
- Run `node --test` if the UI depends on backend response changes.
- Manually check that the affected panel renders when data is present and hides cleanly when missing.
- For profile-related changes, confirm the UI clearly distinguishes:
  - `kr_standard`
  - `us_megacap_growth`
  - `us_broad_large_cap`
