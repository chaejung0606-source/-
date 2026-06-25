// 관리자 계정 — 지출관리자(전체 권한) + 프로그램별 관리자.
// 프로그램별 관리자 계정은 app_config 'admin_accounts'에 보관(지출관리자가 관리).
// 지출관리자 계정은 환경변수(기본 20182135 / 000606).

export type AdminRole = "expense" | "program";

export interface AdminAccount {
  loginId: string;
  password: string;
  name: string;
  programIds: string[]; // 관리하는 프로그램 id 목록
}
export interface ExpenseAdmin { loginId: string; password: string; }
export interface AdminAccountsConfig { expense: ExpenseAdmin; accounts: AdminAccount[]; }

export const EXPENSE_ADMIN_ID = process.env.EXPENSE_ADMIN_ID || "20182135";
export const EXPENSE_ADMIN_PW = process.env.EXPENSE_ADMIN_PW || "000606";

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
    };
  }).filter((a) => a.loginId);
  const e = (v.expense || {}) as Record<string, unknown>;
  const expense: ExpenseAdmin = {
    loginId: String(e.loginId || "").trim() || EXPENSE_ADMIN_ID,
    password: String(e.password || "").trim() || EXPENSE_ADMIN_PW,
  };
  return { expense, accounts };
}
