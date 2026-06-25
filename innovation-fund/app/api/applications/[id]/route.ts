import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow, withMissingColumnRetry } from "@/lib/app-mapper";
import { requireAdmin, requireExpense, canManageApplication } from "@/lib/admin-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("applications").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // 프로그램 관리자는 담당 프로그램의 신청만 열람 가능
  if (!(await canManageApplication(session, data))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const app = fromRow(data);
  // Storage에 저장된 첨부는 만료형 서명 URL 발급 (관리자 열람용)
  app.files = await Promise.all((app.files || []).map(async (f) => {
    if (f.path) {
      const { data: signed } = await admin.storage.from("documents").createSignedUrl(f.path, 3600);
      return { ...f, url: signed?.signedUrl };
    }
    return f; // 구버전(base64 url) 호환
  }));
  return NextResponse.json(app);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const adminDb = supabaseAdmin();
  // 소유 검증: 대상 신청을 먼저 조회해 담당 프로그램 여부 확인
  const { data: existing, error: selErr } = await adminDb.from("applications").select("*").eq("id", id).maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canManageApplication(session, existing))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const patch: Record<string, any> = {};
  if (body.reviewStatus !== undefined) patch.review_status = body.reviewStatus;
  if (body.paymentStatus !== undefined) patch.payment_status = body.paymentStatus;
  if (body.adminMemo !== undefined) patch.admin_memo = body.adminMemo;
  if (body.approvedAmount !== undefined) patch.approved_amount = body.approvedAmount;
  if (body.verifiedAccount !== undefined) patch.verified_account = body.verifiedAccount;
  const stagePatch: Record<string, any> = {};
  if (body.reviewStage !== undefined) stagePatch.review_stage = body.reviewStage;
  if (body.handoffNote !== undefined) stagePatch.handoff_note = body.handoffNote;

  // 배포 DB에 없는 컬럼(review_stage/handoff_note/verified_account 등)은 자동 제외 후 재시도
  const { data, error } = await withMissingColumnRetry<Record<string, unknown>>(
    { ...patch, ...stagePatch }, (r) => adminDb.from("applications").update(r).eq("id", id).select("*").maybeSingle(),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fromRow(data));
}

// 신청 삭제(테스트 신청 정리 등) — 파괴적이므로 지출관리자 전용
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseAdmin().from("applications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
