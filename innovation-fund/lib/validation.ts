// 신청서 양식 검증 — 작성 예시와 동일한 형식이 아니면 다음 단계로 진행 불가.

export const FORMAT_HINTS = {
  date: "YYYY-MM-DD (예: 2026-03-02)",
  time: "24시간제 HH:MM (예: 09:00)",
  phone: "010-0000-0000",
  email: "id@domain.com",
  account: "숫자와 '-'만 (예: 123-456-7890)",
};

export const reDate = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const reTime = /^([01]\d|2[0-3]):[0-5]\d$/;          // 24시간제
export const rePhone = /^01[016789]-\d{3,4}-\d{4}$/;
export const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const reAccount = /^[0-9-]{6,}$/;

// 입력하는 대로 하이픈 자동 삽입 (010-1234-5678)
export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function isDate(v: string) { return reDate.test(v.trim()); }
export function isTime(v: string) { return reTime.test(v.trim()); }
export function isPhone(v: string) { return rePhone.test(v.trim()); }
export function isEmail(v: string) { return reEmail.test(v.trim()); }
export function isAccount(v: string) { return reAccount.test(v.trim()); }

export interface BasicLike {
  name: string; studentId: string; department: string;
  phone: string; email: string;
  accountNumber: string; applicationDate: string;
}

// 기본 정보 형식 검증 → 위반 메시지 목록
export function validateBasicFormat(b: BasicLike): string[] {
  const errs: string[] = [];
  if (!b.name.trim()) errs.push("• 이름을 입력해주세요.");
  if (!/^\d{6,12}$/.test(b.studentId.trim())) errs.push("• 학번은 숫자로만 입력해주세요.");
  if (!b.department.trim()) errs.push("• 학과를 입력해주세요.");
  if (!isPhone(b.phone)) errs.push(`• 연락처 형식이 올바르지 않습니다. 예시: ${FORMAT_HINTS.phone}`);
  if (!isEmail(b.email)) errs.push(`• 이메일 형식이 올바르지 않습니다. 예시: ${FORMAT_HINTS.email}`);
  if (!isAccount(b.accountNumber)) errs.push(`• 계좌번호 형식이 올바르지 않습니다. 예시: ${FORMAT_HINTS.account}`);
  if (!isDate(b.applicationDate)) errs.push(`• 신청일 형식이 올바르지 않습니다. 예시: ${FORMAT_HINTS.date}`);
  return errs;
}
