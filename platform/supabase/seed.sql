-- Named by Alfie on 12 Nov 2026. No passwords, no auth users, and no email is sent.
-- A magic-link sign-in creates the profile. Staff become owners. They are not clients.
-- Client emails, phone numbers, budgets, and materials were not provided.

insert into private.staff (email, full_name, job_title, sort_order) values
  ('alfiebluee@gmail.com', 'Test user', '', 0),
  ('teddy@go-places.io', 'Teddy', 'Director of Ops', 1),
  ('alexbutler@go-places.io', 'Alex', 'Head of Live Ops', 2),
  ('riley@go-places.io', 'Riley', 'Live Ops Team', 3);

insert into public.settings (deposit_percent, business_name, business_email)
values (50, 'Studio', 'alfiebluee@gmail.com');

insert into public.clients (id, name) values
  ('11111111-1111-4111-8111-111111111111', 'Ring'),
  ('22222222-2222-4222-8222-222222222222', 'Shark Ninja');

-- Ring's stage, type, and due date are from the live tracker screenshot (due 13 Nov 2026).
-- Shark Beauty, Shark Home, and Shark Ninja were Ongoing in the Brief column, with no due date.
insert into public.projects (id, client_id, name, type, stage, status, due_date) values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'Ring',
    'Set Design & Delivery',
    'design',
    'active',
    '2026-11-13'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'Shark Beauty',
    'Set Design & Delivery',
    'brief',
    'ongoing',
    null
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    '22222222-2222-4222-8222-222222222222',
    'Shark Home',
    'Set Design & Delivery',
    'brief',
    'ongoing',
    null
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '22222222-2222-4222-8222-222222222222',
    'Shark Ninja',
    'Set Design & Delivery',
    'brief',
    'ongoing',
    null
  );

-- No supplier was named. This row keeps the suppliers table from being empty.
insert into public.suppliers (id, name, default_lead_days) values
  ('77777777-7777-4777-8777-777777777771', 'General supplier', 7);
