import type { Application } from "@/types";
import {
  APPLICATION_TYPE_LABELS, REVIEW_STATUS_LABELS, PAYMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS,
  TRANSPORT_MODE_LABELS, calcSupportTotal,
} from "@/types";

export function subTypeName(app: Application): string {
  if (app.gradeDetail) {
    const m = { microdegree: "성적 우수 - 마이크로디그리(MD)", minor: "성적 우수 - 부전공", double: "성적 우수 - 복수전공" };
    return m[app.gradeDetail.subType];
  }
  if (app.contestDetail) return "경진대회 등 입상";
  if (app.certificateDetail) return "자격증 취득";
  return "-";
}

function reportRows(entries?: import("@/types").ReportEntry[]): [string, string][] {
  return (entries || []).map((e) => [e.label || "보고서 항목", e.type === "file" ? `파일: ${e.fileName || "업로드됨"}` : (e.value || "-")] as [string, string]);
}

function extraCostRows(x?: import("@/types").ExtraCosts): [string, string][] {
  if (!x) return [];
  const rows: [string, string][] = [];
  if (x.registrationFee) rows.push(["등록비·참가비", `${x.registrationFee.toLocaleString()}원`]);
  if (x.lodgingFee) rows.push(["숙박비", `${x.lodgingFee.toLocaleString()}원${x.lodgingNights ? ` (${x.lodgingNights}박)` : ""}`]);
  return rows;
}

function costDetailRows(c?: import("@/types").CostDetail): [string, string][] {
  if (!c) return [];
  const rows: [string, string][] = [];
  if (c.registrationFee) rows.push(["등록비", `${c.registrationFee.toLocaleString()}원${c.registrationProofName ? ` (증빙: ${c.registrationProofName})` : ""}`]);
  (c.transports || []).forEach((t, i) => {
    const seg = (t.departure || t.arrival) ? `${t.departure || "-"}→${t.arrival || "-"}` : (t.route || "-");
    rows.push([`교통비 ${i + 1}`, `${t.date || "-"} · ${TRANSPORT_MODE_LABELS[t.mode]} · ${seg} · ${(t.amount || 0).toLocaleString()}원${t.proofName ? ` (증빙: ${t.proofName})` : ""}`]);
  });
  if (c.lodging) {
    const l = c.lodging;
    rows.push(["숙박비", (l.usage === "personal"
      ? `개인사용 · 결제 ${(l.roomAmount || 0).toLocaleString()}원`
      : `단체사용 · 전체 ${(l.roomAmount || 0).toLocaleString()}원 · 개인부담 ${(l.personalAmount || 0).toLocaleString()}원`)
      + (l.proofName ? ` (증빙: ${l.proofName})` : "")]);
  }
  rows.push(["지원비 합계", `${calcSupportTotal(c).toLocaleString()}원`]);
  return rows;
}

function costRows(c?: import("@/types").CostDetail, x?: import("@/types").ExtraCosts): [string, string][] {
  return c ? costDetailRows(c) : extraCostRows(x);
}

