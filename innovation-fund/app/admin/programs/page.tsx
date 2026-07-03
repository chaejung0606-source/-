"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Search } from "lucide-react";
import type { FundCategory } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchPrograms, SEED, newProgramId, effectiveReportFields, type Program } from "@/lib/programs";
import SchemaForm from "@/components/apply/SchemaForm";
import { type FormSchema, defaultSchemaFromFields, defaultInnovationSchema, cloneSchema } from "@/lib/form-schema";
import ContentPanel from "@/components/admin/ContentPanel";
import CertificatesPanel from "@/components/admin/CertificatesPanel";

// 첫 선택에서 구분하는 지원금 종류: 근로장학금 / 프로그램 참여지원비 / 진행요원비
type ProgKind = "labor" | "program" | "staff" | "club";
const KINDS: ProgKind[] = ["labor", "program", "staff", "club"];
const KIND_LABELS: Record<ProgKind, string> = { labor: "근로장학금", program: "프로그램 참여지원비", staff: "진행요원비", club: "소학회" };
const kindOf = (p: Program): ProgKind => p.programType === "club" ? "club" : (p.category === "labor" ? "labor" : (p.programType === "staff" ? "staff" : "program"));
const categoryOfKind = (k: ProgKind): FundCategory => (k === "labor" ? "labor" : k === "club" ? "activity" : "innovation");
const inKind = (p: Program, k: ProgKind) => kindOf(p) === k;
const today = () => new Date().toISOString().split("T")[0];
// 상시 신청: 기한 제약 없이 항상 신청 가능하도록 하는 센티넬 기간(아주 과거~아주 미래)
const ALWAYS_START = "2000-01-01";
const ALWAYS_END = "2099-12-31";
const isAlways = (s?: string, e?: string) => s === ALWAYS_START && e === ALWAYS_END;
// 신청 마감: 과거로 고정된 센티넬 기간 → 항상 신청 불가
const CLOSED_START = "1900-01-01";
const CLOSED_END = "1900-01-01";
const isClosed = (s?: string, e?: string) => s === CLOSED_START && e === CLOSED_END;
type SchemaKey = "preFormSchema" | "fundFormSchema";
interface FormTemplate { id: string; name: string; schema: FormSchema; }

