import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 공개(로그인 불필요): 공간대여 파일 업로드 → documents 버킷 site/ 경로에 저장.
// site/ 접두사를 사용해 /api/site-file 로 그대로 열람 가능. 형식·용량 제한으로 남용 방지.
// - 기본(사진): 이미지 형식만 → site/space-result/
// - kind=doc(제출 서류): 문서 형식(HWP·PDF·오피스)·이미지 허용 → site/space-docs/
const IMG_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const IMG_EXT = ["png", "jpg", "jpeg", "webp", "gif"];
const DOC_EXT = [...IMG_EXT, "hwp", "hwpx", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") || "");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
  const type = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (kind === "doc") {
    if (!DOC_EXT.includes(ext)) {
      return NextResponse.json({ ok: false, error: "HWP·PDF·오피스 문서 또는 이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
    }
  } else if (!IMG_TYPES.includes(type) && !IMG_EXT.includes(ext)) {
    return NextResponse.json({ ok: false, error: "이미지(JPG·PNG·WEBP) 파일만 업로드할 수 있습니다." }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ ok: false, error: "파일은 15MB 이하만 가능합니다." }, { status: 400 });

  const safeExt = (ext || "jpg").replace(/[^a-z0-9]/g, "").slice(0, 8) || "jpg";
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const path = `site/${kind === "doc" ? "space-docs" : "space-result"}/${rand}.${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin().storage.from("documents").upload(path, buf, { contentType: type || "application/octet-stream", upsert: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, url: `/api/site-file?path=${encodeURIComponent(path)}`, name: file.name });
}
