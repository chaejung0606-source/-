import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// 관리자: 특정 학생의 '지원신청 면제' 프로그램 목록 설정
// body: { id, programIds: string[] }  (빈 배열이면 면제 해제)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const programIds: string[] = Array.isArray(body.programIds) ? body.programIds.filter((x: unknown) => typeof x === "string") : [];
  const skip = programIds.length > 0;

  const admin = supabaseAdmin();
  // 신규: 프로그램별 면제 + 호환용 boolean 동시 저장. 컬럼이 없으면 boolean만 저장.
  let { error } = await admin.from("student_profiles").update({ skip_pre: skip, skip_pre_programs: programIds }).eq("id", id);
  if (error && /skip_pre_programs/i.test(error.message)) {
    ({ error } = await admin.from("student_profiles").update({ skip_pre: skip }).eq("id", id));
  }
  if (error) {
    const msg = /column .*skip_pre/i.test(error.message)
      ? "skip_pre 관련 컬럼이 없습니다. Supabase 마이그레이션(ALTER TABLE student_profiles ...)을 먼저 실행해주세요."
      : error.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
