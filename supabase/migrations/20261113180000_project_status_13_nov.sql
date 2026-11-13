-- Status from Alfie on 13 Nov 2026.
-- Ring is fully approved, materials are ordered, and the build is 16–17 Nov at £4,500 all in.
-- Shark Beauty is in procurement. The scope of work was signed and the invoice was sent the same day.
-- No invoice amount was given, so the contract gate records "invoice sent" without a made-up figure.
-- Shark Home and Shark Ninja are the Home and Kitchen lines. Both stay in proposal.

update public.projects
set
  stage = 'set_build',
  status = 'active',
  start_date = date '2026-11-16',
  due_date = date '2026-11-17',
  contract_value = 4500,
  description = 'Materials ordered. Build 16–17 Nov. £4,500 all in.'
where id = '33333333-3333-4333-8333-333333333333';

update public.project_approvals
set status = 'approved', approved_at = coalesce(approved_at, timestamptz '2026-11-13 12:00:00+00')
where project_id = '33333333-3333-4333-8333-333333333333'
  and status <> 'approved';

update public.materials
set status = 'ordered', ordered_at = coalesce(ordered_at, date '2026-11-13')
where project_id = '33333333-3333-4333-8333-333333333333'
  and status in ('to_order', 'late');

update public.orders
set status = 'ordered', ordered_at = coalesce(ordered_at, date '2026-11-13')
where project_id = '33333333-3333-4333-8333-333333333333'
  and status = 'draft';

update public.projects
set
  stage = 'procurement',
  status = 'active',
  start_date = date '2026-11-23',
  due_date = date '2026-11-24',
  description = 'Invoice sent and scope of work signed 13 Nov 2026. Build 23–24 Nov.'
where id = '44444444-4444-4444-8444-444444444444';

update public.project_approvals
set status = 'approved', approved_at = coalesce(approved_at, timestamptz '2026-11-13 12:00:00+00')
where project_id = '44444444-4444-4444-8444-444444444444'
  and status <> 'approved';

insert into public.documents (project_id, kind, title, status, sent_at)
select
  '44444444-4444-4444-8444-444444444444',
  'scope_of_work',
  'Scope of work',
  'approved',
  timestamptz '2026-11-13 12:00:00+00'
where not exists (
  select 1 from public.documents
  where project_id = '44444444-4444-4444-8444-444444444444'
    and kind = 'scope_of_work'
);

update public.documents
set status = 'approved', sent_at = coalesce(sent_at, timestamptz '2026-11-13 12:00:00+00')
where project_id = '44444444-4444-4444-8444-444444444444'
  and kind = 'scope_of_work';

update public.projects
set
  stage = 'proposal',
  status = 'active',
  start_date = date '2027-01-19',
  due_date = date '2027-01-19',
  description = 'Build week commencing 19 Jan 2027.'
where id = '55555555-5555-4555-8555-555555555555';

update public.projects
set
  stage = 'proposal',
  status = 'active',
  start_date = date '2026-11-30',
  due_date = date '2026-12-01',
  description = 'Build 30 Nov–1 Dec 2026.'
where id = '66666666-6666-4666-8666-666666666666';
