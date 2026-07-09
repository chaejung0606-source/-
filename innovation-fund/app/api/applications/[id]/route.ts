import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow, withMissingColumnRetry } from "@/lib/app-mapper";
import { requireAdmin, requireExpense, canManageApplication } from "@/lib/admin-auth";
import { encryptPII, decryptPII } from "@/lib/pii-crypto";

// verified_account.residentNumber(주민등록번호)는 암호화 저장 → 인증된 관리자 응답에서만 복호화
function decryptResident(app: ReturnType<typeof fromRow>) {
  if (app.verifiedAccount?.residentNumber) {
    app.verifiedAccount = { ...app.verifiedAccount, residentNumber: decryptPII(app.verifiedAccount.residentNumber) };
  }
  return app;
}

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

  const app = decryptResident(fromRow(data));
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
  // 권한 분리: 최종 승인 금액·지급 상태는 지출관리자만 변경 가능(프로그램 관리자는 검토 상태·메모까지)
  if (session.role !== "expense" && (body.paymentStatus !== undefined || body.approvedAmount !== undefined)) {
    return NextResponse.json({ error: "승인 금액·지급 상태는 지출관리자만 변경할 수 있습니다." }, { status: 403 });
  }

  // 반려·보완요청은 사유(안내 메모) 필수 — 최종 메모(변경분 우선, 없으면 기존)가 비면 차단
  if (body.reviewStatus === "rejected" || body.reviewStatus === "supplement") {
    const finalMemo = String((body.adminMemo !== undefined ? body.adminMemo : existing.admin_memo) || "").trim();
    if (!finalMemo) {
      return NextResponse.json({ error: body.reviewStatus === "rejected"
        ? "반려 사유를 안내 메모에 입력해주세요." : "보완 요청 내용을 안내 메모에 입력해주세요." }, { status: 400 });
    }
  }

  const patch: Record<string, any> = {};
  if (body.reviewStatus !== undefined) patch.review_status = body.reviewStatus;
  if (body.paymentStatus !== undefined) patch.payment_status = body.paymentStatus;
  if (body.adminMemo !== undefined) patch.admin_memo = body.adminMemo;
  if (body.approvedAmount !== undefined) patch.approved_amount = body.approvedAmount;
  if (body.verifiedAccount !== undefined) {
    // 주민등록번호는 평문 저장 금지 → 암호화하여 보관 (안전성 확보조치)
    patch.verified_account = { ...body.verifiedAccount, residentNumber: encryptPII(body.verifiedAccount?.residentNumber) };
  }
  const stagePatch: Record<string, any> = {};
  if (body.reviewStage !== undefined) stagePatch.review_stage = body.reviewStage;
  if (body.handoffNote !== undefined) stagePatch.handoff_note = body.handoffNote;

  // 상태 변경 이력(감사 로그) — 검토/지급 상태가 실제로 바뀌면 이전→이후 값을 누적 기록(누가·언제)
  const prevLen = Array.isArray(existing.status_history) ? existing.status_history.length : 0;
  const history: any[] = Array.isArray(existing.status_history) ? [...existing.status_history] : []; // 원본 참조 공유 방지(복사)
  const nowIso = new Date().toISOString();
  const memoForLog = String((body.adminMemo !== undefined ? body.adminMemo : existing.admin_memo) || "").trim();
  if (body.reviewStatus !== undefined && body.reviewStatus !== existing.review_status) {
    history.push({ at: nowIso, by: session.id, role: session.role, field: "review", from: existing.review_status || null, to: body.reviewStatus, memo: memoForLog || undefined });
  }
  if (body.paymentStatus !== undefined && body.paymentStatus !== existing.payment_status) {
    history.push({ at: nowIso, by: session.id, role: session.role, field: "payment", from: existing.payment_status || null, to: body.paymentStatus });
  }
  const historyPatch = history.length !== prevLen ? { status_history: history } : {};

  // 배포 DB에 없는 컬럼(review_stage/handoff_note/verified_account/status_history 등)은 자동 제외 후 재시도
  const { data, error } = await withMissingColumnRetry<Record<string, unknown>>(
    { ...patch, ...stagePatch, ...historyPatch }, (r) => adminDb.from("applications").update(r).eq("id", id).select("*").maybeSingle(),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(decryptResident(fromRow(data)));
}

// 신청 삭제(테스트 신청 정리 등) — 파괴적이므로 지출관리자 전용
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseAdmin().from("applications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
