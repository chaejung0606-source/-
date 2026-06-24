"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Application } from "@/types";
import { buildExportName } from "@/lib/export-settings";
import { PRINT_CSS, PrintDocBody, docLabelOf } from "@/components/admin/PrintDocBody";

function BatchContent() {
  const params = useSearchParams();
  const doc = params.get("doc") || "payment";
  const ids = (params.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const [apps, setApps] = useState<Application[] | null>(null);

  useEffect(() => {
    if (ids.length === 0) { setApps([]); return; }
    Promise.all(ids.map((id) => fetch(`/api/applications/${id}`).then((r) => r.json()).catch(() => null)))
      .then((list) => {
        const valid = list.filter(Boolean) as Application[];
        setApps(valid);
        const kind = doc === "review" ? "review" : "payment";
        const label = doc === "review" ? "심의요청서" : "지출자료";
        document.title = buildExportName(kind, { 접수번호: `외 ${valid.length}건`, 이름: "선택", 학번: "", 유형: label, 날짜: new Date().toISOString().slice(0, 10) }) || `선택 ${label} ${valid.length}건`;
      });
  }, [doc, ids.join(",")]);

  if (!apps) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
  if (apps.length === 0) return <div className="p-10 text-center text-gray-400">선택된 항목이 없습니다.</div>;

  const label = doc === "review" ? "심의요청서" : "지출자료";

  return (
    <div className="print-page">
      <style>{PRINT_CSS}</style>
      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={() => window.print()}>📄 PDF로 저장 / 인쇄 ({apps.length}건)</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          선택한 {apps.length}건의 {label}를 이어서 출력합니다. 각 신청 건은 새 페이지에서 시작됩니다.
        </p>
      </div>
      {apps.map((app, i) => (
        <div key={app.id} className={i > 0 ? "doc-break" : undefined}>
          <PrintDocBody app={app} doc={doc} />
        </div>
      ))}
    </div>
  );
}

export default function BatchPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">로딩 중...</div>}>
      <BatchContent />
    </Suspense>
  );
}