function typeDetailRows(app: Application): [string, string][] {
  if (app.programDetail) {
    const d = app.programDetail;
    return [["프로그램명", d.programName], ["프로그램 유형", d.programType], ["참여 기간", d.participationPeriod], ["지도교수/담당자", d.supervisorName], ["참여 내용", d.participationContent], ...costRows(d.costDetail, d.extraCosts), ...reportRows(d.reportEntries)];
  }
  if (app.staffDetail) {
    const d = app.staffDetail;
    return [["프로그램명", d.programName], ["근무 기간", d.workPeriod], ["근무 일자", d.workDates], ["총 근무시간", `${d.totalHours}시간`], ["학생 구분", d.studentType === "graduate" ? "대학원생" : "대학생"], ["담당 업무", d.taskDescription], ...costRows(d.costDetail, d.extraCosts)];
  }
  if (app.gradeDetail) {
    const d = app.gradeDetail;
    const rows: [string, string][] = [];
    if (d.subType === "microdegree") {
      rows.push(["학과", d.mdDepartment || "-"], ["MD 과정", d.mdProgramName || d.courseName], ["이수 교과목", (d.mdCourses || []).map((c) => `${c.name}(${c.grade})`).join(", ")], ["평점 평균", String(d.gpa)]);
    } else {
      const mc = d.minorCourses || [];
      const total = mc.reduce((s, c) => s + (Number(c.credits) || 0), 0);
      const mdEx = mc.filter((c) => c.mdProgramId && c.excluded).reduce((s, c) => s + (Number(c.credits) || 0), 0);
      rows.push(["전공명", d.minorMajorName || "-"]);
      if (mc.length) {
        rows.push(["이수 교과목", mc.map((c) => `${c.name}(${c.credits}학점, ${c.grade}${c.mdProgramId ? ", MD" : ""}${c.excluded ? "·불인정" : ""})`).join(", ")]);
        rows.push(["총 이수 학점", `${total}학점`], ["MD 학점 불인정", `-${mdEx}학점`]);
      }
      rows.push(["인정 이수 학점", `${d.minorMajorCredits ?? (total - mdEx)}학점`], ["평점 평균", String(d.gpa)], ["이수 MD 과정", d.minorMdName || "-"]);
    }
    return rows;
  }
  if (app.contestDetail) {
    const d = app.contestDetail;
    const award = { grand: "대상(최우수)", silver: "은상(우수상)", bronze: "동상(장려상)", participation: "입상" };
    return [["대회명", d.contestName], ["대회 주제", d.contestTheme], ["개최기관", d.organizer], ["대회 규모", `${d.scale}규모`], ["개인/팀", d.isTeam ? `팀 (${(d.teamMembers || []).length}명, 1인당 ${(d.calculatedAmount || 0).toLocaleString()}원)` : "개인"], ...((d.isTeam && (d.teamMembers || []).length > 0) ? [["팀원", (d.teamMembers || []).map((m) => `${m.name}(${m.studentId})`).join(", ")] as [string, string]] : []), ["시상 등급", award[d.awardLevel]], ["수상일", d.awardDate], ["상금/부상 수령", d.hasMonetaryPrize ? "있음" : "없음"]];
  }
  if (app.certificateDetail) {
    const d = app.certificateDetail;
    const lvl = { high: "상", mid: "중", low: "하", review: "심의 필요" };
    return [["자격증명", d.certName], ["발급기관", d.issuingOrg], ["취득일", d.acquisitionDate], ["난이도", lvl[d.difficulty]], ["미래융합가상학과", d.isMirae ? "예" : "아니오"]];
  }
  if (app.laborDetail) {
    const d = app.laborDetail;
    return [["프로그램", d.programName], ["역할", d.role], ["근로 기간", d.workPeriod], ["총 근로시간", `${d.totalHours}시간`], ["학생 구분", d.studentType === "graduate" ? "대학원생" : "학부생"], ["확인자", d.supervisorName], ["근로 내용", d.workDetail], ...reportRows(d.reportEntries)];
  }
  if (app.activityDetail) {
    const d = app.activityDetail;
    if (d.activityKind === "paper" && d.paper) {
      const p = d.paper;
      return [
        ["신청 구분", "논문게재료"],
        ["논문명", p.paperTitle], ["학술지명", p.journalName], ["ISSN", p.issn],
        ["발행권(호)", p.volumeIssue], ["발행일", p.publishDate], ["발행기관", p.publisher],
        ["신청금액(게재료)", `${(p.requestFee || 0).toLocaleString()}원`],
        ["관련 분야", d.activityType], ["사업단 연관성", d.activityContent],
      ];
    }
    const rows: [string, string][] = [
      ["신청 구분", "학생활동지원비 (학회참석 등)"],
      ["활동명", d.activityName], ["활동 유형", d.activityType],
      ["활동 기간", d.activityPeriod], ["활동 내용", d.activityContent],
    ];
    rows.push(...costRows(d.costDetail, d.extraCosts));
    rows.push(...reportRows(d.reportEntries));
    return rows;
  }
  return [];
}

