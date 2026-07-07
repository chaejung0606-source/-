import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { withMissingColumnRetry } from "@/lib/app-mapper";

// 임시저장(작성 중) 신청의 생성/갱신/최종제출.
// RLS상 신청자는 UPDATE가 불가하므로 JWT 인증 후 service_role로 처리한다.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const { id, row, finalize } = await req.json().catch(() => ({}));
  if (!row || typeof row !== "object") return NextResponse.json({ ok: false, error: "데이터가 필요합니다." }, { status: 400 });

  const admin = supabaseAdmin();
  // 보안: 본인 소유로 강제, 임시저장 여부는 서버가 결정
  const payload: Record<string, any> = { ...row, applicant_id: user.id, is_draft: !finalize };
  // 보완요청 후 재제출: 검토 상태를 '신청완료'로 되돌리고, 프로그램 관리자 재검토 단계로 복귀
  if (finalize) { payload.review_status = "received"; payload.review_stage = null; }

  if (id) {
    const { data: existing } = await admin.from("applications").select("applicant_id,is_draft").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ ok: false, error: "내역을 찾을 수 없습니다." }, { status: 404 });
    if (existing.applicant_id !== user.id) return NextResponse.json({ ok: false, error: "본인 신청만 수정할 수 있습니다." }, { status: 403 });
    // 이미 제출된 신청(보완요청 수정 등)의 중간 저장은 임시저장으로 강등하지 않는다(신청 내역에서 사라짐 방지)
    if (!finalize && existing.is_draft === false) payload.is_draft = false;
    // 배포 DB에 없는 컬럼(is_test/review_stage/form_answers 등)은 자동 제외 후 재시도
    const { data, error } = await withMissingColumnRetry<{ id: string; receipt_number: string }>(
      payload, (r) => admin.from("applications").update(r).eq("id", id).select("id,receipt_number").single(),
    );
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "저장 실패" }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, receiptNumber: data.receipt_number });
  }

  const { data, error } = await withMissingColumnRetry<{ id: string; receipt_number: string }>(
    payload, (r) => admin.from("applications").insert(r).select("id,receipt_number").single(),
  );
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "저장 실패" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, receiptNumber: data.receipt_number });
}
