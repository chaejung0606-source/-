// 관리자 → 신청자 알림(요청 건). 배포 DB에 별도 테이블/컬럼이 없어도 동작하도록
// app_config('admin_notifications')에 JSON 배열로 보관한다. (designated_programs 등과 동일한 패턴)
export const NOTIFICATIONS_KEY = "admin_notifications";

export interface AdminNotification {
  id: string;
  studentId: string;        // 수신 학생 학번 (매칭 기준)
  applicantId?: string;     // 수신 학생 auth uid (알면 함께 저장)
  name?: string;            // 수신 학생 이름 (표시용)
  title: string;            // 요청 제목
  body: string;             // 안내 내용 (신청자가 확인/수행)
  applicationId?: string;   // 연결된 신청 건(선택)
  receiptNumber?: string;   // 연결된 신청 접수번호(표시용, 선택)
  createdAt: string;
  createdBy?: string;       // 보낸 관리자 loginId
  readAt?: string | null;   // 신청자가 열람한 시각
  doneAt?: string | null;   // 신청자가 '확인 완료'한 시각
}

// app_config value → 안전한 배열로 정규화
export function normalizeNotifications(value: unknown): AdminNotification[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n) => ({
      id: String(n.id || ""),
      studentId: String(n.studentId || ""),
      applicantId: n.applicantId ? String(n.applicantId) : undefined,
      name: n.name ? String(n.name) : undefined,
      title: String(n.title || ""),
      body: String(n.body || ""),
      applicationId: n.applicationId ? String(n.applicationId) : undefined,
      receiptNumber: n.receiptNumber ? String(n.receiptNumber) : undefined,
      createdAt: String(n.createdAt || ""),
      createdBy: n.createdBy ? String(n.createdBy) : undefined,
      readAt: n.readAt ? String(n.readAt) : null,
      doneAt: n.doneAt ? String(n.doneAt) : null,
    }))
    .filter((n) => n.id && n.studentId);
}

// 특정 신청자(uid 또는 학번)에게 온 알림만 최신순으로
export function notificationsFor(all: AdminNotification[], uid: string, studentId: string): AdminNotification[] {
  const sid = (studentId || "").trim().toLowerCase();
  return all
    .filter((n) => (n.applicantId && n.applicantId === uid) || (sid && n.studentId.trim().toLowerCase() === sid))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
