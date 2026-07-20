import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 공개: 사이드바에 업로드한 파일(site/ 경로)을 같은 출처에서 inline으로 스트리밍한다.
// (서명 URL 리다이렉트는 외부 출처라 iframe 미리보기가 차단될 수 있어, 본 라우트가 직접 내려보낸다.)
// 보안: 신청자 증빙 등 다른 경로 노출을 막기 위해 'site/' 접두사만 허용한다.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";
  if (!path.startsWith("site/") || path.includes("..")) {
    return NextResponse.json({ error: "not allowed" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin().storage.from("documents").download(path);
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = Buffer.from(await data.arrayBuffer());
  const type = (data as Blob).type || "application/octet-stream";
  // download=1 이면 다운로드(attachment)로, 아니면 inline(브라우저 미리보기).
  // 파일명(name)은 비ASCII(한글) 대비 RFC 5987(filename*)로도 함께 지정.
  const download = url.searchParams.get("download") === "1";
  const rawName = (url.searchParams.get("name") || "").replace(/[\r\n"]/g, "").slice(0, 200);
  let disposition = download ? "attachment" : "inline";
  if (rawName) {
    const ascii = rawName.replace(/[^\x20-\x7e]/g, "_");
    disposition += `; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(rawName)}`;
  }
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=300",
    },
  });
}
