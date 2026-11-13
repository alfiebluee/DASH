-- Phase 2: archive a client without deleting them, and keep uploaded files private.

alter table public.clients
  add column archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema is not available; the documents bucket will be created when Supabase storage is installed';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'documents',
    'documents',
    false,
    20971520,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
  )
  on conflict (id) do nothing;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_owner_select'
  ) then
    create policy documents_owner_select on storage.objects
      for select to authenticated
      using (bucket_id = 'documents' and public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_owner_insert'
  ) then
    create policy documents_owner_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documents' and public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_owner_update'
  ) then
    create policy documents_owner_update on storage.objects
      for update to authenticated
      using (bucket_id = 'documents' and public.is_owner())
      with check (bucket_id = 'documents' and public.is_owner());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_owner_delete'
  ) then
    create policy documents_owner_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'documents' and public.is_owner());
  end if;
end;
$$;
