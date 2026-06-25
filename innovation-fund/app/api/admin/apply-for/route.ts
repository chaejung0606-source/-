import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { withMissingColumnRetry } from "@/lib/app-mapper";

// 관리자 대리 신청: 특정 신청자(applicantId) 명의로 신청서를 저장한다.
// 신청자가 직접 신청한 것과 동일하게 applicant_id가 그 학생으로 기록되어 신청목록에 등록됨.
export async function POST(req: NextRequest) {
  if (!(await getAdminSession(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { applicantId, row } = await req.json().catch(() => ({}));
  if (!applicantId || !row || typeof row !== "object") {
    return NextResponse.json({ ok: false, error: "신청자와 신청 데이터가 필요합니다." }, { status: 400 });
  }
  const admin = supabaseAdmin();
  // 대상 신청자 존재 확인
  const { data: prof } = await admin.from("student_profiles").select("id").eq("id", applicantId).maybeSingle();
  if (!prof) return NextResponse.json({ ok: false, error: "대상 신청자를 찾을 수 없습니다." }, { status: 404 });

  // 신청자 본인이 한 것과 동일: applicant_id 강제, 임시저장 아님
  const payload: Record<string, any> = { ...row, applicant_id: applicantId, is_draft: false };
  const { data, error } = await withMissingColumnRetry<{ id: string; receipt_number: string }>(
    payload, (r) => admin.from("applications").insert(r).select("id,receipt_number").single(),
  );
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "저장 실패" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, receiptNumber: data.receipt_number });
}
