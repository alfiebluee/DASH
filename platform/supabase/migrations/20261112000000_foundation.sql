-- Phase 1 foundation: tables, views, triggers, the morning job, and row level security.
-- Later phases add columns (awaiting_deposit, auto_send_invoices, automations). Do not add them here.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

create schema if not exists private;

create table private.staff (
  email text primary key,
  full_name text not null,
  job_title text not null default '',
  sort_order integer not null default 0
);

revoke all on schema private from public;
revoke all on table private.staff from public;

create type public.user_role as enum ('owner', 'client');
create type public.project_stage as enum ('pipeline', 'brief', 'design', 'build', 'review', 'live');
create type public.project_status as enum ('active', 'ongoing', 'on_hold', 'archived');
create type public.document_kind as enum ('proposal', 'scope_of_work', 'set_design', 'budget', 'sign_off', 'other');
create type public.document_status as enum ('draft', 'sent', 'approved', 'changes_requested');
create type public.approval_decision as enum ('approved', 'changes_requested');
create type public.budget_kind as enum ('design_delivery', 'handyman', 'materials', 'contingency', 'other');
create type public.material_priority as enum ('normal', 'high');
create type public.material_status as enum ('to_order', 'ordered', 'delivered', 'late', 'cancelled');
create type public.order_status as enum ('draft', 'ordered', 'delivered', 'late', 'cancelled');
create type public.invoice_type as enum ('deposit', 'final');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'void');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  role public.user_role not null default 'client',
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  email text unique,
  phone text not null default '',
  xero_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete set null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  name text not null,
  type text not null default 'Production',
  stage public.project_stage not null default 'pipeline',
  status public.project_status not null default 'active',
  due_date date,
  start_date date,
  contract_value numeric(12, 2),
  deposit_percent numeric(5, 2) not null default 50,
  pinned boolean not null default false,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.document_kind not null,
  title text not null,
  version integer not null default 1 check (version > 0),
  file_path text,
  status public.document_status not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, kind, title, version)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  decision public.approval_decision not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  kind public.budget_kind not null,
  amount numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  default_lead_days integer not null default 0 check (default_lead_days >= 0),
  xero_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  reference text not null default '',
  items_total numeric(12, 2) not null default 0,
  vat numeric(12, 2) not null default 0,
  vat_included boolean not null default false,
  delivery_cost numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  paid_with text not null default '',
  status public.order_status not null default 'draft',
  ordered_at date,
  expected_at date,
  delivered_at timestamptz,
  xero_po_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  area_id uuid references public.areas (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  item text not null,
  spec text not null default '',
  quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  line_total numeric(12, 2) generated always as (quantity * unit_cost) stored,
  actual_cost numeric(12, 2),
  link text not null default '',
  notes text not null default '',
  priority public.material_priority not null default 'normal',
  lead_days integer check (lead_days is null or lead_days >= 0),
  status public.material_status not null default 'to_order',
  ordered_at date,
  expected_at date,
  delivered_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.invoice_type not null,
  xero_invoice_id text,
  amount numeric(12, 2) not null default 0,
  status public.invoice_status not null default 'draft',
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  client_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  deposit_percent numeric(5, 2) not null default 50 check (deposit_percent >= 0 and deposit_percent <= 100),
  business_name text not null default 'Studio',
  business_email text not null default '',
  away_from date,
  away_until date,
  singleton boolean not null default true unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settings_away_range check (away_from is null or away_until is null or away_until >= away_from)
);