export function fundLabelOf(app: Application): string {
  if (app.applicationType === "activity") return "학생활동지원비";
  if (app.applicationType === "labor") return "근로장학금";
  return "혁신인재지원금";
}

export function docLabelOf(app: Application, doc: string): string {
  const f = fundLabelOf(app);
  switch (doc) {
    case "evidence": return `${f} 증빙서류`;
    case "review": return `${f} 심의요청서`;
    case "payment": return `${f} 지출자료`;
    default: return `${f} 지급신청서`;
  }
}

export const PRINT_CSS = `
  @media print {
    @page { size: A4; margin: 16mm; }
    .no-print { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  html, body { background: #fff !important; }
  .print-page { max-width: 800px; margin: 0 auto; padding: 24px; color: #111; font-size: 13px; background: #fff; }
  .doc-title { text-align: center; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .doc-sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
  table.form { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.form th, table.form td { border: 1px solid #333; padding: 7px 9px; text-align: left; vertical-align: top; }
  table.form th { background: #ccd5e8; width: 130px; font-weight: 700; white-space: nowrap; color: #1e293b; }
  table.form td { background: #ffffff; }
  .sec { font-weight: 700; font-size: 14px; margin: 16px 0 6px; border-left: 4px solid #2563eb; padding-left: 8px; }
  .ev-page { page-break-after: always; min-height: 90vh; }
  .ev-page:last-child { page-break-after: auto; }
  .doc-break { page-break-before: always; }
  .ev-head { border: 1px solid #333; background: #ccd5e8; font-weight: 700; padding: 8px 10px; border-radius: 6px 6px 0 0; }
  .ev-head-sub { font-size: 11px; font-weight: 500; color: #334155; margin-top: 2px; }
  .ev-img { width: 100%; height: 75vh; object-fit: contain; border: 1px solid #333; border-top: none; border-radius: 0 0 6px 6px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 13px; }
  .ev-img img { max-width: 100%; max-height: 100%; }
  .sign-row { margin-top: 30px; text-align: right; font-size: 13px; }
  .sign-img { display: inline-block; height: 46px; vertical-align: middle; margin: 0 6px; }
  .total-row th, .total-row td { background: #eef2ff !important; font-weight: 800; font-size: 15px; }
  .btn-bar button { background: #2563eb; color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 4px; }
`;

