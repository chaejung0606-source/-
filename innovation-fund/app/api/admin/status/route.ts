import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts } from "@/lib/admin-accounts";

export const dynamic = "force-dynamic";

// 현재 관리자 세션 정보: 인증여부 / 역할 / 아이디 / (프로그램관리자면) 담당 프로그램
export async function GET(req: NextRequest) {
  const admin = req.cookies.get("admin_auth")?.value === "true";
  if (!admin) return NextResponse.json({ admin: false });
  const role = (req.cookies.get("admin_role")?.value as "expense" | "program") || "expense";
  const id = req.cookies.get("admin_id")?.value || "";
  let programIds: string[] = [];
  let name = "";
  if (role === "program") {
    const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "admin_accounts").maybeSingle();
    const { accounts } = normalizeAdminAccounts(data?.value);
    const me = accounts.find((a) => a.loginId === id);
    programIds = me?.programIds || [];
    name = me?.name || "";
  }
  return NextResponse.json({ admin: true, role, id, name, programIds });
}
