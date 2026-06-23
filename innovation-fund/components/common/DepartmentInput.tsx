"use client";
import { useId } from "react";
import { departmentsFor } from "@/lib/departments";

interface Props {
  value: string;
  onChange: (v: string) => void;
  campus?: string;          // 캠퍼스별 학과 목록 필터
  placeholder?: string;
  className?: string;
}

// 강원대 학과/전공 검색·선택 입력 (datalist 기반 — 검색·드롭다운·직접입력 모두 지원)
export default function DepartmentInput({ value, onChange, campus, placeholder, className }: Props) {
  const listId = useId();
  const options = departmentsFor(campus);
  return (
    <>
      <input
        className={className || "input-field"}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "학과/전공 선택 또는 검색"}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((d) => <option key={d} value={d} />)}
      </datalist>
    </>
  );
}
