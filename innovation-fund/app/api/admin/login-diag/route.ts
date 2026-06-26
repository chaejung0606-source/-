import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts, verifyAdminPassword } from "@/lib/admin-accounts";
import { requireExpense } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 진단용(지출관리자 전용): 저장된 관리자 계정 존재/일치 여부 확인.
// 보안: 비밀번호는 POST 바디로만 받는다(GET 쿼리 금지 — URL·접속로그·히스토리 노출 방지).
//       저장된 비밀번호의 원문·해시·길이는 응답에 노출하지 않고 설정 여부/일치 여부만 반환한다.
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "지출관리자만 사용 가능" }, { status: 401 });

  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
  const { expense, accounts } = normalizeAdminAccounts(data?.value);

  const body = await req.json().catch(() => ({}));
  const tryId = String(body?.loginId || "").trim();
  const tryPw = String(body?.password || "");

  const stored = {
    rowExists: !!data,
    expenseLoginId: expense.loginId,
    expensePasswordSet: !!expense.password,
    programAccounts: accounts.map((a) => ({ loginId: a.loginId, passwordSet: !!a.password, name: a.name, programCount: a.programIds.length })),
  };

  let probe: Record<string, unknown> | null = null;
  if (tryId || tryPw) {
    const byId = accounts.find((a) => a.loginId === tryId);
    probe = {
      typedLoginId: tryId,
      matchesExpenseId: tryId === expense.loginId,
      foundProgramAccountWithThisId: !!byId,
      passwordMatches: byId
        ? verifyAdminPassword(tryPw, byId.password)
        : ((!tryId || tryId === expense.loginId) ? verifyAdminPassword(tryPw, expense.password) : false),
    };
  }

  return NextResponse.json({ stored, probe, hint: "rowExists=false 또는 programAccounts가 비어있으면 저장 안 됨. foundProgramAccountWithThisId=false면 아이디 불일치. passwordMatches=false면 비밀번호 불일치." });
}
