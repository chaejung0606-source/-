"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, Search, FileText, Lock } from "lucide-react";
import type { Application, ApplicationType, ReviewStatus, PaymentStatus } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS } from "@/types";
import { REVIEW_STATUS_META, PAYMENT_STATUS_META, REVIEW_STATUS_ORDER, PAYMENT_STATUS_ORDER } from "@/config/status";
import { ReviewBadge, PaymentBadge } from "@/components/common/StatusBadge";
import AdminLayout from "@/components/admin/AdminLayout";
import { buildExportName } from "@/lib/export-settings";

export default function ApplicationsPage() {
  // 신청 목록 진입 비밀번호 게이트 (진입 시마다 재확인 — 세션 저장 안 함)
  const [unlocked, setUnlocked] = useState(false);
  const [gatePw, setGatePw] = useState("");
  const [gateErr, setGateErr] = useState("");
  const tryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: gatePw }) });
    const j = await res.json().catch(() => ({ success: false }));
    if (j.success) { setUnlocked(true); setGatePw(""); }
    else setGateErr("비밀번호가 올바르지 않습니다.");
  };

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 신청 / 취소 목록 분리
  const [view, setView] = useState<"active" | "canceled">("active");

  // 필터 상태
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApplicationType | "">("");
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "">("");
  const [payFilter, setPayFilter] = useState<PaymentStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/applications").then((r) => r.json()).then((d) => { setApps(d); setLoading(false); });
  }, [unlocked]);

  const canceledCount = useMemo(() => apps.filter((a) => a.canceled).length, [apps]);
  const activeCount = apps.length - canceledCount;

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (view === "active" && a.canceled) return false;
      if (view === "canceled" && !a.canceled) return false;
      if (search && !a.name.includes(search) && !a.studentId.includes(search)) return false;
      if (typeFilter && a.applicationType !== typeFilter) return false;
      if (reviewFilter && a.reviewStatus !== reviewFilter) return false;
      if (payFilter && a.paymentStatus !== payFilter) return false;
      if (dateFrom && a.applicationDate < dateFrom) return false;
      if (dateTo && a.applicationDate > dateTo) return false;
      return true;
    });
  }, [apps, view, search, typeFilter, reviewFilter, payFilter, dateFrom, dateTo]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const today10 = () => new Date().toISOString().slice(0, 10);

  // 전체 목록 다운로드 — 신청 + 취소 병합, 접수번호 순 정렬
  const exportAll = async () => {
    const { exportToExcel } = await import("@/lib/excel-export");
    const merged = [...apps].sort((a, b) => (a.receiptNumber || "").localeCompare(b.receiptNumber || "", "ko"));
    exportToExcel(merged, buildExportName("listAll", { 날짜: today10() }) + ".xlsx");
  };

  // 선택 목록 다운로드 — 현재 보기(신청/취소)에서 선택된 항목만
  const exportSelected = async () => {
    const sel = filtered.filter((a) => selected.has(a.id));
    if (sel.length === 0) { alert("먼저 다운로드할 항목을 선택하세요."); return; }
    const { exportToExcel } = await import("@/lib/excel-export");
    exportToExcel(sel, buildExportName("listSelected", { 날짜: today10() }) + ".xlsx");
  };

  // 선택 항목의 지출자료 / 심의요청서 PDF 내보내기 — 항목별로 각각(유형에 맞는 파일명·경로)
  const exportPdfBatch = (doc: "payment" | "review") => {
    const sel = filtered.filter((a) => selected.has(a.id));
    if (sel.length === 0) { alert("먼저 내보낼 항목을 선택하세요."); return; }
    if (sel.length > 8 && !confirm(`${sel.length}건을 항목별로 각각 인쇄 창으로 엽니다. 계속할까요?`)) return;
    // 항목마다 개별 인쇄 창 — 각 신청 건의 유형에 맞는 파일명으로 저장됩니다.
    sel.forEach((a, i) => {
      setTimeout(() => window.open(`/admin/applications/${a.id}/print?doc=${doc}`, `print_${doc}_${a.id}`), i * 350);
    });
  };

  const deleteApp = async (id: string) => {
    if (!confirm("이 테스트 신청을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
    else alert("삭제 실패");
  };

  if (!unlocked) return (
    <AdminLayout>
      <div className="max-w-sm mx-auto mt-16 card text-center">
        <div className="glass-pill w-14 h-14 flex items-center justify-center mx-auto mb-3"><Lock className="w-7 h-7 text-indigo-600" /></div>
        <h1 className="text-lg font-bold text-gray-800 mb-1">신청 목록 접근 확인</h1>
        <p className="text-sm text-gray-500 mb-4">신청자 개인정보 보호를 위해 관리자 비밀번호를 다시 입력해주세요.</p>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input type="password" className="input-field" value={gatePw} onChange={(e) => setGatePw(e.target.value)} placeholder="관리자 비밀번호" autoFocus />
          {gateErr && <p className="text-red-500 text-sm">{gateErr}</p>}
          <button type="submit" disabled={!gatePw} className="btn-primary w-full">확인</button>
        </form>
      </div>
    </AdminLayout>
  );

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  // 대시보드는 취소된 신청을 제외 (취소 목록은 집계에 포함하지 않음)
  const statCount = (field: "reviewStatus" | "paymentStatus", val: string) => apps.filter((a) => !a.canceled && a[field] === val).length;
  // 관리자가 아직 확인하지 못한(검토 상태 '신청완료') 신청 건수
  const unconfirmedCount = apps.filter((a) => !a.canceled && a.reviewStatus === "received").length;

  return (
    <AdminLayout>
      {/* 대시보드 (신청 목록 상단 통합) — 좌: 미확인 신청 / 우: 상태 표시 */}
      <div className="card mb-5 flex flex-col sm:flex-row gap-5">
        <div className="sm:w-44 shrink-0 flex flex-col items-center justify-center text-center sm:border-r sm:border-gray-100 sm:pr-5">
          <span className="text-sm text-gray-500">관리자 미확인 신청</span>
          <span className="text-4xl font-bold text-rose-600 my-1">{unconfirmedCount}<span className="text-base text-gray-500 font-medium ml-1">건</span></span>
          <span className="text-[11px] text-gray-400">검토 상태 ‘{REVIEW_STATUS_META.received.label}’</span>
        </div>
        <div className="flex-1 grid grid-cols-[64px_1fr] gap-x-3 gap-y-4 items-start">
          <div className="text-xs font-semibold text-gray-500 pt-1">검토 상태</div>
          <div className="flex flex-wrap gap-2">
            {REVIEW_STATUS_ORDER.map((s) => (
              <div key={s} className={`w-[68px] rounded-xl p-2 text-center border border-white/80 ring-1 ring-black/5 shadow-sm ${REVIEW_STATUS_META[s].badge}`}>
                <div className="text-[10px] font-semibold leading-tight mb-0.5">{REVIEW_STATUS_META[s].label}</div>
                <div className="text-lg font-bold leading-none">{statCount("reviewStatus", s)}</div>
              </div>
            ))}
          </div>
          <div className="text-xs font-semibold text-gray-500 pt-1">지급 상태</div>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUS_ORDER.map((s) => (
              <div key={s} className={`w-[68px] rounded-xl p-2 text-center border border-white/80 ring-1 ring-black/5 shadow-sm ${PAYMENT_STATUS_META[s].badge}`}>
                <div className="text-[10px] font-semibold leading-tight mb-0.5">{PAYMENT_STATUS_META[s].label}</div>
                <div className="text-lg font-bold leading-none">{statCount("paymentStatus", s)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{view === "active" ? "신청 목록" : "취소 목록"}</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportPdfBatch("payment")} className="btn-secondary flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" /> 지출자료{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
          <button onClick={() => exportPdfBatch("review")} className="btn-secondary flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" /> 심의요청서{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
          <button onClick={exportAll} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> 전체 목록 다운로드
          </button>
          <button onClick={exportSelected} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> 선택 목록 다운로드{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>

      {/* 신청 / 취소 목록 탭 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setView("active"); setSelected(new Set()); }} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${view === "active" ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>
          신청 목록 ({activeCount})
        </button>
        <button onClick={() => { setView("canceled"); setSelected(new Set()); }} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${view === "canceled" ? "bg-rose-500 text-white" : "bg-white/60 text-gray-600"}`}>
          취소 목록 ({canceledCount})
        </button>
      </div>

      {/* 필터 */}
      <div className="card mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="이름 또는 학번 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ApplicationType | "")}>
            <option value="">신청 유형 전체</option>
            {(Object.keys(APPLICATION_TYPE_LABELS) as ApplicationType[]).map((k) => (
              <option key={k} value={k}>{APPLICATION_TYPE_LABELS[k]}</option>
            ))}
          </select>
          <select className="input-field" value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value as ReviewStatus | "")}>
            <option value="">검토 상태 전체</option>
            {(Object.keys(REVIEW_STATUS_META) as ReviewStatus[]).map((k) => (
              <option key={k} value={k}>{REVIEW_STATUS_META[k].label}</option>
            ))}
          </select>
          <select className="input-field" value={payFilter} onChange={(e) => setPayFilter(e.target.value as PaymentStatus | "")}>
            <option value="">지급 상태 전체</option>
            {(Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).map((k) => (
              <option key={k} value={k}>{PAYMENT_STATUS_META[k].label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-gray-500">신청일:</span>
          <input type="date" className="input-field w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400">~</span>
          <input type="date" className="input-field w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <span className="text-sm text-gray-400 ml-2">{filtered.length}건</span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-[32px]">
        <table className="table-glass text-sm">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[#4f8cff]" />
              </th>
              <th className="whitespace-nowrap">접수번호</th>
              <th className="whitespace-nowrap">신청일</th>
              <th className="whitespace-nowrap">이름</th>
              <th className="whitespace-nowrap">학번</th>
              <th className="whitespace-nowrap">학과</th>
              <th className="whitespace-nowrap">신청 유형</th>
              <th className="text-right whitespace-nowrap">신청 금액</th>
              <th className="text-right whitespace-nowrap">산정 금액</th>
              <th className="text-center whitespace-nowrap">검토 상태</th>
              <th className="text-center whitespace-nowrap">지급 상태</th>
              {view === "canceled" && <th className="whitespace-nowrap">취소 일시 / IP</th>}
              <th className="whitespace-nowrap">첨부</th>
              <th className="text-center whitespace-nowrap">상세</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={view === "canceled" ? 14 : 13} className="text-center py-12 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : filtered.map((app) => (
              <tr key={app.id} style={selected.has(app.id) ? { background: "rgba(79,140,255,0.08)" } : undefined}>
                <td>
                  <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)} className="accent-[#4f8cff]" />
                </td>
                <td className="font-mono text-xs">{app.receiptNumber}</td>
                <td className="whitespace-nowrap">{app.applicationDate}</td>
                <td className="font-medium whitespace-nowrap">
                  {app.isTest && <span className="badge bg-amber-100 text-amber-700 mr-1">테스트용</span>}
                  {app.name}{app.accountMismatch && <span title="예금주 불일치 (본인명의 확인 필요)" className="ml-1 text-red-500">⚠️</span>}
                </td>
                <td className="font-mono text-xs">{app.studentId}</td>
                <td className="text-gray-600 max-w-[120px] truncate">{app.department}</td>
                <td className="text-xs whitespace-nowrap">
                  <span className={`badge mr-1 ${app.applicationPhase === "pre" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>{APPLICATION_PHASE_LABELS[app.applicationPhase || "fund"]}</span>
                  {APPLICATION_TYPE_LABELS[app.applicationType]}
                </td>
                <td className="text-right font-mono">{app.requestAmount.toLocaleString()}</td>
                <td className="text-right font-mono text-[#4f8cff]">{app.calculatedAmount.toLocaleString()}</td>
                <td className="text-center"><ReviewBadge status={app.reviewStatus} /></td>
                <td className="text-center"><PaymentBadge status={app.paymentStatus} /></td>
                {view === "canceled" && (
                  <td className="text-xs whitespace-nowrap text-gray-600">
                    {app.canceledAt ? new Date(app.canceledAt).toLocaleString("ko-KR") : "-"}
                    <span className="block font-mono text-gray-400">{app.canceledIp || "-"}</span>
                  </td>
                )}
                <td className="text-center text-gray-400">{app.files.length > 0 ? `📎 ${app.files.length}` : "-"}</td>
                <td className="text-center whitespace-nowrap">
                  <Link href={`/admin/applications/${app.id}`} className="text-[#4f8cff] hover:underline text-xs font-medium">상세</Link>
                  {app.isTest && <button onClick={() => deleteApp(app.id)} className="text-rose-500 hover:underline text-xs font-medium ml-2">삭제</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
