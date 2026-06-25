"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, KeyRound, Users, Lock, CheckCircle, Download, X, ShieldCheck, FilePlus, UserPlus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, FUND_CATEGORY_LABELS } from "@/types";
import { fetchPrograms, audienceOf, type Program } from "@/lib/programs";

// 지정 키: "프로그램id::단계(pre|fund)" — 단계별로 따로 지정
const DESIG_PHASES = [["pre", "지원신청"], ["fund", "지원금 신청"]] as const;
const parseDesigKey = (k: string): { programId: string; phase: "pre" | "fund" } => {
  const i = k.lastIndexOf("::");
  if (i < 0) return { programId: k, phase: "fund" }; // 레거시(프로그램 id만): 지원금 신청으로 간주
  const phase = k.slice(i + 2) === "pre" ? "pre" : "fund";
  return { programId: k.slice(0, i), phase };
};

interface Applicant {
  id: string; student_id: string; name: string;
  department?: string; phone?: string; email?: string; university?: string;
  designated_programs?: string[];
  academic_status?: string; previous_student_ids?: string[];
}

// 프로그램별 신청 가능 학생 목록의 한 행 (승인 신청 / 지정학생)
interface EligRow {
  program: string; studentId: string; name: string; department: string;
  source: "approved" | "designated"; phase?: string; type?: string; date?: string;
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
  const [designateModal, setDesignateModal] = useState<Applicant | null>(null);
  // 신청자 등록(회원가입 처리)
  const [regOpen, setRegOpen] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [regForm, setRegForm] = useState({ studentId: "", name: "", password: "", university: "강원대학교", campus: "춘천", department: "", phone: "", email: "", bankName: "", accountNumber: "", accountHolder: "" });
  const setRf = (k: keyof typeof regForm, v: string) => setRegForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/admin/applicants").then((r) => r.json()).then((d) => { setList(Array.isArray(d) ? d : []); setLoading(false); });
    fetch("/api/applications").then((r) => r.json()).then((d) => setApps(Array.isArray(d) ? d : [])).catch(() => {});
    fetchPrograms().then((p) => setPrograms(p)).catch(() => {});
  }, [unlocked]);

  const filtered = useMemo(() => list.filter((a) => matchTerms(a, search)), [list, search]);
  const progNameById = useMemo(() => Object.fromEntries(programs.map((p) => [p.id, p.name])), [programs]);

  // 프로그램별 신청 가능 학생 = 승인 신청(미취소) + '지정학생만' 단계에 지정된 학생(학생 검색에서 지정)
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
      (s.designated_programs || []).forEach((key) => {
        const { programId, phase } = parseDesigKey(key);
        const phaseLabel = phase === "pre" ? "지원신청" : "지원금 신청";
        rows.push({
          program: `${progNameById[programId] || "(삭제된 프로그램)"} · ${phaseLabel}`, studentId: s.student_id || "", name: s.name || "",
          department: s.department || "", source: "designated",
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
      aoa.push([prog, r.studentId, r.name, r.department, r.source === "designated" ? "지정학생" : "승인",
        r.source === "designated" ? "" : `${r.phase || ""} ${r.type || ""}`.trim(), r.date || ""]);
    }));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "신청 가능 학생");
    XLSX.writeFile(wb, `프로그램별신청가능학생_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 프로그램별 지정학생 저장 (모달에서 호출)
  const saveDesignatedPrograms = async (a: Applicant, programIds: string[]) => {
    const prev = a.designated_programs || [];
    setList((l) => l.map((x) => x.id === a.id ? { ...x, designated_programs: programIds } : x));
    setDesignateModal(null);
    const res = await fetch("/api/admin/applicants/designate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, studentId: a.student_id, programIds }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (!j.ok) { setList((l) => l.map((x) => x.id === a.id ? { ...x, designated_programs: prev } : x)); alert("변경 실패: " + (j.error || res.status)); }
  };

  const resetPw = async (a: Applicant) => {
    const pw = window.prompt(`${a.name}(${a.student_id})님의 새 비밀번호를 입력하세요. (8자 이상)`);
    if (pw == null) return;
    if (pw.length < 8) { alert("비밀번호는 8자 이상이어야 합니다."); return; }
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, password: pw }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) alert(`비밀번호가 재설정되었습니다.\n학번: ${a.student_id}\n새 비밀번호: ${pw}\n\n신청자에게 안내해주세요.`);
    else alert("재설정 실패: " + (j.error || "알 수 없는 오류"));
  };

  // 신청자 등록 (서버에서 service_role로 계정 생성)
  const submitRegister = async () => {
    if (!regForm.studentId.trim() || !regForm.name.trim() || !regForm.password) { alert("학번·이름·비밀번호는 필수입니다."); return; }
    if (regForm.password.length < 8) { alert("비밀번호는 8자 이상이어야 합니다."); return; }
    setRegBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regForm),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("등록 실패: " + (j.error || "알 수 없는 오류")); return; }
      alert(`신청자가 등록되었습니다.\n학번: ${regForm.studentId}\n비밀번호: ${regForm.password}\n\n학생에게 안내해주세요. (학번/비밀번호로 로그인)`);
      setRegOpen(false);
      fetch("/api/admin/applicants").then((r) => r.json()).then((d) => setList(Array.isArray(d) ? d : [])).catch(() => {});
    } finally { setRegBusy(false); }
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
        <button onClick={() => setView("eligible")} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${view === "eligible" ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>프로그램별 신청 가능 학생</button>
      </div>

      {view === "students" ? (
        <>
          <div className="card mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input-field pl-9 w-72" placeholder="학번/이름 검색 (여러 명은 띄어쓰기·쉼표로 구분)" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <p className="text-xs text-gray-400 mt-2">{filtered.length}명</p>
            </div>
            <button onClick={() => { setRegForm({ studentId: "", name: "", password: "", university: "강원대학교", campus: "춘천", department: "", phone: "", email: "", bankName: "", accountNumber: "", accountHolder: "" }); setRegOpen(true); }} className="btn-primary text-sm flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> 신청자 등록
            </button>
          </div>

          <div className="overflow-x-auto rounded-[32px]">
            <table className="table-glass text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">학번</th>
                  <th className="whitespace-nowrap">이름</th>
                  <th className="whitespace-nowrap">학적상태</th>
                  <th className="whitespace-nowrap">소속</th>
                  <th className="whitespace-nowrap">학과</th>
                  <th className="whitespace-nowrap">연락처</th>
                  <th className="whitespace-nowrap">비밀번호</th>
                  <th className="text-center whitespace-nowrap">지정 프로그램</th>
                  <th className="text-center whitespace-nowrap">대리 신청 (참여지원비)</th>
                  <th className="text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">
                      {a.student_id}
                      {(a.previous_student_ids?.length || 0) > 0 && (
                        <span title={`이전 학번: ${a.previous_student_ids!.join(", ")}`} className="ml-1 text-gray-400 cursor-help">↩</span>
                      )}
                    </td>
                    <td className="font-medium whitespace-nowrap">{a.name || "-"}</td>
                    <td className="whitespace-nowrap"><span className="badge bg-indigo-50 text-indigo-600">{a.academic_status || "재학생"}</span></td>
                    <td className="text-gray-600 whitespace-nowrap">{a.university || "-"}</td>
                    <td className="text-gray-600 max-w-[140px] truncate">{a.department || "-"}</td>
                    <td className="text-gray-600 whitespace-nowrap">{a.phone || "-"}</td>
                    <td className="text-gray-400">•••••• (비공개)</td>
                    <td className="text-center">
                      <button
                        onClick={() => setDesignateModal(a)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1 ${(a.designated_programs?.length || 0) > 0 ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/70 text-gray-500 border-gray-200 hover:border-emerald-300"}`}
                        title="'지정학생만' 프로그램에서 이 학생이 신청할 수 있도록 지정"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {(a.designated_programs?.length || 0) > 0 ? `지정 ${a.designated_programs!.length}개` : "지정"}
                      </button>
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Link href={`/apply?adminFor=${a.id}&mode=pre`} className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 inline-flex items-center gap-1" title="이 신청자 명의로 프로그램 참여지원비 지원신청 작성">
                          <FilePlus className="w-3.5 h-3.5" /> 지원신청
                        </Link>
                        <Link href={`/apply?adminFor=${a.id}&mode=fund`} className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 inline-flex items-center gap-1" title="이 신청자 명의로 프로그램 참여지원비 지원금 신청 작성">
                          <FilePlus className="w-3.5 h-3.5" /> 지원금
                        </Link>
                      </div>
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
          <p className="text-sm text-gray-500 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 검토 <strong>승인</strong> 신청 + 관리자가 <strong>지정</strong>한 학생을 프로그램별로 모았습니다.</p>
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
                          {r.source === "designated"
                            ? <span className="badge bg-amber-100 text-amber-700">지정학생</span>
                            : <span className="badge bg-emerald-100 text-emerald-700">승인</span>}
                        </td>
                        <td className="text-xs whitespace-nowrap text-gray-600">{r.source === "designated" ? "-" : `${r.phase || ""} · ${r.type || ""}`}</td>
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

      {designateModal && (
        <DesignateModal
          applicant={designateModal}
          programs={programs}
          onClose={() => setDesignateModal(null)}
          onSave={(ids) => saveDesignatedPrograms(designateModal, ids)}
        />
      )}

      {/* 신청자 등록 모달 */}
      {regOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setRegOpen(false)} />
          <div className="modal relative w-full max-w-lg max-h-[88vh] overflow-y-auto p-6">
            <button onClick={() => setRegOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-gray-800 mb-1">신청자 등록</h2>
            <p className="text-xs text-gray-500 mb-4">관리자가 학생 계정을 직접 생성합니다. 등록 후 학번/비밀번호로 로그인할 수 있습니다.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">학번 <span className="text-red-500">*</span></label><input className="input-field" value={regForm.studentId} onChange={(e) => setRf("studentId", e.target.value)} placeholder="숫자만" /></div>
              <div><label className="label">이름 <span className="text-red-500">*</span></label><input className="input-field" value={regForm.name} onChange={(e) => setRf("name", e.target.value)} /></div>
              <div><label className="label">비밀번호 <span className="text-red-500">*</span></label><input className="input-field" value={regForm.password} onChange={(e) => setRf("password", e.target.value)} placeholder="8자 이상" /></div>
              <div>
                <label className="label">캠퍼스</label>
                <select className="input-field" value={regForm.campus} onChange={(e) => setRf("campus", e.target.value)}>
                  {["춘천", "강릉", "삼척", "삼척(도계)", "원주"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">학과/전공</label><input className="input-field" value={regForm.department} onChange={(e) => setRf("department", e.target.value)} placeholder="컴퓨터공학과" /></div>
              <div><label className="label">연락처</label><input className="input-field" value={regForm.phone} onChange={(e) => setRf("phone", e.target.value)} placeholder="010-0000-0000" /></div>
              <div><label className="label">이메일</label><input className="input-field" value={regForm.email} onChange={(e) => setRf("email", e.target.value)} placeholder="id@kangwon.ac.kr" /></div>
              <div className="col-span-2 grid grid-cols-3 gap-3">
                <div><label className="label">은행</label><input className="input-field" value={regForm.bankName} onChange={(e) => setRf("bankName", e.target.value)} placeholder="국민은행" /></div>
                <div><label className="label">예금주</label><input className="input-field" value={regForm.accountHolder} onChange={(e) => setRf("accountHolder", e.target.value)} /></div>
                <div><label className="label">계좌번호</label><input className="input-field" value={regForm.accountNumber} onChange={(e) => setRf("accountNumber", e.target.value)} placeholder="- 없이" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setRegOpen(false)} className="btn-secondary text-sm">취소</button>
              <button onClick={submitRegister} disabled={regBusy} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-60"><UserPlus className="w-4 h-4" /> {regBusy ? "등록 중..." : "등록"}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// 지정학생 선택 모달 — '지정학생만'으로 설정된 (프로그램 × 단계) 항목만 표시
function DesignateModal({ applicant, programs, onClose, onSave }: { applicant: Applicant; programs: Program[]; onClose: () => void; onSave: (ids: string[]) => void; }) {
  // 레거시(프로그램 id만 저장된) 값을 키 형식("id::단계")으로 정규화
  const [sel, setSel] = useState<string[]>(() => (applicant.designated_programs || []).map((v) => v.includes("::") ? v : `${v}::fund`));
  const toggle = (key: string) => setSel((s) => s.includes(key) ? s.filter((x) => x !== key) : [...s, key]);

  // (프로그램, 단계) 단위 항목 — 해당 단계 신청대상이 '지정학생만'이거나 이미 지정된 항목만 노출
  const entries = useMemo(() => {
    const out: { key: string; programId: string; name: string; category: string; phaseLabel: string }[] = [];
    programs.forEach((p) => {
      DESIG_PHASES.forEach(([ph, lbl]) => {
        const key = `${p.id}::${ph}`;
        if (audienceOf(p, ph) === "designated" || sel.includes(key)) {
          out.push({ key, programId: p.id, name: p.name || "(이름 없음)", category: p.category, phaseLabel: lbl });
        }
      });
    });
    return out;
  }, [programs, sel]);
  const byCat = useMemo(() => {
    const m: Record<string, typeof entries> = {};
    entries.forEach((e) => { (m[e.category] ||= []).push(e); });
    return m;
  }, [entries]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />
      <div className="modal relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-gray-800 mb-1 pr-8">지정 프로그램 선택</h2>
        <p className="text-sm text-gray-500 mb-4">{applicant.name}({applicant.student_id})님이 신청할 수 있도록 <strong>지정</strong>할 항목을 선택하세요. 신청대상이 <strong>‘지정학생만’</strong>인 <strong>프로그램의 해당 단계(지원신청·지원금 신청)</strong>만 표시됩니다.</p>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">신청대상이 ‘지정학생만’인 단계가 없습니다. 먼저 ‘프로그램 신청 내용’에서 해당 단계의 신청대상을 ‘지정학생만’으로 설정해주세요.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(byCat).map(([cat, es]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-500 mb-1">{FUND_CATEGORY_LABELS[cat as keyof typeof FUND_CATEGORY_LABELS] || cat}</p>
                <div className="space-y-1">
                  {es.map((e) => (
                    <label key={e.key} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={sel.includes(e.key)} onChange={() => toggle(e.key)} />
                      <span className="text-gray-700">{e.name} <span className="text-xs text-indigo-500">· {e.phaseLabel}</span></span>
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
