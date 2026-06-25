"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Save, RefreshCw } from "lucide-react";
import type { Application, ReviewStatus, PaymentStatus } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, DOCUMENT_TYPE_LABELS, TRANSPORT_MODE_LABELS, calcSupportTotal } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import DraggableWindow from "@/components/admin/DraggableWindow";
import { type StatusConfig, type StatusOpt, DEFAULT_STATUS_CONFIG, BADGE_PRESETS, newStatusKey } from "@/lib/status-config";
import { maskAccountNumber, maskResidentNumber } from "@/lib/mask";

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

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewStatus,
        paymentStatus,
        adminMemo,
        approvedAmount: approvedAmount === "" ? undefined : Number(approvedAmount),
        verifiedAccount: vAccount,
      }),
    });
    setSaving(false);
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
      ...costRows(app.staffDetail.costDetail, app.staffDetail.transport, app.staffDetail.extraCosts),
    ];
    if (app.gradeDetail) return [
      ["세부 유형", { microdegree: "마이크로디그리", minor: "부전공", double: "복수전공" }[app.gradeDetail.subType]],
      ["이수 과정명", app.gradeDetail.courseName],
      ["이수 학점", String(app.gradeDetail.credits)],
      ["평점 평균", String(app.gradeDetail.gpa)],
    ];
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
          <div className="card">
            <h2 className="section-title">기본 정보</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              {basicRows.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-gray-500 min-w-[80px] flex-shrink-0">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card">
            <h2 className="section-title">계좌 정보</h2>
            <dl className="grid sm:grid-cols-3 gap-3 text-sm">
              {([["은행", app.bankInfo.bankName], ["계좌번호", app.bankInfo.accountNumber], ["예금주", app.bankInfo.accountHolder]] as [string, string][]).map(([k, v]) => (
                <div key={k}><dt className="text-gray-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {/* 통장 사본 (관리자 직접 확인용) */}
            {(() => {
              const bb = app.files.find((f) => f.type === "bankbook");
              if (!bb) return <p className="mt-3 text-xs text-amber-600">※ 제출된 통장 사본이 없습니다.</p>;
              const isImg = bb.url?.startsWith("data:image") || /\.(png|jpe?g|gif|webp)$/i.test(bb.name);
              return (
                <div className="mt-3 rounded-2xl p-3" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  <p className="text-xs font-semibold text-indigo-700 mb-2">통장 사본 — 직접 확인 후 아래 ‘관리자 확인 입력’란에 계좌·예금주를 작성하세요.</p>
                  {bb.url && isImg ? (
                    <a href={bb.url} target="_blank" rel="noopener noreferrer" title="클릭하면 원본 크기로 보기">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bb.url} alt="통장 사본" className="max-h-48 rounded-lg border border-gray-200 bg-white" />
                    </a>
                  ) : bb.url ? (
                    <a href={bb.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm underline">통장 사본 새 창에서 보기</a>
                  ) : (
                    <span className="text-gray-400 text-xs">미리보기 없음</span>
                  )}
                </div>
              );
            })()}
          </div>

          {app.formAnswers?.fields && app.formAnswers.fields.length > 0 && (
            <div className="card">
              <h2 className="section-title">신청서 작성 내용 (관리자 폼)</h2>
              <dl className="space-y-2 text-sm">
                {app.formAnswers.fields.map((f) => (
                  <div key={f.id} className="flex gap-2">
                    <dt className="text-gray-500 min-w-[120px] flex-shrink-0">{f.label}</dt>
                    <dd className="font-medium whitespace-pre-line">{f.value || "-"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="card">
            <h2 className="section-title">신청 상세 내용</h2>
            <dl className="space-y-2 text-sm">
              {getDetail().map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-gray-500 min-w-[100px] flex-shrink-0">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-3 gap-3 text-sm">
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
          </div>

          <div className="card">
            <h2 className="section-title">첨부파일</h2>
            {app.files.length === 0 ? (
              <p className="text-gray-400 text-sm">첨부파일 없음</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {app.files.map((f) => {
                  const isImage = f.url?.startsWith("data:image") || /\.(png|jpe?g|gif|webp)$/i.test(f.name);
                  const isPdf = f.url?.startsWith("data:application/pdf") || /\.pdf$/i.test(f.name);
                  return (
                    <button key={f.id} type="button" onClick={() => setFileWin({ name: f.name, url: f.url })}
                      className="rounded-2xl overflow-hidden text-left hover:ring-2 hover:ring-indigo-300 transition" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
                      <div className="flex items-center gap-2 px-3 py-2 text-xs">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="font-medium truncate flex-1">{f.name}</span>
                        <span className="text-gray-400">{DOCUMENT_TYPE_LABELS[f.type]}</span>
                      </div>
                      <div className="bg-white/60 flex items-center justify-center" style={{ height: 160 }}>
                        {f.url && isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.url} alt={f.name} className="max-w-full max-h-full object-contain" />
                        ) : f.url && isPdf ? (
                          <span className="text-indigo-600 text-sm underline">클릭하여 미리보기</span>
                        ) : (
                          <span className="text-gray-400 text-xs">{f.url ? "클릭하여 미리보기" : "미리보기 없음"}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 관리자 확인 입력 — 첨부파일 아래. 미입력 시 빨강, 저장 후 초록 */}
          {(() => {
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
                <label className="label">지급 상태</label>
                <select className="input-field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
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
                <label className="label">최종 승인 금액 (원)</label>
                <input
                  className="input-field"
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder={String(app.calculatedAmount)}
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
