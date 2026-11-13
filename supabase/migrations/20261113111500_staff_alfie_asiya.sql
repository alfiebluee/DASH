insert into private.staff (email, full_name, job_title, sort_order)
values ('alfie@asiya.space', 'Alfie', '', 4)
on conflict (email) do nothing;
