"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  allowDirect?: boolean; // 옵션에 없으면 입력값을 그대로 사용(직접 입력)
}

// 드롭다운 + 검색 + (옵션에 없을 때) 직접 입력이 가능한 콤보박스
export default function SearchSelect({ value, onChange, options, placeholder = "선택", disabled = false, allowDirect = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  const exact = options.some((o) => o.toLowerCase() === q);

  const pick = (v: string) => { onChange(v); setOpen(false); setQuery(""); };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`input-field flex items-center justify-between gap-2 text-left ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={value ? "text-gray-800 truncate" : "text-gray-400"}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              autoFocus
              className="flex-1 text-sm outline-none bg-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색 또는 직접 입력"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${o === value ? "text-indigo-600 font-medium" : "text-gray-700"}`}
              >
                {o}
              </button>
            ))}
            {filtered.length === 0 && !allowDirect && (
              <div className="px-3 py-2 text-sm text-gray-400">검색 결과가 없습니다.</div>
            )}
            {allowDirect && q && !exact && (
              <button
                type="button"
                onClick={() => pick(query.trim())}
                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 border-t border-gray-100"
              >
                직접 입력: “{query.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
