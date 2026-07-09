"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, Search, FileText, Lock, Send, Undo2 } from "lucide-react";
import type { Application, ApplicationType, ReviewStatus, PaymentStatus } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { buildExportName } from "@/lib/export-settings";
import { type StatusConfig, DEFAULT_STATUS_CONFIG, statusMeta } from "@/lib/status-config";
import { fetchPrograms, type Program } from "@/lib/programs";
import { isGateUnlocked, unlockGate } from "@/lib/pw-gate";

// 신청 건의 프로그램명 추출
const progNameOf = (a: Application): string =>
  a.programDetail?.programName || a.laborDetail?.programName || a.activityDetail?.activityName || a.staffDetail?.programName || "";

export default function ApplicationsPage() {
  // 신청 목록 비밀번호 게이트 — 좌측 메뉴 클릭 시에만 재확인.
  // 메뉴 안에서의 이동(목록↔상세)은 sessionStorage 플래그로 통과 유지(lib/pw-gate).
  const [unlocked, setUnlocked] = useState(false);
  const [gatePw, setGatePw] = useState("");
  const [gateErr, setGateErr] = useState("");
  useEffect(() => { if (isGateUnlocked("/admin/applications")) setUnlocked(true); }, []);
  // 현재 관리자 세션(역할/아이디/담당 프로그램)
  const [me, setMe] = useState<{ role: "expense" | "program"; id: string; programIds: string[] } | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [allAssigned, setAllAssigned] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/status").then((r) => r.json()).then((d) => {
      if (d?.admin) setMe({ role: d.role || "expense", id: d.id || "", programIds: d.programIds || [] });
    }).catch(() => {});
    fetchPrograms().then(setPrograms).catch(() => {});
  }, []);

  const tryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginId: me?.id || "", password: gatePw }) });
    const j = await res.json().catch(() => ({ success: false }));
    if (j.success) { setUnlocked(true); setGatePw(""); unlockGate("/admin/applications"); }
    else setGateErr("비밀번호가 올바르지 않습니다.");
  };

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusCfg, setStatusCfg] = useState<StatusConfig>(DEFAULT_STATUS_CONFIG);
  useEffect(() => { fetch("/api/admin/status-config").then((r) => r.json()).then(setStatusCfg).catch(() => {}); }, []);

  // 신청 / 취소 목록 분리
  const [view, setView] = useState<"active" | "canceled">("active");

  // 필터 상태
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApplicationType | "">("");
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "">("");
  const [payFilter, setPayFilter] = useState<PaymentStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [progFilter, setProgFilter] = useState(""); // 대시보드 '프로그램별'에서 선택한 프로그램으로 목록 필터

  // 신청 건의 역할 추출 — 근로는 laborDetail.role, 스키마 폼은 '역할' 항목 답변
  const roleOf = (a: Application): string => {
    if (a.laborDetail?.role) return a.laborDetail.role;
    const fields = a.formAnswers?.fields || a.programDetail?.formAnswers?.fields || [];
    const m = fields.find((f) => (f.label || "").includes("역할"));
    return m?.value || "";
  };

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/applications").then((r) => r.json()).then((d) => { setApps(d); setLoading(false); });
  }, [unlocked]);

  // 지출관리자: 프로그램별 관리자에게 배정된 프로그램 집합(인계 단계 기본값 판단용)
  useEffect(() => {
    if (!unlocked || me?.role !== "expense") return;
    fetch("/api/admin/admins").then((r) => r.json()).then((j) => {
      const s = new Set<string>();
      (j?.accounts || []).forEach((a: { programIds?: string[] }) => (a.programIds || []).forEach((p) => s.add(p)));
      setAllAssigned(s);
    }).catch(() => {});
  }, [unlocked, me]);

  const nameToId = useMemo(() => Object.fromEntries(programs.map((p) => [p.name, p.id])), [programs]);
  // 프로그램 관리자의 담당 프로그램명(대시보드 범위 표시용)
  const myProgramNames = useMemo(
    () => (me?.role === "program" ? programs.filter((p) => me.programIds.includes(p.id)).map((p) => p.name) : []),
    [programs, me],
  );
  const ownerProgramId = (a: Application) => nameToId[progNameOf(a)] || "";
  // 인계 단계: 명시값 우선, 없으면 담당 프로그램 관리자 존재 여부로 결정
  const effStage = (a: Application): "program" | "expense" => {
    if (a.reviewStage === "program" || a.reviewStage === "expense") return a.reviewStage;
    const pid = ownerProgramId(a);
    if (me?.role === "program") return "program"; // 본인 담당 프로그램 기본은 검토중
    return pid && allAssigned.has(pid) ? "program" : "expense";
  };

  // 역할별 노출: 프로그램 관리자=담당 프로그램의 검토중 건 / 지출관리자=전달됨(또는 담당자 없는) 건
  const roleVisible = (a: Application): boolean => {
    if (!me) return true;
    if (me.role === "program") {
      const pid = ownerProgramId(a);
      return !!pid && me.programIds.includes(pid) && effStage(a) === "program";
    }
    return effStage(a) === "expense";
  };

  // 현재 관리자에게 보이는 신청 집합 — 대시보드 통계·탭 카운트의 공통 기준(테이블과 일치)
  const visibleApps = useMemo(() => apps.filter(roleVisible),
    [apps, me, nameToId, allAssigned]);
  const canceledCount = useMemo(() => visibleApps.filter((a) => a.canceled).length, [visibleApps]);
  const activeCount = visibleApps.length - canceledCount;

  // 프로그램별 신청 건수 (취소 제외) — 프로그램 관리자: 본인 담당 건 / 지출관리자: 아래 pendingByProgram 사용
  const programCounts = useMemo(() => {
    const m: Record<string, number> = {};
    visibleApps.filter((a) => !a.canceled).forEach((a) => {
      const n = progNameOf(a) || "(프로그램 미지정)";
      m[n] = (m[n] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  }, [visibleApps]);

  // 지출관리자용: 프로그램별 '아직 지출관리자에게 전달되지 않은(프로그램 관리자 검토중)' 신청 건수.
  // 프로그램 관리자가 배정된 프로그램만 대상 — 전달 전 적체 현황 확인용.
  const pendingByProgram = useMemo(() => {
    const m: Record<string, number> = {};
    apps.filter((a) => !a.canceled && !a.isDraft && effStage(a) === "program").forEach((a) => {
      const pid = ownerProgramId(a);
      if (!pid || !allAssigned.has(pid)) return; // 담당 프로그램 관리자가 있는 프로그램만
      const n = progNameOf(a) || "(프로그램 미지정)";
      m[n] = (m[n] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  }, [apps, me, nameToId, allAssigned]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (!roleVisible(a)) return false;
      if (view === "active" && a.canceled) return false;
      if (view === "canceled" && !a.canceled) return false;
      if (search && !a.name.includes(search) && !a.studentId.includes(search)) return false;
      if (typeFilter && a.applicationType !== typeFilter) return false;
      if (reviewFilter && a.reviewStatus !== reviewFilter) return false;
      if (payFilter && a.paymentStatus !== payFilter) return false;
      if (dateFrom && a.applicationDate < dateFrom) return false;
      if (dateTo && a.applicationDate > dateTo) return false;
      if (roleFilter && !roleOf(a).includes(roleFilter)) return false;
      if (progFilter && (progNameOf(a) || "(프로그램 미지정)") !== progFilter) return false;
      return true;
    });
  }, [apps, view, search, typeFilter, reviewFilter, payFilter, dateFrom, dateTo, roleFilter, progFilter, me, nameToId, allAssigned]);

  // 검색용 역할 목록 (현재 표시 대상 신청 건들에서 추출)
  const roleOptions = useMemo(
    () => Array.from(new Set(visibleApps.map(roleOf).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [visibleApps],
  );

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

  // 서류 인계: 선택 건을 지출관리자에게 보내기 / 프로그램 관리자에게 돌려보내기
  const handoff = async (stage: "expense" | "program", note?: string) => {
    const sel = filtered.filter((a) => selected.has(a.id));
    if (sel.length === 0) { alert("먼저 보낼 항목을 선택하세요."); return; }
    const verb = stage === "expense" ? "지출관리자에게 전달" : "프로그램 관리자에게 반송";
    if (!confirm(`${sel.length}건을 ${verb}할까요?`)) return;
    // 건별 성공 여부를 확인해 성공한 건만 화면에 반영(실패를 성공으로 표시하지 않음)
    const results = await Promise.all(sel.map(async (a) => {
      try {
        const res = await fetch(`/api/applications/${a.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stage === "program" ? { reviewStage: "program", handoffNote: note || "" } : { reviewStage: "expense" }),
        });
        return { id: a.id, ok: res.ok };
      } catch { return { id: a.id, ok: false }; }
    }));
    const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    setApps((prev) => prev.map((a) => okIds.has(a.id) ? { ...a, reviewStage: stage, handoffNote: stage === "program" ? (note || "") : a.handoffNote } : a));
    setSelected(new Set());
    const failCount = sel.length - okIds.size;
    if (failCount > 0) alert(`${okIds.size}건 ${verb} 완료, ${failCount}건은 실패했습니다. 목록을 새로고침한 뒤 다시 시도해주세요.`);
    else alert(`${sel.length}건을 ${verb}했습니다.`);
  };
  const sendToExpense = () => handoff("expense");
  const returnToProgram = () => {
    const note = window.prompt("프로그램 관리자에게 전달할 보완 요청 내용을 입력하세요. (선택)") || "";
    handoff("program", note);
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
        <p className="text-sm text-gray-500 mb-4">신청자 개인정보 보호를 위해 관리자 비밀번호를 입력해주세요. (메뉴를 클릭해 들어올 때만 확인합니다)</p>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input type="password" className="input-field" value={gatePw} onChange={(e) => setGatePw(e.target.value)} placeholder="관리자 비밀번호" autoFocus />
          {gateErr && <p className="text-red-500 text-sm">{gateErr}</p>}
          <button type="submit" disabled={!gatePw} className="btn-primary w-full">확인</button>
        </form>
      </div>
    </AdminLayout>
  );

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  // 대시보드는 현재 관리자가 담당·열람하는 신청만(visibleApps), 취소 건 제외하고 집계
  const statCount = (field: "reviewStatus" | "paymentStatus", val: string) => visibleApps.filter((a) => !a.canceled && a[field] === val).length;
  // 관리자가 아직 확인하지 못한(검토 상태 '신청완료'·'보완완료') 신청 건수 — 보완 후 재제출 건도 재확인 대상
  const unconfirmedCount = visibleApps.filter((a) => !a.canceled && (a.reviewStatus === "received" || a.reviewStatus === "supplemented")).length;

  return (
    <AdminLayout wide>
      {/* 역할별 안내 — 대시보드/목록이 현재 관리자 기준으로 표시됨 */}
      {me && (
        <div className="mb-3 flex items-center flex-wrap gap-2 text-sm">
          {me.role === "expense" ? (
            <span className="badge bg-teal-100 text-teal-700">지출관리자 · 전체 권한</span>
          ) : (
            <span className="badge bg-indigo-100 text-indigo-700">프로그램 관리자</span>
          )}
          <span className="text-gray-500">
            {me.role === "expense"
              ? "지출관리자에게 전달된(또는 담당자 없는) 신청 건을 표시합니다."
              : myProgramNames.length > 0
                ? `담당 프로그램: ${myProgramNames.join(", ")}`
                : "배정된 담당 프로그램이 없습니다. 지출관리자에게 프로그램 배정을 요청하세요."}
          </span>
        </div>
      )}

      {/* 대시보드 (신청 목록 상단 통합) — 좌: 미확인 신청 / 우: 상태 표시 */}
      <div className="card mb-5 flex flex-col sm:flex-row gap-5">
        <div className="sm:w-60 shrink-0 flex flex-col items-center justify-center text-center sm:border-r sm:border-gray-100 sm:pr-5 py-2">
          <span className="text-sm text-gray-500">관리자 미확인 신청</span>
          <span className="text-5xl font-bold text-rose-600 my-1.5">{unconfirmedCount}<span className="text-lg text-gray-500 font-medium ml-1">건</span></span>
          <span className="text-[11px] text-gray-400">검토 상태 ‘{statusMeta(statusCfg, "review", "received").label}·{statusMeta(statusCfg, "review", "supplemented").label}’</span>
        </div>
        <div className="flex-1 grid grid-cols-[56px_1fr] gap-x-3 gap-y-4 items-start">
          {(() => { const items = statusCfg.review.filter((o) => statCount("reviewStatus", o.key) > 0); return (<>
            <div className="text-xs font-semibold text-gray-500 pt-1">검토 상태</div>
            <div className="flex flex-wrap gap-2">
              {items.length === 0 ? <span className="text-xs text-gray-400 pt-1">집계할 신청이 없습니다.</span> : items.map((o) => (
                <div key={o.key} className={`grow shrink basis-[68px] rounded-xl p-2 text-center border border-white/80 ring-1 ring-black/5 shadow-sm ${o.badge}`}>
                  <div className="text-[10px] font-semibold leading-tight mb-0.5 whitespace-nowrap">{o.label}</div>
                  <div className="text-lg font-bold leading-none">{statCount("reviewStatus", o.key)}</div>
                </div>
              ))}
            </div>
          </>); })()}
          {(() => { const items = statusCfg.payment.filter((o) => statCount("paymentStatus", o.key) > 0); return (<>
            <div className="text-xs font-semibold text-gray-500 pt-1">지급 상태</div>
            <div className="flex flex-wrap gap-2">
              {items.length === 0 ? <span className="text-xs text-gray-400 pt-1">집계할 신청이 없습니다.</span> : items.map((o) => (
                <div key={o.key} className={`grow shrink basis-[68px] rounded-xl p-2 text-center border border-white/80 ring-1 ring-black/5 shadow-sm ${o.badge}`}>
                  <div className="text-[10px] font-semibold leading-tight mb-0.5 whitespace-nowrap">{o.label}</div>
                  <div className="text-lg font-bold leading-none">{statCount("paymentStatus", o.key)}</div>
                </div>
              ))}
            </div>
          </>); })()}
          {me?.role === "expense" ? (
            <>
              <div className="text-xs font-semibold text-gray-500 pt-1">프로그램별 미전달<span className="block text-[10px] font-normal text-gray-400">(프로그램 관리자 검토중)</span></div>
              <div className="flex flex-wrap gap-2">
                {pendingByProgram.length === 0 ? <span className="text-xs text-gray-400 pt-1">프로그램 관리자가 검토중인(미전달) 신청이 없습니다.</span> : pendingByProgram.map(([name, cnt]) => (
                  <span key={name} title="해당 프로그램 관리자가 아직 지출관리자에게 전달하지 않은 신청 건수"
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border bg-amber-50 text-amber-700 border-amber-100">
                    <span className="max-w-[180px] truncate">{name}</span>
                    <span className="font-bold">{cnt}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-500 pt-1">프로그램별</div>
              <div className="flex flex-wrap gap-2">
                {programCounts.length === 0 ? <span className="text-xs text-gray-400 pt-1">집계할 신청이 없습니다.</span> : programCounts.map(([name, cnt]) => {
                  const active = progFilter === name;
                  return (
                    <button key={name} type="button" onClick={() => setProgFilter(active ? "" : name)} title={active ? "필터 해제" : "이 프로그램만 보기"}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"}`}>
                      <span className="max-w-[180px] truncate">{name}</span>
                      <span className="font-bold">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{view === "active" ? "신청 목록" : "취소 목록"}</h1>
        <div className="flex gap-2 flex-wrap">
          {me?.role === "program" && view === "active" && (
            <button onClick={sendToExpense} className="btn-primary flex items-center gap-2 text-sm">
              <Send className="w-4 h-4" /> 지출관리자에게 보내기{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          )}
          {me?.role === "expense" && view === "active" && (
            <button onClick={returnToProgram} className="btn-secondary flex items-center gap-2 text-sm">
              <Undo2 className="w-4 h-4" /> 프로그램 관리자에게 반송{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          )}
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
            {statusCfg.review.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <select className="input-field" value={payFilter} onChange={(e) => setPayFilter(e.target.value as PaymentStatus | "")}>
            <option value="">지급 상태 전체</option>
            {statusCfg.payment.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-sm text-gray-500">신청일:</span>
          <input type="date" className="input-field w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400">~</span>
          <input type="date" className="input-field w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <span className="text-sm text-gray-500 ml-2">역할:</span>
          <input
            className="input-field w-auto"
            list="role-options"
            placeholder="역할 검색"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
          <datalist id="role-options">
            {roleOptions.map((r) => <option key={r} value={r} />)}
          </datalist>
          {roleFilter && (
            <button type="button" onClick={() => setRoleFilter("")} className="text-xs text-gray-400 hover:text-gray-600 underline">초기화</button>
          )}
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
              <th className="text-center whitespace-nowrap">연번</th>
              <th className="whitespace-nowrap">접수번호</th>
              <th className="whitespace-nowrap">신청일</th>
              <th className="whitespace-nowrap">이름</th>
              <th className="whitespace-nowrap">학번</th>
              <th className="whitespace-nowrap">학과</th>
              <th>신청 유형</th>
              <th className="text-right whitespace-nowrap">신청 금액</th>
              <th className="text-right whitespace-nowrap">산정 금액</th>
              <th className="text-center whitespace-nowrap">검토 상태</th>
              <th className="text-center whitespace-nowrap">지급 상태</th>
              <th className="text-center whitespace-nowrap">단계</th>
              {view === "canceled" && <th className="whitespace-nowrap">취소 일시 / IP</th>}
              <th className="whitespace-nowrap">첨부</th>
              <th className="text-center whitespace-nowrap">상세</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={view === "canceled" ? 16 : 15} className="text-center py-12 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : filtered.map((app, idx) => (
              <tr key={app.id} style={selected.has(app.id) ? { background: "rgba(79,140,255,0.08)" } : undefined}>
                <td>
                  <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)} className="accent-[#4f8cff]" />
                </td>
                <td className="text-center text-gray-400 text-xs">{idx + 1}</td>
                <td className="font-mono text-xs">{app.receiptNumber}</td>
                <td className="whitespace-nowrap">{app.applicationDate}</td>
                <td className="font-medium whitespace-nowrap">
                  {app.isTest && <span className="badge bg-amber-100 text-amber-700 mr-1">테스트용</span>}
                  {app.name}
                </td>
                <td className="font-mono text-xs">{app.studentId}</td>
                <td className="text-gray-600 max-w-[120px] truncate">{app.department}</td>
                <td className="text-xs">
                  <span className={`badge ${app.applicationPhase === "pre" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>{APPLICATION_PHASE_LABELS[app.applicationPhase || "fund"]}</span>
                  <span className="block mt-0.5">{APPLICATION_TYPE_LABELS[app.applicationType]}</span>
                </td>
                <td className="text-right font-mono">{app.requestAmount.toLocaleString()}</td>
                <td className="text-right font-mono text-[#4f8cff]">{app.calculatedAmount.toLocaleString()}</td>
                <td className="text-center"><span className={`badge ${statusMeta(statusCfg, "review", app.reviewStatus).badge}`}>{statusMeta(statusCfg, "review", app.reviewStatus).label}</span></td>
                <td className="text-center"><span className={`badge ${statusMeta(statusCfg, "payment", app.paymentStatus).badge}`}>{statusMeta(statusCfg, "payment", app.paymentStatus).label}</span></td>
                <td className="text-center text-xs whitespace-nowrap">
                  {effStage(app) === "expense" ? <span className="badge bg-teal-100 text-teal-700">지출관리자</span> : <span className="badge bg-indigo-100 text-indigo-700">프로그램검토</span>}
                  {app.handoffNote && <span title={app.handoffNote} className="ml-1 text-amber-500 cursor-help">⚠</span>}
                </td>
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
