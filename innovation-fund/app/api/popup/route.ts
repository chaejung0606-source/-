import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const KEY = "popup";

// GET: 공개 — 홈 팝업 공지 설정
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json(data?.value || { enabled: false, title: "", content: "" });
}

// POST: 관리자 — 팝업 공지 저장
export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_auth")?.value !== "true") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const value = { enabled: !!b.enabled, title: String(b.title || ""), content: String(b.content || "") };
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
