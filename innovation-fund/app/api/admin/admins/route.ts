import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts, hashAdminPassword, isHashedPassword, GRANTABLE_MENU_KEYS } from "@/lib/admin-accounts";
import { requireExpenseOnly } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
const KEY = "admin_accounts";

// 지출관리자 전용: 프로그램별 관리자 계정 목록 조회/저장 (서명 세션 검증)
// 보안: 비밀번호(해시)는 응답에 절대 포함하지 않고, 설정 여부(hasPassword)만 전달한다.
export async function GET(req: NextRequest) {
  if (!(await requireExpenseOnly(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  const cfg = normalizeAdminAccounts(data?.value);
  return NextResponse.json({
    expense: { loginId: cfg.expense.loginId, password: "", hasPassword: !!cfg.expense.password },
    accounts: cfg.accounts.map((a) => ({
      loginId: a.loginId, name: a.name, programIds: a.programIds, menus: a.menus || [],
      password: "", hasPassword: !!a.password,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireExpenseOnly(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  // 기존 저장값(원본) — 비밀번호를 비워서 보낸 경우 기존값을 유지하기 위함
  const { data: existing } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  const prev = (existing?.value || {}) as Record<string, any>;
  const prevById: Record<string, any> = {};
  for (const a of (Array.isArray(prev.accounts) ? prev.accounts : [])) {
    if (a?.loginId) prevById[String(a.loginId).trim()] = a;
  }

  // 비밀번호 처리: 입력 없으면 기존값 유지, 입력 있으면 (평문이면) 해시. 평문은 저장하지 않음.
  const keepOrHash = (incoming: unknown, prevStored: unknown): string => {
    const v = String(incoming || "").trim();
    if (!v) return String(prevStored || "");                 // 비우면 기존 유지
    return isHashedPassword(v) ? v : hashAdminPassword(v);    // 새 값은 해시 저장
  };

  const inAccounts = Array.isArray(body?.accounts) ? body.accounts : [];
  const accounts = inAccounts
    .map((a: Record<string, any>) => {
      const loginId = String(a?.loginId || "").trim();
      return {
        loginId,
        name: String(a?.name || "").trim(),
        programIds: Array.isArray(a?.programIds) ? a.programIds.map((x: unknown) => String(x)) : [],
        menus: Array.isArray(a?.menus) ? a.menus.map((x: unknown) => String(x)).filter((k: string) => GRANTABLE_MENU_KEYS.includes(k)) : [],
        password: keepOrHash(a?.password, prevById[loginId]?.password),
      };
    })
    .filter((a: { loginId: string }) => a.loginId);

  const expenseIn = (body?.expense || {}) as Record<string, any>;
  const expense = {
    loginId: String(expenseIn.loginId || "").trim(),
    password: keepOrHash(expenseIn.password, prev?.expense?.password),
  };

  const value = { expense, accounts };
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
