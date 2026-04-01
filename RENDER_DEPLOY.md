# Render Deploy

## What This Gives You

- A more durable public URL than `ngrok`
- Automatic deploys from GitHub
- A free plan to test first

## Free Plan Behavior

Render free web services can spin down after inactivity.
That means:

- the app is not permanently dead
- it goes to sleep when unused for a while
- the next request wakes it back up
- the first response after sleep can be slow

This is still much more stable than a local tunnel because it does not depend on your PC staying on.

## Before You Start

- GitHub repo is ready:
  - `https://github.com/CHAVKVK2/stock-analyzer`
- Render blueprint file is included:
  - `render.yaml`
- You will need to set this environment variable in Render:
  - `FINNHUB_API_KEY`

## Deploy Steps

1. Sign in to Render.
2. Click `New +`.
3. Choose `Blueprint`.
4. Connect your GitHub account if needed.
5. Select the repository:
   - `CHAVKVK2/stock-analyzer`
6. Render should detect `render.yaml`.
7. Set `FINNHUB_API_KEY` in the environment variable section.
8. Start the deploy.

## Expected Commands

- Build:
  - `npm install`
- Start:
  - `npm start`

## After Deploy

You should get a Render URL like:

- `https://stock-analyzer.onrender.com`

The exact subdomain depends on availability.

## Notes

- The free plan may sleep after inactivity.
- If you want a no-sleep setup later, switch the service to a paid plan.
- Route behavior should already work because the app serves both:
  - static frontend
  - Express API
