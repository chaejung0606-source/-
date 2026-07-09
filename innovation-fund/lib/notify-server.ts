// 서버 전용 — 상태 변경 시 신청자에게 인앱 알림(관리자 요청 건)을 자동 생성.
// 외부 발송 채널(이메일·SMS) 없이 기존 admin_notifications(app_config)에 누적해
// 신청자 마이페이지 '내 신청 현황' 위젯에 표시한다. 실패해도 상태 저장을 막지 않는다.
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NOTIFICATIONS_KEY, normalizeNotifications, type AdminNotification } from "@/lib/notifications";

// 알림을 보낼 검토 상태(신청자가 조치·확인해야 하는 상태)
const NOTIFY_REVIEW = new Set(["supplement", "approved", "rejected"]);

function buildMessage(status: string, receiptNumber: string, memo: string): { title: string; body: string } {
  const rn = receiptNumber ? `(접수번호 ${receiptNumber}) ` : "";
  if (status === "supplement") {
    return { title: "✍️ 보완 요청", body: `신청 ${rn}에 보완 요청이 있습니다. 마이페이지에서 안내를 확인하고 수정 후 다시 제출해주세요.${memo ? `\n\n안내: ${memo}` : ""}` };
  }
  if (status === "approved") {
    return { title: "✅ 승인 완료", body: `신청 ${rn}이(가) 승인되었습니다. 마이페이지에서 확인해주세요.${memo ? `\n\n안내: ${memo}` : ""}` };
  }
  // rejected
  return { title: "⛔ 반려 안내", body: `신청 ${rn}이(가) 반려되었습니다. 마이페이지에서 사유를 확인해주세요.${memo ? `\n\n사유: ${memo}` : ""}` };
}

// 검토 상태가 알림 대상으로 바뀐 경우에만 알림 1건을 append. (from → to 비교)
export async function notifyReviewStatusChange(opts: {
  fromStatus?: string | null;
  toStatus?: string;
  studentId?: string;
  applicantId?: string;
  name?: string;
  applicationId: string;
  receiptNumber?: string;
  memo?: string;
  createdBy?: string;
}): Promise<void> {
  const to = String(opts.toStatus || "");
  if (!NOTIFY_REVIEW.has(to)) return;
  if (to === String(opts.fromStatus || "")) return; // 변경 없음
  const sid = String(opts.studentId || "").trim();
  if (!sid) return; // 학번 없으면 수신 매칭 불가

  try {
    const admin = supabaseAdmin();
    const { data } = await admin.from("app_config").select("value").eq("key", NOTIFICATIONS_KEY).maybeSingle();
    const list = normalizeNotifications(data?.value);
    const { title, body } = buildMessage(to, String(opts.receiptNumber || ""), String(opts.memo || "").trim());
    const noti: AdminNotification = {
      id: crypto.randomUUID(),
      studentId: sid,
      applicantId: opts.applicantId || undefined,
      name: opts.name || undefined,
      title, body,
      applicationId: opts.applicationId,
      receiptNumber: opts.receiptNumber || undefined,
      createdAt: new Date().toISOString(),
      createdBy: opts.createdBy || "system",
      readAt: null,
      doneAt: null,
    };
    await admin.from("app_config").upsert({ key: NOTIFICATIONS_KEY, value: [noti, ...list] }, { onConflict: "key" });
  } catch { /* 알림 실패는 상태 저장에 영향 주지 않음 */ }
}
