import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCertList, publicCertList } from "@/lib/cert-list";

export const dynamic = "force-dynamic";

const KEY = "cert_list";

// GET: 관리자(쿠키)면 전체, 아니면 공개 열만
export async function GET(req: NextRequest) {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  const full = normalizeCertList(data?.value);
  const isAdmin = req.cookies.get("admin_auth")?.value === "true";
  return NextResponse.json(isAdmin ? full : publicCertList(full));
}

// POST: 관리자 — 전체 저장
export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_auth")?.value !== "true") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const value = normalizeCertList(body);
  value.updatedAt = new Date().toISOString();
  value.updateNote = typeof body.updateNote === "string" ? body.updateNote : "";
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
