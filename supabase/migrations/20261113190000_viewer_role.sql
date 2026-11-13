-- A new enum value cannot be used in the same migration that adds it.
alter type public.user_role add value if not exists 'viewer';
