import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

// 관리자: 특정 학생이 '지정학생만' 프로그램에서 신청 가능하도록 지정한 프로그램 목록 설정
// body: { id, programIds: string[] }  (빈 배열이면 지정 해제)
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const programIds: string[] = Array.isArray(body.programIds) ? body.programIds.filter((x: unknown) => typeof x === "string") : [];

  const admin = supabaseAdmin();
  const { error } = await admin.from("student_profiles").update({ designated_programs: programIds }).eq("id", id);
  if (error) {
    const msg = /designated_programs/i.test(error.message)
      ? "designated_programs 컬럼이 없습니다. Supabase 마이그레이션(ALTER TABLE student_profiles ADD COLUMN ...)을 먼저 실행해주세요."
      : error.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
