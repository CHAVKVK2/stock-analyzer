# Plans

## Purpose
- Use this file to scope non-trivial work before editing code.
- Keep plans short, concrete, and tied to changed files and verification.
- Prefer updating this file over re-explaining the same work in chat.

## When To Use
- Add or update a plan when the task:
  - touches multiple files
  - changes API behavior
  - changes signal, profile, snapshot, or backtest logic
  - affects both backend and frontend
  - needs explicit validation steps

## Plan Format

```md
## YYYY-MM-DD - Task Name

### Goal
- One short paragraph describing the user-facing outcome.

### Read First
- Files and docs to inspect before coding.

### Expected Changes
- Files likely to change.

### Validation
- Commands and manual checks to run.

### Done When
- Flat checklist of completion criteria.

### Notes
- Risks, assumptions, or deferred follow-up.
```

## Active Plan

## 2026-04-06 - Ralph Audit and Fix Loop Bootstrap

### Goal
- Add a Codex-friendly audit loop and a paired fix loop so the repo can repeatedly check visible UI and public API regressions, write findings to markdown, and then repair one audited issue at a time with explicit verification.

### Read First
- `AGENTS.md`
- `CURRENT_STATE.md`
- `DECISIONS.md`
- `public/index.html`
- `public/js/app.js`
- `public/js/charts.js`
- `test/smoke.test.js`

### Expected Changes
- `.codex/ralph-audit/README.md`
- `.codex/ralph-audit/CODEX.md`
- `.codex/ralph-audit/prd.json`
- `.codex/ralph-audit/ralph.ps1`
- `.codex/ralph-audit/ralph-fix.ps1`
- `.codex/ralph-audit/ralph.sh`
- `.codex/ralph-audit/ralph-fix.sh`
- `.gitignore`
- `package.json`

### Validation
- Review the audit stories to ensure they match real repo risks.
- Validate the PowerShell scripts parse as valid PowerShell.
- Run `node --test` to ensure repo behavior still works.
- Confirm `git status --short --branch` shows only intended changes.

### Done When
- The repo contains a read-only audit loop tailored to `stock-analyzer`.
- The repo contains a paired fix loop that consumes completed audit reports.
- Windows-friendly runner scripts exist because this machine is PowerShell-first.
- The project exposes npm scripts for the audit and fix loop.

### Notes
- The local desktop environment currently does not expose a runnable `codex` CLI binary from PowerShell, so the runner files are scaffolded and documented but cannot be fully exercised from this session.
- The first audit stories focus on the exact classes of regressions this project has already hit: broken Korean text, search control drift, chart indicator visibility, indicator defaults, and public API/page regressions.

## 2026-04-03 - Codex Workflow Foundation

### Goal
- Add a durable Codex-friendly operating layer so future sessions can reuse stable project rules, create lightweight plans, and load only the most relevant task guidance.

### Read First
- `AGENTS.md`
- `CURRENT_STATE.md`
- `DECISIONS.md`
- `WORKLOG.md`
- `API_CONTRACT.md`

### Expected Changes
- `AGENTS.md`
- `PLANS.md`
- `skills/frontend-ui/SKILL.md`
- `skills/backend-api/SKILL.md`
- `skills/stock-indicators/SKILL.md`
- `skills/backtest-debug/SKILL.md`

### Validation
- Review the new docs for internal consistency.
- Run `node --test` to ensure no accidental breakage from repo edits.
- Confirm `git status --short --branch` shows only intended file additions/updates.

### Done When
- `AGENTS.md` contains stable project rules, commands, and validation expectations.
- `PLANS.md` provides a reusable planning template and records this setup task.
- Repo-local skills exist for frontend, backend API, indicator/profile logic, and backtest debugging.

### Notes
- These repo-local skills are lightweight project guides, not globally installed Codex skills.
- If this pattern works well, later we can promote selected skills into `$CODEX_HOME/skills`.

## 2026-04-03 - Standard Market Profile Rollout

### Goal
- Split the technical signal baseline by market/style standard profiles rather than per-ticker optimization, keep the Korean profile conservative through `2025-04-30`, expose the active profile in API responses, and make the active profile visible enough in the UI.

