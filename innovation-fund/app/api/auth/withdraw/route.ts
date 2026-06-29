import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 신청자 회원 탈퇴.
// - 지급 완료(payment_status='completed')된 신청은 정산·증빙을 위해 기록으로 보존(계정 삭제로 applicant_id는 NULL이 됨).
// - 그 외 지원신청 건은 플랫폼 신청목록에서 삭제(첨부파일 포함).
// - 구글 시트는 행을 삭제하지 않고 '신청자 상태=탈퇴'로 표시(웹훅 통지).
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user }, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const currentPassword = String(b.currentPassword || "");
  if (!currentPassword) return NextResponse.json({ ok: false, error: "현재 비밀번호를 입력해주세요." }, { status: 400 });

  // 본인 확인 — 현재 비밀번호로 재인증
  const reauth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: pwErr } = await reauth.auth.signInWithPassword({ email: user.email || "", password: currentPassword });
  if (pwErr) return NextResponse.json({ ok: false, error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: apps } = await admin
    .from("applications").select("id, payment_status, files, receipt_number").eq("applicant_id", user.id);
  const all = (apps || []) as { id: string; payment_status?: string; files?: { path?: string }[]; receipt_number?: string }[];
  const toDelete = all.filter((a) => a.payment_status !== "completed");
  const kept = all.filter((a) => a.payment_status === "completed");

  // 구글 시트: 모든 신청 행을 '탈퇴'로 표시(행 삭제하지 않음)
  const webhook = process.env.GOOGLE_SYNC_WEBHOOK_URL;
  if (webhook) {
    await Promise.allSettled(all.filter((a) => a.receipt_number).map((a) => fetch(webhook, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", receiptNumber: a.receipt_number, applicantStatus: "탈퇴" }),
    })));
  }

  // 삭제 대상 신청의 첨부파일 정리(개인정보 파기)
  const paths = toDelete.flatMap((a) => (Array.isArray(a.files) ? a.files : []).map((f) => f.path).filter((p): p is string => !!p));
  if (paths.length) { try { await admin.storage.from("documents").remove(paths); } catch { /* best-effort */ } }

  // 지급 미완료 신청 삭제(플랫폼 신청목록에서 제거)
  const delIds = toDelete.map((a) => a.id);
  if (delIds.length) {
    const { error } = await admin.from("applications").delete().in("id", delIds);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 계정 삭제 → student_profiles는 CASCADE 삭제, 보존 신청(applications.applicant_id)은 ON DELETE SET NULL로 기록 유지
  const { error: delUserErr } = await admin.auth.admin.deleteUser(user.id);
  if (delUserErr) return NextResponse.json({ ok: false, error: delUserErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: delIds.length, kept: kept.length });
}