// 한 신청 건의 문서 본문 (제목 + 섹션). doc: form | payment | review | evidence
export function PrintDocBody({ app, doc }: { app: Application; doc: string }) {
  const studentInfoBlock = (
    <>
      <div className="sec">신청자 정보</div>
      <table className="form"><tbody>
        <tr><th>성명</th><td>{app.name}</td><th>학번</th><td>{app.studentId}</td></tr>
        <tr><th>대학</th><td>{app.university}</td><th>학과/전공</th><td>{app.department}</td></tr>
        <tr><th>학위/학년</th><td>{app.grade}</td><th>학적상태</th><td>{app.academicStatus}{app.gradCompletion && app.grade === "대학원" ? ` (${app.gradCompletion}${app.completedYears ? `, ${app.completedYears}` : ""}${app.currentSemester ? `, ${app.currentSemester}` : ""})` : ""}</td></tr>
        <tr><th>연락처</th><td>{app.phone}</td><th>이메일</th><td>{app.email}</td></tr>
        <tr><th>지원유형</th><td>{APPLICATION_TYPE_LABELS[app.applicationType]}</td><th>세부유형</th><td>{subTypeName(app)}</td></tr>
        <tr><th>은행/예금주</th><td>{app.bankInfo.bankName} / {app.bankInfo.accountHolder}</td><th>계좌번호</th><td>{app.bankInfo.accountNumber}</td></tr>
      </tbody></table>
    </>
  );

  return (
    <>
      <div className="doc-title">{docLabelOf(app, doc)}</div>
      <div className="doc-sub">강원대학교 데이터보안·활용 혁신융합대학사업단 · 접수번호 {app.receiptNumber}</div>
      {doc === "payment" && <p style={{ textAlign: "center", fontSize: 11, color: "#888", marginTop: -12, marginBottom: 16 }}>※ 신청서 · 지출자료 · 증빙서류를 하나로 병합한 지출 서류입니다.</p>}

      {/* === 신청서 === */}
      {(doc === "form" || doc === "payment") && (
        <div className={doc === "payment" ? "ev-page" : undefined}>
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
            <tr><th>은행명</th><td>{app.verifiedAccount?.bankName || app.bankInfo.bankName}</td><th>예금주</th><td>{app.verifiedAccount?.accountHolder || app.bankInfo.accountHolder}</td></tr>
            <tr><th>계좌번호</th><td colSpan={3}>{app.verifiedAccount?.accountNumber || app.bankInfo.accountNumber}</td></tr>
            {app.verifiedAccount?.residentNumber && <tr><th>주민등록번호</th><td colSpan={3}>{app.verifiedAccount.residentNumber}</td></tr>}
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
            위와 같이 {fundLabelOf(app)}을 신청하며, 제출한 내용과 증빙서류가 사실과 다름없음을 확인합니다.<br />
            허위 신청 또는 부적격 사유 확인 시 지급이 취소되거나 환수될 수 있음에 동의합니다.
          </p>
          <div className="sign-row">
            신청일: {app.applicationDate} &nbsp;&nbsp;&nbsp; 신청인: {app.name}
            {app.signature ? <img src={app.signature} alt="서명" className="sign-img" /> : " (서명)"}
          </div>
        </div>
      )}

      {/* === 지출 내역 (지출자료 병합) === */}
      {doc === "payment" && (
        <div className={app.files.length > 0 ? "ev-page" : undefined}>
          <div className="sec">지급 내역</div>
          <table className="form"><tbody>
            {typeDetailRows(app).filter(([k]) => ["자격증명", "MD 과정", "전공명", "대회명", "프로그램명"].includes(k)).map(([k, v]) => (
              <tr key={k}><th>{k}</th><td colSpan={3}>{v}</td></tr>
            ))}
            <tr><th>지급 상태</th><td colSpan={3}>{PAYMENT_STATUS_LABELS[app.paymentStatus]}</td></tr>
            <tr><th>지급액</th><td colSpan={3}>{(app.approvedAmount ?? app.calculatedAmount).toLocaleString()}원</td></tr>
            <tr className="total-row"><th>합계</th><td colSpan={3}>{(app.approvedAmount ?? app.calculatedAmount).toLocaleString()}원</td></tr>
          </tbody></table>
          <p style={{ marginTop: 20, fontSize: 12, color: "#555" }}>※ 위 금액을 신청인 본인 명의 계좌(상단 ‘3. 계좌 정보’ 참조)로 지급함.</p>
        </div>
      )}

      {/* === 심의요청서 === */}
      {doc === "review" && (
        <>
          {studentInfoBlock}
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

      {/* === 증빙서류 (단독 또는 지출자료 병합) === */}
      {(doc === "evidence" || doc === "payment") && (
        <>
          <div className={app.files.length > 0 ? "ev-page" : undefined}>
            {doc === "evidence" && studentInfoBlock}
            <div className="sec">첨부 서류 목록</div>
            <table className="form"><tbody>
              {app.files.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "#999" }}>첨부된 증빙서류가 없습니다.</td></tr>
              ) : (
                app.files.map((f, i) => (
                  <tr key={f.id}><th>{i + 1}</th><td>{DOCUMENT_TYPE_LABELS[f.type]}</td><td colSpan={2}>{f.name}</td></tr>
                ))
              )}
            </tbody></table>
          </div>
          {app.files.map((f) => (
            <div className="ev-page" key={f.id}>
              <div className="ev-head">
                {DOCUMENT_TYPE_LABELS[f.type]} — {f.name}
                <div className="ev-head-sub">접수번호 {app.receiptNumber} · {app.name}({app.studentId}) · {app.department}</div>
              </div>
              <div className="ev-img">
                {f.url ? <img src={f.url} alt={f.name} /> : "이미지 미리보기 (업로드 파일 연동 시 자동 삽입)"}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
