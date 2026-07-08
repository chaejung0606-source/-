"use client";
// 공간대여 이용결과 — 공간 이용 사진 PDF 저장용 인쇄 화면 (플랫폼 공통 인쇄 양식 사용)
// 관리자 이용결과 제출내역에서 열리며, 브라우저 인쇄 대화상자에서 "PDF로 저장"으로 내려받는다.
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PRINT_CSS } from "@/components/admin/PrintDocBody";
import type { RentalRequest } from "@/lib/space-rental";

function PrintContent() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const [req, setReq] = useState<RentalRequest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/space-rental").then((r) => r.json()).then((d) => {
      const found = (Array.isArray(d.requests) ? (d.requests as RentalRequest[]) : []).find((x) => x.id === id);
      if (!found) { setError("신청 건을 찾을 수 없습니다."); return; }
      setReq(found);
      document.title = `공간대여 이용결과(이용 사진)_${found.spaceName || "공간"}_(${found.applicantName || "-"}${found.studentId ? `_${found.studentId}` : ""})`;
    }).catch(() => setError("불러오지 못했습니다."));
  }, [id]);

  if (error) return <div className="p-10 text-center text-gray-400">{error}</div>;
  if (!req) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
  const u = req.usageResult;
  const photos = u?.photos || [];
  const period = req.date ? `${req.date} ${req.start} ~ ${req.endDate && req.endDate !== req.date ? `${req.endDate} ` : ""}${req.end}` : "-";

  return (
    <div className="print-page">
      <style>{PRINT_CSS}</style>
      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={() => window.print()}>📄 PDF로 저장 / 인쇄</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          인쇄 대화상자에서 &quot;PDF로 저장&quot;을 선택하면 파일로 저장됩니다.
        </p>
      </div>

      <div className="doc-title">공간대여 이용결과 (이용 사진)</div>
      <div className="doc-sub">강원대학교 데이터보안·활용 혁신융합대학사업단</div>

      <div className="sec">대여 정보</div>
      <table className="form"><tbody>
        <tr><th>접수번호</th><td>{req.receiptNo || "-"}</td><th>대여 일시</th><td>{period}</td></tr>
        <tr><th>대여 공간</th><td colSpan={3}>{req.spaceName || "-"}</td></tr>
        <tr><th>신청자</th><td>{req.applicantName || "-"}</td><th>학번/소속</th><td>{req.studentId || "-"}</td></tr>
        <tr><th>이용 인원</th><td>{u?.users?.length ? `${u.users.length}명` : (req.headcount ? `${req.headcount}명` : "-")}</td><th>이용결과 제출</th><td>{u?.submittedAt ? new Date(u.submittedAt).toLocaleString("ko-KR") : "-"}</td></tr>
        {u?.users && u.users.length > 0 && (
          <tr><th>이용자 명단</th><td colSpan={3}>{u.users.map((x) => x.name).join(", ")}</td></tr>
        )}
        {u?.memo && <tr><th>비고</th><td colSpan={3}>{u.memo}</td></tr>}
      </tbody></table>

      {photos.length === 0 ? (
        <p style={{ color: "#888" }}>제출된 이용 사진이 없습니다.</p>
      ) : photos.map((p, i) => (
        <div className="ev-page" key={i}>
          <div className="ev-head">
            공간 이용 사진 ({i + 1} / {photos.length})
            <div className="ev-head-sub">{req.spaceName} · {period} · {req.applicantName}</div>
          </div>
          <div className="ev-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`이용 사진 ${i + 1}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SpaceRentalPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">로딩 중...</div>}>
      <PrintContent />
    </Suspense>
  );
}
