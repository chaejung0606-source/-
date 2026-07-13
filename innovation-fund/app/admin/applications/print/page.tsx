"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Application } from "@/types";
import { PRINT_CSS, PrintDocBody, docLabelOf } from "@/components/admin/PrintDocBody";

// 여러 신청 건을 한 창에 모아 인쇄 — 팝업 차단으로 개별 창이 막히던 문제 해결.
// 각 건은 페이지 나눔(doc-break)으로 구분되어 하나의 PDF로 저장/인쇄된다.
function today10() {
  // Date.now()는 이 환경에서 안전하게 사용 가능(클라이언트 렌더)
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
      const label = ok[0] ? docLabelOf(ok[0], doc) : "지출자료";
      document.title = `${label}_일괄(${ok.length}건)_${today10()}`;
    })();
    return () => { alive = false; };
  }, [idsParam, doc]);

  if (!apps) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
  if (apps.length === 0) return <div className="p-10 text-center text-gray-400">인쇄할 신청 건이 없습니다.</div>;

  return (
    <div className="print-page">
      <style>{PRINT_CSS}</style>
      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={() => window.print()}>📄 PDF로 저장 / 인쇄</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          선택한 <b>{apps.length}건</b>을 한 문서로 모았습니다. 인쇄 대화상자에서 &quot;PDF로 저장&quot;을 선택하세요.
          {failed.length > 0 && (
            <><br /><span style={{ color: "#dc2626" }}>불러오지 못한 {failed.length}건이 있습니다. (권한 또는 네트워크 문제)</span></>
          )}
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
      <BatchPrintContent />
    </Suspense>
  );
}
