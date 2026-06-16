"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { Application } from "@/types";
import {
  APPLICATION_TYPE_LABELS, REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS,
} from "@/types";
import { buildFilename } from "@/lib/export-settings";

function subTypeName(app: Application): string {
  if (app.gradeDetail) {
    const m = { microdegree: "성적 우수 - 마이크로디그리(MD)", minor: "성적 우수 - 부전공", double: "성적 우수 - 복수전공" };
    return m[app.gradeDetail.subType];
  }
  if (app.contestDetail) return "경진대회 등 입상";
  if (app.certificateDetail) return "자격증 취득";
  return "-";
}

function typeDetailRows(app: Application): [string, string][] {
  if (app.programDetail) {
    const d = app.programDetail;
    return [["프로그램명", d.programName], ["프로그램 유형", d.programType], ["참여 기간", d.participationPeriod], ["지도교수/담당자", d.supervisorName], ["참여 내용", d.participationContent]];
  }
  if (app.staffDetail) {
    const d = app.staffDetail;
    return [["프로그램명", d.programName], ["근무 기간", d.workPeriod], ["근무 일자", d.workDates], ["총 근무시간", `${d.totalHours}시간`], ["학생 구분", d.studentType === "graduate" ? "대학원생" : "대학생"], ["담당 업무", d.taskDescription]];
  }
  if (app.gradeDetail) {
    const d = app.gradeDetail;
    const rows: [string, string][] = [];
    if (d.subType === "microdegree") {
      rows.push(["학과", d.mdDepartment || "-"], ["MD 과정", d.mdProgramName || d.courseName], ["이수 교과목", (d.mdCourses || []).map((c) => `${c.name}(${c.grade})`).join(", ")], ["평점 평균", String(d.gpa)]);
    } else {
      rows.push(["전공명", d.minorMajorName || "-"], ["이수 학점", String(d.minorMajorCredits ?? "")], ["평점 평균", String(d.gpa)], ["MD 1개 이상 이수", d.minorMdCompleted ? "예" : "아니오"], ["이수 MD명", d.minorMdName || "-"]);
    }
    return rows;
  }
  if (app.contestDetail) {
    const d = app.contestDetail;
    const award = { grand: "대상(최우수)", silver: "은상(우수상)", bronze: "동상(장려상)", participation: "입상" };
    return [["대회명", d.contestName], ["대회 주제", d.contestTheme], ["개최기관", d.organizer], ["대회 규모", `${d.scale}규모`], ["개인/팀", d.isTeam ? "팀" : "개인"], ["시상 등급", award[d.awardLevel]], ["수상일", d.awardDate], ["상금/부상 수령", d.hasMonetaryPrize ? "있음" : "없음"]];
  }
  if (app.certificateDetail) {
    const d = app.certificateDetail;
    const lvl = { high: "상", mid: "중", low: "하", review: "심의 필요" };
    return [["자격증명", d.certName], ["발급기관", d.issuingOrg], ["취득일", d.acquisitionDate], ["난이도", lvl[d.difficulty]], ["미래융합가상학과", d.isMirae ? "예" : "아니오"]];
  }
  return [];
}

const DOC_TITLE: Record<string, string> = {
  form: "혁신인재지원금 지급신청서",
  evidence: "공통 증빙서류",
  review: "혁신인재지원금 심의요청서",
  payment: "혁신인재지원금 지출자료",
};

