# Studio — Agent Instructions

## Stack

- Next.js 16 (App Router), React 19, TypeScript in strict mode
- Tailwind CSS 4 and shadcn/ui, Lucide icons
- Supabase: Postgres, Auth (magic link), Storage, Realtime, Edge Functions, pg_cron
- @supabase/ssr for Supabase clients in Next.js
- Zod for every form and Server Action input
- Resend and React Email for email
- Xero Accounting API (OAuth 2.0)
- Playwright for end-to-end tests
- Hosted on Vercel

## Ground rules

- Read docs/PRD.md and docs/BUILD-PLAN.md before starting any task.
- Work only on the current phase. Do not build ahead.
- No dead UI. Never add a button, link, menu item or form that does not fully work.
- No mock data in app code. Seed data lives only in supabase/seed.sql.
- All database changes go through migration files in supabase/migrations. Never change the database by hand.
- Row Level Security is enabled on every table, with explicit policies.
- Fetch data on the server by default (Server Components and Server Actions). Use client components only where interaction needs it.
- Every page has loading, empty and error states.
- Every action gives feedback with a toast (success or error).
- After each task, run typecheck, lint and the Playwright tests. Fix failures before reporting the task as done.
- Keep components small, one per file.
- Ask before adding any new dependency.

## Folder structure

```
app/(studio)/          owner area
app/(portal)/          client area
app/api/xero/          Xero OAuth callback and webhooks
components/ui/         shadcn components
components/            app components
lib/supabase/          server, browser and admin clients
lib/xero/              Xero client and token refresh
lib/validation/        Zod schemas
emails/                React Email templates
supabase/              migrations, functions, seed.sql
tests/e2e/             Playwright tests
```

## Where this repo is today

This repository is the one Studio app. It is the Next.js app deployed at https://central-rust.vercel.app. There is no second tracker.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
