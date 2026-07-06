import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 관리자: 사이드바 노출 파일 / 신청폼 다운로드 제공 파일 업로드 → documents 버킷 site/ 경로에 저장
// PDF·이미지 외에 신청서 양식으로 자주 쓰는 문서(HWP·워드·엑셀·PPT·한글·ZIP 등)도 허용.
const OK_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const OK_EXT = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "hwp", "hwpx", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip"];

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });

  const type = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!OK_TYPES.includes(type) && !OK_EXT.includes(ext)) {
    return NextResponse.json({ ok: false, error: "PDF 또는 이미지(JPG·PNG·WEBP) 파일만 업로드할 수 있습니다." }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ ok: false, error: "파일은 20MB 이하만 가능합니다." }, { status: 400 });

  // 스토리지 키는 ASCII만 허용(한글 등 비ASCII는 'Invalid key' 오류) → 랜덤 + 확장자만 사용. 원래 파일명은 표시용으로만 보존.
  const safeExt = (ext || "bin").replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const path = `site/${rand}.${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin().storage.from("documents").upload(path, buf, {
    contentType: type || "application/octet-stream", upsert: false,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, path, name: file.name });
}
