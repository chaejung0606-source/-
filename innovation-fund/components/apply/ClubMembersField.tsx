"use client";
import { Plus, Trash2 } from "lucide-react";
import type { ClubMember } from "@/types";

// 소학회 구성원(회장+팀원) 입력 — 값은 JSON 문자열로 저장(폼 스키마 answers 호환)
interface Props { value: string; onChange: (json: string) => void; }

const emptyMember = (role = "팀원"): ClubMember => ({ role, name: "", studentId: "", department: "", isMirae: false, phone: "" });
const DEFAULT: ClubMember[] = [emptyMember("회장"), ...Array.from({ length: 5 }, () => emptyMember())];

function parse(value: string): ClubMember[] {
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr) && arr.length) return arr as ClubMember[];
  } catch { /* noop */ }
  return DEFAULT;
}

export default function ClubMembersField({ value, onChange }: Props) {
  const members = parse(value);
  const commit = (next: ClubMember[]) => onChange(JSON.stringify(next));
  const setM = (i: number, patch: Partial<ClubMember>) => commit(members.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  const add = () => commit([...members, emptyMember()]);
  const remove = (i: number) => { if (members[i].role === "회장") return; commit(members.filter((_, idx) => idx !== i)); };
  const miraeCount = members.filter((m) => m.isMirae && (m.name || m.studentId)).length;
  const filled = members.filter((m) => m.name.trim() && m.studentId.trim()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">회장 포함 최소 6명 · 미래융합가상학과 {miraeCount}명 / 입력 {filled}명</span>
        <button type="button" onClick={add} className="btn-secondary text-xs flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 팀원 추가</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="text-left font-medium px-1 py-1 w-16">구분</th>
              <th className="text-left font-medium px-1 py-1">이름</th>
              <th className="text-left font-medium px-1 py-1">학번</th>
              <th className="text-left font-medium px-1 py-1">소속학과</th>
              <th className="text-center font-medium px-1 py-1 w-16">가상학과</th>
              <th className="text-left font-medium px-1 py-1">연락처</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={i}>
                <td className="px-1 py-1">{m.role === "회장" ? <span className="badge bg-indigo-100 text-indigo-700">회장</span> : <span className="text-gray-500 text-xs">팀원</span>}</td>
                <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.name} onChange={(e) => setM(i, { name: e.target.value })} placeholder="이름" /></td>
                <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.studentId} onChange={(e) => setM(i, { studentId: e.target.value })} placeholder="학번" /></td>
                <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.department} onChange={(e) => setM(i, { department: e.target.value })} placeholder="학과" /></td>
                <td className="px-1 py-1 text-center"><input type="checkbox" className="w-4 h-4" checked={m.isMirae} onChange={(e) => setM(i, { isMirae: e.target.checked })} /></td>
                <td className="px-1 py-1"><input className="input-field !h-9 !py-1" value={m.phone} onChange={(e) => setM(i, { phone: e.target.value })} placeholder="010-0000-0000" /></td>
                <td className="px-1 py-1 text-center">{m.role !== "회장" && <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
