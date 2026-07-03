import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";

// 관리자: 특정 학생이 '지정학생만' 단계에 신청 가능하도록 지정한 항목 목록 설정
// body: { id, studentId, programIds: string[] }  (programIds 각 항목은 "프로그램id::단계" 키)
// 배포 DB에 student_profiles.designated_programs 컬럼이 없어도 동작하도록 app_config에 저장한다.
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/applicants"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body.id as string | undefined;
  const studentId = String(body.studentId || "").trim();
  if (!studentId) return NextResponse.json({ ok: false, error: "studentId required" }, { status: 400 });
  const programIds: string[] = Array.isArray(body.programIds) ? body.programIds.filter((x: unknown) => typeof x === "string") : [];

  const admin = supabaseAdmin();
  // 1) app_config('designated_programs') 맵에 학번 기준으로 저장 (컬럼 유무와 무관하게 영구 보존)
  const { data } = await admin.from("app_config").select("value").eq("key", "designated_programs").maybeSingle();
  const map: Record<string, string[]> = (data?.value && typeof data.value === "object") ? { ...(data.value as Record<string, string[]>) } : {};
  if (programIds.length) map[studentId] = programIds; else delete map[studentId];
  const up = await admin.from("app_config").upsert({ key: "designated_programs", value: map }, { onConflict: "key" });
  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  // 2) 컬럼이 있는 환경이면 함께 저장 (없으면 조용히 무시)
  if (id) { await admin.from("student_profiles").update({ designated_programs: programIds }).eq("id", id); }

  return NextResponse.json({ ok: true });
}