create table public.xero_connection (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'projects', 'documents', 'approvals', 'budget_lines',
    'suppliers', 'areas', 'orders', 'materials', 'invoices', 'activity_log',
    'settings', 'xero_connection'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  staff_name text;
  linked_client uuid;
  normalised text;
begin
  normalised := lower(new.email);
  select full_name into staff_name from private.staff where email = normalised;
  if found then
    insert into public.profiles (id, email, full_name, role, client_id)
    values (new.id, normalised, staff_name, 'owner', null);
    return new;
  end if;

  if coalesce(new.raw_user_meta_data->>'client_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    linked_client := (new.raw_user_meta_data->>'client_id')::uuid;
    if exists (select 1 from public.clients where id = linked_client) then
      insert into public.profiles (id, email, full_name, role, client_id)
      values (
        new.id,
        normalised,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(normalised, '@', 1)),
        'client',
        linked_client
      );
      return new;
    end if;
  end if;

  raise exception 'This email is not invited';
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.material_dates()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  supplier_days integer;
begin
  if new.status = 'ordered' and (tg_op = 'INSERT' or old.status is distinct from 'ordered') then
    if new.ordered_at is null then
      new.ordered_at = current_date;
    end if;
    if new.expected_at is null then
      supplier_days = null;
      if new.supplier_id is not null then
        select default_lead_days into supplier_days from public.suppliers where id = new.supplier_id;
      end if;
      new.expected_at = new.ordered_at + coalesce(new.lead_days, supplier_days, 0);
    end if;
  end if;

  if new.status = 'delivered' and (tg_op = 'INSERT' or old.status is distinct from 'delivered') then
    if new.delivered_at is null then
      new.delivered_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger material_dates
  before insert or update on public.materials
  for each row execute function public.material_dates();

create or replace function public.order_dates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'ordered' and (tg_op = 'INSERT' or old.status is distinct from 'ordered') then
    if new.ordered_at is null then
      new.ordered_at = current_date;
    end if;
  end if;

  if new.status = 'delivered' and (tg_op = 'INSERT' or old.status is distinct from 'delivered') then
    if new.delivered_at is null then
      new.delivered_at = now();
    end if;
    update public.materials
    set status = 'delivered',
        delivered_at = coalesce(delivered_at, now())
    where order_id = new.id
      and status <> 'cancelled'
      and status is distinct from 'delivered';
  end if;

  if new.status in ('ordered', 'delivered') and new.ordered_at is not null then
    update public.materials
    set ordered_at = coalesce(materials.ordered_at, new.ordered_at),
        expected_at = coalesce(materials.expected_at, new.expected_at)
    where materials.order_id = new.id
      and materials.status <> 'cancelled';
  end if;

  return new;
end;
$$;

create trigger order_dates
  before insert or update on public.orders
  for each row execute function public.order_dates();

create or replace function public.complete_order_when_items_delivered()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_id is not null and new.status = 'delivered' then
    if not exists (
      select 1
      from public.materials
      where order_id = new.order_id
        and status not in ('delivered', 'cancelled')
    ) then
      update public.orders
      set status = 'delivered',
          delivered_at = coalesce(delivered_at, now())
      where id = new.order_id
        and status is distinct from 'delivered';
    end if;
  end if;
  return new;
end;
$$;

create trigger complete_order_when_items_delivered
  after insert or update on public.materials
  for each row execute function public.complete_order_when_items_delivered();

create or replace function public.mark_late_deliveries()
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.materials
  set status = 'late'
  where status = 'ordered'
    and expected_at is not null
    and expected_at < current_date;

  update public.orders
  set status = 'late'
  where status = 'ordered'
    and expected_at is not null
    and expected_at < current_date;
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'mark-late-deliveries',
    '0 7 * * *',
    'select public.mark_late_deliveries()'
  );
exception
  when others then
    raise notice 'pg_cron is not available here; call mark_late_deliveries() from a schedule instead';
end;
$$;

create or replace function public.stage_is_complete(target_project uuid, target_stage public.project_stage)
returns boolean
language sql
stable
set search_path = public
as $$
  select case target_stage
    when 'pipeline' then exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'proposal' and status = 'approved'
    ) and not exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'proposal' and status <> 'approved'
    )
    when 'brief' then exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'scope_of_work' and status = 'approved'
    ) and not exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'scope_of_work' and status <> 'approved'
    )
    when 'design' then exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'set_design' and status = 'approved'
    ) and not exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'set_design' and status <> 'approved'
    ) and exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'budget' and status = 'approved'
    ) and not exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'budget' and status <> 'approved'
    )
    when 'review' then exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'sign_off' and status = 'approved'
    ) and not exists (
      select 1 from public.documents
      where project_id = target_project and kind = 'sign_off' and status <> 'approved'
    )
    else false
  end;
$$;

create or replace function public.handle_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.documents%rowtype;
  proj public.projects%rowtype;
  next_stage public.project_stage;
