"use client";
import { useEffect, useMemo, useState } from "react";
import { Award, Search } from "lucide-react";
import type { CertList as CertListType } from "@/lib/cert-list";

export default function CertList() {
  const [list, setList] = useState<CertListType | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/cert-list", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d?.columns) setList(d); }).catch(() => {});
  }, []);

  const rows = useMemo(() => {
    if (!list) return [];
    const terms = q.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (terms.length === 0) return list.rows;
    return list.rows.filter((r) => {
      const hay = list.columns.map((c) => (r.cells[c.id] || "")).join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [list, q]);

  if (!list || list.columns.length === 0 || list.rows.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Award className="w-6 h-6 text-amber-500" /> 자격증 목록
      </h2>
      <p className="text-sm text-gray-500 mb-4">지원 대상 자격증을 확인하고 검색할 수 있습니다.</p>

      <div className="card">
        <div className="relative max-w-sm mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="자격증명·분야 등 검색 (여러 단어 가능)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="text-xs text-gray-400 mb-2">{rows.length} / {list.rows.length}건</p>
        <div className="overflow-x-auto rounded-2xl">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                {list.columns.map((c) => <th key={c.id} className="py-2 px-3 whitespace-nowrap font-semibold">{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={list.columns.length} className="text-center py-8 text-gray-400">검색 결과가 없습니다.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-indigo-50/40">
                  {list.columns.map((c) => <td key={c.id} className="py-2 px-3 align-top">{r.cells[c.id] || "-"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
