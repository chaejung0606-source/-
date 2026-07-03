import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KEY = "program_forms";

// 프로그램별 신청 폼 스키마: { [programId]: { pre?: FormSchema, fund?: FormSchema } }
// programs 테이블 마이그레이션 없이 app_config(JSONB)에 보관.

export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json((data?.value as Record<string, unknown>) || {});
}

export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/programs"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const value = (body && typeof body.forms === "object" && body.forms) ? body.forms : {};
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
