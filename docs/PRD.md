# Studio

One platform to run the business: projects, documents, client approvals, materials, deliveries and invoicing.

## Product

Studio is Alfie's all-in-one business platform for set design and build projects. It replaces the current tracker and the Excel materials sheets with one simple, fast, good-looking app.

## Users

- **Owner (Alfie):** full access to everything.
- **Client:** logs in with an emailed magic link (no password). Sees only their own projects. Can view documents, approve or request changes, see the project timeline, see materials delivery status (read only) and see their invoices.

## The project pipeline

Every project moves through the same six stages as the current tracker:

1. **Pipeline:** enquiry and Proposal. Client approves the Proposal to move on.
2. **Brief:** Scope of Work. Client approves it to move on.
3. **Design:** Set Design, materials list and budget. Client approves the Set Design and the Budget to move on.
4. **Build:** ordering, deliveries and the build. Owner marks the build finished to move on.
5. **Review:** client checks the finished set and signs off in the portal.
6. **Live:** set handed over, final invoice sent. Archived when done.

The owner can always override and move a project by hand. Projects with no fixed end date (like the Shark sets) show as Ongoing instead of a due date.

## Core features

- **Dashboard:** keeps the current Control Centre layout. Greeting and date, a Focus card (pinned project, days to next deadline, stage progress, next-action button), a Stages board you drag cards across, a Next six weeks timeline with draggable deadlines and the away marker, the Dashboard/Manage switch, and Cmd-K "Add or find anything". Adds late deliveries, deliveries due this week and unpaid invoices.
- **Project page:** tabs for Overview, Documents, Materials, Orders, Budget, Invoices and Timeline.
- **Documents:** upload Proposals, Scopes of Work and Set Designs (PDF and images), keep versions, send to the client, client approves or requests changes with a comment.
- **Budget split:** lines for Design & Delivery, Handyman, Materials and Contingency, plus custom lines. The Materials line follows the materials list live. The client approves the budget in the portal, which locks the agreed total.
- **Materials:** laid out like the current sheets. Items grouped by area (Dresser Area, TV Wall, Sundries and so on) with Item, Spec / cut sizes, Qty, Unit £, Total £, Supplier, Link, Notes, Lead time, Priority, Status, Ordered, Expected and Delivered. Records planned price and actual price paid.
- **Orders:** items bought in one checkout from one supplier, with VAT, delivery charge, total and which card paid (a label like Lloyds or Amex). Replaces the supplier summary table at the bottom of the sheets.
- **Suppliers and memory:** suppliers keep a default lead time, and items bought before (CLS timber, castors, paint) autocomplete with spec, supplier, link and price.
- **Delivery tracking:** expected date worked out from the order date plus lead time. Overdue items are flagged as late automatically.
- **Invoicing via Xero:** deposit invoice when the budget is approved, final invoice when the project goes Live. Paid status syncs back from Xero.
- **Client portal:** the client side described above.
- **Email notifications** for the key events.

## Design

Keep the current tracker's look (`docs/design/current-dashboard.png`): light theme, soft turquoise background glow, white rounded cards, small uppercase labels, status pills, thin stage progress bars.

Palette centred on blue and turquoise, with a few accents.

No heavy blocks of text. Generous spacing and a clear hierarchy.

Built and finished like a professional product.

## Experience

Moving between projects and pages should feel like one continuous app, never a website reloading.

- **One persistent shell:** sidebar and header stay put; only the content area changes. No full page reloads.
- **Everything has a URL:** project, tab, filters and the open item live in the URL, so Back, refresh and shared links land in exactly the same place.
- **Cmd-K everywhere:** jump to any project, client, supplier, item or document, and run actions (new project, add material, mark delivered, send document) without leaving the page.
- **Project switcher:** in the project header, with recent projects and previous/next, keeping the same tab open.
- **Instant saves:** edits show immediately and save in the background (optimistic updates). If a save fails, it rolls back with a toast. Tables have no Save buttons.
- **Side sheets, not detours:** editing a material, supplier or order opens a panel over the current page.
- **Spreadsheet-speed tables:** Tab, Enter, Esc and arrow keys work; paste rows straight from Excel.
- **Live updates:** when a client approves something, the owner's screen updates without a refresh (Supabase Realtime).
- **Never blank:** links prefetch on hover, every page has skeletons, and page changes should feel instant.
- **Smooth motion:** subtle transitions between pages and when cards change stage (React View Transitions), switched off for anyone who has reduced motion turned on.
- **Undo over confirm:** small deletes show an Undo toast. Confirmation dialogs only for things that can't be undone.

## Non-negotiables

- Every button, link and form works. No placeholders, no coming-soon labels, no dead UI. If a feature is not built yet, its UI does not exist.
- Works well on mobile, because clients will use their phones.
- A client can never see another client's data. This is enforced in the database, not just hidden in the UI.

## Out of scope for version 1

- AI image analysis
- Team member accounts beyond the owner
- In-app card payments

## Open questions

- Deposit percentage: 50% is assumed. Change it in settings if it differs.
- The deposit is invoiced when the client approves the budget, since that's when the price is fixed and materials need buying. Confirm that's right, or say if it should be at proposal approval.
- Clients see the budget split and delivery status, but not item prices. Confirm that's right.
