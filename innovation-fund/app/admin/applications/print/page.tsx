"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import { buildExportName, type ExportKind } from "@/lib/export-settings";
import { PRINT_CSS, PrintDocBody } from "@/components/admin/PrintDocBody";

// 여러 신청 건 일괄 다운로드 — 건별 PDF를 생성해 ZIP 하나로 저장한다.
// (건마다 개별 인쇄 창을 열면 브라우저 팝업 차단으로 첫 건만 열리는 문제가 있어 창은 1개만 연다)
// 화면에는 전체 건이 순서대로 표시되어 내용 확인 후 ZIP 저장 또는 병합 인쇄를 선택할 수 있다.

const DOC_SIMPLE_LABEL: Record<string, string> = { payment: "지출자료", review: "심의요청서" };

function today10() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function BatchPrintContent() {
  const params = useSearchParams();
  const doc = params.get("doc") || "payment";
  const idsParam = params.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  const [apps, setApps] = useState<Application[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [ready, setReady] = useState<Set<string>>(new Set());
  const [zipBusy, setZipBusy] = useState(false);
  const [zipMsg, setZipMsg] = useState("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const onAttachmentReady = (fileId: string) => setReady((prev) => prev.has(fileId) ? prev : new Set(prev).add(fileId));
  // 증빙 첨부가 문서에 포함되는 지출자료에서만 변환 대기 표시
  const expected = apps && doc === "payment" ? apps.reduce((n, a) => n + a.files.length, 0) : 0;
  const attachmentsReady = ready.size >= expected;

  useEffect(() => {
    if (ids.length === 0) { setApps([]); return; }
    let alive = true;
    (async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await fetch(`/api/applications/${id}`);
            if (!r.ok) return { id, app: null as Application | null };
            return { id, app: (await r.json()) as Application };
          } catch { return { id, app: null as Application | null }; }
        }),
      );
      if (!alive) return;
      // 원래 선택 순서를 유지
      const ok = results.filter((r) => r.app).map((r) => r.app as Application);
      setApps(ok);
      setFailed(results.filter((r) => !r.app).map((r) => r.id));
      document.title = `${DOC_SIMPLE_LABEL[doc] || "지출자료"} 일괄(${ok.length}건)_${today10()}`;
    })();
    return () => { alive = false; };
  }, [idsParam, doc]);

  // 한 신청 건의 화면 영역을 A4 페이지 단위로 잘라 PDF(blob) 생성
  // 페이지 경계는 .ev-page 블록 시작점을 우선 사용하고, 한 블록이 A4보다 길면 추가 분할한다.
  const sectionToPdf = async (el: HTMLElement): Promise<Blob> => {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const elTop = el.getBoundingClientRect().top;
    const cssH = el.offsetHeight;
    const pxPerCss = canvas.height / cssH;
    const breaks = Array.from(el.querySelectorAll<HTMLElement>(".ev-page"))
      .map((p) => p.getBoundingClientRect().top - elTop)
      .filter((t) => t > 4)
      .sort((a, b) => a - b);
    const bounds = [0, ...breaks, cssH];

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const MARGIN = 10;
    const pageW = 210 - MARGIN * 2;
    const pageH = 297 - MARGIN * 2;
    const maxSliceCss = (pageH / pageW) * el.offsetWidth; // A4 비율에 맞는 최대 CSS 높이
    let first = true;
    for (let s = 0; s < bounds.length - 1; s++) {
      let y = bounds[s];
      const end = bounds[s + 1];
      while (y < end - 1) {
        const sliceCss = Math.min(end - y, maxSliceCss);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.max(1, Math.round(sliceCss * pxPerCss));
        const ctx = slice.getContext("2d");
        if (!ctx) throw new Error("canvas 2d context 없음");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, Math.round(y * pxPerCss), canvas.width, slice.height, 0, 0, slice.width, slice.height);
        if (!first) pdf.addPage();
        first = false;
        const hMm = (slice.height / slice.width) * pageW;
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN, MARGIN, pageW, Math.min(hMm, pageH));
        y += sliceCss;
      }
    }
    return pdf.output("blob");
  };

  // 건별 PDF를 ZIP으로 묶어 다운로드
  const downloadZip = async () => {
    if (!apps || apps.length === 0 || zipBusy) return;
    setZipBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const used = new Set<string>();
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        setZipMsg(`PDF 생성 중… (${i + 1}/${apps.length}) ${app.name}`);
        const el = sectionRefs.current[app.id];
        if (!el) continue;
        const blob = await sectionToPdf(el);
        const vars = {
          접수번호: app.receiptNumber, 이름: app.name, 학번: app.studentId,
          유형: APPLICATION_TYPE_LABELS[app.applicationType], 날짜: app.applicationDate,
        };
        const base = buildExportName(doc as ExportKind, vars);
        let fname = `${base}.pdf`;
        for (let n = 2; used.has(fname); n++) fname = `${base} (${n}).pdf`;
        used.add(fname);
        zip.file(fname, blob);
      }
      setZipMsg("ZIP 압축 중…");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName = buildExportName("batchZip", {
        문서: DOC_SIMPLE_LABEL[doc] || "지출자료", 날짜: today10(), 건수: String(apps.length),
      }) + ".zip";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(a.href);
      setZipMsg(`✓ 완료 — ${apps.length}건을 ${zipName} 으로 저장했습니다.`);
    } catch (e) {
      setZipMsg("ZIP 생성 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setZipBusy(false);
    }
  };

  if (!apps) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
  if (apps.length === 0) return <div className="p-10 text-center text-gray-400">인쇄할 신청 건이 없습니다.</div>;

  return (
    <div className="print-page">
      <style>{PRINT_CSS}</style>
      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={downloadZip} disabled={zipBusy || !attachmentsReady}>
          {zipBusy ? "⏳ 생성 중…" : "🗜 ZIP으로 저장 (건별 PDF)"}
        </button>
        <button onClick={() => window.print()} style={{ background: "#475569" }}>📄 전체 병합 인쇄</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          선택한 <b>{apps.length}건</b> — &lsquo;ZIP으로 저장&rsquo;은 신청 건마다 개별 PDF 파일을 만들어 ZIP 하나로 다운로드합니다.
          {expected > 0 && !attachmentsReady && (
            <><br /><span style={{ color: "#dc2626" }}>첨부 변환 중… ({ready.size}/{expected}) 완료 후 저장할 수 있습니다.</span></>
          )}
          {expected > 0 && attachmentsReady && !zipMsg && (
            <><br /><span style={{ color: "#16a34a" }}>✓ 첨부 {expected}건 준비 완료</span></>
          )}
          {zipMsg && <><br /><span style={{ color: zipMsg.startsWith("✓") ? "#16a34a" : "#2563eb" }}>{zipMsg}</span></>}
          {failed.length > 0 && (
            <><br /><span style={{ color: "#dc2626" }}>불러오지 못한 {failed.length}건이 있습니다. (권한 또는 네트워크 문제)</span></>
          )}
        </p>
      </div>
      {apps.map((app, i) => (
        <div
          key={app.id}
          ref={(el) => { sectionRefs.current[app.id] = el; }}
          className={i > 0 ? "doc-break" : undefined}
        >
          <PrintDocBody app={app} doc={doc} onAttachmentReady={onAttachmentReady} />
        </div>
      ))}
    </div>
  );
}

export default function BatchPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">로딩 중...</div>}>
      <BatchPrintContent />
    </Suspense>
  );
}
