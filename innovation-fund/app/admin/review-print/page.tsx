"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";

function subTypeName(app: Application): string {
  if (app.gradeDetail) {
    const m = { microdegree: "성적우수-MD", minor: "성적우수-부전공", double: "성적우수-복수전공" };
    return m[app.gradeDetail.subType];
  }
  if (app.contestDetail) return "경진대회 입상";
  if (app.certificateDetail) return "자격증 취득";
  return "-";
}

function targetName(app: Application): string {
  if (app.certificateDetail) return app.certificateDetail.certName;
  if (app.contestDetail) return app.contestDetail.contestName;
  if (app.gradeDetail) return app.gradeDetail.mdProgramName || app.gradeDetail.minorMajorName || "-";
  if (app.programDetail) return app.programDetail.programName;
  return "-";
}

function ReviewPrintContent() {
  const params = useSearchParams();
  const month = params.get("month") || "";
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications").then((r) => r.json()).then((all: Application[]) => {
      const filtered = all.filter((a) => {
        const ym = (a.applicationDate || a.createdAt || "").slice(0, 7);
        return (!month || ym === month) && a.reviewStatus === "committee";
      });
      setApps(filtered);
      setLoading(false);
      document.title = `${month || "전체"} 혁신인재지원금 심의요청서`;
    });
  }, [month]);

  if (loading) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;

  return (
    <div className="print-page">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 14mm; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .print-page { max-width: 1000px; margin: 0 auto; padding: 24px; color: #111; font-size: 12px; }
        .doc-title { text-align: center; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .doc-sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; vertical-align: top; }
        thead th { background: #ccd5e8; font-weight: 700; text-align: center; }
        .btn-bar button { background: #2563eb; color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 4px; }
      `}</style>

      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={() => window.print()}>📄 PDF로 저장 / 인쇄</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          {month ? `${month} 신청 건 중 심의대상(심의필요 상태) ${apps.length}건` : `심의대상 ${apps.length}건`}
        </p>
      </div>

      <div className="doc-title">혁신인재지원금 심의요청서</div>
      <div className="doc-sub">강원대학교 데이터보안·활용 혁신융합대학사업단 · {month ? `${month} 신청 건` : "전체"} · 심의대상 {apps.length}건</div>

      {apps.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", padding: 40 }}>해당 기간에 심의 대상(심의필요 상태) 건이 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}>No</th>
              <th>접수번호</th>
              <th>신청일</th>
              <th>성명</th>
              <th>학번</th>
              <th>학과</th>
              <th>지원유형</th>
              <th>세부</th>
              <th>심의 대상</th>
              <th>신청액</th>
              <th style={{ width: 130 }}>심의 결과</th>
              <th style={{ width: 160 }}>심의 의견</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a, i) => (
              <tr key={a.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td>{a.receiptNumber}</td>
                <td>{a.applicationDate}</td>
                <td>{a.name}</td>
                <td>{a.studentId}</td>
                <td>{a.department}</td>
                <td>{APPLICATION_TYPE_LABELS[a.applicationType]}</td>
                <td>{subTypeName(a)}</td>
                <td>{targetName(a)}</td>
                <td style={{ textAlign: "right" }}>{a.requestAmount.toLocaleString()}</td>
                <td style={{ textAlign: "center", fontSize: 11 }}>적격 / 부적격</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 30, textAlign: "right", fontSize: 13 }}>
        심의일: 20&nbsp;&nbsp;.&nbsp;&nbsp;.&nbsp;&nbsp;. &nbsp;&nbsp;&nbsp; 심의위원: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (서명)
      </div>
    </div>
  );
}

export default function ReviewPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">로딩 중...</div>}>
      <ReviewPrintContent />
    </Suspense>
  );
}
