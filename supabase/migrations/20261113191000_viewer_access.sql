-- Alfie (both emails) can change the studio.
-- Alex, Teddy and Riley can look at it and cannot change it.

alter table private.staff
  add column access text not null default 'viewer'
  check (access in ('owner', 'viewer'));

update private.staff
set access = 'owner', full_name = 'Alfie'
where email in ('alfiebluee@gmail.com', 'alfie@asiya.space');

update private.staff
set access = 'viewer'
where email in ('teddy@go-places.io', 'alexbutler@go-places.io', 'riley@go-places.io');

update public.profiles as profiles
set
  role = staff.access::public.user_role,
  full_name = staff.full_name
from private.staff as staff
where lower(profiles.email) = staff.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  staff_name text;
  staff_access text;
  linked_client uuid;
  normalised text;
begin
  normalised := lower(new.email);
  select full_name, access into staff_name, staff_access
  from private.staff
  where email = normalised;
  if found then
    insert into public.profiles (id, email, full_name, role, client_id)
    values (new.id, normalised, staff_name, staff_access::public.user_role, null);
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

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'viewer')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create or replace function public.sign_in_kind(target_email text)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when exists (
      select 1 from private.staff
      where email = lower(trim(target_email)) and access = 'owner'
    ) then 'owner'
    when exists (
      select 1 from private.staff
      where email = lower(trim(target_email)) and access = 'viewer'
    ) then 'viewer'
    when exists (
      select 1 from public.profiles
      where lower(email) = lower(trim(target_email))
        and role = 'client'
        and client_id is not null
    ) then 'client'
    else null
  end;
$$;

drop function if exists public.list_staff();

create function public.list_staff()
returns table (email text, full_name text, job_title text, access text)
language sql
stable
security definer
set search_path = public, private
as $$
  select staff.email, staff.full_name, staff.job_title, staff.access
  from private.staff as staff
  where public.is_staff()
  order by staff.sort_order, staff.full_name;
$$;

revoke all on function public.list_staff() from public;
grant execute on function public.list_staff() to authenticated;

create policy clients_staff_read on public.clients for select
  using (public.is_staff());

create policy projects_staff_read on public.projects for select
  using (public.is_staff());

create policy documents_staff_read on public.documents for select
  using (public.is_staff());

create policy approvals_staff_read on public.approvals for select
  using (public.is_staff());

create policy budget_lines_staff_read on public.budget_lines for select
  using (public.is_staff());

create policy materials_staff_read on public.materials for select
  using (public.is_staff());

create policy invoices_staff_read on public.invoices for select
  using (public.is_staff());

create policy activity_staff_read on public.activity_log for select
  using (public.is_staff());

create policy areas_staff_read on public.areas for select
  using (public.is_staff());

create policy orders_staff_read on public.orders for select
  using (public.is_staff());

create policy suppliers_staff_read on public.suppliers for select
  using (public.is_staff());

create policy settings_staff_read on public.settings for select
  using (public.is_staff());

create policy project_stage_history_staff_read on public.project_stage_history for select
  using (public.is_staff());

create policy project_approvals_staff_read on public.project_approvals for select
  using (public.is_staff());

do $$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_staff_select'
  ) then
    create policy documents_staff_select on storage.objects
      for select
      using (bucket_id = 'documents' and public.is_staff());
  end if;
end;
$$;
