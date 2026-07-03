import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { parseCsv, gridToSheetData, newCertId, type CertSheet } from "@/lib/cert-list";
import { requireMenu } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 관리자: 구글 시트(공개) CSV/XLSX 또는 붙여넣은 CSV/TSV → CertList 파싱
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/certificates"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  // 전체 시트 가져오기(xlsx) — 구글 시트의 모든 탭을 한 번에
  if (body.allSheets && typeof body.url === "string" && body.url) {
    const m = body.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return NextResponse.json({ ok: false, error: "구글 시트 URL 형식이 올바르지 않습니다." }, { status: 400 });
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=xlsx`;
    try {
      const res = await fetch(xlsxUrl, { redirect: "follow" });
      if (!res.ok) return NextResponse.json({ ok: false, error: `시트를 불러오지 못했습니다(HTTP ${res.status}). 공유를 '링크가 있는 모든 사용자: 뷰어'로 설정했는지 확인해주세요.` }, { status: 400 });
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.slice(0, 1).toString() === "<") return NextResponse.json({ ok: false, error: "시트가 비공개입니다. 공유를 '링크가 있는 모든 사용자: 뷰어'로 변경하거나 'CSV/표 붙여넣기'를 사용하세요." }, { status: 400 });
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheets: CertSheet[] = wb.SheetNames.map((name) => {
        const aoa = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, blankrows: false, defval: "" });
        const grid = (aoa as unknown[][]).map((r) => (r as unknown[]).map((c) => String(c ?? ""))).filter((r) => r.some((c) => c.trim() !== ""));
        const d = gridToSheetData(grid);
        return { id: newCertId("sheet"), name: String(name).slice(0, 40), columns: d.columns, rows: d.rows };
      }).filter((s) => s.columns.length > 0);
      if (sheets.length === 0) return NextResponse.json({ ok: false, error: "시트에서 데이터를 찾지 못했습니다." }, { status: 400 });
      return NextResponse.json({ ok: true, sheets });
    } catch {
      return NextResponse.json({ ok: false, error: "시트(xlsx) 요청 중 오류가 발생했습니다. 'CSV/표 붙여넣기'를 사용해주세요." }, { status: 500 });
    }
  }

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
  const data = gridToSheetData(grid);
  return NextResponse.json({ ok: true, data });
}
