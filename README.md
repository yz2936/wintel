<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run locally

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example`.
3. In Supabase SQL Editor, run [`supabase/schema.sql`](/Users/ericzhuang/Downloads/mini-project/wintel%20(1)/supabase/schema.sql).
4. Set `OPENAI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in `.env.local`.
5. Start the API server:
   `npm run server`
6. In a second terminal, start the frontend:
   `npm run dev`
7. Open `http://127.0.0.1:3000`

## Notes

- Authentication uses Supabase Auth.
- Saved workspace state is stored in Supabase Postgres in `public.user_state`.
- Weekly NY/MA docket monitoring can email authenticated users about seeded National Grid and Eversource rate case changes.
- The backend now uses `gpt-5.2-chat-latest` by default. Override with `OPENAI_MODEL` if needed.

## Deploy on Vercel

This project now deploys as:

- a static Vite frontend
- a Vercel serverless API under `/api/*`
- Supabase Auth + Postgres for persistent multi-user auth and saved state

### Required Vercel environment variables

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOCKET_SYNC_SECRET`
- `RESEND_API_KEY`
- `DOCKET_ALERT_FROM_EMAIL`
- `DOCKET_ALERT_REPLY_TO_EMAIL` (optional)

### Recommended Vercel setup

1. Import the repo into Vercel.
2. Create a Supabase project.
3. In Supabase SQL Editor, run [`supabase/schema.sql`](/Users/ericzhuang/Downloads/mini-project/wintel%20(1)/supabase/schema.sql).
4. In Supabase Auth settings, decide whether email confirmation should be required.
5. Add the environment variables above to Vercel Production and Preview.
6. Deploy with Node.js 20.

### Docket Watch v1

The app now auto-bootstraps a default weekly docket watch for each authenticated user. The seed set covers:

- National Grid gas and electric in New York
- National Grid gas and electric in Massachusetts
- Eversource gas and electric in Massachusetts

The current v1 assumptions are:

- email digest delivery only
- weekly polling via Vercel Cron at Monday 13:00 UTC
- focus on new rate case filing changes and official docket page updates
- National Grid New York docket targets are active by default
- Massachusetts National Grid and Eversource targets are active and use official-source retrieval instead of direct `mass.gov` page polling
- Eversource does not have a New York utility docket target seeded by default

Relevant endpoints:

- `POST /api/dockets/bootstrap`
- `GET /api/dockets/events`
- `GET /api/dockets/sync` with `Authorization: Bearer $DOCKET_SYNC_SECRET` for manual runs

For outbound email, configure Resend and set `DOCKET_ALERT_FROM_EMAIL` to a verified sender.

### Auth behavior

- If email confirmation is enabled in Supabase, sign-up will create the account but the user must confirm email before logging in.
- If email confirmation is disabled, sign-up logs the user in immediately.
