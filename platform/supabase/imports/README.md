# Import a spreadsheet export

The projects Alfie named, and the four studio logins, are already in `supabase/seed.sql`. This folder is for a later CSV export if the private Google Sheet has more rows. Do not invent rows here.

1. In Google Sheets, use File → Download → Comma-separated values.
2. Save that file as `platform/supabase/imports/studio.csv`. The file is gitignored if you keep it local.
3. From `platform/`, preview without writing:

```bash
node scripts/import-csv.mjs supabase/imports/studio.csv
```

4. Apply only after the preview looks right, with `platform/.env.local` filled from `supabase status`:

```bash
node scripts/import-csv.mjs supabase/imports/studio.csv --apply
```

Columns:

```text
client_name,client_company,client_email,client_phone,project_name,project_type,project_stage,project_status,start_date,due_date,description
```

`project_stage` is `pipeline`, `brief`, `design`, `build`, `review`, or `live`. `project_status` is `active`, `ongoing`, `on_hold`, or `archived`. Leave unknown emails and dates empty. A row with a client name and no project name creates or matches the client only.

The header-only template is `studio.csv.example`.
