import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// 관리자: 특정 학생에게 '지원신청 없이 지원금 신청 허용' 설정/해제
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id, allow } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin()
    .from("student_profiles")
    .update({ skip_pre: !!allow })
    .eq("id", id);
  if (error) {
    const msg = /column .*skip_pre/i.test(error.message)
      ? "skip_pre 컬럼이 없습니다. Supabase에 마이그레이션(ALTER TABLE student_profiles ADD COLUMN skip_pre ...)을 먼저 실행해주세요."
      : error.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
