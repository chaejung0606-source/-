import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";

// 관리자: 신청자(학생) 목록 조회 — 로그인 지원용(학번 확인)
export async function GET(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/applicants"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // 지정학생(designated_programs)은 컬럼이 없을 수 있어 app_config에도 저장됨 — 학번 기준으로 덮어쓴다
  const { data: cfg } = await admin.from("app_config").select("value").eq("key", "designated_programs").maybeSingle();
  const map = (cfg?.value && typeof cfg.value === "object") ? (cfg.value as Record<string, string[]>) : {};
  const rows = (data || []).map((r) => {
    const sid = (r as { student_id?: string }).student_id || "";
    return { ...(r as object), designated_programs: Array.isArray(map[sid]) ? map[sid] : ((r as { designated_programs?: string[] }).designated_programs ?? []) };
  });
  return NextResponse.json(rows);
}
