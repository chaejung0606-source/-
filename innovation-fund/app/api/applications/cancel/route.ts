import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 신청자 본인이 자신의 신청을 취소 (JWT 인증 후 service_role로 처리)
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

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "신청 ID가 필요합니다." }, { status: 400 });

  const admin = supabaseAdmin();
  // 본인 신청인지 + 상태 확인 (취소 후 정리를 위해 files·접수번호도 함께 조회)
  const { data: app, error: selErr } = await admin
    .from("applications").select("id, applicant_id, canceled, payment_status, files, receipt_number").eq("id", id).maybeSingle();
  if (selErr || !app) return NextResponse.json({ ok: false, error: "신청 내역을 찾을 수 없습니다." }, { status: 404 });
  if (app.applicant_id !== user.id) return NextResponse.json({ ok: false, error: "본인 신청만 취소할 수 있습니다." }, { status: 403 });
  if (app.canceled) return NextResponse.json({ ok: true });
  if (app.payment_status === "completed") {
    return NextResponse.json({ ok: false, error: "이미 지급 완료된 신청은 취소할 수 없습니다. 사업단에 문의해주세요." }, { status: 400 });
  }

  // 취소자 IP (프록시/배포 환경의 여러 헤더 고려)
  const h = req.headers;
  const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim())
    || h.get("x-vercel-forwarded-for")
    || h.get("cf-connecting-ip")
    || h.get("true-client-ip")
    || h.get("x-real-ip")
    || "unknown";

  const base = { canceled: true, canceled_at: new Date().toISOString() };
  // canceled_ip 컬럼이 있으면 함께 저장, 없으면(마이그레이션 전) IP 없이 저장
  let { error: updErr } = await admin.from("applications").update({ ...base, canceled_ip: ip }).eq("id", id);
  if (updErr) {
    ({ error: updErr } = await admin.from("applications").update(base).eq("id", id));
  }
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  // 취소 후 첨부파일 정리 (개인정보 보유목적 종료 → 저장본 삭제). 실패해도 취소는 성공 처리.
  const files = (app.files as { name?: string; type?: string; path?: string }[]) || [];
  const paths = files.map((f) => f.path).filter((p): p is string => !!p);
  if (paths.length) {
    try { await admin.storage.from("documents").remove(paths); } catch { /* best-effort */ }
  }

  // Google Drive/Sheets 동기화: 드라이브 첨부 삭제 + 시트 행은 보존하고 '삭제 건' 표시
  const webhook = process.env.GOOGLE_SYNC_WEBHOOK_URL;
  if (webhook && app.receipt_number) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          receiptNumber: app.receipt_number,
          canceledAt: base.canceled_at,
          fileNames: files.map((f) => f.name).filter(Boolean),
        }),
      });
    } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok: true });
}
