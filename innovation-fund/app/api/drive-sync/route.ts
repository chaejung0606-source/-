import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APPLICATION_TYPE_LABELS, REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

// Google Drive(사용자 Apps Script 웹훅) 동기화.
// ⚠️ 민감 항목은 절대 전송하지 않음: 이름·학번·계좌·연락처·이메일, 신분증·통장 사본 파일.
const SENSITIVE_FILE_TYPES = ["id_card", "bankbook"];

// 진단용: GET /api/drive-sync → 환경변수 설정 여부 확인
//        GET /api/drive-sync?test=1 → 웹훅에 테스트 행 1건 전송 후 응답 상태 반환
export async function GET(req: NextRequest) {
  const webhook = process.env.GOOGLE_SYNC_WEBHOOK_URL;
  const base = {
    configured: !!webhook,
    urlEndsWithExec: webhook ? webhook.trim().endsWith("/exec") : false,
  };
  const test = new URL(req.url).searchParams.get("test") === "1";
  if (test && webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptNumber: "TEST-0000", applicationDate: new Date().toISOString().slice(0, 10),
          applicationType: "연결 테스트", programName: "연결 테스트",
          requestAmount: 0, calculatedAmount: 0, reviewStatus: "테스트", paymentStatus: "테스트", files: [],
        }),
      });
      const text = await res.text();
      return NextResponse.json({ ...base, test: { status: res.status, ok: res.ok, bodyPreview: text.slice(0, 300) } });
    } catch (e: any) {
      return NextResponse.json({ ...base, test: { error: String(e?.message || e) } });
    }
  }
  return NextResponse.json(base);
}

export async function POST(req: NextRequest) {
  const webhook = process.env.GOOGLE_SYNC_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, skipped: true }); // 미설정 시 무동작

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const { data: r, error } = await supabaseAdmin().from("applications").select("*").eq("id", id).maybeSingle();
  if (error || !r) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // 비민감 첨부만 (신분증/통장 제외)
  const files = ((r.files as any[]) || [])
    .filter((f) => !SENSITIVE_FILE_TYPES.includes(f.type))
    .map((f) => ({ name: f.name, type: f.type, dataUrl: f.url || "" }))
    .filter((f) => f.dataUrl);

  // 비민감 요약 (접수번호로만 식별)
  const d = r as any;
  const programName =
    d.program_detail?.programName || d.staff_detail?.programName || d.labor_detail?.programName ||
    d.activity_detail?.activityName || d.contest_detail?.contestName || d.certificate_detail?.certName ||
    d.grade_detail?.courseName || "";

  const payload = {
    receiptNumber: d.receipt_number || "",
    applicationDate: d.application_date || "",
    applicationType: APPLICATION_TYPE_LABELS[d.application_type as keyof typeof APPLICATION_TYPE_LABELS] || d.application_type,
    programName,
    requestAmount: d.request_amount ?? 0,
    calculatedAmount: d.calculated_amount ?? 0,
    reviewStatus: REVIEW_STATUS_LABELS[d.review_status as keyof typeof REVIEW_STATUS_LABELS] || d.review_status || "",
    paymentStatus: PAYMENT_STATUS_LABELS[d.payment_status as keyof typeof PAYMENT_STATUS_LABELS] || d.payment_status || "",
    files,
  };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
