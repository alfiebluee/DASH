import { expect, it } from "vitest"

import { blockingApprovals, daysInStageLabel, gateWarning, readyToAdvance, type GateApproval } from "../lib/stages"

const gates: GateApproval[] = [
  { kind: "proposal_sent", status: "pending", gate_for_stage: "proposal" },
  { kind: "design_approval", status: "pending", gate_for_stage: "set_design" },
  { kind: "client_approval", status: "pending", gate_for_stage: "set_design" },
  { kind: "live_operation_approval", status: "approved", gate_for_stage: "set_design" },
  { kind: "contract_signed_invoice_sent", status: "pending", gate_for_stage: "set_design" },
]

it("lets a project move backwards without a gate", () => {
  expect(blockingApprovals("set_design", "brief", gates)).toEqual([])
})

it("blocks leaving a stage while its approvals are pending", () => {
  expect(blockingApprovals("proposal", "set_design", gates).map((item) => item.kind)).toEqual(["proposal_sent"])
  expect(blockingApprovals("set_design", "procurement", gates).map((item) => item.kind)).toEqual([
    "design_approval",
    "client_approval",
    "contract_signed_invoice_sent",
  ])
  expect(gateWarning(blockingApprovals("set_design", "procurement", gates).slice(0, 1), "procurement")).toBe(
    "Design approval is still pending. Move to Procurement anyway?",
  )
})

it("suggests the next stage only when every gate for the current stage is approved", () => {
  expect(readyToAdvance("set_design", gates)).toBeNull()
  const cleared = gates.map((item) => (item.gate_for_stage === "set_design" ? { ...item, status: "approved" as const } : item))
  expect(readyToAdvance("set_design", cleared)).toBe("procurement")
  expect(readyToAdvance("brief", cleared)).toBeNull()
})

it("counts whole days in the current stage", () => {
  expect(daysInStageLabel("2026-11-10T12:00:00.000Z", new Date("2026-11-13T12:00:00.000Z"))).toBe("3 days")
  expect(daysInStageLabel("2026-11-13T01:00:00.000Z", new Date("2026-11-13T18:00:00.000Z"))).toBe("Today")
})
