"use client";
import { useEffect, useState, useMemo } from "react";
import { Search, KeyRound, Users, Lock, CheckCircle, Download, X, ShieldCheck } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, FUND_CATEGORY_LABELS } from "@/types";
import { fetchPrograms, type Program } from "@/lib/programs";

interface Applicant {
  id: string; student_id: string; name: string;
  department?: string; phone?: string; email?: string; university?: string;
  skip_pre?: boolean; skip_pre_programs?: string[];
}

// 지원금 신청 가능 학생 목록의 한 행 (승인 신청 / 지원신청 면제)
interface EligRow {
  program: string; studentId: string; name: string; department: string;
  source: "approved" | "exempt"; phase?: string; type?: string; date?: string;
}

const progNameOf = (a: Application): string =>
  a.programDetail?.programName || a.laborDetail?.programName || a.activityDetail?.activityName || a.staffDetail?.programName || "(프로그램 미지정)";

// 공백/쉼표로 구분된 여러 검색어 (여러 학생 동시 검색)
const matchTerms = (s: Applicant, q: string) => {
  const terms = q.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.some((t) => (s.student_id || "").includes(t) || (s.name || "").includes(t));
};

export default function ApplicantsPage() {
  // 진입 시마다 비밀번호 확인 (세션 저장하지 않음 — 메뉴 진입 때마다 재확인)
  const [unlocked, setUnlocked] = useState(false);
  const [gatePw, setGatePw] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [myId, setMyId] = useState("");
  useEffect(() => { fetch("/api/admin/status").then((r) => r.json()).then((d) => { if (d?.admin) setMyId(d.id || ""); }).catch(() => {}); }, []);
  const tryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginId: myId, password: gatePw }) });
    const j = await res.json().catch(() => ({ success: false }));
    if (j.success) { setUnlocked(true); setGatePw(""); }
    else setGateErr("비밀번호가 올바르지 않습니다.");
  };

  const [list, setList] = useState<Applicant[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eligSearch, setEligSearch] = useState("");
  const [eligProgram, setEligProgram] = useState<string>("all");
  const [view, setView] = useState<"students" | "eligible">("students");
  const [skipModal, setSkipModal] = useState<Applicant | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/admin/applicants").then((r) => r.json()).then((d) => { setList(Array.isArray(d) ? d : []); setLoading(false); });
    fetch("/api/applications").then((r) => r.json()).then((d) => setApps(Array.isArray(d) ? d : [])).catch(() => {});
    fetchPrograms().then((p) => setPrograms(p)).catch(() => {});
  }, [unlocked]);

  const filtered = useMemo(() => list.filter((a) => matchTerms(a, search)), [list, search]);
  const progNameById = useMemo(() => Object.fromEntries(programs.map((p) => [p.id, p.name])), [programs]);

  // 프로그램별 지원금 신청 가능 학생 = 승인 신청(미취소) + 지원신청 면제 학생
  const eligibleRows = useMemo<EligRow[]>(() => {
    const rows: EligRow[] = [];
    apps.filter((a) => a.reviewStatus === "approved" && !a.canceled).forEach((a) => {
      rows.push({
        program: progNameOf(a), studentId: a.studentId || "", name: a.name || "", department: a.department || "",
        source: "approved", phase: APPLICATION_PHASE_LABELS[a.applicationPhase || "fund"],
        type: APPLICATION_TYPE_LABELS[a.applicationType], date: a.applicationDate,
      });
    });
    list.forEach((s) => {
      (s.skip_pre_programs || []).forEach((pid) => {
        rows.push({
          program: progNameById[pid] || "(삭제된 프로그램)", studentId: s.student_id || "", name: s.name || "",
          department: s.department || "", source: "exempt",
        });
      });
    });
    return rows;
  }, [apps, list, progNameById]);

  // 프로그램 선택 옵션 = 현재 프로그램 목록(프로그램 신청 내용에서 추가/삭제 반영) + 신청 데이터에 등장한 프로그램
  const programOptions = useMemo(() => {
    const names = new Set<string>();
    programs.forEach((p) => p.name && names.add(p.name));
    eligibleRows.forEach((r) => r.program && names.add(r.program));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ko"));
  }, [programs, eligibleRows]);

  const eligibleByProgram = useMemo(() => {
    const terms = eligSearch.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    const match = (r: EligRow) => (terms.length === 0 || terms.some((t) => r.studentId.includes(t) || r.name.includes(t)))
      && (eligProgram === "all" || r.program === eligProgram);
    const m: Record<string, EligRow[]> = {};
    eligibleRows.filter(match).forEach((r) => { (m[r.program] ||= []).push(r); });
    return Object.entries(m).sort((x, y) => x[0].localeCompare(y[0], "ko"));
  }, [eligibleRows, eligSearch, eligProgram]);

  const downloadEligibleExcel = async () => {
    const XLSX = await import("xlsx");
    const aoa: (string | undefined)[][] = [["프로그램", "학번", "이름", "학과", "구분", "단계/유형", "신청일"]];
    eligibleByProgram.forEach(([prog, rows]) => rows.forEach((r) => {
      aoa.push([prog, r.studentId, r.name, r.department, r.source === "exempt" ? "지원신청 면제" : "승인",
        r.source === "exempt" ? "" : `${r.phase || ""} ${r.type || ""}`.trim(), r.date || ""]);
    }));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "지원금 신청 가능 학생");
    XLSX.writeFile(wb, `지원금신청가능학생_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 프로그램별 면제 저장 (모달에서 호출)
  const saveSkipPrograms = async (a: Applicant, programIds: string[]) => {
    const prev = a.skip_pre_programs || [];
    setList((l) => l.map((x) => x.id === a.id ? { ...x, skip_pre_programs: programIds, skip_pre: programIds.length > 0 } : x));
    setSkipModal(null);
    const res = await fetch("/api/admin/applicants/skip-pre", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, programIds }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (!j.ok) { setList((l) => l.map((x) => x.id === a.id ? { ...x, skip_pre_programs: prev, skip_pre: prev.length > 0 } : x)); alert("변경 실패: " + (j.error || res.status)); }
  };

  const resetPw = async (a: Applicant) => {
    const pw = window.prompt(`${a.name}(${a.student_id})님의 새 비밀번호를 입력하세요. (6자 이상)`);
    if (pw == null) return;
    if (pw.length < 6) { alert("비밀번호는 6자 이상이어야 합니다."); return; }
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, password: pw }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) alert(`비밀번호가 재설정되었습니다.\n학번: ${a.student_id}\n새 비밀번호: ${pw}\n\n신청자에게 안내해주세요.`);
    else alert("재설정 실패: " + (j.error || "알 수 없는 오류"));
  };

  if (!unlocked) return (
    <AdminLayout>
      <div className="max-w-sm mx-auto mt-16 card text-center">
        <div className="glass-pill w-14 h-14 flex items-center justify-center mx-auto mb-3"><Lock className="w-7 h-7 text-indigo-600" /></div>
        <h1 className="text-lg font-bold text-gray-800 mb-1">신청자 정보 접근 확인</h1>
        <p className="text-sm text-gray-500 mb-4">개인정보 보호를 위해 메뉴 진입 시마다 관리자 비밀번호를 입력해주세요.</p>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input type="password" className="input-field" value={gatePw} onChange={(e) => setGatePw(e.target.value)} placeholder="관리자 비밀번호" autoFocus />
          {gateErr && <p className="text-red-500 text-sm">{gateErr}</p>}
          <button type="submit" disabled={!gatePw} className="btn-primary w-full">확인</button>
        </form>
      </div>
    </AdminLayout>
  );

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><Users className="w-6 h-6 text-indigo-500" /> 신청자 정보</h1>
      <p className="text-gray-500 text-sm mb-4">신청자 로그인 지원용 화면입니다. 보안상 비밀번호 원문은 조회할 수 없으며, 필요 시 새 비밀번호로 재설정할 수 있습니다.</p>

      {/* 보기 전환 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("students")} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${view === "students" ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>학생 검색</button>
        <button onClick={() => setView("eligible")} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${view === "eligible" ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>프로그램별 지원금 신청 가능 학생</button>
      </div>

      {view === "students" ? (
        <>
          <div className="card mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9 w-72" placeholder="학번/이름 검색 (여러 명은 띄어쓰기·쉼표로 구분)" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{filtered.length}명</p>
          </div>

          <div className="overflow-x-auto rounded-[32px]">
            <table className="table-glass text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">학번</th>
                  <th className="whitespace-nowrap">이름</th>
                  <th className="whitespace-nowrap">소속</th>
                  <th className="whitespace-nowrap">학과</th>
                  <th className="whitespace-nowrap">연락처</th>
                  <th className="whitespace-nowrap">비밀번호</th>
                  <th className="text-center whitespace-nowrap">지원신청 면제</th>
                  <th className="text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.student_id}</td>
                    <td className="font-medium whitespace-nowrap">{a.name || "-"}</td>
                    <td className="text-gray-600 whitespace-nowrap">{a.university || "-"}</td>
                    <td className="text-gray-600 max-w-[140px] truncate">{a.department || "-"}</td>
                    <td className="text-gray-600 whitespace-nowrap">{a.phone || "-"}</td>
                    <td className="text-gray-400">•••••• (비공개)</td>
                    <td className="text-center">
                      <button
                        onClick={() => setSkipModal(a)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1 ${(a.skip_pre_programs?.length || 0) > 0 ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/70 text-gray-500 border-gray-200 hover:border-emerald-300"}`}
                        title="지원신청 없이 지원금 신청을 허용할 프로그램 선택"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {(a.skip_pre_programs?.length || 0) > 0 ? `면제 ${a.skip_pre_programs!.length}개` : "면제 설정"}
                      </button>
                    </td>
                    <td className="text-center">
                      <button onClick={() => resetPw(a)} className="text-indigo-600 hover:underline text-xs font-medium inline-flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" /> 비밀번호 재설정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 검토 <strong>승인</strong> 신청 + 관리자가 <strong>지원신청 면제</strong>한 학생을 프로그램별로 모았습니다.</p>
          <div className="card flex items-center gap-2 flex-wrap">
            <select className="input-field !w-auto text-sm" value={eligProgram} onChange={(e) => setEligProgram(e.target.value)}>
              <option value="all">전체 프로그램</option>
              {programOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9 w-72" placeholder="학번/이름 검색 (여러 명은 띄어쓰기·쉼표)" value={eligSearch} onChange={(e) => setEligSearch(e.target.value)} />
            </div>
            <span className="text-xs text-gray-400">{eligibleByProgram.reduce((s, [, r]) => s + r.length, 0)}건</span>
            <button onClick={downloadEligibleExcel} className="btn-secondary text-sm flex items-center gap-1.5 ml-auto"><Download className="w-4 h-4" /> 엑셀 다운로드</button>
          </div>
          {eligibleByProgram.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">표시할 학생이 없습니다.</div>
          ) : eligibleByProgram.map(([prog, rows]) => (
            <div key={prog} className="card">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="font-bold text-gray-800">{prog}</h3>
                <span className="badge bg-emerald-100 text-emerald-700">{rows.length}명</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-glass text-sm">
                  <thead><tr>
                    <th className="whitespace-nowrap">학번</th>
                    <th className="whitespace-nowrap">이름</th>
                    <th className="whitespace-nowrap">학과</th>
                    <th className="whitespace-nowrap">구분</th>
                    <th className="whitespace-nowrap">단계/유형</th>
                    <th className="whitespace-nowrap">신청일</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">{r.studentId || "-"}</td>
                        <td className="font-medium whitespace-nowrap">{r.name || "-"}</td>
                        <td className="text-gray-600 max-w-[160px] truncate">{r.department || "-"}</td>
                        <td className="text-xs whitespace-nowrap">
                          {r.source === "exempt"
                            ? <span className="badge bg-amber-100 text-amber-700">지원신청 면제</span>
                            : <span className="badge bg-emerald-100 text-emerald-700">승인</span>}
                        </td>
                        <td className="text-xs whitespace-nowrap text-gray-600">{r.source === "exempt" ? "-" : `${r.phase || ""} · ${r.type || ""}`}</td>
                        <td className="text-gray-500 whitespace-nowrap">{r.date || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {skipModal && (
        <SkipPreModal
          applicant={skipModal}
          programs={programs}
          onClose={() => setSkipModal(null)}
          onSave={(ids) => saveSkipPrograms(skipModal, ids)}
        />
      )}
    </AdminLayout>
  );
}

// 지원신청 면제 프로그램 선택 모달
function SkipPreModal({ applicant, programs, onClose, onSave }: { applicant: Applicant; programs: Program[]; onClose: () => void; onSave: (ids: string[]) => void; }) {
  const [sel, setSel] = useState<string[]>(applicant.skip_pre_programs || []);
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const byCat = useMemo(() => {
    const m: Record<string, Program[]> = {};
    programs.forEach((p) => { (m[p.category] ||= []).push(p); });
    return m;
  }, [programs]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />
      <div className="modal relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-gray-800 mb-1 pr-8">지원신청 면제 프로그램</h2>
        <p className="text-sm text-gray-500 mb-4">{applicant.name}({applicant.student_id})님이 <strong>지원신청 없이</strong> 바로 지원금 신청할 수 있는 프로그램을 선택하세요.</p>
        {programs.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 프로그램이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(byCat).map(([cat, ps]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-500 mb-1">{FUND_CATEGORY_LABELS[cat as keyof typeof FUND_CATEGORY_LABELS] || cat}</p>
                <div className="space-y-1">
                  {ps.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} />
                      <span className="text-gray-700">{p.name || "(이름 없음)"}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center gap-2 mt-5">
          <button onClick={() => setSel([])} className="text-xs text-gray-400 hover:text-red-500">전체 해제</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">취소</button>
            <button onClick={() => onSave(sel)} className="btn-primary text-sm">저장 ({sel.length})</button>
          </div>
        </div>
      </div>
    </div>
  );
}
