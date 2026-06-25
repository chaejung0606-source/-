import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 특정 학생이 '지정학생만' 프로그램에 신청 가능하도록 지정되었는지 확인
// body: { studentId, programId } → { allowed: boolean }
export async function POST(req: NextRequest) {
  const { studentId, programId } = await req.json().catch(() => ({}));
  const sid = String(studentId || "").trim();
  const pid = String(programId || "").trim();
  if (!sid || !pid) return NextResponse.json({ allowed: false });
  const { data } = await supabaseAdmin()
    .from("student_profiles")
    .select("designated_programs")
    .eq("student_id", sid)
    .maybeSingle();
  const list: string[] = Array.isArray(data?.designated_programs) ? data!.designated_programs : [];
  return NextResponse.json({ allowed: list.includes(pid) });
}
