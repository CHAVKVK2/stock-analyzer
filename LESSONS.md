# LESSONS

## What Has Worked Well

- Reusing one analysis path for:
  - current-day signal
  - Point-in-Time signal
  keeps behavior aligned.
- Small, staged UI changes are safer than a full redesign.
- Separating backend services made the project easier to reason about.
- Render is a better public demo path than relying only on ngrok.
- `Lightweight Charts` is a good free upgrade path when a `Chart.js` price chart feels too dashboard-like.

## Watch Outs

- Browser cache can easily hide frontend fixes unless asset versions are bumped.
- Local dev server can stop unexpectedly and should always be rechecked before blaming the frontend.
- Temporary tunnels like ngrok can fail simply because the local server died.
- Encoding issues can make the app look less trustworthy even if the logic is fine.
- During chart migration, partial replacement can temporarily break indicator expectations if supporting panels are not restored quickly.

## Project-Specific Notes

- Historical signal requests must not use future data.
- Backtest results must distinguish:
  - signal
  - action
- The current engine should be described carefully:
  - trend-following and rule-based
  - not yet a true quant prediction model
- For Korean official-market data, `Kiwoom REST API` is the most promising next source.
- `Kiwoom OpenAPI+` is less suitable for this web project because it is more desktop / Windows oriented.

## Operational Notes

- Render free may sleep after inactivity.
- ngrok is only for temporary local sharing.
- If the public demo looks broken, check in this order:
  1. local server status
  2. frontend asset version
  3. deployment / tunnel status

## Good Next Practices

- Keep state docs short and current.
- Update `CURRENT_STATE.md` when the product direction changes.
- Update `DECISIONS.md` when a technical or product choice becomes intentional.
- Update `WORKLOG.md` only with meaningful milestones, not every micro-change.
