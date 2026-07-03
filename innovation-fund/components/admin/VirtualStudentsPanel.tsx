"use client";
import { useEffect, useState, useMemo } from "react";
import { Search, Upload, Trash2, Plus, GraduationCap, Save } from "lucide-react";
import * as XLSX from "xlsx";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";

export interface VStudent {
  student_id: string; name?: string; vdept?: string; department?: string;
  grade?: string; gpa?: number; credits?: number; phone?: string; email?: string;
}

const ALL_TYPES: ApplicationType[] = ["program", "staff", "grade", "contest", "certificate", "labor", "activity"];

const matchTerms = (s: VStudent, q: string) => {
  const terms = q.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.some((t) => (s.student_id || "").includes(t) || (s.name || "").includes(t));
};

// 엑셀 헤더 → 필드 매핑
function rowToStudent(r: Record<string, any>): VStudent | null {
  const pick = (keys: string[]) => { for (const k of keys) { if (r[k] != null && r[k] !== "") return r[k]; } return undefined; };
  const student_id = String(pick(["학번"]) ?? "").trim();
  if (!student_id) return null;
  return {
    student_id,
    name: pick(["성명", "이름"]),
    vdept: pick(["가상학과"]),
    department: pick(["본소속학과", "학과"]),
    grade: pick(["학년"]) != null ? String(pick(["학년"])) : undefined,
    gpa: pick(["평점평균", "평점"]) != null ? Number(pick(["평점평균", "평점"])) : undefined,
    credits: pick(["취득학점"]) != null ? parseInt(String(pick(["취득학점"])), 10) : undefined,
    phone: pick(["휴대폰", "연락처"]),
    email: pick(["이메일"]),
  };
}

