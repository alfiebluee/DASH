# Audit of the current tracker

Phase 0 only. No application code was changed.

## Decision

This repo is Vite + React, not Next.js App Router. The build guide says to start a fresh Next.js app, port the reusable pieces, and migrate the data with a one-off script (Phase 1b). Do not convert this Vite app in place. Do not add Supabase to it.

Base44 is already gone from this repo. It is not a data store here. Supabase still has to become the source of truth, because the live site and this folder do not share data.

## Why the shared link shows the old clients

`https://central-rust.vercel.app/` is not this folder.

The page at that address, photographed on 24 October 2026 and saved as `docs/design/current-dashboard.png`, shows Go Places Live Studios in focus, plus Ring, Shark Beauty, Shark Home, Shark Kitchen, Trip and Butternut Box, and a Complete Project control. None of those names, and not that control, exist in this source tree.

This folder's only data is a local seed: Parameter Marketing, Huglin Carpets, Go Places, Alcera Tiles, No Noise, BWeb, Taste Labs, Ream Interiors. It is written to the visitor's browser under the localStorage key `studio.v1` the first time they open the app. There is no server, no account, and no shared database.

That is why sending the link does not show the list on Alfie's machine:

- Other people open a different deployment, with the older client list baked into that deployment.
- Even a deploy of this folder would give each new browser the seed above, not the edits sitting in Alfie's browser.

Edits made on one computer stay on that computer. A shared client list needs the Supabase database in the build plan. Redeploying this Vite app will not fix the link.

## 1. Framework and versions

From `package.json`:

- Vite 8, React 18.3, React DOM 18.3, TypeScript 6 (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- React Router 7
- Tailwind CSS 3
- TanStack Query 5, Zod 4, Framer Motion 12, dnd-kit, Radix (dialog, dropdown, context menu, popover, tabs, tooltip), cmdk, chrono-node, date-fns, sonner, lucide-react
- Vitest 4 and Playwright
- Not present: Next.js, Supabase, Auth, file storage, Resend, Xero

Scripts: `dev`, `build` (`tsc -b && vite build`), `typecheck`, `lint`, `test`, `e2e`, `check`.

Git: one commit, `1st`, on `main`, tracking `https://github.com/alfiebluee/DASH.git`. Uncommitted work is the last polish on the focus card, timeline, project sheet, and e2e spec. There is no `vercel.json` and no `.vercel` link in the repo, so this GitHub repo is not what publishes `central-rust.vercel.app`.

## 2. Where data is stored

`getRepository()` in `src/data/index.ts` always returns `LocalAdapter`. The first empty or corrupt read of `studio.v1` calls `createSeed()` and writes it. Every read and write is validated with Zod.

There is no Base44 adapter. `.env.example` only mentions that calendar sync is off. Google Calendar is not connected.

### Project

`id`, `name`, `client` (a string, not a client record), `description`, `type` (Web, Brand, Paid Media, Production, Personal, Other), `stage` (Pipeline, Brief, Design, Build, Review, Live), `status` (On track, At risk, Blocked, Paused), `colour`, `progress` 0–100, `priority` 1–3, `startDate`, `dueDate`, `hoursPerWeek`, `nextAction`, `notes`, `links[]`, `sortOrder`, `pinned`, `archived`, `createdAt`, `updatedAt`.

### Event

`id`, `title`, `date`, optional `endDate`, `kind` (Deadline, Meeting, Launch, Pitch, Away, Reminder), optional `projectId`, `source` (`manual` or `calendar`), `done`.

### Settings

`greetingName`, `weeklyCapacityHours`, six `stageLabels`, `timelineWeeks` (4, 6 or 8).

Nothing in this shape covers clients as their own records, documents, approvals, materials, orders, suppliers, budgets, invoices, or activity. Those are new tables, not fields to stretch.

### What Phase 1b can actually import

From this repo, a script can only export the eight seed projects (or whatever is in one browser's `studio.v1`). That is the mock list, not the live jobs.

The live list people see at `central-rust.vercel.app` (Go Places Live Studios, Ring, the three Shark sets, Trip, Butternut Box) is not in this repository. Before Phase 1b runs, that deployment's data store has to be identified and exported. Do not treat the seed in `src/data/seed.ts` as the real client list, and do not delete the old system.

## 3. Routes

| Route | What it does |
| --- | --- |
| `/` | Dashboard. Greeting, focus card, stage board, six-week timeline, up next, pipeline ideas, pulse. |
| `/manage` | Editorial headline plus tabs. |
| `/manage?tab=projects` | Search, filters, sortable inline-editable table, bulk stage, status and archive. |
| `/manage?tab=events` | Month calendar, fortnight, events grouped by month. |
| `/manage?tab=settings` | Greeting, weekly capacity, stage labels, timeline length. |
| `/manage?tab=archive` | Restore or permanently delete archived projects. |

Query keys used on Manage: `tab`, `q`, stage, status, type, `scope` (`active` or `risk`), `sort`, `dir`, `day`, `focus`. There is no project page, no client login, and no per-client URL.

## 4. Controls

These work against localStorage. They do not exist on the public Vercel app unless that app was built from this source, which the screenshot shows it was not.

Dashboard:

- Pin (one project at a time), status menu, project name opens the editor, stage segments set the stage, next action saves on Enter and cancels on Esc.
- Stage cards: click focuses, double-click or Enter opens the editor, keys 1–6 move stage, drag between lanes, menu for open, status, colour, pin, archive. New project opens the create sheet on Brief.
- Timeline: 4/6/8 weeks is saved; dragging an edge, the bar, or a marker snaps to a day and can be undone; a click opens the project or event; the away chip extends the window for this session only; phone rows open the same editor.
- Up next: the row opens the event or project; the checkbox marks an event done, with undo; Add date creates an event.
- Pipeline: drag a tile onto a lane; click opens the editor; Add idea creates a Pipeline project.
- Pulse: Active, At risk and Capacity go to the matching Manage view; Due this week flashes the timeline.
- Command palette (⌘K or `/`) searches and can quick-add a dated event. Shortcuts: N, E, ?, Esc, 1–6, arrows. Account menu opens Settings. There is no sign out.

Sheets:

- Project create is disabled until the form is valid. Edit saves text on blur and selects on change. Archive and delete both undo or confirm, and deleting a project removes its events.
- Event editor creates, edits, marks done, and deletes, with undo.

Manage:

- Filters, sort, inline client, stage, status, due date, progress and priority, bulk actions, event done and delete, settings fields, archive restore and permanent delete. Empty states have a real action.

There is no documents UI, no materials grid, no orders, no budget, no invoices, no client invite, and no Xero connect button. Those should not be added to this Vite app.

## 5. Reuse or replace

Reuse as reference, then rebuild in the Next.js app:

- The six stage names and the idea that the owner can move a card by hand.
- The Control Centre arrangement: greeting, focus card, stage board, six-week timeline, away marker, Dashboard/Manage, Cmd-K. The picture to match is `docs/design/current-dashboard.png`, not a redesign.
- Interaction patterns already proven here: optimistic save with rollback, undo toasts, URL-synced filters, drag between stages, keyboard stage moves, no dead buttons.
- Zod on every read and write. The new schemas are the ones in `docs/BUILD-PLAN.md`, not `src/data/schemas.ts`.

Replace:

- Vite, React Router, and the client-only repository. The new app is Next.js App Router, server components, and Supabase.
- localStorage. It cannot be the shared client list.
- The string `client` field. Clients become their own table, with several projects each.
- Status values. The new set is `active`, `ongoing`, `on_hold`, `archived`. Ongoing is how undated work such as the Shark sets is shown.
- The seed projects. They are sample content for this prototype.
- Tailwind 3 tokens and Radix assembled by hand. The new app uses Tailwind 4, shadcn, and CSS variables.
- Events as a separate list, unless a later phase still wants a calendar. The new timeline is driven by project dates, deliveries and the away marker.

Do not port:

- Base44, Google Calendar, or any half-connected sync.
- The Manage editorial page as a second product surface, until Phase 2 decides what "Manage" means beside the new sidebar. The guide keeps the Dashboard/Manage switch on the rebuilt dashboard.
- Any button from a later phase. If it is not in the phase being built, it is not on screen.

## Not in the repo yet

Phase 4 cannot be tested until these are added:

- `tests/fixtures/`: the Shark Beauty and Amazon Ring materials sheets as `.xlsx`.
- `docs/templates/`: a recent Proposal and a Scope of Work.

## What happens next

Phase 1 is started in `platform/`. The Vite tracker stays in the repo root until that app can replace the link people are sent. Supabase is not connected on this machine yet, so sign-in there is local until the keys in `platform/.env.example` are filled in.
