import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { requireMenu } from "@/lib/admin-auth";

// GET: 공개 (푸터·사이드바는 사이트에 표시됨)
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "site").maybeSingle();
  return NextResponse.json(data?.value || DEFAULT_SITE_CONFIG);
}

// POST: 지출관리자만 (서명 세션 검증)
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/site-settings"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: "site", value: body }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
