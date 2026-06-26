import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 관리자: 사이드바에 노출할 파일(PDF·이미지) 업로드 → documents 버킷 site/ 경로에 저장
const OK_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const OK_EXT = ["pdf", "png", "jpg", "jpeg", "webp", "gif"];

export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });

  const type = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!OK_TYPES.includes(type) && !OK_EXT.includes(ext)) {
    return NextResponse.json({ ok: false, error: "PDF 또는 이미지(JPG·PNG·WEBP) 파일만 업로드할 수 있습니다." }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ ok: false, error: "파일은 20MB 이하만 가능합니다." }, { status: 400 });

  const safe = (file.name || "file").replace(/[^\w.\-가-힣]/g, "_").slice(-80);
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `site/${rand}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin().storage.from("documents").upload(path, buf, {
    contentType: type || "application/octet-stream", upsert: false,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, path, name: file.name });
}
