// 관리자 세션 — 서버측 검증. 쿠키 위조 방지를 위해 서명(HMAC)된 토큰을 사용하고,
// 역할(role)·담당 프로그램(programIds)은 항상 DB(app_config.admin_accounts)에서 다시 조회한다.
import crypto from "crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import { normalizeAdminAccounts, type AdminRole } from "./admin-accounts";

const SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-insecure-admin-secret";

export const ADMIN_SESSION_COOKIE = "admin_sess";

// 로그인 시 발급할 서명 토큰: base64url(id).hmac
export function signAdminToken(id: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(id).digest("base64url");
  return `${Buffer.from(id).toString("base64url")}.${mac}`;
}

function verifyAdminToken(token: string | undefined): string | null {
  if (!token) return null;
  const [idB64, mac] = token.split(".");
  if (!idB64 || !mac) return null;
  let id: string;
  try { id = Buffer.from(idB64, "base64url").toString("utf8"); } catch { return null; }
  const expected = crypto.createHmac("sha256", SECRET).update(id).digest("base64url");
  const a = Buffer.from(mac); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return id;
}

export interface AdminSession { id: string; role: AdminRole; programIds: string[]; }

// 서명 검증 후 DB에서 권한을 재조회 → 위조된 role/programIds 차단
export async function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
  const id = verifyAdminToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!id) return null;
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
  const { expense, accounts } = normalizeAdminAccounts(data?.value);
  if (id === expense.loginId) return { id, role: "expense", programIds: [] };
  const acc = accounts.find((a) => a.loginId === id);
  if (!acc) return null;
  return { id, role: "program", programIds: acc.programIds };
}

// 인증된 관리자(역할 무관). null이면 미인증.
export async function requireAdmin(req: NextRequest): Promise<AdminSession | null> {
  return getAdminSession(req);
}

// 지출관리자(전체 권한) 전용. null이면 권한 없음.
export async function requireExpense(req: NextRequest): Promise<AdminSession | null> {
  const s = await getAdminSession(req);
  return s && s.role === "expense" ? s : null;
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
