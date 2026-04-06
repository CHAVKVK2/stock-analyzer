# Ralph Audit Loop for `stock-analyzer`

This folder gives the repo a repeatable Codex-driven audit workflow.

There are two loops:

- `ralph.ps1` / `ralph.sh`
  - read-only audit
  - finds problems
  - writes markdown reports into `audit/`
- `ralph-fix.ps1` / `ralph-fix.sh`
  - write-enabled repair loop
  - reads the audit report
  - attempts a focused fix
  - runs local verification before moving on

## Why This Exists

This project has had several issues that are easy to miss with code-only review:

- broken Korean text in the homepage UI
- duplicated or missing search controls
- RSI / MACD not showing even when toggled
- indicator defaults drifting away from intended UX
- public content pages or API contracts regressing silently

The audit loop is designed to catch those before a human has to point them out.

## Files

- `CODEX.md`
  - quality bar and safety rules for the loop
- `prd.json`
  - audit stories tailored to this repo
- `ralph.ps1`
  - Windows-first audit runner
- `ralph-fix.ps1`
  - Windows-first fix runner
- `ralph.sh`
  - Bash audit runner template
- `ralph-fix.sh`
  - Bash fix runner template
- `audit/`
  - output markdown reports
- `events.log`
  - high-level runner progress
- `run.log`
  - raw Codex CLI output

## Recommended Usage

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/ralph-audit/ralph.ps1 -Iterations 3
```

Then, after reading the generated reports:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/ralph-audit/ralph-fix.ps1 -Iterations 1
```

## Notes for This Machine

- The current desktop environment does not expose a runnable `codex` CLI binary from PowerShell yet.
- `jq` is also not installed.
- That is why both runners are written to work without `jq`, and the PowerShell versions should be your default on Windows.

## Suggested Daily Flow

1. Run one or two audit iterations.
2. Read the created markdown reports in `audit/`.
3. Run one fix iteration for the highest-value failing story.
4. Re-run audit on the same story or the next story.
5. Commit only after the repo passes local verification.
