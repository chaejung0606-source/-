"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import type { FundCategory } from "@/types";
import { FUND_CATEGORY_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchPrograms, SEED, newProgramId, isProgramActive, type Program } from "@/lib/programs";

const CATEGORIES: FundCategory[] = ["labor", "innovation", "activity"];
const today = () => new Date().toISOString().split("T")[0];

export default function ProgramsAdminPage() {
  const [list, setList] = useState<Program[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchPrograms().then((l) => setList(l.length ? l : SEED)); }, []);

  const update = (id: string, patch: Partial<Program>) => {
    setList((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSaved(false);
  };
  const remove = (id: string) => { setList((l) => l.filter((p) => p.id !== id)); setSaved(false); };
  const add = (category: FundCategory) => {
    setList((l) => [...l, { id: newProgramId(), category, name: "", role: "", applyStart: today(), applyEnd: today(), note: "" }]);
    setSaved(false);
  };
  const save = async () => {
    const res = await fetch("/api/admin/programs", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programs: list }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else alert("저장 실패: " + (j.error || res.status));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">프로그램 / 신청기간 관리</h1>
        <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
      </div>
      <p className="text-gray-500 text-sm mb-6">프로그램의 신청 시작·마감일을 설정하면, 학생 신청 화면에는 신청기간 내 프로그램만 표시되고 마감된 프로그램은 자동으로 사라집니다.</p>
      {saved && <div className="mb-4 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}

      <div className="space-y-8">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">{FUND_CATEGORY_LABELS[cat]}</h2>
              <button onClick={() => add(cat)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 프로그램 추가</button>
            </div>
            <div className="space-y-3">
              {list.filter((p) => p.category === cat).length === 0 && (
                <p className="text-sm text-gray-400">등록된 프로그램이 없습니다.</p>
              )}
              {list.filter((p) => p.category === cat).map((p) => {
                const active = isProgramActive(p);
                return (
                  <div key={p.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`badge ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{active ? "신청 가능" : "신청 기간 아님"}</span>
                      <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="lg:col-span-2">
                        <label className="label">프로그램명</label>
                        <input className="input-field" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="프로그램명" />
                      </div>
                      <div>
                        <label className="label">역할 (선택)</label>
                        <input className="input-field" value={p.role || ""} onChange={(e) => update(p.id, { role: e.target.value })} placeholder="예: 공간관리" />
                      </div>
                      <div>
                        <label className="label">신청 시작</label>
                        <input type="date" className="input-field" value={p.applyStart} onChange={(e) => update(p.id, { applyStart: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">신청 마감</label>
                        <input type="date" className="input-field" value={p.applyEnd} onChange={(e) => update(p.id, { applyEnd: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">비고</label>
                        <input className="input-field" value={p.note} onChange={(e) => update(p.id, { note: e.target.value })} placeholder="예: 30명 내외" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
