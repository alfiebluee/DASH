# Studio

One app, deployed at https://central-rust.vercel.app.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000. Sign-in is a magic link. There is no password and no local preview session.

## Database

Docker and the Supabase CLI are required before anyone can sign in.

1. Install [Docker Desktop](https://docs.docker.com/desktop/) and start it.
2. Install the CLI: `brew install supabase/tap/supabase`
3. From this folder: `supabase start`
4. Copy the API URL, publishable key, and secret key from `supabase status` into `.env.local` (see `.env.example`).
5. `supabase db reset` applies `supabase/migrations` and `supabase/seed.sql`.

Local mail is the URL printed by `supabase status`, usually http://127.0.0.1:54324. Opening a magic link from that inbox signs you in. The seed does not send email and does not create passwords.

These addresses become owners on first magic-link sign-in:

- alfiebluee@gmail.com (Test user, also `OWNER_EMAIL`)
- teddy@go-places.io (Teddy)
- alexbutler@go-places.io (Alex)
- riley@go-places.io (Riley)

Seeded projects: Ring (client Ring), and Shark Beauty, Shark Home, and Shark Ninja (client Shark Ninja).

```bash
npm run typecheck
npm run lint
npm test
npm run e2e
```

Playwright reuses http://127.0.0.1:3000.
