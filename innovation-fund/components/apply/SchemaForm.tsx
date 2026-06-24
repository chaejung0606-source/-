"use client";
import { useState } from "react";
import { Upload, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Save, Check, Plus, Trash2 } from "lucide-react";
import type { FormSchema, FormField, FormStep, FormFieldType } from "@/lib/form-schema";
import { FIELD_TYPE_LABELS, STANDARD_TYPES, newSchemaId } from "@/lib/form-schema";

// 스키마 기반 신청 폼.
// editable=false(기본): 미리보기/실제 신청자 화면 (입력 비활성)
// editable=true: 신청자 화면과 동일한 모습 + 인라인 편집 도구 (구글폼식)
interface Props {
  schema: FormSchema;
  editable?: boolean;
  accent?: string;
  onChange?: (schema: FormSchema) => void;
}

function FieldView({ f, disabled }: { f: FormField; disabled: boolean }) {
  const req = f.required ? <span className="text-red-500"> *</span> : null;
  switch (f.type) {
    case "applicantInfo":
      return (
        <div>
          <label className="label">{f.label || "기본정보"}{req}</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {["이름", "학번", "소속 대학", "학과/전공", "학년", "연락처", "이메일"].map((k) => (
              <input key={k} className="input-field bg-gray-50" placeholder={k} disabled />
            ))}
          </div>
        </div>
      );
    case "account":
      return (
        <div>
          <label className="label">{f.label || "계좌 정보"}{req}</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {["은행", "계좌번호", "예금주"].map((k) => <input key={k} className="input-field bg-gray-50" placeholder={k} disabled />)}
          </div>
        </div>
      );
    case "shortText":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><input className="input-field bg-gray-50" placeholder={f.placeholder || ""} disabled={disabled} /></div>);
    case "number":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><input className="input-field bg-gray-50" placeholder={f.placeholder || "0"} inputMode="numeric" disabled={disabled} /></div>);
    case "date":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><input type="date" className="input-field bg-gray-50" disabled={disabled} /></div>);
    case "longText":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><textarea className="input-field h-20 resize-none bg-gray-50" placeholder={f.placeholder || ""} disabled={disabled} /></div>);
    case "select":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><select className="input-field bg-gray-50" disabled={disabled}><option>선택하세요</option>{(f.options || []).map((o) => <option key={o}>{o}</option>)}</select></div>);
    case "file":
      return (
        <div>
          <label className="label">{f.label || "(제목 없음)"}{req}</label>
          <div className="upload-card p-5 text-center text-gray-400 text-sm bg-gray-50 flex flex-col items-center gap-1">
            <Upload className="w-6 h-6 opacity-60" /> 파일을 끌어다 놓거나 클릭하여 업로드
          </div>
        </div>
      );
    case "agreement":
      return (
        <div>
          <label className="label">{f.label || "(제목 없음)"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="text-gray-600 whitespace-pre-line mb-2">{f.text || "(서약 본문)"}</p>
            <label className="flex items-center gap-2 text-gray-700"><input type="checkbox" disabled /> 위 내용에 동의합니다</label>
          </div>
        </div>
      );
    case "signature":
      return (
        <div>
          <label className="label">{f.label || "서명"}{req}</label>
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-24 flex items-center justify-center text-gray-400 text-sm">여기에 서명</div>
        </div>
      );
    default:
      return null;
  }
}

