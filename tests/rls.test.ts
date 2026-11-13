import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { PGlite } from "@electric-sql/pglite"
import { expect, it } from "vitest"

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ringUser = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const sharkUser = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const teddyId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const alexId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const rileyId = "ffffffff-ffff-4fff-8fff-ffffffffffff"
const strangerId = "99999999-9999-4999-8999-999999999999"
const enquiry = "66666666-6666-4666-8666-666666666661"

async function database() {
  const db = new PGlite()
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `)
  await db.exec(readFileSync(resolve("supabase/migrations/20261112000000_foundation.sql"), "utf8"))
  await db.exec(readFileSync(resolve("supabase/migrations/20261113163000_project_stages.sql"), "utf8"))
  await db.exec(readFileSync(resolve("supabase/seed.sql"), "utf8"))
  const ring = await db.query<{ id: string }>("select id from clients where name = 'Ring'")
  const shark = await db.query<{ id: string }>("select id from clients where name = 'Shark Ninja'")
  const ringProject = await db.query<{ id: string }>("select id from projects where name = 'Ring'")
  const ringId = ring.rows[0]?.id
  const sharkId = shark.rows[0]?.id
  const ringProjectId = ringProject.rows[0]?.id
  if (!ringId || !sharkId || !ringProjectId) throw new Error("seed clients were not created")
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ownerId}', 'alfiebluee@gmail.com', '{"full_name":"Ignored"}'),
      ('${ringUser}', 'ring.portal@studio.test', '{"full_name":"Ring","client_id":"${ringId}"}'),
      ('${sharkUser}', 'shark.portal@studio.test', '{"full_name":"Shark","client_id":"${sharkId}"}');
    insert into materials (project_id, item, quantity, unit_cost, status, ordered_at, expected_at)
    values ('${ringProjectId}', 'Paint', 1, 10, 'ordered', current_date - 3, current_date - 1);
  `)
  return { db, ringId, sharkId, ringProjectId }
}

async function asUser(db: PGlite, id: string) {
  await db.exec("reset role")
  await db.exec(`select set_config('request.jwt.claim.sub', '${id}', false)`)
  await db.exec("set role authenticated")
}

it("stops one client reading another client's projects, and hides item prices", async () => {
  const { db, ringProjectId } = await database()
  const sharkBeauty = await db.query<{ id: string }>("select id from projects where name = 'Shark Beauty'")
  await asUser(db, ringUser)

  const own = await db.query<{ name: string }>("select name from projects order by name")
  expect(own.rows.map((row) => row.name)).toEqual(["Ring"])

  const hiddenProject = await db.query(`select name from projects where id = '${sharkBeauty.rows[0]?.id}'`)
  expect(hiddenProject.rows).toEqual([])

  const prices = await db.query("select * from materials")
  expect(prices.rows).toEqual([])

  const shared = await db.query<{ item: string }>(`select * from get_client_materials('${ringProjectId}')`)
  expect(shared.rows).toEqual([expect.objectContaining({ item: "Paint", status: "ordered" })])
  expect(shared.rows[0]).not.toHaveProperty("unit_cost")

  const hiddenMaterials = await db.query(`select * from get_client_materials('${sharkBeauty.rows[0]?.id}')`)
  expect(hiddenMaterials.rows).toEqual([])

  await asUser(db, sharkUser)
  const sharkProjects = await db.query<{ name: string }>("select name from projects order by name")
  expect(sharkProjects.rows.map((row) => row.name)).toEqual(["Shark Beauty", "Shark Home", "Shark Ninja"])

  await asUser(db, ownerId)
  const everything = await db.query<{ name: string }>("select name from projects order by name")
  expect(everything.rows.map((row) => row.name)).toEqual(["Ring", "Shark Beauty", "Shark Home", "Shark Ninja"])

  const directory = await db.query<{ email: string }>("select email from list_staff() order by email")
  expect(directory.rows.map((row) => row.email)).toEqual([
    "alexbutler@go-places.io",
    "alfie@asiya.space",
    "alfiebluee@gmail.com",
    "riley@go-places.io",
    "teddy@go-places.io",
  ])

  await asUser(db, ringUser)
  const privateDirectory = await db.query("select email from list_staff()")
  expect(privateDirectory.rows).toEqual([])
}, 30_000)

it("makes the named staff owners, with no client attached", async () => {
  const { db } = await database()
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${teddyId}', 'teddy@go-places.io', '{}'),
      ('${alexId}', 'alexbutler@go-places.io', '{}'),
      ('${rileyId}', 'Riley@go-places.io', '{}');
  `)
  const owners = await db.query<{ email: string; full_name: string; role: string; client_id: string | null }>(
    "select email, full_name, role, client_id from profiles where role = 'owner' order by email",
  )
  expect(owners.rows).toEqual([
    { email: "alexbutler@go-places.io", full_name: "Alex", role: "owner", client_id: null },
    { email: "alfiebluee@gmail.com", full_name: "Test user", role: "owner", client_id: null },
    { email: "riley@go-places.io", full_name: "Riley", role: "owner", client_id: null },
    { email: "teddy@go-places.io", full_name: "Teddy", role: "owner", client_id: null },
  ])

  await expect(
    db.exec(`insert into auth.users (id, email) values ('${strangerId}', 'stranger@example.com')`),
  ).rejects.toThrow(/not invited/i)

  const teddy = await db.query<{ sign_in_kind: string | null }>("select sign_in_kind('Teddy@go-places.io')")
  expect(teddy.rows[0]?.sign_in_kind).toBe("owner")
  const stranger = await db.query<{ sign_in_kind: string | null }>("select sign_in_kind('stranger@example.com')")
  expect(stranger.rows[0]?.sign_in_kind).toBeNull()
}, 30_000)

it("moves a project on when the stage document is approved, and marks late orders", async () => {
  const { db, ringId } = await database()
  await db.exec(`
    insert into projects (id, client_id, name, stage)
    values ('${enquiry}', '${ringId}', 'New enquiry', 'pipeline');
    insert into documents (id, project_id, kind, title, status)
    values ('77777777-7777-4777-8777-777777777777', '${enquiry}', 'proposal', 'Proposal', 'sent');
    insert into approvals (document_id, user_id, decision)
    values ('77777777-7777-4777-8777-777777777777', '${ownerId}', 'approved');
  `)

  const stage = await db.query<{ stage: string }>(`select stage from projects where id = '${enquiry}'`)
  expect(stage.rows[0]?.stage).toBe("pipeline")
  const ringStage = await db.query<{ stage: string }>("select stage from projects where name = 'Ring'")
  expect(ringStage.rows[0]?.stage).toBe("set_build")
  const history = await db.query<{ stage: string }>(`select stage from project_stage_history where project_id = '${enquiry}' and exited_at is null`)
  expect(history.rows[0]?.stage).toBe("pipeline")
  const proposalGate = await db.query<{ gate_for_stage: string }>(
    `select gate_for_stage from project_approvals where project_id = '${enquiry}' and kind = 'proposal_sent'`,
  )
  expect(proposalGate.rows[0]?.gate_for_stage).toBe("proposal")

  await db.exec("select mark_late_deliveries()")
  const material = await db.query<{ status: string }>("select status from materials where item = 'Paint'")
  expect(material.rows[0]?.status).toBe("late")
}, 30_000)
