"use client";
import { useEffect, useState, useMemo } from "react";
import { Search, KeyRound, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface Applicant {
  id: string; student_id: string; name: string;
  department?: string; phone?: string; email?: string; university?: string;
}

export default function ApplicantsPage() {
  const [list, setList] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/applicants").then((r) => r.json()).then((d) => { setList(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return list;
    return list.filter((a) => (a.student_id || "").includes(q) || (a.name || "").includes(q));
  }, [list, search]);

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

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><Users className="w-6 h-6 text-indigo-500" /> 신청자 정보</h1>
      <p className="text-gray-500 text-sm mb-4">신청자 로그인 지원용 화면입니다. 보안상 비밀번호 원문은 조회할 수 없으며, 필요 시 새 비밀번호로 재설정할 수 있습니다.</p>

      <div className="card mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="학번 또는 이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <td className="font-medium whitespace-nowrap">{a.name}</td>
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
    </AdminLayout>
  );
}
