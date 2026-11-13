-- Seven studio stages. The existing projects.stage column is reused.
-- Old values map as: pipeline → pipeline, brief → brief, design → set_design,
-- build → set_build, review → build_complete, live → build_complete.
-- proposal and procurement are new, so no old row lands there.
-- gate_for_stage is the stage an approval belongs to. The project can move
-- past that stage only after the approval is approved:
--   proposal_sent → proposal
--   design_approval, client_approval, live_operation_approval,
--   contract_signed_invoice_sent → set_design

create or replace function public.handle_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.documents%rowtype;
begin
  select * into doc from public.documents where id = new.document_id;

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

drop function if exists public.stage_is_complete(uuid, public.project_stage);

alter table public.projects alter column stage drop default;

alter table public.projects
  alter column stage type text
  using (
    case stage::text
      when 'design' then 'set_design'
      when 'build' then 'set_build'
      when 'review' then 'build_complete'
      when 'live' then 'build_complete'
      else stage::text
    end
  );

alter table public.projects alter column stage set default 'pipeline';

alter table public.projects drop constraint if exists projects_stage_check;

alter table public.projects
  add constraint projects_stage_check
  check (stage in ('pipeline', 'brief', 'proposal', 'set_design', 'procurement', 'set_build', 'build_complete'));

drop type public.project_stage;

create table public.project_stage_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage text not null,
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_stage_history_stage_check
    check (stage in ('pipeline', 'brief', 'proposal', 'set_design', 'procurement', 'set_build', 'build_complete')),
  constraint project_stage_history_span_check
    check (exited_at is null or exited_at >= entered_at)
);

create index project_stage_history_project_id_idx on public.project_stage_history (project_id, entered_at);

create table public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null,
  status text not null default 'pending',
  gate_for_stage text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, kind),
  constraint project_approvals_kind_check
    check (kind in ('proposal_sent', 'design_approval', 'client_approval', 'live_operation_approval', 'contract_signed_invoice_sent')),
  constraint project_approvals_status_check
    check (status in ('pending', 'approved')),
  constraint project_approvals_gate_check
    check (gate_for_stage in ('pipeline', 'brief', 'proposal', 'set_design', 'procurement', 'set_build', 'build_complete'))
);

create index project_approvals_project_id_idx on public.project_approvals (project_id);

create trigger set_updated_at before update on public.project_stage_history
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.project_approvals
  for each row execute function public.set_updated_at();

create or replace function public.record_project_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_stage_history (project_id, stage, entered_at)
    values (new.id, new.stage, coalesce(new.created_at, now()));

    insert into public.project_approvals (project_id, kind, gate_for_stage) values
      (new.id, 'proposal_sent', 'proposal'),
      (new.id, 'design_approval', 'set_design'),
      (new.id, 'client_approval', 'set_design'),
      (new.id, 'live_operation_approval', 'set_design'),
      (new.id, 'contract_signed_invoice_sent', 'set_design');
    return new;
  end if;

  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    update public.project_stage_history
    set exited_at = now()
    where project_id = new.id and exited_at is null;

    insert into public.project_stage_history (project_id, stage, entered_at)
    values (new.id, new.stage, now());
  end if;

  return new;
end;
$$;

create trigger record_project_stage
  after insert or update of stage on public.projects
  for each row execute function public.record_project_stage();

insert into public.project_stage_history (project_id, stage, entered_at)
select id, stage, created_at
from public.projects
where not exists (
  select 1 from public.project_stage_history
  where project_stage_history.project_id = projects.id
);

insert into public.project_approvals (project_id, kind, gate_for_stage)
select projects.id, gates.kind, gates.gate_for_stage
from public.projects
cross join (
  values
    ('proposal_sent', 'proposal'),
    ('design_approval', 'set_design'),
    ('client_approval', 'set_design'),
    ('live_operation_approval', 'set_design'),
    ('contract_signed_invoice_sent', 'set_design')
) as gates(kind, gate_for_stage)
where not exists (
  select 1 from public.project_approvals
  where project_approvals.project_id = projects.id
    and project_approvals.kind = gates.kind
);

alter table public.project_stage_history enable row level security;
alter table public.project_stage_history force row level security;
alter table public.project_approvals enable row level security;
alter table public.project_approvals force row level security;

create policy project_stage_history_owner on public.project_stage_history for all
  using (public.is_owner()) with check (public.is_owner());

create policy project_stage_history_client on public.project_stage_history for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_stage_history.project_id
        and projects.client_id = public.my_client_id()
    )
  );

create policy project_approvals_owner on public.project_approvals for all
  using (public.is_owner()) with check (public.is_owner());

create policy project_approvals_client on public.project_approvals for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_approvals.project_id
        and projects.client_id = public.my_client_id()
    )
  );

grant select, insert, update, delete on public.project_stage_history to authenticated;
grant select, insert, update, delete on public.project_approvals to authenticated;
