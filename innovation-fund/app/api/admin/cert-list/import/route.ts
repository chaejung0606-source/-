import { NextRequest, NextResponse } from "next/server";
import { parseCsv, gridToCertList } from "@/lib/cert-list";

export const dynamic = "force-dynamic";

// 관리자: 구글 시트(공개) CSV 또는 붙여넣은 CSV/TSV → CertList 파싱
export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_auth")?.value !== "true") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  let csv: string | undefined = typeof body.csv === "string" ? body.csv : undefined;

  if (!csv && typeof body.url === "string" && body.url) {
    const m = body.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return NextResponse.json({ ok: false, error: "구글 시트 URL 형식이 올바르지 않습니다." }, { status: 400 });
    const exportUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
    try {
      const res = await fetch(exportUrl, { redirect: "follow" });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `시트를 불러오지 못했습니다(HTTP ${res.status}). 시트 공유를 '링크가 있는 모든 사용자: 뷰어'로 설정했는지 확인해주세요.` }, { status: 400 });
      }
      csv = await res.text();
      if (csv.trim().startsWith("<")) {
        return NextResponse.json({ ok: false, error: "시트가 비공개입니다. 공유를 '링크가 있는 모든 사용자: 뷰어'로 변경하거나, 아래 'CSV 붙여넣기'를 사용하세요." }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ ok: false, error: "시트 요청 중 오류가 발생했습니다. 'CSV 붙여넣기'를 사용해주세요." }, { status: 500 });
    }
  }

  if (!csv) return NextResponse.json({ ok: false, error: "url 또는 csv가 필요합니다." }, { status: 400 });
  // 탭 구분(붙여넣기)도 지원: 탭이 더 많으면 탭→콤마 변환은 위험하니 자체 분기
  const looksTsv = csv.split("\n")[0]?.includes("\t");
  const grid = looksTsv
    ? csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim() !== "").map((l) => l.split("\t"))
    : parseCsv(csv);
  const list = gridToCertList(grid);
  return NextResponse.json({ ok: true, list });
}
