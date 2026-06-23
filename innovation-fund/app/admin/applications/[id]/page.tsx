"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Save, RefreshCw } from "lucide-react";
import type { Application, ReviewStatus, PaymentStatus } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, DOCUMENT_TYPE_LABELS, TRANSPORT_MODE_LABELS, calcSupportTotal } from "@/types";
import {
  REVIEW_STATUS_META, PAYMENT_STATUS_META, REVIEW_STATUS_ORDER, PAYMENT_STATUS_ORDER,
} from "@/config/status";
import AdminLayout from "@/components/admin/AdminLayout";

const REVIEW_STATUSES = REVIEW_STATUS_ORDER;
const PAYMENT_STATUSES = PAYMENT_STATUS_ORDER;

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
      }),
    });
    setSaving(false);
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
      ["개인/팀", app.contestDetail.isTeam ? "팀" : "개인"],
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
          <button onClick={() => window.open(`/admin/applications/${id}/print?doc=form`, "_blank")} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 신청서
          </button>
          <button onClick={() => window.open(`/admin/applications/${id}/print?doc=evidence`, "_blank")} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 증빙서류
          </button>
          <button onClick={() => window.open(`/admin/applications/${id}/print?doc=review`, "_blank")} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 심의요청서
          </button>
          <button onClick={() => window.open(`/admin/applications/${id}/print?doc=payment`, "_blank")} className="btn-secondary text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 지출자료
          </button>
          <button onClick={driveSync} disabled={syncing} className="btn-secondary text-sm flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "동기화 중..." : "Drive 재동기화"}
          </button>
        </div>
      </div>

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
            {app.accountMismatch && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl p-3 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                ⚠️ <span><strong>예금주({app.bankInfo.accountHolder})와 신청자 성명({app.name})이 다릅니다.</strong> 본인 명의 계좌 여부 및 통장 사본을 반드시 확인하세요.</span>
              </div>
            )}
          </div>

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
                    <div key={f.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
                      <div className="flex items-center gap-2 px-3 py-2 text-xs">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="font-medium truncate flex-1">{f.name}</span>
                        <span className="text-gray-400">{DOCUMENT_TYPE_LABELS[f.type]}</span>
                      </div>
                      <div className="bg-white/60 flex items-center justify-center" style={{ height: 160 }}>
                        {f.url && isImage ? (
                          <img src={f.url} alt={f.name} className="max-w-full max-h-full object-contain" />
                        ) : f.url && isPdf ? (
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm underline">PDF 새 창에서 보기</a>
                        ) : (
                          <span className="text-gray-400 text-xs">{f.url ? "미리보기 불가" : "미리보기 없음"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title">상태 관리</h2>
            <div className="space-y-4">
              <div>
                <label className="label">검토 상태</label>
                <select className="input-field" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}>
                  {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{REVIEW_STATUS_META[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">지급 상태</label>
                <select className="input-field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_META[s].label}</option>)}
                </select>
              </div>
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
                <label className="label">관리자 메모</label>
                <textarea
                  className="input-field h-28 resize-none"
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  placeholder="내부 검토 메모 (학생에게 노출되지 않음)"
                />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>

          <div className="card bg-gray-50">
            <h3 className="font-medium text-gray-600 text-sm mb-2">메모 예시</h3>
            {["증빙자료 부족", "심의위원회 검토 필요", "지급 가능", "지출 완료", "계좌 정보 확인 필요"].map((m) => (
              <button key={m} onClick={() => setAdminMemo(m)} className="block text-xs text-primary-600 hover:underline mb-1">{m}</button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