### Read First
- `CURRENT_STATE.md`
- `DECISIONS.md`
- `API_CONTRACT.md`
- `src/services/marketProfile.js`
- `src/services/scoreWeights.js`
- `src/services/signalScoring.js`
- `src/services/technicalService.js`
- `src/routes/stockRoutes.js`
- `public/js/app.js`
- `test/marketProfile.test.js`
- `test/smoke.test.js`

### Expected Changes
- `src/services/marketProfile.js`
- `src/services/scoreWeights.js`
- `src/services/signalScoring.js`
- `src/services/technicalService.js`
- `src/routes/stockRoutes.js`
- `public/js/app.js`
- `public/index.html`
- `public/css/styles.css`
- `test/marketProfile.test.js`
- `test/smoke.test.js`
- `CURRENT_STATE.md`
- `WORKLOG.md`
- `DECISIONS.md`
- `API_CONTRACT.md`

### Current Implementation Status
- Automatic profile resolution is wired in:
  - `.KS` and `.KQ` -> `kr_standard`
  - M7 (`AAPL`, `MSFT`, `NVDA`, `META`, `AMZN`, `GOOG`, `GOOGL`, `TSLA`) -> `us_megacap_growth`
  - everything else -> `us_broad_large_cap`
- Score weights now support profile overrides on top of strategy overrides.
- Technical, historical snapshot, and backtest routes all accept `profile=auto|...` and return profile metadata.
- API docs and state docs have been updated to describe the profile system.
- The UI now shows profile information in the signal header and badges, plus a dedicated profile banner for better visibility.

### Validation
- Run `node --test`.
- Confirm API behavior at minimum:
  - `005930` resolves to `kr_standard`
  - `AAPL` resolves to `us_megacap_growth`
  - historical snapshot out-of-range still returns `404 NO_DATA_IN_RANGE`
- Confirm the signal header makes the active profile obvious without needing to inspect raw JSON.
- Confirm frontend asset version strings in `public/index.html` were bumped if the UI changed.

### Done When
- The profile split remains standard-profile based, not ticker-by-ticker tuned.
- `kr_standard`, `us_megacap_growth`, and `us_broad_large_cap` all resolve predictably.
- Korean profile metadata clearly shows the conservative calibration anchor through `2025-04-30`.
- `/api/stock/technical`, `/api/stock/historical-snapshot`, and `/api/stock/backtest` all surface profile metadata consistently.
- Tests cover profile resolution and basic API exposure.
- The UI surfaces the active profile prominently enough for normal users to notice.
- Related docs are aligned with the implemented behavior.

### Remaining Follow-Up
- Validate current weights against a wider basket beyond the smoke-test examples.
- Decide whether the profile badge/banner wording needs further Korean copy cleanup.
- After commit and deploy, re-check the Render site to ensure the profile UI is visible in production and not hidden by cached assets.

### Notes
- This task intentionally avoids complete per-ticker optimization.
- The Korean profile is intentionally conservative to avoid overfitting to the overheated period after `2025-04-30`.

## 2026-04-03 - Public Trust Pages

### Goal
- Add publicly accessible About, Contact, and Privacy pages so the site has baseline trust and policy content suitable for users, search engines, and future ad-monetization review.

### Read First
- `public/index.html`
- `public/css/styles.css`
- `server.js`
- `PLANS.md`

### Expected Changes
- `server.js`
- `public/index.html`
- `public/css/styles.css`
- `public/about.html`
- `public/contact.html`
- `public/privacy.html`
- `test/smoke.test.js`

### Validation
- Run `node --test`.
- Confirm `/about`, `/contact`, and `/privacy` each return `200`.
- Confirm the home page exposes visible links to the three public pages.

### Done When
- Users can reach About, Contact, and Privacy from the site header or footer.
- Each page has enough original text to explain site purpose, contact path, and privacy/cookie/ad disclosure direction.
- Static page routes work in local and deployed environments.

### Notes
- The contact email is a placeholder until a real address is provided.
- Privacy text is a practical baseline and should be reviewed again before live ad-network application.
