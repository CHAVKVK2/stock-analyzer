# LESSONS

## What Has Worked
- Reusing `calculateTechnicalAnalysisForDate()` keeps historical logic aligned with current signal logic.
- Adding new endpoints without replacing old ones reduces frontend breakage.
- Small UI additions are safer than redesigning the whole page.

## Watch Outs
- Some legacy strings had encoding issues and can make the UI confusing.
- Local dev server may stop and need a manual restart.
- Browser cache can hide recent frontend changes if asset versions are not updated.

## Project-Specific Notes
- Historical signal requests should use `ticker` and `target_date`.
- The Point-in-Time flow must not use future price data.
- Backtesting should be designed separately from the single-date snapshot flow.
