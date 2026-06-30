import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 공개: 사이드바에 업로드한 파일(site/ 경로)을 같은 출처에서 inline으로 스트리밍한다.
// (서명 URL 리다이렉트는 외부 출처라 iframe 미리보기가 차단될 수 있어, 본 라우트가 직접 내려보낸다.)
// 보안: 신청자 증빙 등 다른 경로 노출을 막기 위해 'site/' 접두사만 허용한다.
export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path") || "";
  if (!path.startsWith("site/") || path.includes("..")) {
    return NextResponse.json({ error: "not allowed" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin().storage.from("documents").download(path);
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = Buffer.from(await data.arrayBuffer());
  const type = (data as Blob).type || "application/octet-stream";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
    },
  });
}
