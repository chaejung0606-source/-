"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import { buildFilename, buildExportName } from "@/lib/export-settings";
import { PRINT_CSS, PrintDocBody, docLabelOf } from "@/components/admin/PrintDocBody";

function PrintContent() {
  const { id } = useParams() as { id: string };
  const params = useSearchParams();
  const doc = params.get("doc") || "form";
  const [app, setApp] = useState<Application | null>(null);

  useEffect(() => {
    fetch(`/api/applications/${id}`).then((r) => r.json()).then((d: Application) => {
      setApp(d);
      const vars = {
        접수번호: d.receiptNumber, 이름: d.name, 학번: d.studentId,
        유형: APPLICATION_TYPE_LABELS[d.applicationType], 날짜: d.applicationDate,
      };
      if (doc === "form") document.title = buildFilename(d.applicationType, vars);
      else if (doc === "payment") document.title = buildExportName("payment", vars);
      else if (doc === "review") document.title = buildExportName("review", vars);
      else document.title = `${d.receiptNumber} ${docLabelOf(d, doc)}_(${d.name}_${d.studentId})`;
    });
  }, [id, doc]);

  if (!app) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;

  return (
    <div className="print-page">
      <style>{PRINT_CSS}</style>
      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={() => window.print()}>📄 PDF로 저장 / 인쇄</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          저장 파일명: <b>{app.receiptNumber} {docLabelOf(app, doc)}_({app.name}_{app.studentId})</b><br />
          인쇄 대화상자에서 &quot;PDF로 저장&quot;을 선택하면 위 파일명으로 저장됩니다.
        </p>
      </div>
      <PrintDocBody app={app} doc={doc} />
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">로딩 중...</div>}>
      <PrintContent />
    </Suspense>
  );
}
