import { NextResponse } from "next/server"

import { browserOrigin } from "@/lib/origin"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL("/login", browserOrigin(request)))

  const supabase = await createClient()
  const { data: document } = await supabase
    .from("documents")
    .select("id, file_path, status")
    .eq("id", documentId)
    .maybeSingle()
  if (!document?.file_path || (session.role === "client" && document.status === "draft")) {
    return new NextResponse("Not found", { status: 404 })
  }

  const signed = await supabase.storage.from("documents").createSignedUrl(document.file_path, 120)
  if (signed.error || !signed.data?.signedUrl) return new NextResponse("Preview unavailable", { status: 404 })
  return NextResponse.redirect(signed.data.signedUrl)
}
