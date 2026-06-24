import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { programToRow, type Program } from "@/lib/programs";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// 관리자: 프로그램 전체 교체
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { programs } = await req.json().catch(() => ({}));
  if (!Array.isArray(programs)) return NextResponse.json({ error: "programs array required" }, { status: 400 });

  const admin = supabaseAdmin();
  const del = await admin.from("programs").delete().neq("id", "___never___");
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  if (programs.length) {
    const rows = (programs as Program[]).map(programToRow);
    let ins = await admin.from("programs").insert(rows);
    // enabled/enabled_pre/enabled_fund 컬럼이 없으면(마이그레이션 전) 해당 필드 제외하고 재시도
    if (ins.error) ins = await admin.from("programs").insert(rows.map(({ enabled_pre, enabled_fund, ...r }) => r));
    if (ins.error) ins = await admin.from("programs").insert(rows.map(({ enabled, enabled_pre, enabled_fund, ...r }) => r));
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
