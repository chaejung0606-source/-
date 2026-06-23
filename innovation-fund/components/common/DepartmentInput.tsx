"use client";
import { useState, useRef, useMemo } from "react";
import { departmentsFor } from "@/lib/departments";

interface Props {
  value: string;
  onChange: (v: string) => void;
  campus?: string;          // 캠퍼스별 학과 목록 필터
  placeholder?: string;
  className?: string;
}

// 강원대 학과/전공 검색·선택 콤보박스 (선택할 때까지 옵션 목록 유지, 직접입력 허용)
export default function DepartmentInput({ value, onChange, campus, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // null이면 현재 value 기준
  const boxRef = useRef<HTMLDivElement>(null);
  const all = useMemo(() => departmentsFor(campus), [campus]);

  const q = (query ?? value ?? "").trim();
  const filtered = useMemo(() => {
    if (!q) return all;
    return all.filter((d) => d.includes(q));
  }, [all, q]);

  const choose = (d: string) => { onChange(d); setQuery(null); setOpen(false); };

  return (
    <div className="relative" ref={boxRef}
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget as Node)) { setOpen(false); setQuery(null); } }}
    >
      <input
        className={className || "input-field"}
        value={query ?? value}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "학과/전공 선택 또는 검색"}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-white shadow-lg border border-gray-100">
          {filtered.map((d) => (
            <button
              key={d}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); choose(d); }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${d === value ? "text-indigo-600 font-medium" : "text-gray-700"}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
