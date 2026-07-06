import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";
import { GUIDE_KEY, DEFAULT_GUIDE, normalizeGuide, type GuideConfig } from "@/lib/guide";

export const dynamic = "force-dynamic";

// 관리자: 이용안내 조회 (저장값 없으면 기본값 + customized:false)
export async function GET(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/site-settings"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", GUIDE_KEY).maybeSingle();
  const saved = normalizeGuide(data?.value);
  if (saved && saved.sections.length) return NextResponse.json({ ...saved, customized: true });
  return NextResponse.json({ ...DEFAULT_GUIDE, customized: false });
}

// 관리자: 이용안내 저장
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/site-settings"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const norm = normalizeGuide(b);
  if (!norm) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  const value: GuideConfig = { sections: norm.sections, updatedAt: new Date().toISOString() };
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: GUIDE_KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
