import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts } from "@/lib/admin-accounts";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

// 관리자 로그인: 아이디 + 비밀번호.
// - 지출관리자(전체 권한): EXPENSE_ADMIN_ID / EXPENSE_ADMIN_PW
// - 프로그램별 관리자: app_config 'admin_accounts'에 등록된 계정
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const loginId = String(body.loginId || body.id || "").trim();
  const password = String(body.password || "");

  // 구버전 단일 비밀번호 호환(아이디 없이 비번만) → 지출관리자로 처리
  const legacyPw = process.env.ADMIN_PASSWORD;

  // 관리자 설정(app_config)에서 지출관리자 계정·프로그램 관리자 계정 조회
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
  const { expense, accounts } = normalizeAdminAccounts(data?.value);

  let role: "expense" | "program" | null = null;
  let id = "";
  if ((loginId === expense.loginId && password === expense.password) || (!loginId && legacyPw && password === legacyPw)) {
    role = "expense"; id = expense.loginId;
  } else if (loginId) {
    const match = accounts.find((a) => a.loginId === loginId && a.password === password);
    if (match) { role = "program"; id = match.loginId; }
  }

  if (!role) return NextResponse.json({ success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });

  const res = NextResponse.json({ success: true, role, id });
  res.cookies.set("admin_auth", "true", COOKIE_OPTS);
  res.cookies.set("admin_role", role, COOKIE_OPTS);
  res.cookies.set("admin_id", id, COOKIE_OPTS);
  return res;
}