begin
  select * into doc from public.documents where id = new.document_id;
  select * into proj from public.projects where id = doc.project_id;

  if new.decision = 'approved' then
    update public.documents set status = 'approved' where id = doc.id;
    insert into public.activity_log (project_id, actor_id, type, message, client_visible)
    values (doc.project_id, new.user_id, 'approval', doc.title || ' approved', true);

    if doc.kind = 'budget' then
      update public.budget_lines
      set amount = coalesce((
        select sum(line_total)
        from public.materials
        where project_id = doc.project_id
          and status <> 'cancelled'
      ), 0)
      where project_id = doc.project_id
        and kind = 'materials';

      update public.projects
      set contract_value = coalesce((
        select sum(amount) from public.budget_lines where project_id = doc.project_id
      ), 0)
      where id = doc.project_id;

      insert into public.activity_log (project_id, actor_id, type, message, client_visible)
      values (doc.project_id, new.user_id, 'budget', 'Budget locked', true);
    end if;

    if public.stage_is_complete(doc.project_id, proj.stage) then
      next_stage = case proj.stage
        when 'pipeline' then 'brief'::public.project_stage
        when 'brief' then 'design'::public.project_stage
        when 'design' then 'build'::public.project_stage
        when 'review' then 'live'::public.project_stage
        else null
      end;
      if next_stage is not null then
        update public.projects set stage = next_stage where id = proj.id and stage = proj.stage;
        insert into public.activity_log (project_id, actor_id, type, message, client_visible)
        values (proj.id, new.user_id, 'stage', 'Moved to ' || initcap(next_stage::text), true);
      end if;
    end if;
  elsif new.decision = 'changes_requested' then
    update public.documents set status = 'changes_requested' where id = doc.id;
    insert into public.activity_log (project_id, actor_id, type, message, metadata, client_visible)
    values (
      doc.project_id,
      new.user_id,
      'changes_requested',
      doc.title || ' needs changes',
      jsonb_build_object('comment', new.comment),
      true
    );
  end if;

  return new;
end;
$$;

create trigger handle_approval
  after insert on public.approvals
  for each row execute function public.handle_approval();

create view public.project_budget as
select
  p.id as project_id,
  coalesce(p.contract_value, sums.agreed_total, 0) as agreed_total,
  sums.design_delivery,
  sums.handyman,
  sums.materials_line,
  sums.contingency,
  sums.other_lines,
  coalesce(mats.materials_planned, 0) as materials_planned,
  coalesce(mats.materials_actual, 0) as materials_actual,
  coalesce(deliveries.delivery_charges, 0) as delivery_charges,
  greatest(
    sums.contingency - greatest(
      coalesce(mats.materials_actual, 0) + coalesce(deliveries.delivery_charges, 0) - sums.materials_line,
      0
    ),
    0
  ) as contingency_remaining,
  case
    when sums.contingency = 0 then 0
    else round(
      least(
        greatest(
          coalesce(mats.materials_actual, 0) + coalesce(deliveries.delivery_charges, 0) - sums.materials_line,
          0
        ),
        sums.contingency
      ) / sums.contingency * 100,
      2
    )
  end as contingency_percent_used
from public.projects p
left join lateral (
  select
    coalesce(sum(amount) filter (where kind = 'design_delivery'), 0) as design_delivery,
    coalesce(sum(amount) filter (where kind = 'handyman'), 0) as handyman,
    coalesce(sum(amount) filter (where kind = 'materials'), 0) as materials_line,
    coalesce(sum(amount) filter (where kind = 'contingency'), 0) as contingency,
    coalesce(sum(amount) filter (where kind = 'other'), 0) as other_lines,
    coalesce(sum(amount), 0) as agreed_total
  from public.budget_lines
  where project_id = p.id
) sums on true
left join lateral (
  select
    coalesce(sum(line_total) filter (where status <> 'cancelled'), 0) as materials_planned,
    coalesce(sum(coalesce(actual_cost, line_total)) filter (where status in ('ordered', 'delivered')), 0) as materials_actual
  from public.materials
  where project_id = p.id
) mats on true
left join lateral (
  select coalesce(sum(delivery_cost), 0) as delivery_charges
  from public.orders
  where project_id = p.id
) deliveries on true;

create view public.delivery_stats as
select
  project_id,
  count(*) filter (
    where status = 'delivered'
      and expected_at is not null
      and delivered_at::date <= expected_at
  ) as delivered_on_time,
  count(*) filter (
    where status = 'delivered'
      and (expected_at is null or delivered_at::date > expected_at)
  ) as delivered_late,
  count(*) filter (where status in ('to_order', 'ordered', 'late')) as still_outstanding