export default function SchemaForm({ schema, editable = false, accent = "#6366f1", onChange }: Props) {
  const steps = schema.steps || [];
  const [step, setStep] = useState(0);
  const total = steps.length;
  const isReview = step === total;
  const cur = steps[Math.min(step, total - 1)];

  const set = (s: FormSchema) => onChange?.(s);
  const mutSteps = (fn: (st: FormStep[]) => FormStep[]) => set({ ...schema, steps: fn(steps) });
  const addStep = () => { mutSteps((st) => [...st, { id: newSchemaId(), title: `${st.length + 1}단계`, fields: [] }]); setStep(total); };
  const renameStep = (sid: string, title: string) => mutSteps((st) => st.map((s) => s.id === sid ? { ...s, title } : s));
  const removeStep = (sid: string) => { mutSteps((st) => st.filter((s) => s.id !== sid)); setStep((p) => Math.max(0, p - 1)); };
  const moveStep = (sid: string, dir: -1 | 1) => mutSteps((st) => { const a = [...st]; const i = a.findIndex((s) => s.id === sid); const j = i + dir; if (i < 0 || j < 0 || j >= a.length) return st; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const addField = (sid: string) => mutSteps((st) => st.map((s) => s.id === sid ? { ...s, fields: [...s.fields, { id: newSchemaId("f"), label: "", type: "shortText", required: false }] } : s));
  const updField = (sid: string, fid: string, patch: Partial<FormField>) => mutSteps((st) => st.map((s) => s.id === sid ? { ...s, fields: s.fields.map((f) => f.id === fid ? { ...f, ...patch } : f) } : s));
  const removeField = (sid: string, fid: string) => mutSteps((st) => st.map((s) => s.id === sid ? { ...s, fields: s.fields.filter((f) => f.id !== fid) } : s));
  const moveField = (sid: string, fid: string, dir: -1 | 1) => mutSteps((st) => st.map((s) => {
    if (s.id !== sid) return s; const a = [...s.fields]; const i = a.findIndex((f) => f.id === fid); const j = i + dir;
    if (i < 0 || j < 0 || j >= a.length) return s; [a[i], a[j]] = [a[j], a[i]]; return { ...s, fields: a };
  }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {/* 단계 탭 */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${i === step && !isReview ? "text-white" : "bg-white/70 text-gray-500 border-gray-200"}`}
            style={i === step && !isReview ? { background: accent, borderColor: accent } : undefined}>
            {i + 1}. {s.title || "단계"}
          </button>
        ))}
        <button onClick={() => setStep(total)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${isReview ? "text-white" : "bg-white/70 text-gray-500 border-gray-200"}`}
          style={isReview ? { background: accent, borderColor: accent } : undefined}>
          신청내용 확인
        </button>
        {editable && <button onClick={addStep} className="px-2 py-1 rounded-full text-xs font-medium border border-dashed text-gray-500 hover:text-indigo-600 flex items-center gap-1"><Plus className="w-3 h-3" /> 단계</button>}
      </div>

      {/* 본문 */}
      {!isReview && cur ? (
        <div className="space-y-4">
          {editable ? (
            <div className="flex items-center gap-2">
              <input className="input-field flex-1 font-bold" value={cur.title} onChange={(e) => renameStep(cur.id, e.target.value)} placeholder="단계 제목" />
              <button onClick={() => moveStep(cur.id, -1)} disabled={step === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => moveStep(cur.id, 1)} disabled={step >= total - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => removeStep(cur.id)} className="text-gray-300 hover:text-red-500" title="단계 삭제"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) : (
            <h3 className="font-bold text-gray-800">{cur.title}</h3>
          )}

          {cur.fields.length === 0 ? (
            <p className="text-sm text-gray-400">이 단계에 항목이 없습니다.</p>
          ) : cur.fields.map((f, fi) => editable ? (
            <div key={f.id} className="rounded-xl border border-gray-100 bg-white p-3" style={{ borderLeft: `3px solid ${accent}` }}>
              <div className="flex items-start gap-2 flex-wrap mb-2">
                <input className="flex-1 min-w-[150px] text-sm font-medium border-0 border-b border-gray-200 focus:border-indigo-400 outline-none bg-transparent pb-1" value={f.label} onChange={(e) => updField(cur.id, f.id, { label: e.target.value })} placeholder={`질문/항목 ${fi + 1}`} />
                <select className="input-field !w-auto text-xs" value={f.type} onChange={(e) => updField(cur.id, f.id, { type: e.target.value as FormFieldType })}>
                  {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              {/* 신청자 화면과 동일한 미리보기 */}
              <FieldView f={f} disabled />
              {f.type === "select" && (
                <input className="input-field text-xs mt-2" value={(f.options || []).join(", ")} onChange={(e) => updField(cur.id, f.id, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="선택지 (쉼표로 구분)" />
              )}
              {f.type === "agreement" && (
                <textarea className="input-field text-xs mt-2 h-16 resize-none" value={f.text || ""} onChange={(e) => updField(cur.id, f.id, { text: e.target.value })} placeholder="서약 본문" />
              )}
              {!STANDARD_TYPES.includes(f.type) && !["select", "agreement", "signature", "file"].includes(f.type) && (
                <input className="input-field text-xs mt-2" value={f.placeholder || ""} onChange={(e) => updField(cur.id, f.id, { placeholder: e.target.value })} placeholder="입력 도움말(placeholder) — 선택" />
              )}
              <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-gray-100">
                <button onClick={() => moveField(cur.id, f.id, -1)} disabled={fi === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveField(cur.id, f.id, 1)} disabled={fi === cur.fields.length - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                <label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={!!f.required} onChange={(e) => updField(cur.id, f.id, { required: e.target.checked })} /> 필수</label>
                <button onClick={() => removeField(cur.id, f.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <FieldView key={f.id} f={f} disabled />
          ))}

          {editable && (
            <button onClick={() => addField(cur.id)} className="w-full rounded-2xl border-2 border-dashed py-2.5 text-sm font-medium flex items-center justify-center gap-1.5" style={{ borderColor: `${accent}55`, color: accent }}>
              <Plus className="w-4 h-4" /> 항목 추가
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">신청 내용 확인</h3>
          <p className="text-sm text-gray-500">제출 전 입력한 내용을 확인하는 단계입니다. (앞 단계에서 추가·삭제한 항목이 그대로 반영됩니다)</p>
          {steps.map((s) => (
            <div key={s.id} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">{s.title}</p>
              {s.fields.length === 0 ? (
                <p className="text-xs text-gray-300">항목 없음</p>
              ) : (
                <div className="space-y-3">
                  {s.fields.map((f) => <FieldView key={f.id} f={f} disabled />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 네비게이션 (신청자 화면 동일) */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> 이전</button>
        <div className="flex items-center gap-2">
          {editable && isReview && (
            <input className="input-field !w-auto text-xs" value={schema.submitLabel || ""} onChange={(e) => set({ ...schema, submitLabel: e.target.value })} placeholder="제출 버튼 라벨" />
          )}
          <button className="btn-secondary text-sm flex items-center gap-1" disabled><Save className="w-4 h-4" /> 임시저장</button>
          {isReview ? (
            <button className="btn-primary text-sm flex items-center gap-1" disabled style={{ background: accent }}><Check className="w-4 h-4" /> {schema.submitLabel || "신청 제출"}</button>
          ) : (
            <button onClick={() => setStep((s) => Math.min(total, s + 1))}
              className="btn-primary text-sm flex items-center gap-1" style={{ background: accent }}>다음 <ChevronRight className="w-4 h-4" /></button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-2 text-center">
        {editable ? "※ 신청자 화면과 동일한 모습입니다. 항목을 바로 편집하고, 위에서 ‘저장’을 누르면 반영됩니다." : "※ 신청자에게 보이는 화면과 동일합니다."}
      </p>
    </div>
  );
}
