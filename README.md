# Cryzo v10

Cryzo v10 is a Vite React web app with Vercel API functions. Firebase Auth is
used for identity, Supabase Postgres stores app/chat state, and the server reads
AI provider keys from environment variables.

## Local Development

```bash
npm install
npm run dev
```

## Required Environment

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Apply `supabase/migrations/0001_cryzo_v10.sql` to the Supabase project that
backs the app. The API uses the service role key server-side and scopes every
request by verified Firebase UID.

## Deployment

Push this repo to GitHub, connect it in Vercel, and set the environment
variables above in the Vercel project settings.
