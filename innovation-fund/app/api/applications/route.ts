import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow } from "@/lib/app-mapper";
import { requireAdmin, appRowProgramName } from "@/lib/admin-auth";

// 관리자 전용: 전체 신청 목록 (service_role로 RLS 우회, 서명 세션으로 관리자 검증)
// 프로그램 관리자는 담당 프로그램의 신청만 조회 가능.
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("applications")
    .select("*")
    .eq("is_draft", false)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let rows = data || [];
  if (session.role === "program") {
    const { data: progs } = await admin.from("programs").select("id,name");
    const nameToId = Object.fromEntries((progs || []).map((p) => [p.name, p.id]));
    rows = rows.filter((r) => session.programIds.includes(nameToId[appRowProgramName(r)]));
  }
  return NextResponse.json(rows.map(fromRow));
}
