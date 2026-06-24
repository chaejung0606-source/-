"use client";
import { useState } from "react";
import { Upload, ChevronLeft, ChevronRight, Save, Check } from "lucide-react";
import type { FormSchema, FormField } from "@/lib/form-schema";

// 스키마 기반 신청 폼 렌더러.
// preview=true: 관리자 미리보기(입력 비활성, 제출 동작 없음) — 실제 신청자가 보는 모습과 동일.
interface Props {
  schema: FormSchema;
  preview?: boolean;
  accent?: string;
}

function FieldView({ f, disabled }: { f: FormField; disabled: boolean }) {
  const req = f.required ? <span className="text-red-500"> *</span> : null;
  switch (f.type) {
    case "applicantInfo":
      return (
        <div>
          <label className="label">{f.label}{req}</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {["이름", "학번", "소속 대학", "학과/전공", "학년", "연락처", "이메일"].map((k) => (
              <div key={k}>
                <span className="text-xs text-gray-400">{k}</span>
                <input className="input-field bg-gray-50" placeholder={k} disabled />
              </div>
            ))}
          </div>
        </div>
      );
    case "account":
      return (
        <div>
          <label className="label">{f.label}{req}</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {["은행", "계좌번호", "예금주"].map((k) => (
              <input key={k} className="input-field bg-gray-50" placeholder={k} disabled />
            ))}
          </div>
        </div>
      );
    case "shortText":
      return (<div><label className="label">{f.label}{req}</label><input className="input-field bg-gray-50" placeholder={f.placeholder || ""} disabled={disabled} /></div>);
    case "number":
      return (<div><label className="label">{f.label}{req}</label><input className="input-field bg-gray-50" placeholder={f.placeholder || "0"} inputMode="numeric" disabled={disabled} /></div>);
    case "date":
      return (<div><label className="label">{f.label}{req}</label><input type="date" className="input-field bg-gray-50" disabled={disabled} /></div>);
    case "longText":
      return (<div><label className="label">{f.label}{req}</label><textarea className="input-field h-20 resize-none bg-gray-50" placeholder={f.placeholder || ""} disabled={disabled} /></div>);
    case "select":
      return (<div><label className="label">{f.label}{req}</label><select className="input-field bg-gray-50" disabled={disabled}><option>선택하세요</option>{(f.options || []).map((o) => <option key={o}>{o}</option>)}</select></div>);
    case "file":
      return (
        <div>
          <label className="label">{f.label}{req}</label>
          <div className="upload-card p-5 text-center text-gray-400 text-sm bg-gray-50 flex flex-col items-center gap-1">
            <Upload className="w-6 h-6 opacity-60" /> 파일을 끌어다 놓거나 클릭하여 업로드
          </div>
        </div>
      );
    case "agreement":
      return (
        <div>
          <label className="label">{f.label}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="text-gray-600 whitespace-pre-line mb-2">{f.text || "(서약 본문)"}</p>
            <label className="flex items-center gap-2 text-gray-700"><input type="checkbox" disabled /> 위 내용에 동의합니다</label>
          </div>
        </div>
      );
    case "signature":
      return (
        <div>
          <label className="label">{f.label}{req}</label>
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-24 flex items-center justify-center text-gray-400 text-sm">여기에 서명</div>
        </div>
      );
    default:
      return null;
  }
}

export default function SchemaForm({ schema, preview = true, accent = "#6366f1" }: Props) {
  const steps = schema.steps || [];
  const [step, setStep] = useState(0);
  const total = steps.length;
  const isReview = step === total; // 마지막 다음 = 신청내용확인
  const cur = steps[step];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {/* 단계 표시 */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${i === step ? "text-white" : "bg-white/70 text-gray-500 border-gray-200"}`}
            style={i === step ? { background: accent, borderColor: accent } : undefined}>
            {i + 1}. {s.title || "단계"}
          </button>
        ))}
        <button onClick={() => setStep(total)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${isReview ? "text-white" : "bg-white/70 text-gray-500 border-gray-200"}`}
          style={isReview ? { background: accent, borderColor: accent } : undefined}>
          신청내용 확인
        </button>
      </div>

      {/* 본문 */}
      {!isReview && cur ? (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800">{cur.title}</h3>
          {cur.fields.length === 0 ? (
            <p className="text-sm text-gray-400">이 단계에 항목이 없습니다.</p>
          ) : cur.fields.map((f) => <FieldView key={f.id} f={f} disabled={preview} />)}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">신청 내용 확인</h3>
          <p className="text-sm text-gray-500">제출 전 입력한 내용을 확인하는 단계입니다.</p>
          {steps.map((s) => (
            <div key={s.id} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">{s.title}</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                {s.fields.map((f) => <li key={f.id}>· {f.label}{f.required ? " (필수)" : ""}</li>)}
                {s.fields.length === 0 && <li className="text-gray-300">항목 없음</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 네비게이션 버튼 */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> 이전</button>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-sm flex items-center gap-1" disabled={preview}><Save className="w-4 h-4" /> 임시저장</button>
          {isReview ? (
            <button className="btn-primary text-sm flex items-center gap-1" disabled={preview} style={{ background: accent }}><Check className="w-4 h-4" /> {schema.submitLabel || "신청 제출"}</button>
          ) : (
            <button onClick={() => setStep((s) => Math.min(total, s + 1))}
              className="btn-primary text-sm flex items-center gap-1" style={{ background: accent }}>다음 <ChevronRight className="w-4 h-4" /></button>
          )}
        </div>
      </div>
      {preview && <p className="text-[11px] text-gray-400 mt-2 text-center">※ 미리보기 — 실제 신청자에게 보이는 화면과 동일합니다. (입력·제출은 동작하지 않음)</p>}
    </div>
  );
}
