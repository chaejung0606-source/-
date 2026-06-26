import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APPLICATION_TYPE_LABELS, REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

// Google Drive(사용자 Apps Script 웹훅) 동기화. ⚠️ 개인정보 처리 위탁(데이터 국외 이전 가능)에 해당 — 처리방침 제5조 고지.
// 요약 시트에는 식별정보(이름·학번·계좌·연락처·이메일)를 보내지 않는다.
// 첨부 중 신분증·통장 사본은 전송하지 않으나, 그 외 서류(재학증명서·성적증명서·자격증/수상 증빙 등)는
// 그 내용에 이름·학번 등 식별정보가 포함될 수 있음에 유의(접수번호 폴더로 분리 전송).
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

  // 비민감 첨부만 (신분증/통장 제외) → dataUrl로 변환
  const admin = supabaseAdmin();
  const nonSensitive = ((r.files as any[]) || []).filter((f) => !SENSITIVE_FILE_TYPES.includes(f.type));
  const files: { name: string; type: string; dataUrl: string }[] = [];
  for (const f of nonSensitive) {
    if (f.path) {
      // Storage에서 다운로드 후 base64
      const { data: blob } = await admin.storage.from("documents").download(f.path);
      if (blob) {
        const buf = Buffer.from(await blob.arrayBuffer());
        const mime = (blob as any).type || "application/octet-stream";
        files.push({ name: f.name, type: f.type, dataUrl: `data:${mime};base64,${buf.toString("base64")}` });
      }
    } else if (f.url) {
      // 구버전 base64 호환
      files.push({ name: f.name, type: f.type, dataUrl: f.url });
    }
  }

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
