import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeStatusConfig, DEFAULT_STATUS_CONFIG } from "@/lib/status-config";
import { requireExpense } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KEY = "status_config";

export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json(data?.value ? normalizeStatusConfig(data.value) : DEFAULT_STATUS_CONFIG);
}

export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const value = normalizeStatusConfig(body);
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
