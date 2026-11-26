<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6fbcd6be-8225-471f-b76c-3ebe63417790

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Tour Financial Management (API + finance screens)

1. `npm install`
2. Copy `.env.example` to `.env` and set `SEED_USER_PASSWORD` (dev only) so the seeded employees can sign in.
   Leave `DATABASE_URL` empty to use the built-in embedded PostgreSQL, or set it to your PostgreSQL server.
3. Terminal 1: `npm run dev:api` (API on port 4000; migrates and seeds on first run)
4. Terminal 2: `npm run dev` (web app on http://localhost:3000)
5. Choose a department, open **Tour Financials** in the sidebar and sign in with an employee login ID
   (e.g. `pranab.sarma` for Accounts) and the `SEED_USER_PASSWORD`.

Checks: `npm test`, `npm run lint`, `npm run build`. Full module documentation: `docs/TOUR_FINANCE.md`.
