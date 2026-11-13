# Studio build plan

Work one phase at a time. For each phase: plan first, implement only that phase, then tick the acceptance criteria. A phase is done only when its criteria pass and its Playwright tests are green.

The schema below is the source of truth for Phase 1 migrations.

## Database schema

Fourteen tables in Supabase. Every table has `id` (uuid), `created_at` and `updated_at`. Money fields use `numeric(12,2)`.

The `project_stage` enum is: `pipeline`, `brief`, `design`, `build`, `review`, `live`.

| Table | Key fields | Notes |
| --- | --- | --- |
| profiles | id (same as the auth user), full_name, email, role, client_id | role is `owner` or `client`; `client_id` is set for clients only |
| clients | name, company, email, phone, xero_contact_id | one client can have several projects (Shark Beauty, Shark Home, Shark Kitchen) |
| projects | client_id, name, type, stage, status, due_date, start_date, contract_value, deposit_percent, pinned, description | stage uses `project_stage`; status is `active`, `ongoing`, `on_hold` or `archived`; `contract_value` is locked when the client approves the budget; `deposit_percent` defaults from settings |
| documents | project_id, kind, title, version, file_path, status, sent_at | kind is `proposal`, `scope_of_work`, `set_design`, `budget`, `sign_off` or `other`; budget and sign_off have no file, the portal shows them in-app; status is `draft`, `sent`, `approved` or `changes_requested` |
| approvals | document_id, user_id, decision, comment | decision is `approved` or `changes_requested` |
| budget_lines | project_id, label, kind, amount, sort_order | kind is `design_delivery`, `handyman`, `materials`, `contingency` or `other`; the materials line follows the materials total until the budget is approved, then freezes |
| suppliers | name, contact_name, email, phone, website, default_lead_days, xero_contact_id | lead days drive the expected delivery dates |
| areas | project_id, name, sort_order | sections of the materials list, such as Dresser Area, TV Wall or Sundries |
| materials | project_id, area_id, supplier_id, order_id, item, spec, quantity, unit_cost, line_total, actual_cost, link, notes, priority, lead_days, status, ordered_at, expected_at, delivered_at, sort_order | `line_total` is generated (`quantity × unit_cost`); `actual_cost` is what was really paid when it differs; priority is `normal` or `high`; `lead_days` overrides the supplier default; status is `to_order`, `ordered`, `delivered`, `late` or `cancelled` |
| orders | project_id, supplier_id, reference, items_total, vat, vat_included, delivery_cost, total, paid_with, status, ordered_at, expected_at, delivered_at, xero_po_id | one checkout with one supplier; `total = items_total + delivery_cost`, plus vat when `vat_included` is false; `paid_with` is a label such as Lloyds or Amex, never a card number |
| invoices | project_id, type, xero_invoice_id, amount, status, sent_at, paid_at | type is `deposit` or `final`; status is `draft`, `sent`, `paid` or `void` |
| activity_log | project_id, actor_id, type, message, metadata (jsonb), client_visible | feeds the project timeline; `client_visible` controls what clients see |
| settings | deposit_percent, business_name, business_email, away_from, away_until | a single row; the away dates show as the marker on the timeline |
| xero_connection | tenant_id, access_token, refresh_token, expires_at | owner only, never sent to the browser |

Later migrations (do not add these in Phase 1):

- Phase 5: `settings.auto_send_invoices` (boolean, default false), `projects.awaiting_deposit` (boolean).
- Phase 6: `settings.automations` (jsonb).

## Automatic rules

Database triggers and scheduled jobs:

