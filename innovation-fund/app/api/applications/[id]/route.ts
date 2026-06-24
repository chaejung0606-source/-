import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow } from "@/lib/app-mapper";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("applications").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
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

  const adminDb = supabaseAdmin();
  let { data, error } = await adminDb.from("applications").update({ ...patch, ...stagePatch }).eq("id", id).select("*").maybeSingle();
  // review_stage/handoff_note 컬럼이 없으면(마이그레이션 전) 해당 필드 제외 후 재시도
  if (error && /review_stage|handoff_note/i.test(error.message)) {
    ({ data, error } = await adminDb.from("applications").update(patch).eq("id", id).select("*").maybeSingle());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fromRow(data));
}

// 관리자: 신청 삭제 (테스트 신청 정리 등)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseAdmin().from("applications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
