import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAdminAccounts } from "@/lib/admin-accounts";

export const dynamic = "force-dynamic";
const KEY = "admin_accounts";

function isExpense(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true" && (req.cookies.get("admin_role")?.value || "expense") === "expense";
}

// 지출관리자 전용: 프로그램별 관리자 계정 목록 조회/저장
export async function GET(req: NextRequest) {
  if (!isExpense(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json(normalizeAdminAccounts(data?.value));
}

export async function POST(req: NextRequest) {
  if (!isExpense(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const value = normalizeAdminAccounts(body);
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