// 가상학과 학생 본문 — '신청자 정보' 메뉴의 탭 및 독립 페이지에서 사용
// (상위 페이지에서 이미 관리자 비밀번호로 게이트됨)
export default function VirtualStudentsPanel() {
  const [list, setList] = useState<VStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [requiredTypes, setRequiredTypes] = useState<ApplicationType[]>([]);
  const [cfgSaved, setCfgSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newStu, setNewStu] = useState<VStudent>({ student_id: "", name: "", vdept: "", department: "" });

  // 회원가입한 학생의 학번 집합 — 명단의 학생이 실제 가입했는지 표시용
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const load = () => {
    setLoading(true);
    fetch("/api/admin/virtual-students").then((r) => r.json()).then((d) => { setList(Array.isArray(d) ? d : []); setLoading(false); });
  };
  useEffect(() => {
    load();
    fetch("/api/vdept-config").then((r) => r.json()).then((d) => setRequiredTypes(d.requiredTypes || []));
    fetch("/api/admin/applicants").then((r) => r.json()).then((d) => {
      const ids = (Array.isArray(d) ? d : []).map((x: { student_id?: string }) => String(x.student_id || "").trim()).filter(Boolean);
      setRegistered(new Set(ids));
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => list.filter((s) => matchTerms(s, search)), [list, search]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      const students = rows.map(rowToStudent).filter(Boolean) as VStudent[];
      if (students.length === 0) { alert("학번이 있는 데이터를 찾지 못했습니다. 엑셀 형식을 확인해주세요."); return; }
      if (!confirm(`${students.length}명의 명단을 업로드합니다. 기존 명단을 모두 교체할까요?\n(취소를 누르면 기존 명단에 추가/갱신만 합니다.)`)) {
        await post({ action: "upsert", students });
      } else {
        await post({ action: "replace", students });
      }
      load();
    } catch (err: any) {
      alert("업로드 실패: " + (err?.message || "엑셀을 읽을 수 없습니다."));
    } finally {
      setUploading(false);
    }
  };

  const post = async (body: any) => {
    const res = await fetch("/api/admin/virtual-students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({ ok: false }));
    if (!j.ok) alert("실패: " + (j.error || "오류"));
    return j;
  };

  const removeStudent = async (sid: string) => {
    if (!confirm(`${sid} 학생을 명단에서 삭제할까요?`)) return;
    await post({ action: "delete", studentIds: [sid] });
    load();
  };

  const addStudent = async () => {
    if (!newStu.student_id.trim()) { alert("학번을 입력해주세요."); return; }
    await post({ action: "upsert", students: [newStu] });
    setNewStu({ student_id: "", name: "", vdept: "", department: "" });
    setAdding(false);
    load();
  };

  const toggleType = (t: ApplicationType) => setRequiredTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const saveConfig = async () => {
    const res = await fetch("/api/vdept-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requiredTypes }) });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) { setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2500); } else alert("저장 실패: " + (j.error || ""));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><GraduationCap className="w-6 h-6 text-indigo-500" /> 미래융합가상학과 학생</h1>
      <p className="text-gray-500 text-sm mb-4">엑셀로 가상학과 재학생 명단을 업로드하고, 특정 지원유형을 가상학과 학생만 신청하도록 설정합니다.</p>

      {/* 가상학과 전용 신청유형 설정 */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="font-bold text-gray-800">가상학과 학생만 신청 가능한 유형</h2>
          <button onClick={saveConfig} className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-4 h-4" /> 저장</button>
        </div>
        {cfgSaved && <div className="text-green-600 text-sm font-medium mb-2">✓ 저장되었습니다.</div>}
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => (
            <label key={t} className={`px-3 py-2 rounded-xl text-sm font-medium cursor-pointer border transition ${requiredTypes.includes(t) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 text-gray-600 border-gray-200"}`}>
              <input type="checkbox" className="hidden" checked={requiredTypes.includes(t)} onChange={() => toggleType(t)} />
              {APPLICATION_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">체크한 유형은 가상학과 명단에 있는 학생만 신청할 수 있습니다.</p>
      </div>

      {/* 명단 관리 */}
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <label className={`btn-secondary cursor-pointer flex items-center gap-2 text-sm ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          <Upload className="w-4 h-4" /> {uploading ? "업로드 중..." : "엑셀 업로드"}
          <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} />
        </label>
        <button onClick={() => setAdding((v) => !v)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 학생 추가</button>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9 w-72" placeholder="학번/이름 검색 (여러 명은 띄어쓰기·쉼표)" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {adding && (
        <div className="card mb-4 grid sm:grid-cols-5 gap-2 items-end">
          <div><label className="label">학번 *</label><input className="input-field" value={newStu.student_id} onChange={(e) => setNewStu({ ...newStu, student_id: e.target.value })} /></div>
          <div><label className="label">성명</label><input className="input-field" value={newStu.name || ""} onChange={(e) => setNewStu({ ...newStu, name: e.target.value })} /></div>
          <div><label className="label">가상학과</label><input className="input-field" value={newStu.vdept || ""} onChange={(e) => setNewStu({ ...newStu, vdept: e.target.value })} /></div>
          <div><label className="label">본소속학과</label><input className="input-field" value={newStu.department || ""} onChange={(e) => setNewStu({ ...newStu, department: e.target.value })} /></div>
          <button onClick={addStudent} className="btn-primary text-sm">추가</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">로딩 중...</div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">총 {list.length}명 · 검색 {filtered.length}명 · 가입 {filtered.filter((s) => registered.has(s.student_id)).length}명</p>
          <div className="overflow-x-auto rounded-[32px]">
            <table className="table-glass text-sm">
              <thead>
                <tr>
                  <th className="text-center whitespace-nowrap">연번</th>
                  <th className="whitespace-nowrap">학번</th>
                  <th className="whitespace-nowrap">성명</th>
                  <th className="text-center whitespace-nowrap">회원가입</th>
                  <th className="whitespace-nowrap">가상학과</th>
                  <th className="whitespace-nowrap">본소속학과</th>
                  <th className="whitespace-nowrap">학년</th>
                  <th className="text-right whitespace-nowrap">평점</th>
                  <th className="text-right whitespace-nowrap">취득학점</th>
                  <th className="text-center whitespace-nowrap">삭제</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">명단이 없습니다. 엑셀을 업로드하거나 학생을 추가해주세요.</td></tr>
                ) : filtered.map((s, i) => {
                  const joined = registered.has(s.student_id);
                  return (
                  <tr key={s.student_id}>
                    <td className="text-center text-gray-400 text-xs">{i + 1}</td>
                    <td className="font-mono text-xs">{s.student_id}</td>
                    <td className="font-medium whitespace-nowrap">{s.name || "-"}</td>
                    <td className="text-center">
                      {joined
                        ? <span className="badge bg-emerald-100 text-emerald-700">가입</span>
                        : <span className="badge bg-gray-200 text-gray-500">미가입</span>}
                    </td>
                    <td className="text-gray-600 whitespace-nowrap">{s.vdept || "-"}</td>
                    <td className="text-gray-600 max-w-[140px] truncate">{s.department || "-"}</td>
                    <td className="text-gray-600">{s.grade || "-"}</td>
                    <td className="text-right">{s.gpa ?? "-"}</td>
                    <td className="text-right">{s.credits ?? "-"}</td>
                    <td className="text-center"><button onClick={() => removeStudent(s.student_id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
