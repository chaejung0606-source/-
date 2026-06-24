import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 특정 학번이 가상학과 재학생 명단에 있는지 확인 (신청 자격 판정용)
export async function POST(req: NextRequest) {
  const { studentId } = await req.json().catch(() => ({}));
  const sid = String(studentId || "").trim();
  if (!sid) return NextResponse.json({ isVirtual: false });
  const { data } = await supabaseAdmin()
    .from("virtual_students").select("student_id").eq("student_id", sid).maybeSingle();
  return NextResponse.json({ isVirtual: !!data });
}
