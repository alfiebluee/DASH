-- Marking an order delivered used to update its items from a BEFORE trigger.
-- Those items then marked the order delivered again, and the two triggers
-- recursed until Postgres hit the stack limit. Stamp dates on the order
-- first, then update items afterwards, and do not let that item update
-- mark the same order again.

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
  end if;

  return new;
end;
$$;

create or replace function public.apply_order_to_materials()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  skip_id text;
begin
  skip_id := nullif(current_setting('app.delivering_material', true), '');

  update public.materials
  set status = case
        when new.status = 'delivered' and status is distinct from 'delivered' then 'delivered'::public.material_status
        else status
      end,
      delivered_at = case
        when new.status = 'delivered' and status is distinct from 'delivered' then coalesce(delivered_at, now())
        else delivered_at
      end,
      ordered_at = coalesce(ordered_at, new.ordered_at),
      expected_at = coalesce(expected_at, new.expected_at)
  where order_id = new.id
    and status <> 'cancelled'
    and (skip_id is null or id::text <> skip_id)
    and (
      (new.status = 'delivered' and status is distinct from 'delivered')
      or (ordered_at is null and new.ordered_at is not null)
      or (expected_at is null and new.expected_at is not null)
    );

  return null;
end;
$$;

drop trigger if exists apply_order_to_materials on public.orders;

create trigger apply_order_to_materials
  after insert or update on public.orders
  for each row execute function public.apply_order_to_materials();

create or replace function public.complete_order_when_items_delivered()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.order_id is not null and new.status = 'delivered' then
    if not exists (
      select 1
      from public.materials
      where order_id = new.order_id
        and status not in ('delivered', 'cancelled')
        and id <> new.id
    ) then
      perform set_config('app.delivering_material', new.id::text, true);
      update public.orders
      set status = 'delivered',
          delivered_at = coalesce(delivered_at, now())
      where id = new.order_id
        and status is distinct from 'delivered';
      perform set_config('app.delivering_material', '', true);
    end if;
  end if;

  return new;
end;
$$;
