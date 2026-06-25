import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

// 관리자: 유형 세부내용 저장 (type별 upsert)
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { content } = await req.json().catch(() => ({}));
  if (!content || typeof content !== "object") return NextResponse.json({ error: "content required" }, { status: 400 });

  const rows = Object.entries(content).map(([type, c]) => ({ type, content: c }));
  const { error } = await supabaseAdmin().from("site_content").upsert(rows, { onConflict: "type" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
