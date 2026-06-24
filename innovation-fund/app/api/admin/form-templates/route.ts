import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const KEY = "form_templates";

// 자주 쓰는 신청 폼 형식 저장소: [{ id, name, schema }]
// app_config(JSONB)에 보관 — programs 테이블 마이그레이션 불필요.

export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  const v = data?.value as { templates?: unknown[] } | unknown[] | undefined;
  const templates = Array.isArray(v) ? v : (v?.templates && Array.isArray(v.templates) ? v.templates : []);
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_auth")?.value !== "true") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const templates = Array.isArray(body?.templates) ? body.templates : [];
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value: { templates } }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
