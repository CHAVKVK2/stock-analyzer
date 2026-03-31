# Project Status

## Current architecture
- Backend: Express server in `server.js`
- Stock API routes: `src/routes/stockRoutes.js`
- Technical analysis logic: `src/services/technicalService.js`
- Frontend: `public/index.html`, `public/js/app.js`, `public/css/styles.css`

## What works
- Current-day signal endpoint: `/api/stock/technical`
- Historical snapshot endpoint: `/api/stock/historical-snapshot`
- Historical snapshot uses price data only up to `target_date`
- Frontend has a Point-in-Time section with date input and result rendering

## What is missing
- Backtesting is not finalized for this task
- Historical signal browser flow still needs more real-user verification
- Some UI text/encoding cleanup is still needed in parts of the page

## Current target
- Make the historical signal flow stable and easy to verify

## Do not break
- `/api/stock/technical`
- Existing current-day view
- Historical snapshot must not use future data
