import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts } from "@/lib/admin-accounts";
import { requireExpense } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 임시 진단용: 지출관리자만 호출 가능. 저장된 관리자 계정이 실제로 DB에 있는지,
// 그리고 입력한 아이디/비밀번호가 어디서 어긋나는지 확인한다. 비밀번호 원문은 노출하지 않는다.
// 사용: 지출관리자로 로그인한 상태에서 브라우저로
//   /api/admin/login-diag?loginId=프로그램관리자아이디&password=비밀번호  접속
export async function GET(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ error: "지출관리자만 사용 가능" }, { status: 401 });

  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
  const { expense, accounts } = normalizeAdminAccounts(data?.value);

  const tryId = String(req.nextUrl.searchParams.get("loginId") || "").trim();
  const tryPw = String(req.nextUrl.searchParams.get("password") || "").trim();

  const stored = {
    rowExists: !!data,
    expenseLoginId: expense.loginId,
    programAccounts: accounts.map((a) => ({ loginId: a.loginId, pwLength: a.password.length, name: a.name, programCount: a.programIds.length })),
  };

  let probe: Record<string, unknown> | null = null;
  if (tryId) {
    const byId = accounts.find((a) => a.loginId === tryId);
    probe = {
      typedLoginId: tryId,
      typedPwLength: tryPw.length,
      matchesExpenseId: tryId === expense.loginId,
      foundProgramAccountWithThisId: !!byId,
      passwordMatches: byId ? byId.password === tryPw : (tryId === expense.loginId ? expense.password === tryPw : false),
    };
  }

  return NextResponse.json({ stored, probe, hint: "rowExists=false 또는 programAccounts가 비어있으면 저장이 안 된 것. foundProgramAccountWithThisId=false면 아이디 불일치(공백·오타). passwordMatches=false면 비밀번호 불일치." });
}
