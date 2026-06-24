"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { FundCategory } from "@/types";
import { FUND_CATEGORY_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchPrograms, SEED, newProgramId, newFieldId, isProgramActive, effectiveReportFields, type Program, type ReportField } from "@/lib/programs";
import SchemaForm from "@/components/apply/SchemaForm";
import {
  type FormSchema, type FormStep, type FormField, type FormFieldType,
  FIELD_TYPE_LABELS, STANDARD_TYPES, newSchemaId, defaultSchemaFromFields, emptySchema,
} from "@/lib/form-schema";

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

  // 신청자 입력 항목 설정 (key: 지원신청=preReportFields / 지원금 신청=reportFields)
  type FieldKey = "reportFields" | "preReportFields";
  const fieldsOf = (p: Program, key: FieldKey): ReportField[] => p[key] || [];
  const setFields = (id: string, key: FieldKey, fields: ReportField[]) => update(id, { [key]: fields });
  const addField = (p: Program, key: FieldKey) => setFields(p.id, key, [...fieldsOf(p, key), { id: newFieldId(), label: "", type: "text", required: false }]);
  const updateField = (p: Program, key: FieldKey, fid: string, patch: Partial<ReportField>) =>
    setFields(p.id, key, fieldsOf(p, key).map((f) => (f.id === fid ? { ...f, ...patch } : f)));
  const removeField = (p: Program, key: FieldKey, fid: string) => setFields(p.id, key, fieldsOf(p, key).filter((f) => f.id !== fid));
  const moveField = (p: Program, key: FieldKey, fid: string, dir: -1 | 1) => {
    const arr = [...fieldsOf(p, key)];
    const i = arr.findIndex((f) => f.id === fid); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setFields(p.id, key, arr);
  };

  // 구글폼 방식 인라인 폼 빌더 — 실제 신청 화면과 동일한 모습에서 바로 편집
  const TYPE_LABELS: Record<string, string> = { text: "서술형", file: "파일 업로드", select: "드롭다운", agreement: "서약(동의)", signature: "서명" };
  const renderFormBuilder = (p: Program, key: FieldKey, accent: string) => {
    const fields = fieldsOf(p, key);
    return (
      <div className="space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">아직 항목이 없습니다. 아래 &lsquo;＋ 항목 추가&rsquo;로 신청자가 작성할 항목을 만드세요.</p>
        )}
        {fields.map((f, idx) => (
          <div key={f.id} className="rounded-2xl bg-white border border-gray-200 p-4" style={{ borderLeft: `4px solid ${accent}` }}>
            {/* 상단: 질문(항목명) + 유형 + 도구 */}
            <div className="flex items-start gap-2 flex-wrap">
              <input
                className="flex-1 min-w-[160px] text-base font-medium border-0 border-b border-gray-200 focus:border-indigo-400 outline-none bg-transparent pb-1"
                value={f.label}
                onChange={(e) => updateField(p, key, f.id, { label: e.target.value })}
                placeholder={`질문 ${idx + 1} (예: 활동 내용)`}
              />
              <select className="input-field !w-auto text-sm" value={f.type} onChange={(e) => updateField(p, key, f.id, { type: e.target.value as ReportField["type"] })}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {/* 실제 신청 화면과 동일한 입력 컨트롤 미리보기 */}
            <div className="mt-3">
              {f.type === "text" && <textarea className="input-field h-16 resize-none bg-gray-50" placeholder="신청자가 작성하는 칸" disabled />}
              {f.type === "file" && <div className="upload-card p-4 text-center text-gray-400 text-sm bg-gray-50">파일을 끌어다 놓거나 클릭하여 업로드</div>}
              {f.type === "select" && (
                <>
                  <select className="input-field bg-gray-50 mb-2" disabled><option>선택하세요</option>{(f.options || []).map((o) => <option key={o}>{o}</option>)}</select>
                  <input className="input-field text-sm" value={(f.options || []).join(", ")} onChange={(e) => updateField(p, key, f.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="선택지 입력 (쉼표로 구분, 예: 공간관리, 행사지원, 홍보)" />
                </>
              )}
              {f.type === "agreement" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <textarea className="input-field h-20 resize-none text-sm mb-2 bg-white" value={f.text || ""} onChange={(e) => updateField(p, key, f.id, { text: e.target.value })} placeholder="서약 본문 내용을 입력하세요" />
                  <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" disabled /> 위 내용에 동의합니다</label>
                </div>
              )}
              {f.type === "signature" && <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-16 flex items-center justify-center text-gray-400 text-sm">서명란</div>}
            </div>

            {/* 하단 도구: 필수 / 순서 / 삭제 */}
            <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => moveField(p, key, f.id, -1)} disabled={idx === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30" title="위로"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => moveField(p, key, f.id, 1)} disabled={idx === fields.length - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30" title="아래로"><ChevronDown className="w-4 h-4" /></button>
              <label className="flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" checked={!!f.required} onChange={(e) => updateField(p, key, f.id, { required: e.target.checked })} /> 필수</label>
              <button onClick={() => removeField(p, key, f.id)} className="text-gray-300 hover:text-red-500" title="삭제"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        <button onClick={() => addField(p, key)} className="w-full rounded-2xl border-2 border-dashed py-3 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-white transition" style={{ borderColor: `${accent}55`, color: accent }}>
          <Plus className="w-4 h-4" /> 항목 추가
        </button>
      </div>
    );
  };

  // ===== 전체 신청 폼 빌더 (단계·항목·필수) =====
  const schemaKey: SchemaKey = selectedStep === "pre" ? "preFormSchema" : "fundFormSchema";
  const schemaOf = (p: Program): FormSchema | undefined => p[schemaKey];
  const setSchema = (p: Program, schema: FormSchema) => update(p.id, { [schemaKey]: schema });
  const initSchema = (p: Program, fromFields: boolean) => {
    const fields = selectedStep === "pre" ? (p.preReportFields || []) : (p.reportFields || []);
    setSchema(p, fromFields ? defaultSchemaFromFields(p.name, fields, selectedStep) : emptySchema());
  };
  const mutSteps = (p: Program, fn: (steps: FormStep[]) => FormStep[]) => {
    const s = schemaOf(p); if (!s) return;
    setSchema(p, { ...s, steps: fn(s.steps) });
  };
  const addStep = (p: Program) => mutSteps(p, (st) => [...st, { id: newSchemaId(), title: `${st.length + 1}단계`, fields: [] }]);
  const removeStep = (p: Program, sid: string) => mutSteps(p, (st) => st.filter((s) => s.id !== sid));
  const renameStep = (p: Program, sid: string, title: string) => mutSteps(p, (st) => st.map((s) => s.id === sid ? { ...s, title } : s));
  const moveStep = (p: Program, sid: string, dir: -1 | 1) => mutSteps(p, (st) => {
    const arr = [...st]; const i = arr.findIndex((s) => s.id === sid); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return st; [arr[i], arr[j]] = [arr[j], arr[i]]; return arr;
  });
  const addSField = (p: Program, sid: string) => mutSteps(p, (st) => st.map((s) => s.id === sid ? { ...s, fields: [...s.fields, { id: newSchemaId("f"), label: "", type: "shortText", required: false }] } : s));
  const updSField = (p: Program, sid: string, fid: string, patch: Partial<FormField>) =>
    mutSteps(p, (st) => st.map((s) => s.id === sid ? { ...s, fields: s.fields.map((f) => f.id === fid ? { ...f, ...patch } : f) } : s));
  const removeSField = (p: Program, sid: string, fid: string) =>
    mutSteps(p, (st) => st.map((s) => s.id === sid ? { ...s, fields: s.fields.filter((f) => f.id !== fid) } : s));
  const moveSField = (p: Program, sid: string, fid: string, dir: -1 | 1) =>
    mutSteps(p, (st) => st.map((s) => {
      if (s.id !== sid) return s;
      const arr = [...s.fields]; const i = arr.findIndex((f) => f.id === fid); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return s; [arr[i], arr[j]] = [arr[j], arr[i]]; return { ...s, fields: arr };
    }));

  const renderSchemaBuilder = (p: Program, accent: string) => {
    const schema = schemaOf(p);
    if (!schema) {
      return (
        <div className="rounded-2xl border-2 border-dashed p-5 text-center" style={{ borderColor: `${accent}55` }}>
          <p className="text-sm text-gray-500 mb-3">이 단계의 전체 신청 폼이 아직 구성되지 않았습니다.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => initSchema(p, true)} className="btn-primary text-sm" style={{ background: accent }}>기존 항목으로 폼 만들기</button>
            <button onClick={() => initSchema(p, false)} className="btn-secondary text-sm">빈 폼으로 시작</button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-gray-500">신청제출 버튼 라벨</label>
          <input className="input-field !w-auto text-sm" value={schema.submitLabel || ""} onChange={(e) => setSchema(p, { ...schema, submitLabel: e.target.value })} placeholder="신청 제출" />
        </div>
        {schema.steps.map((st, si) => (
          <div key={st.id} className="rounded-2xl border border-gray-200 bg-white/70 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-400">{si + 1}단계</span>
              <input className="input-field flex-1 font-semibold" value={st.title} onChange={(e) => renameStep(p, st.id, e.target.value)} placeholder="단계 제목 (예: 기본 정보)" />
              <button onClick={() => moveStep(p, st.id, -1)} disabled={si === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => moveStep(p, st.id, 1)} disabled={si === schema.steps.length - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
              <button onClick={() => removeStep(p, st.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 pl-1">
              {st.fields.map((f, fi) => (
                <div key={f.id} className="rounded-xl border border-gray-100 bg-white p-2.5" style={{ borderLeft: `3px solid ${accent}` }}>
                  <div className="flex items-start gap-2 flex-wrap">
                    <input className="flex-1 min-w-[140px] text-sm border-0 border-b border-gray-200 focus:border-indigo-400 outline-none bg-transparent pb-1" value={f.label} onChange={(e) => updSField(p, st.id, f.id, { label: e.target.value })} placeholder={`질문/항목 ${fi + 1}`} />
                    <select className="input-field !w-auto text-xs" value={f.type} onChange={(e) => updSField(p, st.id, f.id, { type: e.target.value as FormFieldType })}>
                      {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  {f.type === "select" && (
                    <input className="input-field text-xs mt-2" value={(f.options || []).join(", ")} onChange={(e) => updSField(p, st.id, f.id, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="선택지 (쉼표로 구분)" />
                  )}
                  {f.type === "agreement" && (
                    <textarea className="input-field text-xs mt-2 h-16 resize-none" value={f.text || ""} onChange={(e) => updSField(p, st.id, f.id, { text: e.target.value })} placeholder="서약 본문" />
                  )}
                  {!STANDARD_TYPES.includes(f.type) && f.type !== "select" && f.type !== "agreement" && f.type !== "signature" && f.type !== "file" && (
                    <input className="input-field text-xs mt-2" value={f.placeholder || ""} onChange={(e) => updSField(p, st.id, f.id, { placeholder: e.target.value })} placeholder="입력 도움말(placeholder) — 선택" />
                  )}
                  <div className="flex items-center justify-end gap-3 mt-2">
                    <button onClick={() => moveSField(p, st.id, f.id, -1)} disabled={fi === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveSField(p, st.id, f.id, 1)} disabled={fi === st.fields.length - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                    <label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={!!f.required} onChange={(e) => updSField(p, st.id, f.id, { required: e.target.checked })} /> 필수</label>
                    <button onClick={() => removeSField(p, st.id, f.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addSField(p, st.id)} className="text-xs hover:underline flex items-center gap-1" style={{ color: accent }}><Plus className="w-3.5 h-3.5" /> 항목 추가</button>
            </div>
          </div>
        ))}
        <button onClick={() => addStep(p)} className="w-full rounded-2xl border-2 border-dashed py-2.5 text-sm font-medium flex items-center justify-center gap-1.5" style={{ borderColor: `${accent}55`, color: accent }}><Plus className="w-4 h-4" /> 단계 추가</button>
      </div>
    );
  };

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

              {/* 구글폼 방식: 신청자 작성 항목(간편 편집) */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${stepAccent}33` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: stepAccent }}>신청자 작성 항목 (간편 편집)</p>
                <p className="text-[11px] text-gray-400 mb-3">현재 신청 폼의 ‘신청 정보’ 영역에 표시되는 추가 항목입니다. 아래 ‘전체 신청 폼 빌더’로 폼 전체를 구성할 수도 있습니다.</p>
                {renderFormBuilder(p, selectedStep === "pre" ? "preReportFields" : "reportFields", stepAccent)}
              </div>
            </div>

            {/* 전체 신청 폼 빌더 + 실시간 미리보기 */}
            <div className="mt-4 grid lg:grid-cols-2 gap-4">
              <div className="rounded-2xl p-3" style={{ background: `${stepAccent}08`, border: `1px solid ${stepAccent}33` }}>
                <p className="text-sm font-bold mb-1" style={{ color: stepAccent }}>전체 신청 폼 빌더</p>
                <p className="text-[11px] text-gray-400 mb-3">기본정보·신청정보·서류·서명·단계·필수여부까지 구글폼처럼 구성합니다. 저장하면 오른쪽 미리보기에 즉시 반영됩니다.</p>
                {renderSchemaBuilder(p, stepAccent)}
              </div>
              <div className="rounded-2xl p-3 bg-white/60 border border-gray-100">
                <p className="text-sm font-bold mb-2" style={{ color: stepAccent }}>실시간 미리보기 (신청자 화면)</p>
                {schemaOf(p)
                  ? <SchemaForm schema={schemaOf(p)!} preview accent={stepAccent} />
                  : <p className="text-xs text-gray-400">왼쪽에서 폼을 만들면 신청자에게 보이는 화면이 여기에 표시됩니다.</p>}
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
