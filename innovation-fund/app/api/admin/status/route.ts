import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts } from "@/lib/admin-accounts";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 현재 관리자 세션 정보: 인증여부 / 역할 / 아이디 / (프로그램관리자면) 담당 프로그램
// 서명된 세션 토큰을 검증하고 권한은 DB에서 재조회(위조 쿠키 차단)
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ admin: false });
  let name = "";
  if (session.role === "program") {
    const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
    const { accounts } = normalizeAdminAccounts(data?.value);
    name = accounts.find((a) => a.loginId === session.id)?.name || "";
  }
  return NextResponse.json({ admin: true, role: session.role, id: session.id, name, programIds: session.programIds, menus: session.menus });
}
