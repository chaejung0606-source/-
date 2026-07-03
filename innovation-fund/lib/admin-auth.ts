// 관리자 세션 — 서버측 검증. 쿠키 위조 방지를 위해 서명(HMAC)된 토큰을 사용하고,
// 역할(role)·담당 프로그램(programIds)은 항상 DB(app_config.admin_accounts)에서 다시 조회한다.
import crypto from "crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import { normalizeAdminAccounts, GRANTABLE_MENU_KEYS, type AdminRole } from "./admin-accounts";

// 세션 서명 키: ADMIN_SESSION_SECRET 우선, 없으면 SUPABASE_SERVICE_ROLE_KEY.
// 하드코딩 폴백 금지 — 둘 다 없으면 예외(fail-closed).
function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("관리자 세션 서명 키 미설정: ADMIN_SESSION_SECRET(권장) 또는 SUPABASE_SERVICE_ROLE_KEY 필요");
  return s;
}

export const ADMIN_SESSION_COOKIE = "admin_sess";

// 로그인 시 발급할 서명 토큰: base64url(id).hmac
export function signAdminToken(id: string): string {
  const mac = crypto.createHmac("sha256", getSecret()).update(id).digest("base64url");
  return `${Buffer.from(id).toString("base64url")}.${mac}`;
}

function verifyAdminToken(token: string | undefined): string | null {
  if (!token) return null;
  const [idB64, mac] = token.split(".");
  if (!idB64 || !mac) return null;
  let id: string;
  try { id = Buffer.from(idB64, "base64url").toString("utf8"); } catch { return null; }
  const expected = crypto.createHmac("sha256", getSecret()).update(id).digest("base64url");
  const a = Buffer.from(mac); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return id;
}

export interface AdminSession { id: string; role: AdminRole; programIds: string[]; menus: string[]; }

// 서명 검증 후 DB에서 권한을 재조회 → 위조된 role/programIds 차단
export async function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
  const id = verifyAdminToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!id) return null;
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
  const { expense, accounts } = normalizeAdminAccounts(data?.value);
  if (id === expense.loginId) return { id, role: "expense", programIds: [], menus: [...GRANTABLE_MENU_KEYS] };
  const acc = accounts.find((a) => a.loginId === id);
  if (!acc) return null;
  return { id, role: "program", programIds: acc.programIds, menus: acc.menus || [] };
}

// 인증된 관리자(역할 무관). null이면 미인증.
export async function requireAdmin(req: NextRequest): Promise<AdminSession | null> {
  return getAdminSession(req);
}

// 지출관리자(최상위) 전용 — 관리자 계정 관리 등 민감 작업. 부여받은 관리자도 접근 불가.
export async function requireExpense(req: NextRequest): Promise<AdminSession | null> {
  const s = await getAdminSession(req);
  return s && s.role === "expense" ? s : null;
}
export const requireExpenseOnly = requireExpense;

// 특정 메뉴 접근 권한 — 지출관리자이거나, 해당 메뉴 권한을 부여받은 프로그램 관리자.
export async function requireMenu(req: NextRequest, keys: string | string[]): Promise<AdminSession | null> {
  const s = await getAdminSession(req);
  if (!s) return null;
  if (s.role === "expense") return s;
  const need = Array.isArray(keys) ? keys : [keys];
  return need.some((k) => s.menus.includes(k)) ? s : null;
}

// 신청 row(JSONB) → 담당 프로그램명
export function appRowProgramName(row: Record<string, any> | null | undefined): string {
  if (!row) return "";
  return row.program_detail?.programName || row.labor_detail?.programName || row.activity_detail?.activityName || row.staff_detail?.programName || "";
}

// 프로그램 관리자가 해당 신청을 다룰 수 있는지(담당 프로그램 소유 검증)
export async function canManageApplication(session: AdminSession, row: Record<string, any> | null | undefined): Promise<boolean> {
  if (session.role === "expense") return true;
  const name = appRowProgramName(row);
  if (!name) return false;
  const { data } = await supabaseAdmin().from("programs").select("id,name");
  const pid = (data || []).find((p) => p.name === name)?.id;
  return !!pid && session.programIds.includes(pid);
}
