import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { programToRow, type Program } from "@/lib/programs";
import { requireExpense } from "@/lib/admin-auth";

// 관리자(지출관리자): 프로그램 전체 교체
// 안전성: 기존처럼 '전체 삭제 후 삽입'하면 삽입 실패 시 전 프로그램이 유실되므로
// 업서트(있으면 갱신/없으면 추가) 후, 들어온 목록에 없는 프로그램만 삭제한다.
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { programs } = await req.json().catch(() => ({}));
  if (!Array.isArray(programs)) return NextResponse.json({ error: "programs array required" }, { status: 400 });

  const admin = supabaseAdmin();
  const rows = (programs as Program[]).map(programToRow);

  if (rows.length) {
    // 배포 DB에 없는 컬럼(enabled/roles/report_fields/pre_apply 등)은 자동 감지·제외 후 재시도
    let attempt: Record<string, unknown>[] = rows as unknown as Record<string, unknown>[];
    let up = await admin.from("programs").upsert(attempt, { onConflict: "id" });
    for (let i = 0; i < 12 && up.error; i++) {
      const m = up.error.message.match(/Could not find the '([^']+)' column/i);
      if (!m) break;
      const col = m[1];
      attempt = attempt.map(({ [col]: _drop, ...r }) => r);
      up = await admin.from("programs").upsert(attempt, { onConflict: "id" });
    }
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  // 업서트 성공 후에만 삭제 — 목록에 없는 기존 프로그램 제거
  const keep = new Set(rows.map((r) => r.id).filter(Boolean));
  const { data: existing, error: selErr } = await admin.from("programs").select("id");
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  const toDelete = (existing || []).map((e) => e.id).filter((id) => !keep.has(id));
  if (toDelete.length) {
    const del = await admin.from("programs").delete().in("id", toDelete);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
