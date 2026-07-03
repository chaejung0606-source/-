import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 공개(로그인 불필요): 공간대여 이용결과 사진 업로드 → documents 버킷 site/space-result/ 경로에 저장.
// site/ 접두사를 사용해 /api/site-file 로 그대로 열람 가능. 이미지·용량 제한으로 남용 방지.
const OK_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const OK_EXT = ["png", "jpg", "jpeg", "webp", "gif"];

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
  const type = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!OK_TYPES.includes(type) && !OK_EXT.includes(ext)) {
    return NextResponse.json({ ok: false, error: "이미지(JPG·PNG·WEBP) 파일만 업로드할 수 있습니다." }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ ok: false, error: "사진은 15MB 이하만 가능합니다." }, { status: 400 });

  const safeExt = (ext || "jpg").replace(/[^a-z0-9]/g, "").slice(0, 8) || "jpg";
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const path = `site/space-result/${rand}.${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin().storage.from("documents").upload(path, buf, { contentType: type || "image/jpeg", upsert: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, url: `/api/site-file?path=${encodeURIComponent(path)}` });
}
