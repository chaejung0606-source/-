import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 공개: 사이드바에 업로드한 파일(site/ 경로)을 새 서명 URL로 리다이렉트해 열어준다.
// 보안: 신청자 증빙 등 다른 경로 노출을 막기 위해 'site/' 접두사만 허용한다.
export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path") || "";
  if (!path.startsWith("site/") || path.includes("..")) {
    return NextResponse.json({ error: "not allowed" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin().storage.from("documents").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
