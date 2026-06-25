import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

// 관리자: 신청자(학생) 목록 조회 — 로그인 지원용(학번 확인)
export async function GET(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  // designated_programs 등 포함 조회, 컬럼이 없으면(마이그레이션 전) 제외하고 재시도
  const withSkip = await admin
    .from("student_profiles")
    .select("id, student_id, name, department, phone, email, university, designated_programs, academic_status, previous_student_ids")
    .order("student_id", { ascending: true });
  let data: unknown[] | null = withSkip.data;
  let error = withSkip.error;
  if (error) {
    const fallback = await admin
      .from("student_profiles")
      .select("id, student_id, name, department, phone, email, university")
      .order("student_id", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
