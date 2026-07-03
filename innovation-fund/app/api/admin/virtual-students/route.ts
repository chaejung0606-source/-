import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";

// 관리자: 가상학과 학생 명단 조회
export async function GET(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/virtual-students"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("virtual_students").select("*").order("student_id", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// 관리자: 가상학과 학생 명단 변경 (action: replace | upsert | delete)
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/virtual-students"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const admin = supabaseAdmin();

  const sanitize = (s: any) => ({
    student_id: String(s.student_id || "").trim(),
    name: s.name || null,
    vdept: s.vdept || null,
    department: s.department || null,
    grade: s.grade != null ? String(s.grade) : null,
    gpa: s.gpa != null && s.gpa !== "" ? Number(s.gpa) : null,
    credits: s.credits != null && s.credits !== "" ? parseInt(String(s.credits), 10) || null : null,
    phone: s.phone || null,
    email: s.email || null,
    raw: s.raw || null,
  });

  if (action === "delete") {
    const ids: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];
    if (!ids.length) return NextResponse.json({ ok: false, error: "삭제할 학번이 없습니다." }, { status: 400 });
    const { error } = await admin.from("virtual_students").delete().in("student_id", ids);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const rows = (Array.isArray(body.students) ? body.students : []).map(sanitize).filter((r: any) => r.student_id);
  if (action === "replace") {
    const del = await admin.from("virtual_students").delete().neq("student_id", "___never___");
    if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });
  }
  if (rows.length) {
    const { error } = await admin.from("virtual_students").upsert(rows, { onConflict: "student_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: rows.length });
}
