"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import type { FundCategory } from "@/types";
import { FUND_CATEGORY_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchPrograms, SEED, newProgramId, newFieldId, isProgramActive, type Program, type ReportField } from "@/lib/programs";

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
    setList((l) => [...l, { id: newProgramId(), category, name: "", roles: [], reportFields: [], applyStart: today(), applyEnd: today(), note: "" }]);
    setSaved(false);
  };

  // 역할 다중 (편집 중에는 빈 칸도 유지해야 하므로 raw 배열을 직접 사용)
  const rawRoles = (p: Program): string[] => p.roles || [];
  const setRoles = (id: string, roles: string[]) => update(id, { roles });
  const addRole = (p: Program) => setRoles(p.id, [...rawRoles(p), ""]);
  const updateRole = (p: Program, i: number, val: string) => setRoles(p.id, rawRoles(p).map((r, idx) => (idx === i ? val : r)));
  const removeRole = (p: Program, i: number) => setRoles(p.id, rawRoles(p).filter((_, idx) => idx !== i));

  // 지원신청 기간 — 처음 입력 시 지원금 신청기간에도 동일하게 채움
  const updatePreStart = (p: Program, val: string) => update(p.id, p.preApplyStart ? { preApplyStart: val } : { preApplyStart: val, applyStart: val });
  const updatePreEnd = (p: Program, val: string) => update(p.id, p.preApplyEnd ? { preApplyEnd: val } : { preApplyEnd: val, applyEnd: val });

  // 보고서 입력 항목 설정
  const setFields = (id: string, reportFields: ReportField[]) => update(id, { reportFields });
  const addField = (p: Program) => setFields(p.id, [...(p.reportFields || []), { id: newFieldId(), label: "", type: "text", required: false }]);
  const updateField = (p: Program, fid: string, patch: Partial<ReportField>) =>
    setFields(p.id, (p.reportFields || []).map((f) => (f.id === fid ? { ...f, ...patch } : f)));
  const removeField = (p: Program, fid: string) => setFields(p.id, (p.reportFields || []).filter((f) => f.id !== fid));
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
                const active = isProgramActive(p, undefined, "fund");
                const preActive = isProgramActive(p, undefined, "pre");
                return (
                  <div key={p.id} className="card">
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${preActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>지원신청 {preActive ? "가능" : "기간 아님"}</span>
                        <span className={`badge ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>지원금 신청 {active ? "가능" : "기간 아님"}</span>
                      </div>
                      <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="lg:col-span-3">
                        <label className="label">프로그램명</label>
                        <input className="input-field" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="프로그램명" />
                      </div>
                      <div>
                        <label className="label">비고</label>
                        <input className="input-field" value={p.note} onChange={(e) => update(p.id, { note: e.target.value })} placeholder="예: 30명 내외" />
                      </div>
                    </div>

                    {/* 신청 기간: 지원신청(활동 전) / 지원금 신청(활동 후) */}
                    <div className="grid sm:grid-cols-2 gap-4 mt-3">
                      <div className="rounded-2xl p-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
                        <p className="text-sm font-semibold text-indigo-700 mb-2">지원신청 기간 (활동 전)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">시작</label>
                            <input type="date" className="input-field" value={p.preApplyStart || ""} onChange={(e) => updatePreStart(p, e.target.value)} />
                          </div>
                          <div>
                            <label className="label">마감</label>
                            <input type="date" className="input-field" value={p.preApplyEnd || ""} onChange={(e) => updatePreEnd(p, e.target.value)} />
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1.5">※ 처음 입력하면 지원금 신청기간에도 동일하게 채워집니다. 미설정 시 지원금 신청기간을 따릅니다.</p>
                      </div>
                      <div className="rounded-2xl p-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}>
                        <p className="text-sm font-semibold text-emerald-700 mb-2">지원금 신청 기간 (활동 후)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">시작</label>
                            <input type="date" className="input-field" value={p.applyStart} onChange={(e) => update(p.id, { applyStart: e.target.value })} />
                          </div>
                          <div>
                            <label className="label">마감</label>
                            <input type="date" className="input-field" value={p.applyEnd} onChange={(e) => update(p.id, { applyEnd: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 역할 (여러 개 입력 가능) */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="label mb-0">역할 (여러 개 입력 가능)</label>
                        <button onClick={() => addRole(p)} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 역할 추가</button>
                      </div>
                      {rawRoles(p).length === 0 ? (
                        <p className="text-xs text-gray-400">등록된 역할이 없습니다. 신청자가 직접 역할을 입력합니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {rawRoles(p).map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input className="input-field flex-1" value={r} onChange={(e) => updateRole(p, i, e.target.value)} placeholder="예: 공간관리" />
                              <button onClick={() => removeRole(p, i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 신청자 보고서 입력 항목 설정 */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">신청자 입력 항목 (보고서·증빙)</label>
                        <button onClick={() => addField(p)} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 항목 추가</button>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">신청자가 작성/업로드해야 하는 활동내용·증빙 등을 항목으로 설정합니다.</p>
                      {(p.reportFields || []).length === 0 ? (
                        <p className="text-xs text-gray-400">설정된 항목이 없습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {(p.reportFields || []).map((f) => (
                            <div key={f.id} className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <input className="input-field flex-1 min-w-[140px]" value={f.label} onChange={(e) => updateField(p, f.id, { label: e.target.value })} placeholder="항목명 (예: 활동 내용)" />
                                <select className="input-field !w-auto" value={f.type} onChange={(e) => updateField(p, f.id, { type: e.target.value as ReportField["type"] })}>
                                  <option value="text">서술형</option>
                                  <option value="file">파일 업로드</option>
                                  <option value="agreement">서약(동의)</option>
                                  <option value="signature">서명</option>
                                </select>
                                <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                                  <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(p, f.id, { required: e.target.checked })} /> 필수
                                </label>
                                <button onClick={() => removeField(p, f.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                              </div>
                              {f.type === "agreement" && (
                                <textarea className="input-field h-20 resize-none text-sm" value={f.text || ""} onChange={(e) => updateField(p, f.id, { text: e.target.value })} placeholder="서약 본문 내용" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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