from public.materials
group by project_id;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

create or replace function public.sign_in_kind(target_email text)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when exists (
      select 1 from private.staff where email = lower(trim(target_email))
    ) then 'owner'
    when exists (
      select 1 from public.profiles
      where lower(email) = lower(trim(target_email))
        and role = 'client'
        and client_id is not null
    ) then 'client'
    else null
  end;
$$;

revoke all on function public.sign_in_kind(text) from public;

create or replace function public.list_staff()
returns table (email text, full_name text, job_title text)
language sql
stable
security definer
set search_path = public, private
as $$
  select staff.email, staff.full_name, staff.job_title
  from private.staff as staff
  where public.is_owner()
  order by staff.sort_order, staff.full_name;
$$;

revoke all on function public.list_staff() from public;

create or replace function public.get_client_materials(target_project uuid)
returns table (
  area text,
  item text,
  quantity numeric,
  status public.material_status,
  expected_at date,
  delivered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.name, m.item, m.quantity, m.status, m.expected_at, m.delivered_at
  from public.materials m
  left join public.areas a on a.id = m.area_id
  join public.projects p on p.id = m.project_id
  where m.project_id = target_project
    and p.client_id = public.my_client_id();
$$;

revoke all on function public.get_client_materials(uuid) from public;
grant execute on function public.get_client_materials(uuid) to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.my_client_id() to authenticated;
grant execute on function public.list_staff() to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.sign_in_kind(text) to service_role;
  end if;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'projects', 'documents', 'approvals', 'budget_lines',
    'suppliers', 'areas', 'orders', 'materials', 'invoices', 'activity_log',
    'settings', 'xero_connection'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

create policy profiles_owner on public.profiles for all
  using (public.is_owner()) with check (public.is_owner());
create policy profiles_self on public.profiles for select
  using (id = auth.uid());

create policy clients_owner on public.clients for all
  using (public.is_owner()) with check (public.is_owner());
create policy clients_self on public.clients for select
  using (id = public.my_client_id());

create policy projects_owner on public.projects for all
  using (public.is_owner()) with check (public.is_owner());
create policy projects_client on public.projects for select
  using (client_id = public.my_client_id());

create policy documents_owner on public.documents for all
  using (public.is_owner()) with check (public.is_owner());
create policy documents_client on public.documents for select
  using (
    status <> 'draft'
    and exists (
      select 1 from public.projects
      where projects.id = documents.project_id
        and projects.client_id = public.my_client_id()
    )
  );

create policy approvals_owner on public.approvals for all
  using (public.is_owner()) with check (public.is_owner());
create policy approvals_client_read on public.approvals for select
  using (user_id = auth.uid());
create policy approvals_client_insert on public.approvals for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.documents
      join public.projects on projects.id = documents.project_id
      where documents.id = approvals.document_id
        and projects.client_id = public.my_client_id()
    )
  );

create policy budget_lines_owner on public.budget_lines for all
  using (public.is_owner()) with check (public.is_owner());
create policy budget_lines_client on public.budget_lines for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = budget_lines.project_id
        and projects.client_id = public.my_client_id()
    )
  );

create policy materials_owner on public.materials for all
  using (public.is_owner()) with check (public.is_owner());

create policy invoices_owner on public.invoices for all
  using (public.is_owner()) with check (public.is_owner());
create policy invoices_client on public.invoices for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = invoices.project_id
        and projects.client_id = public.my_client_id()
    )
  );

create policy activity_owner on public.activity_log for all
  using (public.is_owner()) with check (public.is_owner());
create policy activity_client on public.activity_log for select
  using (
    client_visible
    and exists (
      select 1 from public.projects
      where projects.id = activity_log.project_id
        and projects.client_id = public.my_client_id()
    )
  );

create policy areas_owner on public.areas for all
  using (public.is_owner()) with check (public.is_owner());
create policy orders_owner on public.orders for all
  using (public.is_owner()) with check (public.is_owner());
create policy suppliers_owner on public.suppliers for all
  using (public.is_owner()) with check (public.is_owner());
create policy settings_owner on public.settings for all
  using (public.is_owner()) with check (public.is_owner());
create policy xero_owner on public.xero_connection for all
  using (public.is_owner()) with check (public.is_owner());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.project_budget, public.delivery_stats to authenticated;
