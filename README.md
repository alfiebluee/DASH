# Studio

A personal project control centre. One screen for what you are working on, what stage it is at, and what is due. Manage is the same data, seen from the back.

## Run it

```bash
npm install
npm run dev
```

No environment variables are required. The first launch writes seed data to `localStorage` under `studio.v1`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm run check` | Typecheck, lint, unit tests, then the browser test |
| `npm run test` | Vitest |
| `npm run e2e` | Playwright |
| `npm run build` | Typecheck and production build |

## Environment

Studio stores projects, dates, and settings in `localStorage`. Edit them in the app. There is no remote account.

| Variable | Purpose |
|---|---|
| `VITE_FEATURE_GCAL` | Left unset. Calendar sync is not part of this build. |

## Shortcuts

`N` new project, `E` new date, `⌘K` or `/` command palette, `?` shortcut list, `Esc` close, `1`–`6` move the focused stage card, arrow keys shift a focused timeline edge.

## Where things live

- `src/components/ui` primitives
- `src/components/dashboard` the control centre
- `src/components/manage` the back office
- `src/data` zod schemas, seed data, and the repository
- `src/lib` dates, focus, capacity, timeline
- `src/styles` tokens and global CSS
