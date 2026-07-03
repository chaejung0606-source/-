// 관리자 계정 — 지출관리자(전체 권한) + 프로그램별 관리자.
// 프로그램별 관리자 계정은 app_config 'admin_accounts'에 보관(지출관리자가 관리).
// 비밀번호는 scrypt 해시로 저장(레거시 평문도 검증 호환). 지출관리자 비번은 환경변수/설정값으로만 동작.
import crypto from "crypto";

export type AdminRole = "expense" | "program";

// 프로그램별 관리자에게 메뉴별로 부여 가능한 관리자 시스템 메뉴 (지출관리자 전용 '관리자 설정'은 제외)
export const GRANTABLE_MENUS: { key: string; label: string }[] = [
  { key: "/admin/applicants", label: "신청자 정보" },
  { key: "/admin/virtual-students", label: "가상학과 학생" },
  { key: "/admin/programs", label: "신청폼 편집" },
  { key: "/admin/space-rental", label: "공간대여 신청" },
  { key: "/admin/meeting-minutes", label: "회의록 작성" },
  { key: "/admin/content", label: "유형별 지급 기준" },
  { key: "/admin/certificates", label: "자격증 목록" },
  { key: "/admin/site-settings", label: "사이트 설정" },
  { key: "/admin/settings", label: "파일 저장 경로" },
];
export const GRANTABLE_MENU_KEYS = GRANTABLE_MENUS.map((m) => m.key);

export interface AdminAccount {
  loginId: string;
  password: string;
  name: string;
  programIds: string[]; // 관리하는 프로그램 id 목록
  menus?: string[];     // 접근 권한을 부여한 관리자 시스템 메뉴(경로) 목록
}
export interface ExpenseAdmin { loginId: string; password: string; }
export interface AdminAccountsConfig { expense: ExpenseAdmin; accounts: AdminAccount[]; }

// 아이디는 비밀이 아니므로 기본값 유지. 비밀번호는 약한 기본값 금지 →
// EXPENSE_ADMIN_PW(또는 '관리자 설정'에서 저장한 값)가 없으면 지출관리자 로그인 비활성(fail-closed).
export const EXPENSE_ADMIN_ID = process.env.EXPENSE_ADMIN_ID || "20182135";
export const EXPENSE_ADMIN_PW = process.env.EXPENSE_ADMIN_PW || "";

// ---- 관리자 비밀번호 해시 (scrypt, 외부 의존성 없이 Node 내장) ----
const HASH_PREFIX = "scrypt:";
export function isHashedPassword(v: string | undefined | null): boolean {
  return typeof v === "string" && v.startsWith(HASH_PREFIX);
}
export function hashAdminPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(pw), salt, 32);
  return `${HASH_PREFIX}${salt.toString("base64")}:${dk.toString("base64")}`;
}
// 입력 비번이 저장값(해시 또는 레거시 평문)과 일치하는지 — timing-safe 비교
export function verifyAdminPassword(input: string, stored: string | undefined | null): boolean {
  if (!input || !stored) return false; // 빈 값은 항상 실패(fail-closed)
  if (!isHashedPassword(stored)) {
    // 레거시 평문 호환 (이후 저장 시 자동으로 해시로 전환됨)
    const a = Buffer.from(String(input));
    const b = Buffer.from(String(stored));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  try {
    const [saltB64, hashB64] = String(stored).slice(HASH_PREFIX.length).split(":");
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const dk = crypto.scryptSync(String(input), salt, expected.length);
    return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
  } catch { return false; }
}

export function normalizeAdminAccounts(value: unknown): AdminAccountsConfig {
  const v = (value || {}) as Record<string, unknown>;
  const arr = Array.isArray(v.accounts) ? v.accounts : [];
  const accounts: AdminAccount[] = (arr as unknown[]).map((a) => {
    const o = (a || {}) as Record<string, unknown>;
    return {
      loginId: String(o.loginId || "").trim(),
      password: String(o.password || "").trim(),
      name: String(o.name || "").trim(),
      programIds: Array.isArray(o.programIds) ? (o.programIds as unknown[]).map((x) => String(x)) : [],
      // 구버전 systemAdmin(전체 권한) 호환: true였으면 모든 부여가능 메뉴로 확장
      menus: Array.isArray(o.menus)
        ? (o.menus as unknown[]).map((x) => String(x)).filter((k) => GRANTABLE_MENU_KEYS.includes(k))
        : (o.systemAdmin === true ? [...GRANTABLE_MENU_KEYS] : []),
    };
  }).filter((a) => a.loginId);
  const e = (v.expense || {}) as Record<string, unknown>;
  const expense: ExpenseAdmin = {
    loginId: String(e.loginId || "").trim() || EXPENSE_ADMIN_ID,
    password: String(e.password || "").trim() || EXPENSE_ADMIN_PW,
  };
  return { expense, accounts };
}
