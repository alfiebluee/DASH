export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

export function failed(message: string): ActionResult {
  return { ok: false, message }
}

export function succeeded(message: string): ActionResult {
  return { ok: true, message }
}
