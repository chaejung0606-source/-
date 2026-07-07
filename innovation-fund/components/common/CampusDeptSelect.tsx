"use client";
import { useState, useEffect } from "react";
import { CAMPUSES, collegesFor, deptsFor, collegeOfDept, DIRECT_INPUT } from "@/lib/departments";

interface Props {
  campus: string;
  department: string;
  onCampusChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  showCampus?: boolean;   // 캠퍼스 셀렉트 표시 여부
}

// 캠퍼스 → 단과대학 → 학과 단계 선택 (목록에 없으면 직접 입력)
export default function CampusDeptSelect({ campus, department, onCampusChange, onDepartmentChange, showCampus = true }: Props) {
  const [college, setCollege] = useState("");
  const [direct, setDirect] = useState(false);

  // 초기/외부 값으로부터 단과대학·직접입력 상태 복원.
  // 프로필·임시저장의 학과가 비동기로 늦게 채워져도 반영되도록 department 변화에도 재실행한다.
  // 선택 진행 중(학과 비움)·직접 입력 타이핑 중에는 건드리지 않는다.
  useEffect(() => {
    if (!department || direct) return;
    const c = collegeOfDept(campus, department);
    if (c) { setCollege(c); setDirect(false); }
    else { setCollege(""); setDirect(true); } // 목록에 없는 값 → 직접 입력으로 간주
  }, [campus, department, direct]);

  const colleges = collegesFor(campus);
  const depts = deptsFor(campus, college);

  const onCampus = (v: string) => { onCampusChange(v); setCollege(""); setDirect(false); onDepartmentChange(""); };
  const onCollege = (v: string) => { setCollege(v); setDirect(false); onDepartmentChange(""); };
  const onDept = (v: string) => {
    if (v === DIRECT_INPUT) { setDirect(true); onDepartmentChange(""); return; }
    setDirect(false); onDepartmentChange(v);
  };

  return (
    <div className="grid grid-cols-1 gap-2">
      {showCampus && (
        <select className="input-field" value={campus} onChange={(e) => onCampus(e.target.value)}>
          <option value="">캠퍼스 선택</option>
          {CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <select className="input-field" value={college} onChange={(e) => onCollege(e.target.value)} disabled={!campus}>
        <option value="">{campus ? "단과대학 선택" : "캠퍼스를 먼저 선택"}</option>
        {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="input-field" value={direct ? DIRECT_INPUT : department} onChange={(e) => onDept(e.target.value)} disabled={!college}>
        <option value="">{college ? "학과/전공 선택" : "단과대학을 먼저 선택"}</option>
        {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        {college && <option value={DIRECT_INPUT}>{DIRECT_INPUT}</option>}
      </select>
      {direct && (
        <input className="input-field" value={department} onChange={(e) => onDepartmentChange(e.target.value)} placeholder="학과/전공 직접 입력" />
      )}
    </div>
  );
}
