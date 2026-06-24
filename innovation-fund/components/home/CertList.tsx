"use client";
import { useEffect, useMemo, useState } from "react";
import { Award, Search } from "lucide-react";
import type { CertList as CertListType } from "@/lib/cert-list";

export default function CertList() {
  const [list, setList] = useState<CertListType | null>(null);
  const [active, setActive] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/cert-list", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d?.sheets) setList(d); }).catch(() => {});
  }, []);

  // 공개 열이 있고 자격증이 있는 시트만 노출
  const sheets = useMemo(() => (list?.sheets || []).filter((s) => s.columns.length > 0 && s.rows.length > 0), [list]);
  const sheet = sheets[Math.min(active, sheets.length - 1)];

  const rows = useMemo(() => {
    if (!sheet) return [];
    const terms = q.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (terms.length === 0) return sheet.rows;
    return sheet.rows.filter((r) => {
      const hay = sheet.columns.map((c) => r.cells[c.id] || "").join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [sheet, q]);

  if (sheets.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-2"><Award className="w-6 h-6 text-amber-500" /> 자격증 목록</span>
        {list?.updatedAt && (
          <span className="text-xs font-normal text-gray-400">
            업데이트 {new Date(list.updatedAt).toLocaleDateString("ko-KR")}{list.updateNote ? ` · ${list.updateNote}` : ""}
          </span>
        )}
      </h2>
      <p className="text-sm text-gray-500 mb-4">구분을 선택하고, 자격증을 검색해 확인할 수 있습니다.</p>

      {/* 시트(구분) 선택 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sheets.map((s, i) => (
          <button key={s.id} onClick={() => { setActive(i); setQ(""); }} className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${i === active ? "bg-amber-500 text-white border-amber-500" : "bg-white/70 border-gray-200 text-gray-600 hover:border-amber-300"}`}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="자격증명·분야 등 검색 (여러 단어 가능)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="text-xs text-gray-400 mb-2">{rows.length} / {sheet.rows.length}건</p>
        <div className="overflow-x-auto rounded-2xl">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                {sheet.columns.map((c) => <th key={c.id} className="py-2 px-3 whitespace-nowrap font-semibold">{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={sheet.columns.length} className="text-center py-8 text-gray-400">검색 결과가 없습니다.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-amber-50/40">
                  {sheet.columns.map((c) => <td key={c.id} className="py-2 px-3 align-top">{r.cells[c.id] || "-"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
