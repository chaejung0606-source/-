"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Save, RefreshCw } from "lucide-react";
import type { Application, ReviewStatus, PaymentStatus } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, TRANSPORT_MODE_LABELS, CLUB_FIELD_LABELS, calcSupportTotal } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import DraggableWindow from "@/components/admin/DraggableWindow";
import { type StatusConfig, type StatusOpt, DEFAULT_STATUS_CONFIG, BADGE_PRESETS, newStatusKey } from "@/lib/status-config";
import { maskAccountNumber, maskResidentNumber } from "@/lib/mask";
import { parseTableGrid } from "@/components/apply/TableField";
import { getProgramById } from "@/lib/md-courses";

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("received");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("waiting");
  const [adminMemo, setAdminMemo] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");
  const [syncing, setSyncing] = useState(false);
  // 관리자가 통장사본 확인 후 입력 (인쇄/내보내기 전용, 화면 마스킹)
  const [vAccount, setVAccount] = useState<{ bankName: string; accountNumber: string; accountHolder: string; residentNumber: string }>({ bankName: "", accountNumber: "", accountHolder: "", residentNumber: "" });
  // 저장된 확인정보는 화면에서 마스킹하고, '수정'을 누르면 입력란을 다시 연다
  const [editAccount, setEditAccount] = useState(false);
  // 검토/지급 상태 옵션 설정 (수정·추가·삭제 가능)
  const [statusCfg, setStatusCfg] = useState<StatusConfig>(DEFAULT_STATUS_CONFIG);
  const [statusEdit, setStatusEdit] = useState(false);
  const [cfgSaving, setCfgSaving] = useState(false);
  const [myRole, setMyRole] = useState<"expense" | "program" | null>(null);
  useEffect(() => { fetch("/api/admin/status-config").then((r) => r.json()).then(setStatusCfg).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/admin/status").then((r) => r.json()).then((d) => { if (d?.admin) setMyRole(d.role || "expense"); }).catch(() => {}); }, []);

  // 서류 인계 (단일 건)
  const handoff = async (stage: "expense" | "program") => {
    let note: string | undefined;
    if (stage === "program") note = window.prompt("프로그램 관리자에게 전달할 보완 요청 내용을 입력하세요. (선택)") || "";
    else if (!window.confirm("이 신청 서류를 지출관리자에게 보낼까요?")) return;
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stage === "program" ? { reviewStage: "program", handoffNote: note || "" } : { reviewStage: "expense" }),
    });
    if (res.ok) { const d = await res.json(); setApp(d); alert(stage === "expense" ? "지출관리자에게 전달했습니다." : "프로그램 관리자에게 반송했습니다."); }
    else alert("처리 실패");
  };
  const setOpts = (kind: "review" | "payment", opts: StatusOpt[]) => setStatusCfg((c) => ({ ...c, [kind]: opts }));
  const addOpt = (kind: "review" | "payment") => setOpts(kind, [...statusCfg[kind], { key: newStatusKey(), label: "새 상태", badge: BADGE_PRESETS[0].badge }]);
  const updOpt = (kind: "review" | "payment", i: number, patch: Partial<StatusOpt>) => setOpts(kind, statusCfg[kind].map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const removeOpt = (kind: "review" | "payment", i: number) => { if (statusCfg[kind].length <= 1) return; setOpts(kind, statusCfg[kind].filter((_, idx) => idx !== i)); };
  const saveStatusCfg = async () => {
    setCfgSaving(true);
    try {
      const res = await fetch("/api/admin/status-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(statusCfg) });
      const j = await res.json().catch(() => ({ ok: false }));
      if (j.ok) { setStatusEdit(false); alert("상태 옵션이 저장되었습니다."); }
      else alert("저장 실패: " + (j.error || res.status));
    } finally { setCfgSaving(false); }
  };

  // 첨부파일 미리보기 — 이동 가능한 임시 팝업창
  const [fileWin, setFileWin] = useState<{ name: string; url?: string } | null>(null);

  // 인쇄양식(첨부 삽입 포함) 미리보기 — 크기 조정·이동 가능한 작은 새 창
  const openPreview = (doc: string) => {
    window.open(
      `/admin/applications/${id}/print?doc=${doc}`,
      `preview_${doc}`,
      "width=900,height=1100,resizable=yes,scrollbars=yes",
    );
  };

  const driveSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/drive-sync", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.ok) alert("Google Drive로 재동기화했습니다.");
      else if (j.skipped) alert("Drive 동기화가 설정되지 않았습니다. (GOOGLE_SYNC_WEBHOOK_URL 미설정)");
      else alert("동기화 실패: " + (j.error || res.status));
    } catch {
      alert("동기화 중 오류가 발생했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetch(`/api/applications/${id}`).then((r) => r.json()).then((d: Application) => {
      setApp(d);
      setReviewStatus(d.reviewStatus);
      setPaymentStatus(d.paymentStatus);
      setAdminMemo(d.adminMemo);
      setApprovedAmount(d.approvedAmount ?? "");
      setVAccount({
        bankName: d.verifiedAccount?.bankName || "",
        accountNumber: d.verifiedAccount?.accountNumber || "",
        accountHolder: d.verifiedAccount?.accountHolder || "",
        residentNumber: d.verifiedAccount?.residentNumber || "",
      });
      // 이미 저장된 확인정보가 있으면 마스킹 표시, 없으면 입력 모드로 시작
      setEditAccount(!(d.verifiedAccount?.accountNumber || d.verifiedAccount?.residentNumber));
      setLoading(false);
    });
  }, [id]);

  // 신청폼 스키마의 '전체 필드 순서'(특수 블록 포함) — 상세 화면을 신청폼과 동일한 순서로 표시하는 데 사용.
  // fieldStepMap: 필드→단계(구버전 답변에 step 미저장 시 단계 구분 복원)
  const [fieldStepMap, setFieldStepMap] = useState<Record<string, string>>({});
  const [schemaTop, setSchemaTop] = useState<{ id: string; label: string; type: string; step: string }[]>([]);
  useEffect(() => {
    const fa = app?.formAnswers;
    if (!fa?.programId || !fa.fields?.length) { setSchemaTop([]); return; }
    // 신청폼 스키마는 programs 테이블이 아니라 program-forms(별도)에 저장됨
    fetch("/api/admin/program-forms").then((r) => r.json()).then((forms) => {
      const f = (forms || {})[fa.programId as string];
      const schema = app?.applicationPhase === "pre" ? f?.pre : f?.fund;
      if (!schema) { setSchemaTop([]); return; }
      const m: Record<string, string> = {};
      const top: { id: string; label: string; type: string; step: string }[] = [];
      (schema.steps || []).forEach((s: { title?: string; fields?: { id: string; label: string; type: string }[] }) =>
        (s.fields || []).forEach((fl) => {
          m[fl.id] = s.title || "";
          top.push({ id: fl.id, label: fl.label, type: fl.type, step: s.title || "" });
        }));
      setFieldStepMap(m);
      setSchemaTop(top);
    }).catch(() => {});
  }, [app]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewStatus,
        adminMemo,
        verifiedAccount: vAccount,
        // 승인 금액·지급 상태는 지출관리자 전용(서버에서도 차단) — 프로그램 관리자는 전송하지 않음
        ...(myRole === "program" ? {} : { paymentStatus, approvedAmount: approvedAmount === "" ? undefined : Number(approvedAmount) }),
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { alert(res?.status === 403 ? "저장 실패: 승인 금액·지급 상태는 지출관리자만 변경할 수 있습니다." : "저장에 실패했습니다. 잠시 후 다시 시도해주세요."); return; }
    setApp((a) => (a ? { ...a, verifiedAccount: { ...vAccount }, reviewStatus, paymentStatus, adminMemo, approvedAmount: approvedAmount === "" ? undefined : Number(approvedAmount) } : a));
    // 저장 후에는 화면에서 계좌·주민번호를 마스킹 표시
    if (vAccount.accountNumber || vAccount.residentNumber) setEditAccount(false);
    alert("저장되었습니다.");
  };

  if (loading || !app) {
    return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;
  }

  const transportRows = (t?: import("@/types").TransportInfo): [string, string][] => {
    if (!t) return [];
    return [
      ["교통비", `${TRANSPORT_MODE_LABELS[t.mode]} · ${t.region === "overseas" ? "국외" : t.isJeju ? "국내(제주)" : "국내"}${t.route ? ` · ${t.route}` : ""} · ${t.amount.toLocaleString()}원`],
    ];
  };

  const reportRows = (entries?: import("@/types").ReportEntry[]): [string, string][] =>
    (entries || []).map((e) => {
      let v: string;
      if (e.type === "file") v = `파일: ${e.fileName || "업로드됨"}`;
      else if (e.type === "agreement") v = e.value === "동의" ? "동의함" : "미동의";
      else if (e.type === "signature") v = e.value ? "서명 완료" : "미서명";
      else v = e.value || "-";
      return [e.label || "보고서 항목", v] as [string, string];
    });

  const locationRows = (loc?: import("@/types").EventLocation): [string, string][] => {
    if (!loc) return [];
    const v = loc.scope === "overseas"
      ? `국외 · ${loc.country || ""}${loc.cityName ? ` ${loc.cityName}` : ""}`
      : `국내 · ${loc.province || ""}${loc.city ? ` ${loc.city}` : ""}${loc.cityName ? ` ${loc.cityName}` : ""}`;
    return [["행사 장소", v]];
  };

  const extraCostRows = (x?: import("@/types").ExtraCosts): [string, string][] => {
    if (!x) return [];
    const rows: [string, string][] = [];
    if (x.registrationFee) rows.push(["등록비·참가비", `${x.registrationFee.toLocaleString()}원`]);
    if (x.lodgingFee) rows.push(["숙박비", `${x.lodgingFee.toLocaleString()}원${x.lodgingNights ? ` (${x.lodgingNights}박)` : ""}`]);
    return rows;
  };

  const costDetailRows = (c?: import("@/types").CostDetail): [string, string][] => {
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
  };

  // costDetail(신버전) 우선, 없으면 구버전 transport/extraCosts
  const costRows = (
    c?: import("@/types").CostDetail,
    t?: import("@/types").TransportInfo,
    x?: import("@/types").ExtraCosts,
  ): [string, string][] => (c ? costDetailRows(c) : [...transportRows(t), ...extraCostRows(x)]);

  const getDetail = (): [string, string][] => {
    if (app.programDetail) return [
      ["프로그램명", app.programDetail.programName],
      ["유형", app.programDetail.programType],
      ["참여 기간", app.programDetail.participationPeriod],
      ["지도교수", app.programDetail.supervisorName],
      ["참여 내용", app.programDetail.participationContent],
      ...locationRows(app.programDetail.eventLocation),
      ...((app.programDetail.workLog && app.programDetail.workLog.length)
        ? [["근무 기록", app.programDetail.workLog.map((e) => `${e.date} ${e.startTime}~${e.endTime}(${e.hours}h)${e.detail ? ` ${e.detail}` : ""}`).join(" / ")] as [string, string],
           ["총 근무시간", `${app.programDetail.workLog.reduce((s, e) => s + (Number(e.hours) || 0), 0)}시간`] as [string, string]]
        : []),
      ...costRows(app.programDetail.costDetail, app.programDetail.transport, app.programDetail.extraCosts),
      ...reportRows(app.programDetail.reportEntries),
    ];
    if (app.staffDetail) return [
      ["프로그램명", app.staffDetail.programName],
      ["근무 기간", app.staffDetail.workPeriod],
      ["근무 일자", app.staffDetail.workDates],
      ["총 근무 시간", `${app.staffDetail.totalHours}시간`],
      ["학생 구분", app.staffDetail.studentType === "graduate" ? "대학원생" : "대학생"],
      ["담당 업무", app.staffDetail.taskDescription],
      ...((app.staffDetail.workLog && app.staffDetail.workLog.length)
        ? [["근무 기록", app.staffDetail.workLog.map((e) => `${e.date} ${e.startTime}~${e.endTime}(${e.hours}h)${e.detail ? ` ${e.detail}` : ""}`).join(" / ")] as [string, string]]
        : []),
      ...costRows(app.staffDetail.costDetail, app.staffDetail.transport, app.staffDetail.extraCosts),
      ...reportRows(app.staffDetail.reportEntries),
    ];
    if (app.gradeDetail) {
      const g = app.gradeDetail;
      const rows: [string, string][] = [
        ["세부 유형", { microdegree: "마이크로디그리", minor: "부전공", double: "복수전공" }[g.subType]],
      ];
      if (g.subType === "microdegree") {
        rows.push(
          ["학과", g.mdDepartment || "-"],
          ["MD 과정명", g.mdProgramName || g.courseName || "-"],
          ["이수 교과목·성적", (g.mdCourses || []).length
            ? (g.mdCourses || []).map((c) => `${c.name} — ${c.grade}${c.isBase ? " (기초/전공)" : ""}`).join("\n")
            : (g.courseName || "-")],
          ["평점 평균", String(g.gpa)],
        );
      } else {
        // 부전공/복수전공 — 신청자가 입력한 전공·교과목 내역·자격 확인을 모두 표시
        rows.push(
          ["전공명", g.minorMajorName || "-"],
          ["미래융합가상학과 이수(예정)자", g.minorIsMirae ? "확인함" : "미확인"],
          ["이수 교과목 내역", (g.minorCourses || []).length
            ? (g.minorCourses || []).map((c) =>
                `${c.name || "(과목명 없음)"} · ${c.credits}학점 · ${c.grade}${(c.mdProgramId || c.isMd) ? (c.excluded ? " · MD(학점 불인정)" : " · MD") : ""}`
              ).join("\n")
            : "-"],
          ["인정 이수 학점", `${g.minorMajorCredits ?? g.credits}학점 (기준 ${g.subType === "minor" ? 21 : 36}학점)`],
          ["평점 평균", `${g.gpa} / 4.5`],
          ["졸업(예정) 시기", g.minorGradDate ? `${g.minorGradDate.slice(0, 4)}년 ${Number(g.minorGradDate.slice(5))}월` : "-"],
          ["마이크로디그리(MD) 이수", g.minorMdCompleted ? `이수${g.minorMdName ? ` — ${g.minorMdName}` : ""}` : "미이수"],
          ["MD 발급 학년도", Object.keys(g.minorMdYears || {}).length
            ? Object.entries(g.minorMdYears || {}).map(([id, yr]) => `${getProgramById(id)?.name || id}: ${yr}학년도${yr === "2026" ? "(개편)" : ""}`).join("\n")
            : "-"],
        );
      }
      return rows;
    }
    if (app.contestDetail) return [
      ["대회명", app.contestDetail.contestName],
      ["주제", app.contestDetail.contestTheme],
      ["개최기관", app.contestDetail.organizer],
      ["규모", `${app.contestDetail.scale}규모`],
      ["개인/팀", app.contestDetail.isTeam
        ? `팀 (${(app.contestDetail.teamMembers || []).length}명, 1인당 ${app.contestDetail.calculatedAmount?.toLocaleString() || 0}원)`
        : "개인"],
      ...(app.contestDetail.isTeam && (app.contestDetail.teamMembers || []).length > 0
        ? [["팀원", (app.contestDetail.teamMembers || []).map((m) => `${m.name}(${m.studentId})`).join(", ")] as [string, string]]
        : []),
      ["시상 등급", { grand: "대상/최우수", silver: "은상/우수", bronze: "동상/장려", participation: "입상" }[app.contestDetail.awardLevel]],
      ["수상일", app.contestDetail.awardDate],
      ["상금 수령", app.contestDetail.hasMonetaryPrize ? "있음" : "없음"],
      ["분야 적합성", app.contestDetail.relevanceDescription],
    ];
    if (app.certificateDetail) return [
      ["자격증명", app.certificateDetail.certName],
      ["발급기관", app.certificateDetail.issuingOrg],
      ["취득일", app.certificateDetail.acquisitionDate],
      ["분야", app.certificateDetail.certField],
      ["난이도", { high: "상", mid: "중", low: "하", review: "심의필요" }[app.certificateDetail.difficulty]],
      ["미래융합가상학과", app.certificateDetail.isMirae ? "해당" : "미해당"],
    ];
    if (app.laborDetail) return [
      ["프로그램", app.laborDetail.programName],
      ["역할", app.laborDetail.role],
      ["근로 기간", app.laborDetail.workPeriod],
      ["총 근로시간", `${app.laborDetail.totalHours}시간`],
      ["학생 구분", app.laborDetail.studentType === "graduate" ? "대학원생" : "학부생"],
      ["확인자", app.laborDetail.supervisorName],
      ["근로 내용", app.laborDetail.workDetail],
      ["근무 기록", (app.laborDetail.workLog || []).map((e) => `${e.date} ${e.startTime}~${e.endTime}(${e.hours}h)${e.detail ? ` ${e.detail}` : ""}`).join(" / ") || "-"],
      ...reportRows(app.laborDetail.reportEntries),
    ];
    if (app.activityDetail) {
      const a = app.activityDetail;
      if (a.activityKind === "paper" && a.paper) {
        const p = a.paper;
        return [
          ["신청 구분", "논문게재료"],
          ["논문명", p.paperTitle],
          ["학술지명", p.journalName],
          ["ISSN", p.issn],
          ["발행권(호)", p.volumeIssue],
          ["발행일", p.publishDate],
          ["발행기관", p.publisher],
          ["신청금액(게재료)", `${(p.requestFee || 0).toLocaleString()}원`],
          ["관련 분야", a.activityType],
          ["사업단 연관성", a.activityContent],
        ];
      }
      return [
        ["신청 구분", "학생활동지원비 (학회참석 등)"],
        ["활동명", a.activityName],
        ["활동 유형", a.activityType],
        ["활동 기간", a.activityPeriod],
        ["활동 내용", a.activityContent],
        ...locationRows(a.eventLocation),
        ...costRows(a.costDetail, a.transport, a.extraCosts),
        ...reportRows(a.reportEntries),
      ];
    }
    if (app.clubDetail) {
      const c = app.clubDetail;
      const members = (c.members || []).filter((m) => m.name || m.studentId);
      const rows: [string, string][] = [
        ["소학회명", c.clubName],
        ["활동 분야", CLUB_FIELD_LABELS[c.field] || c.field || "-"],
        ["활동 주제", c.topic],
        ["지도교수", c.advisor],
      ];
      if (c.intro) rows.push(["소학회 소개", c.intro]);
      if (c.achievements) rows.push(["특이사항", c.achievements]);
      rows.push(["구성원", members.map((m) => `${m.role} ${m.name}(${m.studentId}${m.department ? `·${m.department}` : ""}${m.isMirae ? "·가상" : ""}${m.phone ? `·${m.phone}` : ""})`).join("\n") || "-"]);
      rows.push(["미래융합가상학과 인원", `${members.filter((m) => m.isMirae).length} / ${members.length}명`]);
      if (c.goals) rows.push(["활동 목표", c.goals]);
      if (c.plan) rows.push(["활동 계획", c.plan]);
      if (c.expectedOutcome) rows.push(["기대 성과", c.expectedOutcome]);
      if (c.presidentMonths) rows.push(["회장 지원금", `${c.presidentMonths}개월 × 240,000원 = ${((c.presidentMonths || 0) * 240000).toLocaleString()}원`]);
      if (c.budgetNote) rows.push(["운영비 사용 계획", c.budgetNote]);
      if (c.requestAmount) rows.push(["총 신청 금액", `${(c.requestAmount || 0).toLocaleString()}원`]);
      return rows;
    }
    return [];
  };

  const basicRows: [string, string][] = [
    ["이름", app.name], ["학번", app.studentId],
    ["소속 대학", app.university], ["학과", app.department],
    ["학년", app.grade], ["학적 상태", app.academicStatus],
    ["연락처", app.phone], ["이메일", app.email],
    ["신청일", app.applicationDate], ["신청 유형", APPLICATION_TYPE_LABELS[app.applicationType]],
  ];

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin/applications" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            접수번호 {app.receiptNumber}
            <span className={`badge ${app.applicationPhase === "pre" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>{APPLICATION_PHASE_LABELS[app.applicationPhase || "fund"]}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">{app.name} 신청 상세</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openPreview("payment")} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 지출자료
          </button>
          <button onClick={() => openPreview("review")} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 심의요청서
          </button>
          <button onClick={driveSync} disabled={syncing} className="btn-secondary text-sm flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "동기화 중..." : "Drive 재동기화"}
          </button>
        </div>
      </div>

      {app.canceled && (
        <div className="card mb-6" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.3)" }}>
          <h2 className="section-title" style={{ color: "#be123c" }}>신청자 취소 정보</h2>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 min-w-[80px]">취소 일시</dt><dd className="font-medium">{app.canceledAt ? new Date(app.canceledAt).toLocaleString("ko-KR") : "-"}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 min-w-[80px]">취소 IP</dt><dd className="font-mono font-medium">{app.canceledIp || "-"}</dd></div>
          </dl>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* ① 관리자 확인 입력 (최상단). 미입력 시 빨강, 저장 후 초록.
              지원신청(활동 전)은 지급이 없어 계좌·주민번호 확인이 불필요하므로 숨김 */}
          {app.applicationPhase !== "pre" && (() => {
            const confirmed = !!(app.verifiedAccount?.accountNumber || app.verifiedAccount?.residentNumber);
            const theme = confirmed
              ? { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.35)", title: "#047857" }
              : { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.4)", title: "#b91c1c" };
            return (
              <div className="card" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="section-title mb-0" style={{ color: theme.title }}>관리자 확인 입력 (계좌·주민번호)</h2>
                  <span className="badge" style={{ background: confirmed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: theme.title }}>
                    {confirmed ? "입력 완료" : "미입력"}
                  </span>
                  {confirmed && !editAccount && (
                    <button onClick={() => setEditAccount(true)} className="ml-auto text-xs text-indigo-600 hover:underline">수정</button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mb-3">통장사본·신분증을 보고 직접 입력하세요. 입력 중에는 보이고, <strong>저장하면 화면에서 마스킹</strong>됩니다. (인쇄·내보내기 문서에만 전체 표시)</p>
                {confirmed && !editAccount ? (
                  <dl className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div><dt className="text-gray-500 text-xs">은행</dt><dd className="font-medium">{vAccount.bankName || "—"}</dd></div>
                    <div><dt className="text-gray-500 text-xs">계좌번호</dt><dd className="font-medium font-mono tracking-wide">{maskAccountNumber(vAccount.accountNumber) || "—"}</dd></div>
                    <div><dt className="text-gray-500 text-xs">예금주</dt><dd className="font-medium">{vAccount.accountHolder || "—"}</dd></div>
                    <div className="sm:col-span-3"><dt className="text-gray-500 text-xs">주민등록번호</dt><dd className="font-medium font-mono tracking-wide">{maskResidentNumber(vAccount.residentNumber) || "—"}</dd></div>
                  </dl>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input className="input-field" value={vAccount.bankName} onChange={(e) => setVAccount({ ...vAccount, bankName: e.target.value })} placeholder="은행" />
                    <input className="input-field" value={vAccount.accountNumber} onChange={(e) => setVAccount({ ...vAccount, accountNumber: e.target.value })} placeholder="계좌번호" autoComplete="off" inputMode="numeric" />
                    <input className="input-field" value={vAccount.accountHolder} onChange={(e) => setVAccount({ ...vAccount, accountHolder: e.target.value })} placeholder="예금주" />
                    <input className="input-field sm:col-span-3" value={vAccount.residentNumber} onChange={(e) => setVAccount({ ...vAccount, residentNumber: e.target.value })} placeholder="주민등록번호" autoComplete="off" inputMode="numeric" />
                  </div>
                )}
                <p className="text-[11px] mt-2" style={{ color: confirmed ? "#047857" : "#b91c1c" }}>
                  {confirmed
                    ? (editAccount ? "수정 후 ‘상태 관리’의 저장 버튼을 누르면 다시 마스킹됩니다." : "✓ 확인 정보가 저장되어 화면에서 마스킹 표시 중입니다. (전체 값은 인쇄·내보내기에서만 표시)")
                    : "※ 아직 저장되지 않았습니다. 입력 후 ‘상태 관리’의 저장 버튼을 누르세요."}
                </p>
              </div>
            );
          })()}

          {/* ② 신청자가 작성한 신청서 — 기본정보·작성 항목·첨부·계좌·상세를 신청 폼 그대로 한 카드에 (보기 전용) */}
          {(() => {
            // 폼 스타일 값 박스
            const fv = (label: string, value: string) => (
              <div key={label}>
                <div className="text-[13px] font-semibold text-gray-700 mb-1">{label}</div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-line break-words" style={{ minHeight: 38 }}>
                  {value || <span className="text-gray-400">미작성</span>}
                </div>
              </div>
            );
            const sub = (t: string) => <h3 className="text-sm font-bold text-indigo-700 mt-5 mb-2 pb-1 border-b border-indigo-100">{t}</h3>;
            // 첨부 썸네일 — 서명처럼 인라인 표시, 클릭하면 미리보기 창
            const fileThumb = (f: (typeof app.files)[number]) => {
              const isImage = f.url?.startsWith("data:image") || /\.(png|jpe?g|gif|webp)$/i.test(f.name);
              return (
                <button key={f.id} type="button" onClick={() => setFileWin({ name: f.name, url: f.url })}
                  title="클릭하면 미리보기 창이 열립니다"
                  className="rounded-xl overflow-hidden text-left border border-gray-200 bg-white hover:ring-2 hover:ring-indigo-300 transition" style={{ width: 176 }}>
                  {f.url && isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.name} className="h-28 w-full object-contain bg-white" />
                  ) : (
                    <div className="h-28 w-full flex flex-col items-center justify-center gap-1 text-gray-400">
                      <FileText className="w-6 h-6 text-indigo-400" />
                      <span className="text-indigo-600 text-[11px] underline">{f.url ? "클릭하여 미리보기" : "미리보기 없음"}</span>
                    </div>
                  )}
                  <div className="px-2 py-1 text-[11px] text-gray-600 truncate border-t border-gray-100">{f.name}</div>
                </button>
              );
            };
            // 신청폼 file 항목에 연결된 파일(파일명 접두 `{항목라벨} · `)을 인라인으로 매칭
            const usedIds = new Set<string>();
            const filesForField = (label: string) => {
              const arr = app.files.filter((x) => x.name.startsWith(`${label} · `));
              arr.forEach((x) => usedIds.add(x.id));
              return arr;
            };
            const bankbook = app.files.find((f) => f.type === "bankbook");
            if (bankbook) usedIds.add(bankbook.id);
            const isSchemaApp = !!(app.formAnswers?.fields && app.formAnswers.fields.length > 0);
            const faFields = app.formAnswers?.fields || [];

            // 금액(정수) 문자열에 천단위 쉼표 — number 항목·'금액/원'이 포함된 라벨에 적용
            const commafy = (label: string, type: string, value: string) => {
              const isMoney = type === "number" || /금액|비용|원/.test(label);
              return isMoney && /^\d{4,}$/.test(value.trim()) ? Number(value.trim()).toLocaleString() : value;
            };
            // 한 신청 항목(폼 필드) 렌더 — 표/서명/파일/텍스트
            const renderField = (f: (typeof faFields)[number]) => {
              const grid = f.type === "table" ? parseTableGrid(f.value) : null;
              const isSig = f.type === "signature";
              const sigImg = isSig && (f.value.startsWith("data:") || f.value.startsWith("http"));
              const inlineFiles = f.type === "file" ? filesForField(f.label) : [];
              const textVal = commafy(f.label, f.type, f.value);
              return (
                <div>
                  <div className="text-[13px] font-semibold text-gray-700 mb-1">{f.label}</div>
                  {grid ? (
                    <div className="overflow-x-auto"><table className="border-collapse text-sm"><tbody>
                      {grid.map((row, r) => (
                        <tr key={r}>{row.map((cell, c) => (
                          <td key={c} className="border border-gray-300 px-2 py-1 align-top whitespace-pre-line">{cell || "-"}</td>
                        ))}</tr>
                      ))}
                    </tbody></table></div>
                  ) : isSig ? (
                    sigImg
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={f.value} alt="서명" className="h-16 border border-gray-200 rounded bg-white" />
                      : <div className="text-sm text-gray-500">{f.value ? "서명 완료" : "미서명"}</div>
                  ) : f.type === "file" ? (
                    inlineFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">{inlineFiles.map(fileThumb)}</div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" style={{ minHeight: 38 }}>{f.value || "첨부 없음"}</div>
                    )
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-line break-words" style={{ minHeight: 38 }}>
                      {textVal || <span className="text-gray-400">미작성</span>}
                    </div>
                  )}
                </div>
              );
            };

            // 특수 블록(행사 장소·비용·근무기록·구성원)은 formAnswers.fields에 없으므로, 앱 상세에서 값을 만들어 스키마 위치에 끼워 넣는다.
            const AD = app.activityDetail, PD = app.programDetail, SD = app.staffDetail, CLUB = app.clubDetail;
            const specialRowsOf = (type: string): [string, string][] => {
              if (type === "eventLocation") return locationRows(AD?.eventLocation ?? PD?.eventLocation);
              if (type === "registration" || type === "transport" || type === "lodging")
                return costRows(AD?.costDetail ?? PD?.costDetail ?? SD?.costDetail, AD?.transport ?? PD?.transport ?? SD?.transport, AD?.extraCosts ?? PD?.extraCosts ?? SD?.extraCosts);
              if (type === "workLog") {
                const wl = PD?.workLog ?? SD?.workLog;
                if (!wl?.length) return [];
                return [
                  ["근무 기록", wl.map((e) => `${e.date} ${e.startTime}~${e.endTime}(${e.hours}h)${e.detail ? ` ${e.detail}` : ""}`).join(" / ")],
                  ["총 근무시간", `${wl.reduce((s, e) => s + (Number(e.hours) || 0), 0)}시간`],
                ];
              }
              if (type === "clubMembers" && CLUB) {
                const members = (CLUB.members || []).filter((m) => m.name || m.studentId);
                if (!members.length) return [];
                return [
                  ["구성원", members.map((m) => `${m.role} ${m.name}(${m.studentId}${m.department ? `·${m.department}` : ""}${m.isMirae ? "·가상" : ""})`).join("\n")],
                  ["미래융합가상학과 인원", `${members.filter((m) => m.isMirae).length} / ${members.length}명`],
                ];
              }
              return [];
            };

            // 프로그램명(하위 프로그램) — 기본정보 위에 먼저 표시 (아래 항목·상세에서 같은 값은 중복 제거)
            const programName = app.programDetail?.programName || app.staffDetail?.programName
              || app.laborDetail?.programName || app.activityDetail?.activityName
              || app.clubDetail?.clubName || app.formAnswers?.programName || "";

            // 스키마 필드 순서대로 항목을 나열(특수 블록 포함) → 신청폼과 동일한 순서로 표시
            type DetailItem = { step: string; fa?: (typeof faFields)[number]; row?: [string, string] };
            const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
            const renderedVals = new Set<string>();
            const items: DetailItem[] = [];
            // 상단에 이미 표시한 '프로그램명'과 같은 항목은 중복 방지 차원에서 건너뛴다
            const isDupProgram = (label: string, value: string) =>
              !!programName && label.replace(/\s/g, "") === "프로그램명" && norm(value) === norm(programName);
            const pushFa = (f: (typeof faFields)[number], step: string) => {
              if (isDupProgram(f.label || "", String(f.value || ""))) return;
              items.push({ step, fa: f });
              if (f.value) renderedVals.add(norm(String(f.value)));
            };
            const pushRows = (rows: [string, string][], step: string) => rows.forEach((r) => {
              if (isDupProgram(r[0], r[1])) return;
              items.push({ step, row: r });
              if (r[1]) renderedVals.add(norm(r[1]));
            });
            const SKIP_INLINE = new Set(["applicantInfo", "account", "privacyConsent", "fileDownload"]); // 전용 섹션(기본정보·계좌·동의)·다운로드는 인라인 제외
            const COST_TYPES = new Set(["registration", "transport", "lodging"]);
            // 특수 블록 전체(비용은 1회) — 스키마 미로딩 폴백에서 누락 방지용
            const pushAllSpecialRows = (step: string) => {
              pushRows(specialRowsOf("eventLocation"), step);
              pushRows(specialRowsOf("registration"), step); // 비용(등록·교통·숙박) 통합 1회
              pushRows(specialRowsOf("workLog"), step);
              pushRows(specialRowsOf("clubMembers"), step);
            };

            if (isSchemaApp && schemaTop.length > 0) {
              const topIds = new Set(schemaTop.map((t) => t.id));
              let ptr = 0, costDone = false;
              for (const T of schemaTop) {
                if (SKIP_INLINE.has(T.type)) continue;
                if (T.type === "eventLocation") { pushRows(specialRowsOf("eventLocation"), T.step); continue; }
                if (COST_TYPES.has(T.type)) { if (!costDone) { pushRows(specialRowsOf(T.type), T.step); costDone = true; } continue; }
                if (T.type === "workLog") { pushRows(specialRowsOf("workLog"), T.step); continue; }
                if (T.type === "clubMembers") { pushRows(specialRowsOf("clubMembers"), T.step); continue; }
                // 텍스트류: 답변에서 찾아 렌더(+뒤따르는 조건부 하위항목)
                const idx = faFields.findIndex((f, i) => i >= ptr && f.id === T.id);
                if (idx === -1) continue;
                pushFa(faFields[idx], T.step); ptr = idx + 1;
                while (ptr < faFields.length && !topIds.has(faFields[ptr].id)) { pushFa(faFields[ptr], faFields[ptr].step || T.step); ptr++; }
              }
              while (ptr < faFields.length) { pushFa(faFields[ptr], faFields[ptr].step || "신청 내용"); ptr++; }
            } else if (isSchemaApp) {
              // 스키마 미로딩/구버전: 답변 순서대로 표시 + 특수 블록(행사 장소·비용·근무기록·구성원)도 빠짐없이 표시
              faFields.forEach((f) => pushFa(f, f.step || fieldStepMap[f.id] || "신청 내용"));
              pushAllSpecialRows(faFields[faFields.length - 1]?.step || "신청 내용");
            }

            // 단계(파란 소제목)별로 묶기
            const groups: { title: string; items: DetailItem[] }[] = [];
            items.forEach((it) => {
              const last = groups[groups.length - 1];
              if (last && last.title === it.step) last.items.push(it);
              else groups.push({ title: it.step, items: [it] });
            });

            // 신청 상세 — 고정형(비스키마)만 표시하며, 상단 프로그램명과 같은 행은 중복 제거.
            const detailRows = getDetail().filter(([k, v]) => {
              if (isDupProgram(k, String(v ?? ""))) return false;
              if (!isSchemaApp) return true;
              const s = String(v ?? "").trim();
              if (!s || s === "-") return false;
              return !renderedVals.has(norm(s));
            });

            return (
              <div className="card">
                <h2 className="section-title">신청자가 작성한 신청서 <span className="text-xs font-normal text-gray-400">(보기 전용 · 수정 불가 · 파일 클릭 시 미리보기)</span></h2>

                {/* 프로그램명(하위 프로그램) — 기본정보 위 */}
                {programName && <div className="mt-1">{fv("프로그램명", programName)}</div>}

                {/* 기본 정보 — 고정형 신청폼은 계좌 입력도 기본 정보 단계에 포함되므로 함께 표시 */}
                {sub("기본 정보")}
                <div className="grid sm:grid-cols-2 gap-3">
                  {basicRows.map(([k, v]) => fv(k, String(v ?? "")))}
                  {!isSchemaApp && (
                    <>
                      {fv("은행", app.bankInfo.bankName)}
                      {fv("계좌번호", app.bankInfo.accountNumber)}
                      {fv("예금주", app.bankInfo.accountHolder)}
                    </>
                  )}
                </div>

                {/* 신청 내용 — 신청폼과 동일한 순서(단계별 파란 소제목). 특수 블록(행사 장소·비용 등)도 폼 위치에 표시 */}
                {groups.map((g, gi) => (
                  <div key={`${g.title}-${gi}`}>
                    {sub(g.title)}
                    <div className="space-y-3">
                      {g.items.map((it, i) => (
                        <div key={it.fa ? `f-${it.fa.id}-${i}` : `r-${i}`}>
                          {it.fa ? renderField(it.fa) : fv(it.row![0], it.row![1])}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 신청 내용 (유형별 항목·비용 내역) — 고정형 폼(성적·경진대회·자격증 등)만 표시.
                    스키마 폼 신청은 위 '신청 내용'이 신청폼 순서 그대로 전체를 보여주므로 별도 상세 섹션을 두지 않는다. */}
                {!isSchemaApp && detailRows.length > 0 && (
                  <>
                    {sub("신청 내용")}
                    <div className="space-y-3">
                      {detailRows.map(([k, v]) => fv(k, String(v ?? "")))}
                    </div>
                  </>
                )}

                {/* 계좌 정보 + 통장 사본 — 스키마 폼 신청만 별도 표시(고정형 폼은 기본 정보에 포함) */}
                {isSchemaApp && (
                  <>
                    {sub("계좌 정보")}
                    <div className="grid sm:grid-cols-3 gap-3">
                      {fv("은행", app.bankInfo.bankName)}
                      {fv("계좌번호", app.bankInfo.accountNumber)}
                      {fv("예금주", app.bankInfo.accountHolder)}
                    </div>
                    <div className="mt-2">
                      <div className="text-[13px] font-semibold text-gray-700 mb-1">통장 사본</div>
                      {bankbook ? (
                        <div className="flex flex-wrap gap-2">{fileThumb(bankbook)}</div>
                      ) : (
                        <p className="text-xs text-amber-600">※ 제출된 통장 사본이 없습니다.</p>
                      )}
                    </div>
                  </>
                )}

                {/* 서류 업로드 — 고정형 폼은 3단계 제목 그대로 전체 파일 표시,
                    스키마 폼은 위 답변 항목에 인라인되지 않은 나머지 파일만 */}
                {(() => {
                  const rest = isSchemaApp ? app.files.filter((f) => !usedIds.has(f.id)) : app.files;
                  if (rest.length === 0) return null;
                  return (
                    <>
                      {sub(isSchemaApp ? "첨부파일" : "서류 업로드")}
                      <div className="flex flex-wrap gap-2">{rest.map(fileThumb)}</div>
                    </>
                  );
                })()}

                {/* 동의 및 서명 (공통 제출 항목 — 폼 답변과 별도로 저장되는 동의·신청인 서명) */}
                {sub(isSchemaApp ? "동의 및 서명" : "동의 및 제출")}
                <div className="grid sm:grid-cols-3 gap-3">
                  {fv("개인정보 수집·이용 동의", app.privacyConsent ? "동의함" : "미동의")}
                  {fv("사실 확인 동의", app.truthConsent ? "동의함" : "미동의")}
                  {fv("본인 명의 계좌 확인 동의", app.accountConsent ? "동의함" : "미동의")}
                </div>
                <div className="mt-2">
                  <div className="text-[13px] font-semibold text-gray-700 mb-1">신청인 서명</div>
                  {app.signature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.signature} alt="신청인 서명" className="h-16 border border-gray-200 rounded bg-white" />
                  ) : (
                    <p className="text-sm text-gray-400">서명 없음</p>
                  )}
                </div>

                {/* 금액 */}
                <div className="mt-5 pt-4 border-t border-gray-100 grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">신청 금액</dt>
                    <dd className="font-bold text-gray-800">{app.requestAmount.toLocaleString()}원</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">자동 산정 금액</dt>
                    <dd className="font-bold text-primary-700">{app.calculatedAmount.toLocaleString()}원</dd>
                  </div>
                  {app.approvedAmount !== undefined && (
                    <div>
                      <dt className="text-gray-500">최종 승인 금액</dt>
                      <dd className="font-bold text-green-700">{app.approvedAmount.toLocaleString()}원</dd>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 mt-3">※ 신청자가 제출한 신청서 내용 그대로입니다(수정 불가). 파일·서명은 클릭하면 미리보기 창이 열립니다.</p>
              </div>
            );
          })()}

        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">상태 관리</h2>
              <button onClick={() => setStatusEdit((v) => !v)} className="text-xs text-indigo-600 hover:underline">{statusEdit ? "옵션 편집 닫기" : "옵션 편집"}</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">검토 상태</label>
                <select className="input-field" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}>
                  {statusCfg.review.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">지급 상태 {myRole === "program" && <span className="text-xs text-gray-400 font-normal">(지출관리자 전용)</span>}</label>
                <select className="input-field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} disabled={myRole === "program"}>
                  {statusCfg.payment.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>

              {/* 상태 옵션 편집 (수정·추가·삭제) */}
              {statusEdit && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
                  <p className="text-[11px] text-gray-500">드롭다운에 표시될 상태 옵션을 수정·추가·삭제합니다. 저장하면 모든 신청서에 공통 적용됩니다.</p>
                  {(["review", "payment"] as const).map((kind) => (
                    <div key={kind}>
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">{kind === "review" ? "검토 상태" : "지급 상태"} 옵션</p>
                      <div className="space-y-1.5">
                        {statusCfg[kind].map((o, i) => (
                          <div key={o.key} className="flex items-center gap-1.5">
                            <input className="input-field !py-1 text-xs flex-1" value={o.label} onChange={(e) => updOpt(kind, i, { label: e.target.value })} placeholder="상태명" />
                            <select className="input-field !py-1 !w-auto text-xs" value={o.badge} onChange={(e) => updOpt(kind, i, { badge: e.target.value })}>
                              {BADGE_PRESETS.map((b) => <option key={b.badge} value={b.badge}>{b.name}</option>)}
                            </select>
                            <span className={`badge ${o.badge}`}>{o.label || "예시"}</span>
                            <button onClick={() => removeOpt(kind, i)} disabled={statusCfg[kind].length <= 1} className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg leading-none px-1">×</button>
                          </div>
                        ))}
                        <button onClick={() => addOpt(kind)} className="text-xs text-indigo-600 hover:underline">＋ 옵션 추가</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={saveStatusCfg} disabled={cfgSaving} className="btn-secondary text-xs w-full">{cfgSaving ? "저장 중..." : "상태 옵션 저장"}</button>
                </div>
              )}
              <div>
                <label className="label">최종 승인 금액 (원) {myRole === "program" && <span className="text-xs text-gray-400 font-normal">(지출관리자 전용)</span>}</label>
                <input
                  className="input-field"
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder={String(app.calculatedAmount)}
                  disabled={myRole === "program"}
                />
              </div>
              <div>
                <label className="label">신청자 안내 메모 <span className="text-indigo-500 text-xs font-medium">(신청자 마이페이지에 표시됨)</span></label>
                <textarea
                  className="input-field h-28 resize-none"
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  placeholder="수정 요청·반려 사유 등 신청자가 확인해야 할 안내를 작성하세요. (신청자에게 노출됩니다)"
                />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>

          {/* 서류 인계 */}
          <div className="card">
            <h2 className="section-title mb-2">서류 인계</h2>
            {app.handoffNote && (
              <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="font-semibold">지출관리자 보완 요청: </span>{app.handoffNote}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-2">
              현재 단계: {app.reviewStage === "expense" ? <span className="badge bg-teal-100 text-teal-700">지출관리자</span> : <span className="badge bg-indigo-100 text-indigo-700">프로그램 검토</span>}
            </p>
            {myRole === "program" && app.reviewStage !== "expense" && (
              <button onClick={() => handoff("expense")} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> 서류 확인 완료 — 지출관리자에게 보내기
              </button>
            )}
            {myRole === "expense" && (
              <button onClick={() => handoff("program")} className="btn-secondary w-full text-sm">
                프로그램 관리자에게 반송(보완 요청)
              </button>
            )}
          </div>

          <div className="card bg-gray-50">
            <h3 className="font-medium text-gray-600 text-sm mb-2">메모 예시</h3>
            {["증빙자료 부족", "심의위원회 검토 필요", "지급 가능", "지출 완료", "계좌 정보 확인 필요"].map((m) => (
              <button key={m} onClick={() => setAdminMemo(m)} className="block text-xs text-primary-600 hover:underline mb-1">{m}</button>
            ))}
          </div>
        </div>
      </div>

      {fileWin && (
        <DraggableWindow title={fileWin.name} onClose={() => setFileWin(null)}>
          {fileWin.url ? (
            (fileWin.url.startsWith("data:image") || /\.(png|jpe?g|gif|webp)$/i.test(fileWin.name)) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileWin.url} alt={fileWin.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <iframe src={fileWin.url} title={fileWin.name} className="w-full h-full bg-white" style={{ border: "none" }} />
            )
          ) : (
            <span className="text-gray-400 text-sm">미리보기를 불러올 수 없습니다.</span>
          )}
        </DraggableWindow>
      )}
    </AdminLayout>
  );
}
