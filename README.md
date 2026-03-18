<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run locally

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` and set `OPENAI_API_KEY`.
3. Start the API server:
   `npm run server`
4. In a second terminal, start the frontend:
   `npm run dev`
5. Open `http://127.0.0.1:3000`

## Notes

- Accounts, sessions, and saved workspace state are stored in `data/wintel.db`.
- The backend now uses `gpt-5.2-chat-latest` by default. Override with `OPENAI_MODEL` if needed.

## Deploy on Vercel

This project now deploys as:

- a static Vite frontend
- a Vercel serverless API under `/api/*`
- Vercel KV for persistent auth/session/user-state storage in production

### Required Vercel environment variables

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### Recommended Vercel setup

1. Import the repo into Vercel.
2. Create a Vercel KV database and connect it to the project.
3. Add the environment variables above to Production and Preview.
4. Deploy with Node.js 20.

### Local vs production storage

- Local development uses SQLite at `data/wintel.db`.
- Vercel uses KV automatically when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are present.
