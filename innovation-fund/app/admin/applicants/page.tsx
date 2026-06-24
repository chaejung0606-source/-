"use client";
import { useEffect, useState, useMemo } from "react";
import { Search, KeyRound, Users, Lock, CheckCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";

interface Applicant {
  id: string; student_id: string; name: string;
  department?: string; phone?: string; email?: string; university?: string;
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
  const tryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: gatePw }) });
    const j = await res.json().catch(() => ({ success: false }));
    if (j.success) { setUnlocked(true); setGatePw(""); }
    else setGateErr("비밀번호가 올바르지 않습니다.");
  };

  const [list, setList] = useState<Applicant[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"students" | "eligible">("students");

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/admin/applicants").then((r) => r.json()).then((d) => { setList(Array.isArray(d) ? d : []); setLoading(false); });
    fetch("/api/applications").then((r) => r.json()).then((d) => setApps(Array.isArray(d) ? d : [])).catch(() => {});
  }, [unlocked]);

  const filtered = useMemo(() => list.filter((a) => matchTerms(a, search)), [list, search]);

  // 프로그램별 지원금 신청 가능 학생 = 지원신청(pre) 승인 + 미취소
  const eligibleByProgram = useMemo(() => {
    const m: Record<string, Application[]> = {};
    apps.filter((a) => a.applicationPhase === "pre" && a.reviewStatus === "approved" && !a.canceled)
      .forEach((a) => { (m[progNameOf(a)] ||= []).push(a); });
    return Object.entries(m).sort((x, y) => x[0].localeCompare(y[0], "ko"));
  }, [apps]);

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
                  <th className="text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.student_id}</td>
                    <td className="font-medium whitespace-nowrap">{a.name || "-"}</td>
                    <td className="text-gray-600 whitespace-nowrap">{a.university || "-"}</td>
                    <td className="text-gray-600 max-w-[140px] truncate">{a.department || "-"}</td>
                    <td className="text-gray-600 whitespace-nowrap">{a.phone || "-"}</td>
                    <td className="text-gray-400">•••••• (비공개)</td>
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
          <p className="text-sm text-gray-500 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 지원신청이 <strong>승인</strong>된 학생만 해당 프로그램의 지원금 신청이 가능합니다. (프로그램별 목록)</p>
          <p className="text-[11px] text-gray-400">진단: 불러온 신청 {apps.length}건 · 지원신청(pre) {apps.filter((a) => a.applicationPhase === "pre" && !a.canceled).length}건 · 그중 승인 {apps.filter((a) => a.applicationPhase === "pre" && a.reviewStatus === "approved" && !a.canceled).length}건 · (검토상태 분포: {Array.from(new Set(apps.filter((a) => a.applicationPhase === "pre").map((a) => a.reviewStatus))).join(", ") || "없음"})</p>
          {eligibleByProgram.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">승인된 지원신청이 없습니다.</div>
          ) : eligibleByProgram.map(([prog, students]) => (
            <div key={prog} className="card">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="font-bold text-gray-800">{prog}</h3>
                <span className="badge bg-emerald-100 text-emerald-700">{students.length}명 신청 가능</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-glass text-sm">
                  <thead><tr>
                    <th className="whitespace-nowrap">학번</th>
                    <th className="whitespace-nowrap">이름</th>
                    <th className="whitespace-nowrap">학과</th>
                    <th className="whitespace-nowrap">신청 유형</th>
                    <th className="whitespace-nowrap">지원신청일</th>
                  </tr></thead>
                  <tbody>
                    {students.map((a) => (
                      <tr key={a.id}>
                        <td className="font-mono text-xs">{a.studentId}</td>
                        <td className="font-medium whitespace-nowrap">{a.name}</td>
                        <td className="text-gray-600 max-w-[160px] truncate">{a.department}</td>
                        <td className="text-xs whitespace-nowrap">{APPLICATION_TYPE_LABELS[a.applicationType]}</td>
                        <td className="text-gray-500 whitespace-nowrap">{a.applicationDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
