import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 특정 학생이 '지정학생만' 프로그램의 해당 단계(pre/fund)에 신청 가능하도록 지정되었는지 확인
// body: { studentId, programId, phase } → { allowed: boolean }
export async function POST(req: NextRequest) {
  const { studentId, programId, phase } = await req.json().catch(() => ({}));
  const sid = String(studentId || "").trim();
  const pid = String(programId || "").trim();
  const ph = phase === "pre" ? "pre" : "fund";
  if (!sid || !pid) return NextResponse.json({ allowed: false });
  const admin = supabaseAdmin();

  // app_config 우선(컬럼 없는 환경 대비), 없으면 컬럼 값으로 폴백
  let list: string[] = [];
  const { data: cfg } = await admin.from("app_config").select("value").eq("key", "designated_programs").maybeSingle();
  const map = (cfg?.value && typeof cfg.value === "object") ? (cfg.value as Record<string, string[]>) : {};
  if (Array.isArray(map[sid])) list = map[sid];
  if (!list.length) {
    const { data } = await admin.from("student_profiles").select("designated_programs").eq("student_id", sid).maybeSingle();
    if (Array.isArray(data?.designated_programs)) list = data!.designated_programs;
  }
  // 단계별 키("id::단계") 우선, 레거시(프로그램 id만 저장) 값도 허용
  const allowed = list.includes(`${pid}::${ph}`) || list.includes(pid);
  return NextResponse.json({ allowed });
}