1. A material changes to `ordered`: `ordered_at` is set to today if empty, and `expected_at` is set to `ordered_at` plus its `lead_days` (or the supplier's `default_lead_days`) if empty. Materials in an order take the order's dates.
2. A material changes to `delivered`: `delivered_at` is set to now if empty. Marking an order delivered marks all its items delivered; when every item in an order is delivered, the order is delivered.
3. Every morning (`pg_cron`, scheduled in UTC): any material or order still marked `ordered` with an `expected_at` before today becomes `late`.
4. An approval is added with decision `approved`: the document becomes `approved`. When every document the current stage needs is approved, the project moves to the next stage. Pipeline needs the proposal; Brief needs the `scope_of_work`; Design needs the `set_design` and the budget; Review needs the `sign_off`.
5. The budget is approved: the materials line freezes at its current amount, and `contract_value` is set to the sum of all budget lines.
6. An approval is added with decision `changes_requested`: the document becomes `changes_requested` and the owner is notified.
7. Each of the above writes a row to `activity_log`.

Phase 5 changes rule 4 for Design: when Xero is connected, an approved budget sets `awaiting_deposit` to true and the project waits in Design. When the deposit is paid, the project moves to Build.

## Views

- `project_budget`, one row per project: agreed total, each budget line, materials planned (sum of `line_total`, cancelled excluded), materials actual (`actual_cost` where set, otherwise `line_total`, for ordered and delivered items), delivery charges from orders, contingency remaining and percent used.
- `delivery_stats`, one row per project: delivered on time, delivered late and still outstanding. On time means `delivered_at` is on or before `expected_at`.

## Who can see what

Row Level Security. Helper functions: `is_owner()` and `my_client_id()`.

| Table | Owner | Client |
| --- | --- | --- |
| clients | Full access | Read their own record |
| projects | Full access | Read their own projects |
| documents | Full access | Read documents on their own projects, excluding drafts |
| approvals | Full access | Read their own; add approvals on their own projects' documents |
| budget_lines | Full access | Read the lines on their own projects (the split, not item prices) |
| materials | Full access | No direct access. `get_client_materials(project_id)` returns area, item, quantity, status, expected_at and delivered_at only, with no costs |
| invoices | Full access | Read their own |
| activity_log | Full access | Read entries on their own projects where `client_visible` is true |
| areas, orders, suppliers, settings, xero_connection | Full access | No access |

## Open questions

- Deposit percentage: 50% is assumed. Change it in settings if it differs.
- The deposit is invoiced when the client approves the budget. Confirm, or say if it should be at proposal approval.
- Clients see the budget split and delivery status, but not item prices. Confirm.

## Phase 1 — Foundation

Read `AGENTS.md`, `docs/PRD.md` and the Database schema section of this file. Implement Phase 1 only:

1. Set up Supabase in this Next.js app with `@supabase/ssr`: server, browser and admin clients in `lib/supabase`.
2. Write migrations for every table, enum, view, trigger, scheduled job and RLS policy in the schema, plus the `is_owner()` and `my_client_id()` helper functions.
3. Magic-link login. A new auth user gets a `profiles` row automatically. The email in `OWNER_EMAIL` gets role `owner`. Anyone else can only sign in once invited as a client.
4. Middleware: owners go to `/studio`, clients go to `/portal`, signed-out users go to `/login`. A client opening `/studio` is redirected to `/portal`.
5. App shell: studio sidebar with Dashboard and Settings only (later phases add their own links) and a simple portal header.
6. Design tokens in `globals.css`: light theme, blue and turquoise palette.
7. `supabase/seed.sql` with one demo client, project and supplier for local testing.
8. Set up Playwright with tests for login and the redirects.

Plan first. Do not build anything from later phases.

### Acceptance criteria

- Owner logs in by magic link and lands on `/studio`.
- A seeded client logs in and lands on `/portal`; opening `/studio` redirects them.
- An uninvited email cannot sign in.
- Automated test proves client A cannot read client B's projects.
- Types generated; typecheck, lint and Playwright all pass.

## Phase 1b — Move existing data

Only if `docs/AUDIT.md` says the current tracker holds real clients and projects. It does. See that file for where the live list actually is.

Using `docs/AUDIT.md`, write a one-off script in `scripts/migrate.ts` that exports clients and projects from the old tracker and imports them into Supabase, mapping old fields to the new schema. Run a dry run first that prints what it would import. Do not delete anything from the old system.

### Acceptance criteria

- Alfie has checked the dry-run output.
- Real run imports every client and project, and the counts match.

## Phase 2 — Projects, documents and approvals

Implement Phase 2 only:

1. Clients: list, create, edit, archive.
2. Projects: list with stage and status filters, create, edit, and a project page.
3. Project page: stage tracker (six stages, current one highlighted), documents panel, activity timeline.
4. Documents: upload a PDF or image to the `documents` bucket, automatic version numbers, preview through a signed URL, status pill.
5. Send to client: status becomes `sent`, `sent_at` is set, activity is logged, toast confirms. Emails come in Phase 6.
6. Owner override: move a project to any stage after a confirmation dialog; logged to the timeline.
7. Dashboard rebuilt to match `docs/design/current-dashboard.png`: greeting and date, Focus card (pinned project, days to next deadline, stage progress, next-action button), Stages board with drag-and-drop between stages, Next six weeks timeline with draggable deadline ends and the away marker, Dashboard/Manage switch, and the Cmd-K palette ("Add or find anything") searching projects and clients.
7b. Persistent app shell and project switcher as described in the Experience section of `docs/PRD.md`.
8. Add Projects and Clients to the sidebar.
9. Playwright tests covering every button and form on these pages.

### Acceptance criteria

- Create a client, create a project, upload a proposal and send it, with no errors.
- A new upload on the same document creates version 2, and version 1 can still be viewed.
- A manual stage override works and shows on the timeline.
- Every button and form on these pages has a Playwright test.

## Phase 3 — Client portal

Implement Phase 3 only:

1. Invite client: on the client page the owner enters an email; Supabase sends an invite magic link; the profile is created with role `client` and the correct `client_id`.
2. Portal home: the client's projects as cards with stage progress.
3. Portal project page: stage progress, sent documents with preview, Approve and Request changes buttons (a comment is required to request changes), and the client-visible timeline.
4. Approvals trigger the database rules: the document status updates and the project moves on when the current stage is approved.
5. In Review, the portal shows a Sign off button with an optional comment. Signing off approves the `sign_off` document and moves the project to Live.
6. Mobile-first layout, checked at phone width.
7. Playwright tests: the approve flow, the request-changes flow, the sign-off flow, and a client opening another client's project gets a not-found page.

### Acceptance criteria

- A client receives the invite, logs in and sees only their own project.
- Approving the proposal moves the project from Pipeline to Brief and logs it.
- Requesting changes needs a comment, and the comment shows on the owner's project page.
- Opening another client's project link shows a not-found page.
- Everything works cleanly at phone width.

## Phase 4 — Materials, suppliers, deliveries and budget

Implement Phase 4 only:

1. Suppliers: list, create, edit, with website and default lead time in days.
2. Materials tab laid out like the current sheets (see `tests/fixtures`): items grouped by area (add, rename, reorder, collapse areas), columns Item, Spec / cut sizes, Qty, Unit £, Total £, Supplier, Link, Notes, Lead time, Priority, Status, Ordered, Expected, Delivered. Inline editing with keyboard navigation, drag to reorder, area subtotals and a grand total.
3. Add, duplicate and delete rows (Undo toast). Bulk actions on selected rows: mark ordered, mark delivered, move to area, group into an order.
4. Autocomplete: typing an item or supplier suggests matches from past projects and fills spec, supplier, link and unit price.
5. Paste rows copied from Excel straight into the table.
6. Excel import (`.xlsx` or `.csv`) with a column-mapping preview. Rows with only a name in the Item column become areas. Lead-time text converts to days ("Next Day" = 1, "1-3 working days" = 3, "7 days" = 7). "High Priority" sets priority high. "Ordered" sets status ordered. Use SheetJS from the official SheetJS CDN, not the outdated npm package (ask before adding it).
7. Orders: group items bought in one checkout from one supplier. Fields: reference, VAT, VAT included yes/no, delivery charge, paid with (a label such as Lloyds or Amex, never a card number). Totals calculate automatically. An Orders tab lists every order on the project.
8. Status changes run the database rules; the owner can still edit expected dates. Late items are highlighted.
9. Budget tab: the budget lines (Design & Delivery, Handyman, Materials, Contingency, plus custom), materials planned vs actual, delivery charges, contingency remaining, and a warning colour above 90% used. A Send budget for approval button creates the budget document.
10. Dashboard widgets: late deliveries and deliveries due this week across all projects.
11. Portal: the budget split for approval (line totals only) and a read-only delivery list via `get_client_materials()`, with no item prices.
12. Add Suppliers to the sidebar. Playwright tests covering every button and form, using the fixture sheets.

### Acceptance criteria

- The Shark Beauty and Amazon Ring sheets import with every row and area, and the materials totals match the originals.
- Shark Beauty's budget split totals £11,148 (£2,500 + £1,200 + £6,448 + £1,000).
- An order with VAT on top (like Screenmoove) and one with VAT included (like Wickes) both total correctly.
- Marking an item as ordered fills in the expected date from its lead time, or the supplier's default.
- Setting an expected date to yesterday and running the daily job marks the item late.
- Typing "CLS" on a new project suggests the Wickes CLS timber with its price and link.
- The client approves the budget, the total locks, and they never see item prices.

`tests/fixtures/` (the Shark Beauty and Amazon Ring `.xlsx` files) and `docs/templates/` (a recent Proposal and Scope of Work) are not in the repo yet. Phase 4 cannot be signed off until they are added.

## Phase 5 — Xero

Test everything against the Xero Demo Company before connecting the real account. Implement Phase 5 only. Follow `.cursor/rules/xero.mdc`.

1. Settings page: a Connect to Xero button runs the OAuth flow and stores the tokens; once connected it shows the organisation name and a Disconnect button.
2. A token refresh helper in `lib/xero` that every Xero call goes through.
3. Contacts: the first time a client is invoiced, find or create their Xero contact and save `xero_contact_id`.
4. Migration: add `auto_send_invoices` (boolean, default false) to settings, `awaiting_deposit` (boolean) to projects (suppliers already have `xero_contact_id`).
5. Deposit invoice: when the budget is approved, create an invoice for `contract_value ×` the project's `deposit_percent`. If `auto_send_invoices` is off, create it as a draft and show a Review and send button in Studio; if on, approve it and email it through Xero.
6. Change the Design approval rule: when Xero is connected, an approved budget sets `awaiting_deposit` to true and the project waits in Design. When the deposit is paid, the project moves to Build.
7. Final invoice: when the project moves to Live, create the final invoice for `contract_value` minus the deposit, using the same draft or auto-send setting.
8. Webhook at `/api/xero/webhook`: verify the signature, handle Xero's intent-to-receive check, and on invoice updates fetch the invoice; when it is paid, set status to `paid` and `paid_at`, log it, and apply rule 6.
9. Optional button on the materials tab: send the selected items as a purchase order to their supplier in Xero, saving `xero_po_id`.
10. Playwright tests for the Settings connect flow and the Studio invoice buttons, with Xero calls mocked in tests only.

### Acceptance criteria

- Connecting from Settings works, and Xero calls still work an hour later (token refresh).
- Approving a budget creates a deposit invoice for the right amount, against the right contact.
- Approving twice never creates a second invoice.
- Marking the invoice paid in Xero updates Studio within a minute and moves the project to Build.
- Moving a project to Live creates the final invoice for the balance.

## Phase 6 — Automations and emails

Implement Phase 6 only:

1. React Email templates in `emails/` matching the app's design, one per automation in the table below.
2. Send through Resend from server code or Edge Functions only. Log every email sent to `activity_log`.
3. Morning digest Edge Function, run by `pg_cron` after the late-marking job. Send nothing if there is nothing to report.
4. Migration: add an `automations` jsonb column to settings. Settings page: a toggle for each automation.
5. Playwright tests that trigger each event and check an email was recorded, using a test mode that records emails instead of sending them.

| Trigger | What happens | Emailed to |
| --- | --- | --- |
| Document sent to the client | Email with a link to it in the portal | Client |
| Client approves or requests changes | Email with the decision and any comment | Alfie |
| Deposit or final invoice sent | Sent through Xero, or left as a draft for review | Client |
| Invoice paid | Logged and shown on the dashboard | Alfie |
| Item becomes late, or is due in the next 2 days | One morning digest covering every project | Alfie |
| Project goes Live | Thank-you email with a link to the final documents | Client |

### Acceptance criteria

- Each automation fires once, and only once, for its trigger.
- Emails look right on phone and desktop, and every link in them works.
- Turning an automation off in Settings stops it.
- No digest is sent on a morning with nothing to report.

## Definition of done

Every phase:

- Typecheck and lint pass.
- Every button, link and form touched in the phase has a Playwright test, and the whole suite passes.
- Loading, empty and error states exist on every page touched.
- Checked at phone width and desktop width.
- No errors in the browser console.
- Committed to git with a clear message, and the Vercel preview deploy works.

### Dead-button sweep

At the end of every phase, list every button, link, menu item and form: where it is, what it should do, whether it works, and which Playwright test covers it. Fix anything that does not work. Remove anything that is not part of a finished phase. Add tests for anything not covered. Then run the full test suite and report the results.

## Environment variables

Put these in `.env.local` for local work and in the Vercel project settings for the live site. Never commit `.env.local`.

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase API keys, publishable key |
| `SUPABASE_SECRET_KEY` | Supabase API keys, secret key (server only) |
| `OWNER_EMAIL` | The email Alfie logs in with |
| `XERO_CLIENT_ID` | Xero developer app |
| `XERO_CLIENT_SECRET` | Xero developer app (server only) |
| `XERO_REDIRECT_URI` | The live domain plus `/api/xero/callback`, also added in the Xero app |
| `XERO_WEBHOOK_KEY` | Xero developer app, Webhooks tab |
| `RESEND_API_KEY` | Resend dashboard |
| `APP_URL` | The live site address, used in email links |

## Launch checklist

- Custom domain connected in Vercel.
- Supabase Auth site URL and redirect URLs set to the live domain; login emails branded.
- Resend sending domain verified, so emails don't land in spam.
- Xero redirect URI and webhook URL pointing at the live domain; real organisation connected.
- Supabase on a paid plan with daily backups once real client data is in.
- One friendly client invited first; fix what they find before inviting everyone else.