export default function ProgramsAdminPage() {
  const [list, setList] = useState<Program[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedKind, setSelectedKind] = useState<ProgKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<"pre" | "fund">("pre");
  const [progSearch, setProgSearch] = useState("");
  const [tab, setTab] = useState<"edit" | "search" | "templates" | "periods" | "content" | "certs">("edit");
  // 성과형(성적·경진대회·자격증) 학기별 신청기한
  const [periods, setPeriods] = useState<Record<string, { start: string; end: string }>>({ grade: { start: "", end: "" }, contest: { start: "", end: "" }, certificate: { start: "", end: "" } });
  const [periodsSaved, setPeriodsSaved] = useState(false);
  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");
  const [tplSearch, setTplSearch] = useState("");
  const [tplEditId, setTplEditId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [tplName, setTplName] = useState("");

  useEffect(() => {
    Promise.all([
      fetchPrograms(),
      fetch("/api/admin/program-forms").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/form-templates").then((r) => r.json()).catch(() => ({ templates: [] })),
      fetch("/api/type-periods").then((r) => r.json()).catch(() => ({ periods: {} })),
    ]).then(([l, forms, tpl, per]) => {
      if (per?.periods) setPeriods((prev) => ({ ...prev, ...per.periods }));
      const base = l.length ? l : SEED;
      const fm = (forms || {}) as Record<string, { pre?: FormSchema; fund?: FormSchema }>;
      setList(base.map((p) => ({
        ...p,
        preReportFields: (p.preReportFields && p.preReportFields.length) ? p.preReportFields : effectiveReportFields(p, "pre"),
        preFormSchema: fm[p.id]?.pre,
        fundFormSchema: fm[p.id]?.fund,
      })));
      setTemplates(Array.isArray(tpl?.templates) ? tpl.templates : []);
    });
  }, []);

  // 폼 형식(템플릿) 저장 / 삭제 / 불러오기
  const newId = () => Math.random().toString(36).slice(2, 10);
  const persistTemplates = async (next: FormTemplate[]) => {
    const prev = templates;
    setTemplates(next);
    const res = await fetch("/api/admin/form-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templates: next }) });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) { alert("저장 실패: " + (j.error || res.status)); setTemplates(prev); return false; }
    return true;
  };
  const saveTemplate = async (p: Program) => {
    const key: SchemaKey = selectedStep === "pre" ? "preFormSchema" : "fundFormSchema";
    const schema = p[key];
    if (!schema) { alert("저장할 폼이 없습니다."); return; }
    const name = tplName.trim();
    if (!name) { alert("템플릿 이름을 입력해주세요."); return; }
    if (await persistTemplates([...templates, { id: newId(), name, schema: cloneSchema(schema) }])) setTplName("");
  };
  // 템플릿 설정 탭: 선택한 템플릿 내용(스키마) 편집(로컬) → '템플릿 저장'으로 일괄 반영
  const setTemplateSchemaLocal = (id: string, schema: FormSchema) => { setTemplates((ts) => ts.map((t) => t.id === id ? { ...t, schema } : t)); };
  const deleteTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (t && !window.confirm(`템플릿 ‘${t.name}’을(를) 삭제할까요?`)) return;
    persistTemplates(templates.filter((x) => x.id !== id));
  };
  const applyTemplate = (p: Program, tid: string) => {
    const tpl = templates.find((t) => t.id === tid);
    if (!tpl) return;
    if (schemaOf(p) && !window.confirm("현재 폼을 템플릿 내용으로 덮어씁니다. 계속할까요?")) return;
    const key: SchemaKey = selectedStep === "pre" ? "preFormSchema" : "fundFormSchema";
    update(p.id, { [key]: cloneSchema(tpl.schema) });
  };

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
      // 혁신인재지원금: 기존(코드 내장) 신청서 양식을 모두 수정 가능한 항목으로 기본 적용
      if (p.category === "innovation") {
        update(p.id, { [key]: defaultInnovationSchema(p.name, selectedStep) });
      } else {
        const fields = selectedStep === "pre" ? (p.preReportFields || []) : (p.reportFields || []);
        update(p.id, { [key]: defaultSchemaFromFields(p.name, fields, selectedStep) });
      }
    }
  }, [selectedId, selectedStep, list]);
  const remove = (id: string) => { setList((l) => l.filter((p) => p.id !== id)); setSelectedId(null); setSaved(false); };

  // 성과형 신청기한 — 값 변경(저장은 상단 통합 '저장' 버튼)
  const setPeriod = (t: string, k: "start" | "end", v: string) => { setPeriods((p) => ({ ...p, [t]: { ...p[t], [k]: v } })); setPeriodsSaved(false); };
  const add = (kind: ProgKind) => {
    const category = categoryOfKind(kind);
    const np: Program = { id: newProgramId(), category, name: "", roles: [], reportFields: [], applyStart: today(), applyEnd: today(), note: "", ...(kind === "club" ? { programType: "club" as const } : category === "innovation" ? { programType: (kind === "staff" ? "staff" : "program") as "program" | "staff" } : {}) };
    setList((l) => [...l, np]);
    setSelectedKind(kind);
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

  // 통합 저장 — 프로그램·폼·성과형 신청기한·템플릿을 한 번에 저장(상단 '저장' 버튼 하나로)
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const forms: Record<string, { pre?: FormSchema; fund?: FormSchema }> = {};
      list.forEach((p) => {
        if (p.preFormSchema || p.fundFormSchema) forms[p.id] = { pre: p.preFormSchema, fund: p.fundFormSchema };
      });
      const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const rs = await Promise.all([
        post("/api/admin/programs", { programs: list }),
        post("/api/admin/program-forms", { forms }),
        post("/api/type-periods", { periods }),
        post("/api/admin/form-templates", { templates }),
      ]);
      const js = await Promise.all(rs.map((r) => r.json().catch(() => ({}))));
      if (js.every((j) => j.ok)) { setSaved(true); setPeriodsSaved(true); setTimeout(() => setSaved(false), 2500); }
      else alert("저장 실패: " + (js.find((j) => !j.ok)?.error || "일부 항목이 저장되지 않았습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">신청폼 편집</h1>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? "저장 중..." : `저장${saved ? "됨 ✓" : ""}`}</button>
      </div>

      {/* 하위 메뉴 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([["edit", "프로그램 신청 내용"], ["search", "프로그램 검색"], ["templates", "템플릿 설정"], ["periods", "성과형 신청기한"], ["content", "유형별 지급 기준"], ["certs", "자격증 목록"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${tab === key ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600 hover:text-indigo-600"}`}>{label}</button>
        ))}
      </div>

      {saved && <div className="mb-4 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}

      {tab === "edit" && (<>
      <p className="text-gray-500 text-sm mb-4">프로그램의 신청 시작·마감일을 설정하면, 학생 신청 화면에는 신청기간 내 프로그램만 표시되고 마감된 프로그램은 자동으로 사라집니다.</p>

      {/* 1단계: 소메뉴(지원금 종류) 선택 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">① 지원금 종류 선택</p>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => { setSelectedKind(kind); setSelectedId(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${selectedKind === kind ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"}`}
            >
              {KIND_LABELS[kind]} <span className="text-xs font-normal opacity-80">({list.filter((p) => inKind(p, kind)).length})</span>
            </button>
          ))}
        </div>
      </div>

      {!selectedKind && <p className="text-sm text-gray-400">위에서 지원금 종류를 선택하면 해당 종류의 하위 프로그램이 표시됩니다.</p>}

      {/* 2단계: 하위 프로그램 선택 / 추가 */}
      {selectedKind && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="text-xs font-semibold text-gray-500">② {KIND_LABELS[selectedKind]} 하위 프로그램 선택 (클릭하면 해당 프로그램만 수정)</p>
            <button onClick={() => add(selectedKind)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 프로그램 추가</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {list.filter((p) => inKind(p, selectedKind)).length === 0 ? (
              <p className="text-xs text-gray-400">등록된 프로그램이 없습니다. &lsquo;프로그램 추가&rsquo;로 생성하세요.</p>
            ) : [...list.filter((p) => inKind(p, selectedKind))]
                .map((p) => {
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        selectedId === p.id
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-white/70 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                      }`}
                    >
                      {p.name || "(이름 없음)"}
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {/* 3단계: 선택한 프로그램 수정 */}
      {selectedKind && list.filter((p) => inKind(p, selectedKind) && p.id === selectedId).map((p) => {
        const stepAccent = selectedStep === "pre" ? "#6366f1" : "#10b981";
        const stepLabel = selectedStep === "pre" ? "지원신청" : "지원금 신청";
        return (
          <div key={p.id} id={`prog-${p.id}`} className="space-y-4 scroll-mt-20">
            {/* ③ 전체 신청 폼 빌더 — 폼 형식(템플릿) 저장/불러오기 (독립 박스) */}
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 mb-1">③ 전체 신청 폼 빌더 (폼 형식 템플릿)</p>
              <p className="text-[11px] text-gray-400 mb-2.5">아래 ‘④ 수정할 단계 선택’에서 만든 <strong>{stepLabel}</strong> 단계 폼을 템플릿으로 저장하거나, 저장된 템플릿을 불러올 수 있습니다.</p>
              <div className="p-3 rounded-xl bg-white/70 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500">폼 형식(템플릿)</span>
                  <select
                    className="input-field !w-auto text-xs"
                    value=""
                    onChange={(e) => { if (e.target.value) applyTemplate(p, e.target.value); e.target.selectedIndex = 0; }}
                  >
                    <option value="">템플릿에서 불러오기…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    className="input-field !w-auto text-xs flex-1 min-w-[160px]"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="현재 폼을 저장할 템플릿 이름"
                  />
                  <button onClick={() => saveTemplate(p)} className="btn-secondary text-xs flex items-center gap-1"><Save className="w-3.5 h-3.5" /> 템플릿으로 저장</button>
                </div>
                <p className="text-[11px] text-gray-400">저장된 템플릿의 이름·내용 편집/삭제는 상단 ‘템플릿 설정’ 탭에서 할 수 있습니다.</p>
              </div>
            </div>

            {/* ④ 수정할 단계 선택 + 폼 편집 (독립 박스) */}
            <div className="card">
            <div className="flex items-center justify-end mb-3 gap-2 flex-wrap">
              <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500 flex items-center gap-1 text-xs"><Trash2 className="w-4 h-4" /> 프로그램 삭제</button>
            </div>
            {/* 단계 선택: 하위 프로그램 선택 후 수정할 단계(지원신청/지원금 신청)를 선택 */}
            <div className="mt-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">④ 수정할 단계 선택</p>
              <div className="flex gap-2 flex-wrap">
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

              {/* 지원 유형은 ① 지원금 종류 선택에서 이미 구분됨 (참여지원비/진행요원비) */}
              {p.category === "innovation" && (
                <p className="mb-3 text-[11px] text-indigo-600">구분: <strong>{KIND_LABELS[kindOf(p)]}</strong> (① 지원금 종류 선택에서 변경)</p>
              )}

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

              {/* 프로그램 신청대상 — 지원신청/지원금 신청 단계별로 따로 설정 */}
              {(() => {
                const audKey = selectedStep === "pre" ? "audiencePre" : "audienceFund";
                const curAud = ((selectedStep === "pre" ? (p.audiencePre ?? p.audience) : (p.audienceFund ?? p.audience)) || "anyone");
                return (
                  <div className="mb-3">
                    <label className="label mb-1.5">프로그램 신청대상 <span className="text-[11px] font-normal" style={{ color: stepAccent }}>· {stepLabel} 단계</span></label>
                    <div className="flex gap-2 flex-wrap">
                      {([["virtual", "미래융합가상학과 학생만"], ["designated", "지정학생만"], ["anyone", "누구나"]] as const).map(([val, lbl]) => {
                        const active = curAud === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => update(p.id, { [audKey]: val })}
                            className={`flex-1 min-w-[120px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${active ? "text-white" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                            style={active ? { background: stepAccent, borderColor: stepAccent } : undefined}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      {curAud === "designated"
                        ? "‘지정학생만’: 신청자 정보 메뉴에서 이 프로그램을 신청할 수 있는 학생을 직접 지정합니다. 지정되지 않은 학생은 신청할 수 없습니다."
                        : curAud === "virtual"
                          ? "‘미래융합가상학과 학생만’을 선택하면 재학생 명단에 없는 학생은 이 단계에서 신청할 수 없습니다."
                          : "신청대상은 지원신청·지원금 신청 단계별로 따로 설정됩니다. (위 ‘수정할 단계 선택’에서 단계를 바꿔 각각 지정)"}
                    </p>
                  </div>
                );
              })()}

              {selectedStep === "pre" ? (
                <>
                  {(() => { const always = isAlways(p.preApplyStart, p.preApplyEnd); const closed = isClosed(p.preApplyStart, p.preApplyEnd); return (
                  <>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <p className="text-sm font-bold text-indigo-700">지원신청 (활동 전)</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => always ? update(p.id, { preApplyStart: today(), preApplyEnd: today() }) : update(p.id, { preApplyStart: ALWAYS_START, preApplyEnd: ALWAYS_END })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${always ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}
                      >{always ? "● 상시 신청 중" : "상시 신청"}</button>
                      <button
                        type="button"
                        onClick={() => closed ? update(p.id, { preApplyStart: today(), preApplyEnd: today() }) : update(p.id, { preApplyStart: CLOSED_START, preApplyEnd: CLOSED_END })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${closed ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}
                      >{closed ? "● 신청 마감됨" : "신청마감"}</button>
                    </div>
                  </div>
                  {always ? (
                    <p className="text-[11px] text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">상시 신청 — 기한 제약 없이 계속 신청할 수 있습니다.</p>
                  ) : closed ? (
                    <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">신청 마감 — 신청자가 이 프로그램을 신청할 수 없습니다.</p>
                  ) : (
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
                  )}
                  <p className="text-[11px] text-gray-500 mt-1.5">※ 처음 입력하면 지원금 신청기간에도 동일하게 채워집니다. 미설정 시 지원금 신청기간을 따릅니다.</p>
                  </>
                  ); })()}
                </>
              ) : (
                <>
                  {(() => { const always = isAlways(p.applyStart, p.applyEnd); const closed = isClosed(p.applyStart, p.applyEnd); return (
                  <>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <p className="text-sm font-bold text-emerald-700">지원금 신청 (활동 후)</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => always ? update(p.id, { applyStart: today(), applyEnd: today() }) : update(p.id, { applyStart: ALWAYS_START, applyEnd: ALWAYS_END })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${always ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"}`}
                      >{always ? "● 상시 신청 중" : "상시 신청"}</button>
                      <button
                        type="button"
                        onClick={() => closed ? update(p.id, { applyStart: today(), applyEnd: today() }) : update(p.id, { applyStart: CLOSED_START, applyEnd: CLOSED_END })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${closed ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}
                      >{closed ? "● 신청 마감됨" : "신청마감"}</button>
                    </div>
                  </div>
                  {always ? (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">상시 신청 — 기한 제약 없이 계속 신청할 수 있습니다.</p>
                  ) : closed ? (
                    <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">신청 마감 — 신청자가 이 프로그램을 신청할 수 없습니다.</p>
                  ) : (
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
                  )}
                  </>
                  ); })()}
                </>
              )}

              {/* 신청 폼 편집 — 신청자 화면과 동일한 화면에서 바로 편집 */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: `${stepAccent}33` }}>
                <p className="text-sm font-bold mb-1" style={{ color: stepAccent }}>신청 폼 편집 (신청자 화면 = 편집 화면)</p>
                <p className="text-[11px] text-gray-400 mb-3">아래는 신청자가 보는 폼과 동일합니다. 단계·항목·필수여부를 바로 편집하세요. 만든 폼의 <strong>템플릿 저장·불러오기</strong>는 위 ‘③ 전체 신청 폼 빌더’ 박스에서 할 수 있습니다.</p>

                {schemaOf(p)
                  ? <SchemaForm editable schema={schemaOf(p)!} accent={stepAccent} onChange={(s) => setSchema(p, s)} />
                  : <p className="text-xs text-gray-400">불러오는 중...</p>}
              </div>
            </div>
            </div>
          </div>
        );
      })}

      {selectedKind && selectedId === null && (
        <p className="text-sm text-gray-400">위에서 하위 프로그램을 선택하면 해당 프로그램의 단계별 입력 항목을 수정할 수 있습니다.</p>
      )}
      </>)}

      {/* 프로그램 검색 탭 — 프로그램명·기간으로 검색, 전체 목록·간단 정보·삭제 */}
      {tab === "search" && (
        <div className="space-y-4">
          <div className="card flex items-end gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9" placeholder="프로그램명 검색" value={progSearch} onChange={(e) => setProgSearch(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs mb-0.5">기간 시작</label>
              <input type="date" className="input-field" value={searchStart} onChange={(e) => setSearchStart(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs mb-0.5">기간 끝</label>
              <input type="date" className="input-field" value={searchEnd} onChange={(e) => setSearchEnd(e.target.value)} />
            </div>
            {(progSearch || searchStart || searchEnd) && (
              <button onClick={() => { setProgSearch(""); setSearchStart(""); setSearchEnd(""); }} className="btn-secondary text-sm">초기화</button>
            )}
          </div>
          {(() => {
            const terms = progSearch.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
            const inPeriod = (p: Program) => {
              if (!searchStart && !searchEnd) return true;
              const s = p.applyStart || "", e = p.applyEnd || "";
              const lo = searchStart || "0000-00-00", hi = searchEnd || "9999-12-31";
              return (!!s && !!e) ? (s <= hi && e >= lo) : false;
            };
            const hits = list.filter((p) => terms.every((t) => (p.name || "").toLowerCase().includes(t)) && inPeriod(p));
            return (
              <div className="card overflow-x-auto">
                <p className="text-xs text-gray-400 mb-2">전체 {list.length}개 중 {hits.length}개 표시</p>
                <table className="table-glass text-sm">
                  <thead><tr>
                    <th className="text-center whitespace-nowrap">연번</th>
                    <th className="whitespace-nowrap">종류</th>
                    <th className="whitespace-nowrap">프로그램명</th>
                    <th className="whitespace-nowrap">지원신청 기간</th>
                    <th className="whitespace-nowrap">지원금 신청 기간</th>
                    <th className="text-center whitespace-nowrap">작업</th>
                  </tr></thead>
                  <tbody>
                    {hits.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">검색 결과가 없습니다.</td></tr>
                    ) : hits.map((p, i) => (
                      <tr key={p.id}>
                        <td className="text-center text-gray-400 text-xs">{i + 1}</td>
                        <td className="text-xs whitespace-nowrap text-gray-600">{KIND_LABELS[kindOf(p)]}</td>
                        <td className="font-medium">{p.name || "(이름 없음)"}</td>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{(p.preApplyStart || p.applyStart || "-")} ~ {(p.preApplyEnd || p.applyEnd || "-")}</td>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{(p.applyStart || "-")} ~ {(p.applyEnd || "-")}</td>
                        <td className="text-center whitespace-nowrap">
                          <button onClick={() => { setTab("edit"); setSelectedKind(kindOf(p)); setSelectedId(p.id); }} className="text-indigo-600 hover:underline text-xs mr-2">수정</button>
                          <button onClick={() => { if (window.confirm(`‘${p.name || "이 프로그램"}’을(를) 삭제할까요? (상단 ‘저장’을 눌러야 최종 반영됩니다)`)) remove(p.id); }} className="text-rose-500 hover:underline text-xs">삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-gray-400 mt-2">삭제는 상단 ‘저장’을 눌러야 최종 반영됩니다.</p>
              </div>
            );
          })()}
        </div>
      )}

      {/* 템플릿 설정 탭 — 저장된 템플릿 검색·선택·편집·삭제 */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="card">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9" placeholder="템플릿 검색" value={tplSearch} onChange={(e) => setTplSearch(e.target.value)} />
            </div>
            {(() => {
              const terms = tplSearch.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
              const hits = templates.filter((t) => terms.every((x) => (t.name || "").toLowerCase().includes(x)));
              return (
                <div className="mt-2.5">
                  <p className="text-[11px] text-gray-400 mb-1.5">{hits.length}개 / 전체 {templates.length}개 — 클릭하면 해당 템플릿만 수정합니다.</p>
                  {templates.length === 0 ? (
                    <p className="text-xs text-gray-400">저장된 템플릿이 없습니다. ‘프로그램 신청 내용’ 탭에서 폼을 템플릿으로 저장하세요.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {hits.map((t) => (
                        <button key={t.id} onClick={() => setTplEditId(t.id)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${tplEditId === t.id ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"}`}>{t.name || "(이름 없음)"}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          {tplEditId && (() => {
            const t = templates.find((x) => x.id === tplEditId);
            if (!t) return null;
            return (
              <div className="card space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input className="input-field flex-1 min-w-[200px] font-bold" value={t.name} onChange={(e) => setTemplates((ts) => ts.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} placeholder="템플릿 이름" />
                  <button onClick={() => { deleteTemplate(t.id); setTplEditId(null); }} className="btn-secondary text-sm text-rose-500 flex items-center gap-1"><Trash2 className="w-4 h-4" /> 삭제</button>
                </div>
                <SchemaForm editable schema={t.schema} accent="#6366f1" onChange={(s) => setTemplateSchemaLocal(t.id, s)} />
                <p className="text-[11px] text-gray-400">선택한 템플릿의 내용을 수정한 뒤 <strong>오른쪽 위 ‘저장’</strong>을 누르면 반영됩니다.</p>
              </div>
            );
          })()}
        </div>
      )}

      {/* 성과형 신청기한 탭 — 프로그램이 없는 성적·경진대회·자격증의 학기별 신청기한 */}
      {tab === "periods" && (
        <div className="card max-w-2xl space-y-4">
          <div>
            <h2 className="section-title mb-1">성과형 지원금 신청기한 (학기별)</h2>
            <p className="text-sm text-gray-500">성적 우수·경진대회 입상·자격증 취득 지원금은 프로그램이 없으므로 여기서 신청 가능 기간을 직접 설정합니다. 기간을 비워두면 <strong>상시 신청 가능</strong>합니다. 기간 밖에는 신청이 차단됩니다.</p>
          </div>
          {([["grade", "성적 우수 지원금"], ["contest", "경진대회 입상 우수성과 지원금"], ["certificate", "자격증 취득 우수성과 지원금"]] as const).map(([t, label]) => (
            <div key={t} className="rounded-xl border border-gray-200 p-3">
              <div className="font-semibold text-gray-800 mb-2">{label}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">신청 시작일</label>
                  <input type="date" className="input-field" value={periods[t]?.start || ""} onChange={(e) => setPeriod(t, "start", e.target.value)} />
                </div>
                <div>
                  <label className="label">신청 마감일</label>
                  <input type="date" className="input-field" value={periods[t]?.end || ""} onChange={(e) => setPeriod(t, "end", e.target.value)} />
                </div>
              </div>
              {!periods[t]?.start && !periods[t]?.end && <p className="text-[11px] text-gray-400 mt-1.5">※ 미설정 — 현재 상시 신청 가능</p>}
            </div>
          ))}
          <p className="text-[11px] text-gray-400">오른쪽 위 <strong>‘저장’</strong>을 누르면 신청기한이 함께 저장됩니다.{periodsSaved ? " ✓ 저장됨" : ""}</p>
        </div>
      )}

      {/* 유형별 지급 기준 탭 (통합) */}
      {tab === "content" && <ContentPanel />}

      {/* 자격증 목록 탭 (통합) */}
      {tab === "certs" && <CertificatesPanel />}
    </AdminLayout>
  );
}
