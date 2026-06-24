"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import type { FundCategory } from "@/types";
import { FUND_CATEGORY_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchPrograms, SEED, newProgramId, isProgramActive, effectiveReportFields, type Program } from "@/lib/programs";
import SchemaForm from "@/components/apply/SchemaForm";
import { type FormSchema, defaultSchemaFromFields } from "@/lib/form-schema";

const CATEGORIES: FundCategory[] = ["labor", "innovation", "activity"];
const today = () => new Date().toISOString().split("T")[0];
type SchemaKey = "preFormSchema" | "fundFormSchema";

export default function ProgramsAdminPage() {
  const [list, setList] = useState<Program[]>([]);
  const [saved, setSaved] = useState(false);
  const [selectedCat, setSelectedCat] = useState<FundCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<"pre" | "fund">("pre");

  useEffect(() => {
    Promise.all([
      fetchPrograms(),
      fetch("/api/admin/program-forms").then((r) => r.json()).catch(() => ({})),
    ]).then(([l, forms]) => {
      const base = l.length ? l : SEED;
      const fm = (forms || {}) as Record<string, { pre?: FormSchema; fund?: FormSchema }>;
      setList(base.map((p) => ({
        ...p,
        preReportFields: (p.preReportFields && p.preReportFields.length) ? p.preReportFields : effectiveReportFields(p, "pre"),
        preFormSchema: fm[p.id]?.pre,
        fundFormSchema: fm[p.id]?.fund,
      })));
    });
  }, []);

  const update = (id: string, patch: Partial<Program>) => {
    setList((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSaved(false);
  };

  // 단계 진입 시 폼 스키마가 없으면 현재 설정 항목으로 자동 생성 (모든 항목이 빌더에 들어오도록)
  useEffect(() => {
    if (!selectedId) return;
    const p = list.find((x) => x.id === selectedId);
    if (!p) return;
    const key: SchemaKey = selectedStep === "pre" ? "preFormSchema" : "fundFormSchema";
    if (!p[key]) {
      const fields = selectedStep === "pre" ? (p.preReportFields || []) : (p.reportFields || []);
      update(p.id, { [key]: defaultSchemaFromFields(p.name, fields, selectedStep) });
    }
  }, [selectedId, selectedStep, list]);
  const remove = (id: string) => { setList((l) => l.filter((p) => p.id !== id)); setSelectedId(null); setSaved(false); };
  const add = (category: FundCategory) => {
    const np: Program = { id: newProgramId(), category, name: "", roles: [], reportFields: [], applyStart: today(), applyEnd: today(), note: "" };
    setList((l) => [...l, np]);
    setSelectedCat(category);
    setSelectedId(np.id);
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


  // ===== 전체 신청 폼 빌더 (단계·항목·필수) =====
  const schemaKey: SchemaKey = selectedStep === "pre" ? "preFormSchema" : "fundFormSchema";
  const schemaOf = (p: Program): FormSchema | undefined => p[schemaKey];
  const setSchema = (p: Program, schema: FormSchema) => update(p.id, { [schemaKey]: schema });

  const save = async () => {
    const forms: Record<string, { pre?: FormSchema; fund?: FormSchema }> = {};
    list.forEach((p) => {
      if (p.preFormSchema || p.fundFormSchema) forms[p.id] = { pre: p.preFormSchema, fund: p.fundFormSchema };
    });
    const [r1, r2] = await Promise.all([
      fetch("/api/admin/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programs: list }) }),
      fetch("/api/admin/program-forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ forms }) }),
    ]);
    const j1 = await r1.json().catch(() => ({}));
    const j2 = await r2.json().catch(() => ({}));
    if (j1.ok && j2.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else alert("저장 실패: " + (j1.error || j2.error || `${r1.status}/${r2.status}`));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">프로그램 신청 내용</h1>
        <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
      </div>
      <p className="text-gray-500 text-sm mb-4">프로그램의 신청 시작·마감일을 설정하면, 학생 신청 화면에는 신청기간 내 프로그램만 표시되고 마감된 프로그램은 자동으로 사라집니다.</p>

      {saved && <div className="mb-4 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}

      {/* 1단계: 소메뉴(지원금 종류) 선택 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">① 지원금 종류 선택</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCat(cat); setSelectedId(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${selectedCat === cat ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"}`}
            >
              {FUND_CATEGORY_LABELS[cat]} <span className="text-xs font-normal opacity-80">({list.filter((p) => p.category === cat).length})</span>
            </button>
          ))}
        </div>
      </div>

      {!selectedCat && <p className="text-sm text-gray-400">위에서 지원금 종류를 선택하면 해당 종류의 하위 프로그램이 표시됩니다.</p>}

      {/* 2단계: 하위 프로그램 선택 / 추가 */}
      {selectedCat && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="text-xs font-semibold text-gray-500">② {FUND_CATEGORY_LABELS[selectedCat]} 하위 프로그램 선택 (클릭하면 해당 프로그램만 수정)</p>
            <button onClick={() => add(selectedCat)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 프로그램 추가</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {list.filter((p) => p.category === selectedCat).length === 0 ? (
              <p className="text-xs text-gray-400">등록된 프로그램이 없습니다. &lsquo;프로그램 추가&rsquo;로 생성하세요.</p>
            ) : list.filter((p) => p.category === selectedCat).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${selectedId === p.id ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"}`}
              >
                {p.name || "(이름 없음)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3단계: 선택한 프로그램 수정 */}
      {selectedCat && list.filter((p) => p.category === selectedCat && p.id === selectedId).map((p) => {
        const active = isProgramActive(p, undefined, "fund");
        const preActive = isProgramActive(p, undefined, "pre");
        const stepAccent = selectedStep === "pre" ? "#6366f1" : "#10b981";
        return (
          <div key={p.id} id={`prog-${p.id}`} className="card scroll-mt-20">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${preActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>지원신청 {preActive ? "가능" : "기간 아님"}</span>
                <span className={`badge ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>지원금 신청 {active ? "가능" : "기간 아님"}</span>
              </div>
              <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500 flex items-center gap-1 text-xs"><Trash2 className="w-4 h-4" /> 프로그램 삭제</button>
            </div>
            {/* 단계 선택: 하위 프로그램 선택 후 바로 단계 선택 */}
            <div className="mt-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">③ 수정할 단계 선택</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedStep("pre")}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition ${selectedStep === "pre" ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:border-indigo-300"}`}
                >지원신청 (활동 전)</button>
                <button
                  onClick={() => setSelectedStep("fund")}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition ${selectedStep === "fund" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/70 border-gray-200 text-gray-600 hover:border-emerald-300"}`}
                >지원금 신청 (활동 후)</button>
              </div>
            </div>

            {/* 선택한 단계: 프로그램명·역할·기간·신청 항목 모두 편집 */}
            <div className="mt-3 rounded-2xl p-3" style={{ background: `${stepAccent}10`, border: `1px solid ${stepAccent}33` }}>
              {/* 프로그램명 (공통) */}
              <div className="mb-3">
                <label className="label">프로그램명</label>
                <input className="input-field" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="프로그램명" />
              </div>

              {/* 역할 (공통, 여러 개) */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">역할 (여러 개 입력 가능)</label>
                  <button onClick={() => addRole(p)} className="text-xs hover:underline flex items-center gap-1" style={{ color: stepAccent }}><Plus className="w-3.5 h-3.5" /> 역할 추가</button>
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

              {selectedStep === "pre" ? (
                <>
                  <p className="text-sm font-bold text-indigo-700 mb-2">지원신청 (활동 전)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">신청 시작</label>
                      <input type="date" className="input-field" value={p.preApplyStart || ""} onChange={(e) => updatePreStart(p, e.target.value)} />
                    </div>
                    <div>
                      <label className="label">신청 마감</label>
                      <input type="date" className="input-field" value={p.preApplyEnd || ""} onChange={(e) => updatePreEnd(p, e.target.value)} />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">※ 처음 입력하면 지원금 신청기간에도 동일하게 채워집니다. 미설정 시 지원금 신청기간을 따릅니다.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-emerald-700 mb-2">지원금 신청 (활동 후)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">신청 시작</label>
                      <input type="date" className="input-field" value={p.applyStart} onChange={(e) => update(p.id, { applyStart: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">신청 마감</label>
                      <input type="date" className="input-field" value={p.applyEnd} onChange={(e) => update(p.id, { applyEnd: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* 전체 신청 폼 빌더 — 신청자 화면과 동일한 화면에서 바로 편집 */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${stepAccent}33` }}>
                <p className="text-sm font-bold mb-1" style={{ color: stepAccent }}>전체 신청 폼 빌더 (신청자 화면 = 편집 화면)</p>
                <p className="text-[11px] text-gray-400 mb-3">아래는 신청자가 보는 폼과 동일합니다. 단계·항목·필수여부를 바로 편집하고, 상단 ‘저장’을 누르면 반영됩니다. (현재 설정된 항목이 자동으로 들어와 있습니다)</p>
                {schemaOf(p)
                  ? <SchemaForm editable schema={schemaOf(p)!} accent={stepAccent} onChange={(s) => setSchema(p, s)} />
                  : <p className="text-xs text-gray-400">불러오는 중...</p>}
              </div>
            </div>
          </div>
        );
      })}

      {selectedCat && selectedId === null && (
        <p className="text-sm text-gray-400">위에서 하위 프로그램을 선택하면 해당 프로그램의 단계별 입력 항목을 수정할 수 있습니다.</p>
      )}
    </AdminLayout>
  );
}
