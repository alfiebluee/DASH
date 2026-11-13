-- Named by Alfie on 12 Nov 2026. No passwords, no auth users, and no email is sent.
-- A magic-link sign-in creates the profile. Staff become owners. They are not clients.
-- Client emails, phone numbers, budgets, and materials were not provided.

insert into private.staff (email, full_name, job_title, sort_order, access) values
  ('alfiebluee@gmail.com', 'Alfie', '', 0, 'owner'),
  ('alfie@asiya.space', 'Alfie', '', 4, 'owner'),
  ('teddy@go-places.io', 'Teddy', 'Director of Ops', 1, 'viewer'),
  ('alexbutler@go-places.io', 'Alex', 'Head of Live Ops', 2, 'viewer'),
  ('riley@go-places.io', 'Riley', 'Live Ops Team', 3, 'viewer')
on conflict (email) do nothing;

insert into public.settings (deposit_percent, business_name, business_email)
values (50, 'Studio', 'alfiebluee@gmail.com');

insert into public.clients (id, name) values
  ('11111111-1111-4111-8111-111111111111', 'Ring'),
  ('22222222-2222-4222-8222-222222222222', 'Shark Ninja');

-- Status from Alfie on 13 Nov 2026.
-- Ring is approved, materials are ordered, and the build is 16–17 Nov at £4,500 all in.
-- Shark Beauty is in procurement: the scope of work is signed and the invoice was sent the same day.
-- Shark Home and Shark Ninja (the kitchen line) are in proposal.
insert into public.projects (
  id, client_id, name, type, stage, status, start_date, due_date, contract_value, description
) values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'Ring',
    'Set Design & Delivery',
    'set_build',
    'active',
    '2026-11-16',
    '2026-11-17',
    4500,
    'Materials ordered. Build 16–17 Nov. £4,500 all in.'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'Shark Beauty',
    'Set Design & Delivery',
    'procurement',
    'active',
    '2026-11-23',
    '2026-11-24',
    null,
    'Invoice sent and scope of work signed 13 Nov 2026. Build 23–24 Nov.'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    '22222222-2222-4222-8222-222222222222',
    'Shark Home',
    'Set Design & Delivery',
    'proposal',
    'active',
    '2027-01-19',
    '2027-01-19',
    null,
    'Build week commencing 19 Jan 2027.'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '22222222-2222-4222-8222-222222222222',
    'Shark Ninja',
    'Set Design & Delivery',
    'proposal',
    'active',
    '2026-11-30',
    '2026-12-01',
    null,
    'Build 30 Nov–1 Dec 2026.'
  );

update public.project_approvals
set status = 'approved', approved_at = timestamptz '2026-11-13 12:00:00+00'
where project_id in (
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);

insert into public.documents (project_id, kind, title, status, sent_at)
values (
  '44444444-4444-4444-8444-444444444444',
  'scope_of_work',
  'Scope of work',
  'approved',
  timestamptz '2026-11-13 12:00:00+00'
);

-- No supplier was named. This row keeps the suppliers table from being empty.
insert into public.suppliers (id, name, default_lead_days) values
  ('77777777-7777-4777-8777-777777777771', 'General supplier', 7);
