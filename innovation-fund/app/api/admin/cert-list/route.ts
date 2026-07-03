import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCertList, publicCertList } from "@/lib/cert-list";
import { requireMenu, getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KEY = "cert_list";

// GET: 관리자(쿠키)면 전체, 아니면 공개 열만
export async function GET(req: NextRequest) {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  const full = normalizeCertList(data?.value);
  const isAdmin = !!(await getAdminSession(req));
  // ?pub=1 : 관리자 쿠키가 있어도 공개본만 반환(홈에서 학생 화면 그대로 확인)
  const forcePublic = req.nextUrl.searchParams.get("pub") === "1";
  return NextResponse.json(isAdmin && !forcePublic ? full : publicCertList(full));
}

// POST: 관리자 — 전체 저장
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/certificates"))) {
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
