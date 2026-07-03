import { NextRequest, NextResponse } from "next/server";
import { requireMenu } from "@/lib/admin-auth";
import { normalizeMeeting, buildMinutesDocx, minutesFileBase } from "@/lib/meeting-minutes";

export const dynamic = "force-dynamic";

// 회의록 파일 다운로드 — 편집된 회의록 내용을 받아 문서로 생성.
// 한글(HWP)은 docx를 정상적으로 열 수 있어, 확장자 .docx 문서로 내보낸다.
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/meeting-minutes"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const m = normalizeMeeting(b.meeting || b, String((b.meeting || b)?.groupName || ""));
  const buf = await buildMinutesDocx(m);
  const base = minutesFileBase(m);
  // RFC 5987로 한글 파일명 인코딩
  const encoded = encodeURIComponent(`${base}.docx`);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="minutes.docx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