function PrintContent() {
  const { id } = useParams() as { id: string };
  const params = useSearchParams();
  const doc = params.get("doc") || "form";
  const [app, setApp] = useState<Application | null>(null);

  useEffect(() => {
    fetch(`/api/applications/${id}`).then((r) => r.json()).then((d: Application) => {
      setApp(d);
      // 인쇄 시 기본 저장 파일명 지정
      const label = DOC_TITLE[doc] || "혁신인재지원금";
      const vars = {
        접수번호: d.receiptNumber, 이름: d.name, 학번: d.studentId,
        유형: APPLICATION_TYPE_LABELS[d.applicationType], 날짜: d.applicationDate,
      };
      if (doc === "form") {
        document.title = buildFilename(d.applicationType, vars);
      } else {
        document.title = `${d.receiptNumber} ${label}_(${d.name}_${d.studentId})`;
      }
    });
  }, [id, doc]);

  if (!app) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;

  return (
    <div className="print-page">
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .print-page { max-width: 800px; margin: 0 auto; padding: 24px; color: #111; font-size: 13px; }
        .doc-title { text-align: center; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .doc-sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
        table.form { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.form th, table.form td { border: 1px solid #333; padding: 7px 9px; text-align: left; vertical-align: top; }
        table.form th { background: #ccd5e8; width: 130px; font-weight: 700; white-space: nowrap; color: #1e293b; }
        table.form td { background: #ffffff; }
        .sec { font-weight: 700; font-size: 14px; margin: 16px 0 6px; border-left: 4px solid #2563eb; padding-left: 8px; }
        .ev-page { page-break-after: always; min-height: 90vh; }
        .ev-page:last-child { page-break-after: auto; }
        .ev-head { border: 1px solid #333; background: #ccd5e8; font-weight: 700; padding: 8px 10px; border-radius: 6px 6px 0 0; }
        .ev-img { width: 100%; height: 75vh; object-fit: contain; border: 1px solid #333; border-top: none; border-radius: 0 0 6px 6px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 13px; }
        .ev-img img { max-width: 100%; max-height: 100%; }
        .sign-row { margin-top: 30px; text-align: right; font-size: 13px; }
        .sign-img { display: inline-block; height: 46px; vertical-align: middle; margin: 0 6px; }
        .total-row th, .total-row td { background: #eef2ff !important; font-weight: 800; font-size: 15px; }
        .btn-bar button { background: #2563eb; color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 4px; }
      `}</style>

      <div className="btn-bar no-print" style={{ textAlign: "center", marginBottom: 20 }}>
        <button onClick={() => window.print()}>📄 PDF로 저장 / 인쇄</button>
        <button onClick={() => window.close()} style={{ background: "#888" }}>닫기</button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          저장 파일명: <b>{app.receiptNumber} {DOC_TITLE[doc]}_({app.name}_{app.studentId})</b><br />
          인쇄 대화상자에서 &quot;PDF로 저장&quot;을 선택하면 위 파일명으로 저장됩니다.
        </p>
      </div>

      {/* === 신청서 === */}
      {doc === "form" && (
        <>
          <div className="doc-title">혁신인재지원금 지급신청서</div>
          <div className="doc-sub">강원대학교 데이터보안·활용 혁신융합대학사업단 · 접수번호 {app.receiptNumber}</div>

          <div className="sec">1. 기본 정보</div>
          <table className="form"><tbody>
            <tr><th>접수번호</th><td>{app.receiptNumber}</td><th>신청일시</th><td>{new Date(app.createdAt).toLocaleString("ko-KR")}</td></tr>
            <tr><th>지원유형</th><td>{APPLICATION_TYPE_LABELS[app.applicationType]}</td><th>세부유형</th><td>{subTypeName(app)}</td></tr>
          </tbody></table>

          <div className="sec">2. 신청자 정보</div>
          <table className="form"><tbody>
            <tr><th>성명</th><td>{app.name}</td><th>학번</th><td>{app.studentId}</td></tr>
            <tr><th>대학</th><td>{app.university}</td><th>학과/전공</th><td>{app.department}</td></tr>
            <tr><th>학위/학년</th><td>{app.grade}</td><th>학적상태</th><td>{app.academicStatus}{app.gradCompletion && app.grade === "대학원" ? ` (${app.gradCompletion}${app.completedYears ? `, ${app.completedYears}` : ""}${app.currentSemester ? `, ${app.currentSemester}` : ""})` : ""}</td></tr>
            <tr><th>연락처</th><td>{app.phone}</td><th>이메일</th><td>{app.email}</td></tr>
          </tbody></table>

          <div className="sec">3. 계좌 정보 (본인 명의)</div>
          <table className="form"><tbody>
            <tr><th>은행명</th><td>{app.bankInfo.bankName}</td><th>예금주</th><td>{app.bankInfo.accountHolder}</td></tr>
            <tr><th>계좌번호</th><td colSpan={3}>{app.bankInfo.accountNumber}</td></tr>
          </tbody></table>

          <div className="sec">4. 신청 상세 내용</div>
          <table className="form"><tbody>
            {typeDetailRows(app).map(([k, v]) => (<tr key={k}><th>{k}</th><td colSpan={3}>{v}</td></tr>))}
          </tbody></table>

          <div className="sec">5. 금액 및 심사</div>
          <table className="form"><tbody>
            <tr><th>신청 금액</th><td>{app.requestAmount.toLocaleString()}원</td><th>자동 산정액</th><td>{app.calculatedAmount.toLocaleString()}원</td></tr>
            <tr><th>최종 승인액</th><td>{app.approvedAmount != null ? app.approvedAmount.toLocaleString() + "원" : "-"}</td><th>검토 상태</th><td>{REVIEW_STATUS_LABELS[app.reviewStatus]}</td></tr>
          </tbody></table>

          <p style={{ marginTop: 24, fontSize: 12, lineHeight: 1.7 }}>
            위와 같이 혁신인재지원금을 신청하며, 제출한 내용과 증빙서류가 사실과 다름없음을 확인합니다.<br />
            허위 신청 또는 부적격 사유 확인 시 지급이 취소되거나 환수될 수 있음에 동의합니다.
          </p>
          <div className="sign-row">
            신청일: {app.applicationDate} &nbsp;&nbsp;&nbsp; 신청인: {app.name}
            {app.signature ? <img src={app.signature} alt="서명" className="sign-img" /> : " (서명)"}
          </div>
        </>
      )}

      {/* === 증빙서류 (서류별 1페이지) === */}
      {doc === "evidence" && (
        <>
          <div className="doc-title">양식1. 공통 증빙서류</div>
          <div className="doc-sub">접수번호 {app.receiptNumber} · {app.name} ({app.studentId})</div>
          {app.files.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", padding: 40 }}>첨부된 증빙서류가 없습니다.</p>
          ) : (
            app.files.map((f) => (
              <div className="ev-page" key={f.id}>
                <div className="ev-head">{DOCUMENT_TYPE_LABELS[f.type]} — {f.name}</div>
                <div className="ev-img">
                  {f.url ? <img src={f.url} alt={f.name} /> : "이미지 미리보기 (업로드 파일 연동 시 자동 삽입)"}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* === 심의요청서 === */}
      {doc === "review" && (
        <>
          <div className="doc-title">혁신인재지원금 심의요청서</div>
          <div className="doc-sub">강원대학교 데이터보안·활용 혁신융합대학사업단 · 접수번호 {app.receiptNumber}</div>

          <div className="sec">학생 정보</div>
          <table className="form"><tbody>
            <tr><th>성명</th><td>{app.name}</td><th>학번</th><td>{app.studentId}</td></tr>
            <tr><th>학과/전공</th><td>{app.department}</td><th>학위/학년</th><td>{app.grade}</td></tr>
            <tr><th>지원유형</th><td>{APPLICATION_TYPE_LABELS[app.applicationType]}</td><th>세부유형</th><td>{subTypeName(app)}</td></tr>
          </tbody></table>

          <div className="sec">심의 대상 내용</div>
          <table className="form"><tbody>
            {typeDetailRows(app).map(([k, v]) => (<tr key={k}><th>{k}</th><td colSpan={3}>{v}</td></tr>))}
            <tr><th>자동 산정액</th><td colSpan={3}>{app.calculatedAmount.toLocaleString()}원</td></tr>
          </tbody></table>

          <div className="sec">심의 의견</div>
          <table className="form"><tbody>
            <tr><th>심의 결과</th><td colSpan={3} style={{ height: 40 }}>□ 적격 &nbsp;&nbsp; □ 보완 &nbsp;&nbsp; □ 부적격</td></tr>
            <tr><th>심의 의견</th><td colSpan={3} style={{ height: 90 }}></td></tr>
          </tbody></table>

          <div className="sign-row">
            심의일: 20&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;. &nbsp;&nbsp;&nbsp; 심의자(교수): &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (서명)
          </div>
        </>
      )}

      {/* === 지출자료 === */}
      {doc === "payment" && (
        <>
          <div className="doc-title">혁신인재지원금 지출자료</div>
          <div className="doc-sub">강원대학교 데이터보안·활용 혁신융합대학사업단 · 접수번호 {app.receiptNumber}</div>

          <div className="sec">지급 대상자</div>
          <table className="form"><tbody>
            <tr><th>성명</th><td>{app.name}</td><th>학번</th><td>{app.studentId}</td></tr>
            <tr><th>지원유형</th><td>{APPLICATION_TYPE_LABELS[app.applicationType]}</td><th>세부유형</th><td>{subTypeName(app)}</td></tr>
          </tbody></table>

          <div className="sec">계좌 정보 (본인 명의)</div>
          <table className="form"><tbody>
            <tr><th>은행명</th><td>{app.bankInfo.bankName}</td><th>예금주</th><td>{app.bankInfo.accountHolder}</td></tr>
            <tr><th>계좌번호</th><td colSpan={3}>{app.bankInfo.accountNumber}</td></tr>
          </tbody></table>

          <div className="sec">지급 내역</div>
          <table className="form"><tbody>
            {typeDetailRows(app).filter(([k]) => ["자격증명", "MD 과정", "전공명", "대회명", "프로그램명"].includes(k)).map(([k, v]) => (
              <tr key={k}><th>{k}</th><td colSpan={3}>{v}</td></tr>
            ))}
            <tr><th>지급 상태</th><td colSpan={3}>{PAYMENT_STATUS_LABELS[app.paymentStatus]}</td></tr>
            <tr><th>지급액</th><td colSpan={3}>{(app.approvedAmount ?? app.calculatedAmount).toLocaleString()}원</td></tr>
            <tr className="total-row"><th>합계</th><td colSpan={3}>{(app.approvedAmount ?? app.calculatedAmount).toLocaleString()}원</td></tr>
          </tbody></table>

          <p style={{ marginTop: 20, fontSize: 12, color: "#555" }}>※ 위 금액을 신청인 본인 명의 계좌로 지급함.</p>
        </>
      )}
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
