"use client";
import { useState } from "react";
import { Upload, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Save, Check, Plus, Trash2 } from "lucide-react";
import type { FormSchema, FormField, FormStep, FormFieldType } from "@/lib/form-schema";
import { FIELD_TYPE_LABELS, STANDARD_TYPES, WORKLOG_GROUPS, newSchemaId } from "@/lib/form-schema";
import TableField, { defaultTableCells } from "./TableField";

// 스키마 기반 신청 폼.
// editable=false(기본): 미리보기/실제 신청자 화면 (입력 비활성)
// editable=true: 신청자 화면과 동일한 모습 + 인라인 편집 도구 (구글폼식)
interface Props {
  schema: FormSchema;
  editable?: boolean;
  accent?: string;
  onChange?: (schema: FormSchema) => void;
}

// 항목 추가 시 기본 라벨 / 기본 필수 여부
const FIELD_DEFAULT_LABEL: Partial<Record<FormFieldType, string>> = {
  applicantInfo: "신청자 기본정보", account: "입금 계좌 정보", privacyConsent: "개인정보 수집·이용 및 신청 동의",
  signature: "신청인 서명", workLog: "근무상황부", transport: "교통비", registration: "등록비", lodging: "숙박비", file: "증빙 서류", eventLocation: "활동 장소",
};
const FIELD_DEFAULT_REQUIRED: Partial<Record<FormFieldType, boolean>> = {
  applicantInfo: true, account: true, privacyConsent: true, signature: true,
};
// 항목 추가 메뉴 구성 — 입력 항목 / 표준 블록(필수요소 포함)
const ADD_GROUPS: { title: string; types: FormFieldType[] }[] = [
  { title: "필수·표준 항목", types: ["applicantInfo", "privacyConsent", "account", "signature"] },
  { title: "입력 항목", types: ["shortText", "longText", "number", "date", "select", "table", "file", "agreement"] },
  { title: "활동·비용·근무 항목", types: ["eventLocation", "workLog", "transport", "registration", "lodging"] },
];

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
      return (
        <div>
          <label className="label">{f.label || "(제목 없음)"}{req}</label>
          {f.range ? (
            <div className="flex items-center gap-2">
              <input type="date" className="input-field bg-gray-50" disabled={disabled} />
              <span className="text-gray-400">~</span>
              <input type="date" className="input-field bg-gray-50" disabled={disabled} />
            </div>
          ) : (
            <input type="date" className="input-field bg-gray-50" disabled={disabled} />
          )}
        </div>
      );
    case "longText":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><textarea className="input-field h-20 resize-none bg-gray-50" placeholder={f.placeholder || ""} disabled={disabled} /></div>);
    case "select":
      return (<div><label className="label">{f.label || "(제목 없음)"}{req}</label><select className="input-field bg-gray-50" disabled={disabled}><option>선택하세요</option>{(f.options || []).map((o) => <option key={o}>{o}</option>)}</select></div>);
    case "table":
      return (
        <div>
          <label className="label">{f.label || "(제목 없음)"}{req}</label>
          <TableField field={f} disabled />
          {(f.tableAddRows || f.tableAddCols) && (
            <p className="text-[11px] text-gray-400 mt-1">신청자가 {[f.tableAddRows ? "행" : "", f.tableAddCols ? "열" : ""].filter(Boolean).join("·")}을 추가할 수 있습니다.</p>
          )}
        </div>
      );
    case "file":
      return (
        <div>
          <label className="label">{f.label || "(제목 없음)"}{req}</label>
          {f.uploadNotice && <p className="text-[11px] text-amber-600 mb-1">※ {f.uploadNotice} (업로드 시 안내창 표시)</p>}
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
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-24 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
              <span>여기에 직접 서명</span>
              <span className="text-[11px] text-gray-300">마우스·터치로 그리기</span>
            </div>
            <div className="upload-card p-4 text-center text-gray-400 text-sm bg-gray-50 flex flex-col items-center justify-center gap-1">
              <Upload className="w-5 h-5 opacity-60" /> 서명 이미지 업로드
              <span className="text-[11px] text-gray-300">PNG·JPG 등</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">직접 서명하거나 서명 이미지를 업로드할 수 있습니다.</p>
        </div>
      );
    case "privacyConsent":
      return (
        <div>
          <label className="label">{f.label || "개인정보 수집·이용 및 신청 동의"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 leading-relaxed space-y-1">
            <p className="font-semibold text-gray-800">개인정보 수집·이용 안내</p>
            <p>• 수집 항목: 이름, 학번, 소속, 학과, 연락처, 이메일, 계좌정보</p>
            <p>• 수집 목적: 지원 신청 접수 및 지급 관리 · 보유 기간: 지급 완료 후 5년</p>
            <div className="mt-2 space-y-1">
              <label className="flex items-start gap-2 text-gray-700"><input type="checkbox" disabled className="mt-0.5" /> 개인정보 수집·이용에 동의합니다. <span className="text-red-500">[필수]</span></label>
              <label className="flex items-start gap-2 text-gray-700"><input type="checkbox" disabled className="mt-0.5" /> 제출 자료가 사실과 다를 경우 지원 취소·환수에 동의합니다. <span className="text-red-500">[필수]</span></label>
              <label className="flex items-start gap-2 text-gray-700"><input type="checkbox" disabled className="mt-0.5" /> 본인 명의 계좌로만 지급됨을 확인합니다. <span className="text-red-500">[필수]</span></label>
            </div>
          </div>
        </div>
      );
    case "workLog":
      return (
        <div>
          <label className="label">{f.label || "근무상황부"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-[11px] text-gray-500">근무일자</span><input type="date" className="input-field bg-white" disabled /></div>
              <div><span className="text-[11px] text-gray-500">시작</span><input type="time" className="input-field bg-white" disabled /></div>
              <div><span className="text-[11px] text-gray-500">종료</span><input type="time" className="input-field bg-white" disabled /></div>
              <div className="flex items-end"><button className="btn-secondary text-xs w-full" disabled>＋ 등록</button></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 text-gray-400">
              <span className="font-medium">YYYY-MM-DD (월)</span><span>09:00 ~ 18:00</span><span className="text-primary-600 font-semibold">8시간</span>
              <input className="flex-1 min-w-[100px] border-b border-gray-200 bg-transparent" placeholder="상세내역" disabled />
            </div>
            {(() => {
              const byGrade = f.unitPriceMode === "byGrade";
              // 미리보기 샘플: 8시간 기준, 구분별이면 재학생 단가를 대표로 표시(실제는 신청자 학년 구분에 따라 자동)
              const unit = byGrade ? (f.unitPriceByGrade?.["재학생"] || 0) : (f.unitPrice || 0);
              const maxNote = byGrade ? (f.maxHoursByGrade?.["재학생"] || 0) : (f.maxHours || 0);
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">
                      합계 근무시간 <strong className="text-gray-700">8시간</strong>
                      {maxNote ? <span className="text-amber-600"> · 최대 {maxNote}시간</span> : null}
                    </span>
                    {unit ? (
                      <span className="text-gray-700 font-semibold">합계 <span className="text-primary-700">{(unit * 8).toLocaleString()}원</span></span>
                    ) : (
                      <span className="text-gray-400">단가 미설정</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">날짜·시간을 등록하면 근무시간이 자동 합산되며{unit ? `, ${byGrade ? "신청자 학년 구분(재학생/대학원생)에 따라 단가가 자동 적용되어" : "단가를 곱해"} 지급 합계가 자동 계산됩니다` : ""}.</p>
                </>
              );
            })()}
          </div>
        </div>
      );
    case "transport":
      return (
        <div>
          <label className="label">{f.label || "교통비"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div><span className="text-[11px] text-gray-500">사용일자</span><input type="date" className="input-field bg-white" disabled /></div>
              <div><span className="text-[11px] text-gray-500">교통수단</span><select className="input-field bg-white" disabled><option>버스/기차/택시…</option></select></div>
              <div><span className="text-[11px] text-gray-500">금액(원)</span><input className="input-field bg-white" placeholder="0" disabled /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div><span className="text-[11px] text-gray-500">출발지</span><input className="input-field bg-white" placeholder="예: 춘천" disabled /></div>
              <div><span className="text-[11px] text-gray-500">도착지</span><input className="input-field bg-white" placeholder="예: 서울" disabled /></div>
            </div>
            <button className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-400" disabled>＋ 교통비 항목 추가 (행별 증빙 첨부)</button>
          </div>
        </div>
      );
    case "registration":
      return (
        <div>
          <label className="label">{f.label || "등록비"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 grid sm:grid-cols-2 gap-2 items-end">
            <div><span className="text-[11px] text-gray-500">등록비용(원)</span><input className="input-field bg-white" placeholder="0" disabled /></div>
            <div className="upload-card p-3 text-center text-gray-400 text-xs bg-white flex items-center justify-center gap-1"><Upload className="w-4 h-4 opacity-60" /> 증빙(참가확인서 등) 업로드</div>
          </div>
        </div>
      );
    case "lodging":
      return (
        <div>
          <label className="label">{f.label || "숙박비"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex gap-2">
              <button className="btn-primary flex-1 text-xs" disabled>개인사용</button>
              <button className="btn-secondary flex-1 text-xs" disabled>단체사용</button>
            </div>
            <div><span className="text-[11px] text-gray-500">숙소 결제금액(원)</span><input className="input-field bg-white" placeholder="0" disabled /></div>
            <p className="text-[11px] text-gray-400">※ 숙박비는 1인 70,000원 한도까지 지원됩니다. (단체사용 시 개인 부담금액 입력)</p>
            <div className="upload-card p-3 text-center text-gray-400 text-xs bg-white flex items-center justify-center gap-1"><Upload className="w-4 h-4 opacity-60" /> 숙박 영수증·숙박확인증 업로드</div>
          </div>
        </div>
      );
    case "eventLocation":
      return (
        <div>
          <label className="label">{f.label || "활동 장소"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex gap-2">
              <button className="btn-primary flex-1 text-xs" disabled>국내</button>
              <button className="btn-secondary flex-1 text-xs" disabled>국외</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input className="input-field bg-white" placeholder="도/시 (예: 강원특별자치도)" disabled />
              <input className="input-field bg-white" placeholder="시/군/구 또는 도시명" disabled />
            </div>
            <p className="text-[11px] text-gray-400">국내/국외를 선택하고 활동(참여) 장소를 입력합니다.</p>
          </div>
        </div>
      );
    case "clubMembers":
      return (
        <div>
          <label className="label">{f.label || "소학회 구성원"}{req}</label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-2">회장 + 팀원 명단 (이름·학번·소속학과·가상학과 여부·연락처). 신청자가 직접 입력합니다.</p>
            <div className="grid grid-cols-5 gap-1 text-[11px] text-gray-400">
              <span>구분</span><span>이름</span><span>학번</span><span>소속학과·가상학과</span><span>연락처</span>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function SchemaForm({ schema, editable = false, accent = "#6366f1", onChange }: Props) {
  const steps = schema.steps || [];
  const [step, setStep] = useState(0);
  const [addOpen, setAddOpen] = useState<string | null>(null);
  const total = steps.length;
  const isReview = step === total;
  const cur = steps[Math.min(step, total - 1)];

  const set = (s: FormSchema) => onChange?.(s);
  const mutSteps = (fn: (st: FormStep[]) => FormStep[]) => set({ ...schema, steps: fn(steps) });
  const addStep = () => { mutSteps((st) => [...st, { id: newSchemaId(), title: `${st.length + 1}단계`, fields: [] }]); setStep(total); };
  const renameStep = (sid: string, title: string) => mutSteps((st) => st.map((s) => s.id === sid ? { ...s, title } : s));
  const removeStep = (sid: string) => { mutSteps((st) => st.filter((s) => s.id !== sid)); setStep((p) => Math.max(0, p - 1)); };
  const moveStep = (sid: string, dir: -1 | 1) => mutSteps((st) => { const a = [...st]; const i = a.findIndex((s) => s.id === sid); const j = i + dir; if (i < 0 || j < 0 || j >= a.length) return st; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const addField = (sid: string, type: FormFieldType = "shortText") => {
    const extra: Partial<FormField> = type === "table" ? { tableCells: defaultTableCells(), tableHeaderRow: true } : {};
    mutSteps((st) => st.map((s) => s.id === sid ? { ...s, fields: [...s.fields, { id: newSchemaId("f"), label: FIELD_DEFAULT_LABEL[type] || "", type, required: !!FIELD_DEFAULT_REQUIRED[type], ...extra }] } : s));
    setAddOpen(null);
  };
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
              {f.type === "select" && (() => {
                const opts = f.options || [];
                const branches = f.branches || {};
                const renameOpt = (i: number, val: string) => {
                  const old = opts[i];
                  const br: Record<string, FormField[]> = { ...branches };
                  if (old !== val && br[old] !== undefined) { br[val] = br[old]; delete br[old]; }
                  updField(cur.id, f.id, { options: opts.map((o, k) => k === i ? val : o), branches: br });
                };
                const addOpt = () => updField(cur.id, f.id, { options: [...opts, ""] });
                const removeOpt = (i: number) => {
                  const br: Record<string, FormField[]> = { ...branches }; delete br[opts[i]];
                  updField(cur.id, f.id, { options: opts.filter((_, k) => k !== i), branches: br });
                };
                const setSubs = (opt: string, next: FormField[]) => updField(cur.id, f.id, { branches: { ...branches, [opt]: next } });
                return (
                  <div className="mt-2 space-y-2">
                    {opts.length === 0 && <p className="text-[11px] text-gray-400">선택지가 없습니다. 아래 ‘옵션 추가’로 만드세요.</p>}
                    {opts.map((opt, i) => {
                      const subs = branches[opt] || [];
                      return (
                        <div key={i} className="rounded-md border border-gray-200 bg-white p-2 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400 w-4 text-center shrink-0">{i + 1}</span>
                            <input className="input-field text-xs flex-1" value={opt} onChange={(e) => renameOpt(i, e.target.value)} placeholder={`옵션 ${i + 1}`} />
                            <button onClick={() => removeOpt(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="ml-6 rounded-md bg-indigo-50/40 border border-indigo-100 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-indigo-700">이 선택지의 추가 질문(조건부)</span>
                              <button disabled={!opt.trim()} onClick={() => setSubs(opt, [...subs, { id: newSchemaId("sf"), label: "", type: "shortText", required: true }])} className="text-[11px] text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-0.5"><Plus className="w-3 h-3" />질문 추가</button>
                            </div>
                            {subs.length === 0 ? (
                              <p className="text-[11px] text-gray-400 mt-1">추가 질문 없음</p>
                            ) : (
                              <div className="mt-1.5 space-y-1.5">
                                {subs.map((sf, si) => (
                                  <div key={sf.id} className="flex flex-wrap items-center gap-1.5">
                                    <input className="flex-1 min-w-[120px] text-xs border-b border-gray-200 outline-none bg-transparent pb-0.5" value={sf.label} onChange={(e) => setSubs(opt, subs.map((x) => x.id === sf.id ? { ...x, label: e.target.value } : x))} placeholder={`하위 질문 ${si + 1}`} />
                                    <select className="input-field !w-auto text-[11px] !py-0.5" value={sf.type} onChange={(e) => setSubs(opt, subs.map((x) => x.id === sf.id ? { ...x, type: e.target.value as FormFieldType } : x))}>
                                      {(["shortText", "longText", "number", "date", "select", "file"] as FormFieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                                    </select>
                                    <label className="flex items-center gap-1 text-[11px] text-gray-600"><input type="checkbox" checked={!!sf.required} onChange={(e) => setSubs(opt, subs.map((x) => x.id === sf.id ? { ...x, required: e.target.checked } : x))} />필수</label>
                                    <button onClick={() => setSubs(opt, subs.filter((x) => x.id !== sf.id))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                    {sf.type === "select" && (
                                      <div className="w-full ml-2 space-y-1">
                                        {(sf.options || []).map((o, oi) => (
                                          <div key={oi} className="flex items-center gap-1">
                                            <input className="input-field text-[11px] !py-0.5 flex-1" value={o} onChange={(e) => setSubs(opt, subs.map((x) => x.id === sf.id ? { ...x, options: (x.options || []).map((y, k) => k === oi ? e.target.value : y) } : x))} placeholder={`옵션 ${oi + 1}`} />
                                            <button onClick={() => setSubs(opt, subs.map((x) => x.id === sf.id ? { ...x, options: (x.options || []).filter((_, k) => k !== oi) } : x))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                          </div>
                                        ))}
                                        <button onClick={() => setSubs(opt, subs.map((x) => x.id === sf.id ? { ...x, options: [...(x.options || []), ""] } : x))} className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><Plus className="w-3 h-3" />옵션 추가</button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={addOpt} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-3.5 h-3.5" />옵션 추가</button>
                  </div>
                );
              })()}
              {f.type === "agreement" && (
                <textarea className="input-field text-xs mt-2 h-16 resize-none" value={f.text || ""} onChange={(e) => updField(cur.id, f.id, { text: e.target.value })} placeholder="서약 본문" />
              )}
              {f.type === "date" && (
                <label className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
                  <input type="checkbox" checked={!!f.range} onChange={(e) => updField(cur.id, f.id, { range: e.target.checked })} /> 기간 선택(시작일~종료일)
                </label>
              )}
              {f.type === "workLog" && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
                    <span className="font-semibold text-gray-500">단가 방식</span>
                    <label className="flex items-center gap-1"><input type="radio" checked={(f.unitPriceMode || "flat") === "flat"} onChange={() => updField(cur.id, f.id, { unitPriceMode: "flat" })} /> 고정 단가</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={f.unitPriceMode === "byGrade"} onChange={() => updField(cur.id, f.id, { unitPriceMode: "byGrade" })} /> 구분별(재학생/대학원생)</label>
                  </div>
                  {f.unitPriceMode === "byGrade" ? (
                    <div className="space-y-1.5">
                      {WORKLOG_GROUPS.map((g) => (
                        <div key={g.key} className="flex items-center gap-2 flex-wrap text-xs text-gray-600">
                          <span className="w-24 font-medium">{g.label}</span>
                          <label className="flex items-center gap-1">단가(원/시간)
                            <input type="number" inputMode="numeric" className="input-field !w-24 text-xs !py-1"
                              value={f.unitPriceByGrade?.[g.key] ?? ""}
                              onChange={(e) => updField(cur.id, f.id, { unitPriceByGrade: { ...(f.unitPriceByGrade || {}), [g.key]: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) } })}
                              placeholder="예: 9860" />
                          </label>
                          <label className="flex items-center gap-1">최대 시간
                            <input type="number" inputMode="numeric" className="input-field !w-20 text-xs !py-1"
                              value={f.maxHoursByGrade?.[g.key] ?? ""}
                              onChange={(e) => updField(cur.id, f.id, { maxHoursByGrade: { ...(f.maxHoursByGrade || {}), [g.key]: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) } })}
                              placeholder="제한 없음" />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-gray-600 flex items-center gap-1">시간당 단가(원)
                        <input type="number" inputMode="numeric" className="input-field !w-28 text-xs !py-1" value={f.unitPrice ?? ""} onChange={(e) => updField(cur.id, f.id, { unitPrice: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0) })} placeholder="예: 9860" />
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1">최대 입력 시간
                        <input type="number" inputMode="numeric" className="input-field !w-24 text-xs !py-1" value={f.maxHours ?? ""} onChange={(e) => updField(cur.id, f.id, { maxHours: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0) })} placeholder="제한 없음" />
                      </label>
                    </div>
                  )}
                </div>
              )}
              {f.type === "table" && (() => {
                const cells = (f.tableCells && f.tableCells.length ? f.tableCells : defaultTableCells());
                const rows = cells.length; const cols = cells[0]?.length || 0;
                const setCells = (g: string[][]) => updField(cur.id, f.id, { tableCells: g });
                const setCell = (r: number, c: number, v: string) => { const g = cells.map((row) => [...row]); g[r][c] = v; setCells(g); };
                const addRow = () => setCells([...cells.map((row) => [...row]), Array(cols).fill("")]);
                const addCol = () => setCells(cells.map((row) => [...row, ""]));
                const delRow = (r: number) => { if (rows <= 1) return; setCells(cells.filter((_, i) => i !== r)); };
                const delCol = (c: number) => { if (cols <= 1) return; setCells(cells.map((row) => row.filter((_, i) => i !== c))); };
                return (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] text-gray-500">표를 직접 작성하세요. <strong>내용을 채운 칸</strong>은 신청자에게 그대로 보이고(머리글·예시), <strong>빈 칸</strong>은 신청자가 입력합니다.</p>
                    <div className="overflow-x-auto">
                      <table className="border-collapse text-xs">
                        <tbody>
                          {cells.map((row, r) => (
                            <tr key={r}>
                              {row.map((cell, c) => {
                                const header = (f.tableHeaderRow && r === 0) || (f.tableHeaderCol && c === 0);
                                return (
                                  <td key={c} className={`border border-gray-300 p-0 ${header ? "bg-indigo-50" : "bg-white"}`}>
                                    <input className="w-full px-1.5 py-1 outline-none bg-transparent" style={{ minWidth: 80 }} value={cell} onChange={(e) => setCell(r, c, e.target.value)} placeholder={r === 0 ? "머리글" : (r === 1 ? "예시/빈칸" : "빈칸=신청자")} />
                                  </td>
                                );
                              })}
                              <td className="border-0 pl-1"><button onClick={() => delRow(r)} className="text-gray-300 hover:text-red-500" title="행 삭제"><Trash2 className="w-3.5 h-3.5" /></button></td>
                            </tr>
                          ))}
                          <tr>{cells[0]?.map((_, c) => (
                            <td key={c} className="border-0 text-center pt-0.5"><button onClick={() => delCol(c)} className="text-gray-300 hover:text-red-500" title="열 삭제"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          ))}</tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addRow} className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> 행 추가</button>
                      <button onClick={addCol} className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> 열 추가</button>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.tableHeaderRow} onChange={(e) => updField(cur.id, f.id, { tableHeaderRow: e.target.checked })} /> 첫 행을 머리글로</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.tableHeaderCol} onChange={(e) => updField(cur.id, f.id, { tableHeaderCol: e.target.checked })} /> 첫 열을 머리글로</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.tableAddRows} onChange={(e) => updField(cur.id, f.id, { tableAddRows: e.target.checked })} /> 신청자 행 추가 허용</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.tableAddCols} onChange={(e) => updField(cur.id, f.id, { tableAddCols: e.target.checked })} /> 신청자 열 추가 허용</label>
                    </div>
                  </div>
                );
              })()}
              {!STANDARD_TYPES.includes(f.type) && !["select", "table", "agreement", "signature", "file", "date"].includes(f.type) && (
                <input className="input-field text-xs mt-2" value={f.placeholder || ""} onChange={(e) => updField(cur.id, f.id, { placeholder: e.target.value })} placeholder="입력 도움말(placeholder) — 선택" />
              )}
              {f.type === "file" && (
                <input className="input-field text-xs mt-2" value={f.uploadNotice || ""} onChange={(e) => updField(cur.id, f.id, { uploadNotice: e.target.value })} placeholder="업로드 안내창 문구(선택) — 예: 재학증명서는 직인 날인본으로 제출" />
              )}
              {(f.type === "shortText" || f.type === "longText") && (
                <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-gray-600">
                  <span className="text-gray-500">글자수 제한</span>
                  <label className="flex items-center gap-1">최소
                    <input type="number" inputMode="numeric" min={0} className="input-field !w-20 text-xs !py-1" value={f.minLen ?? ""} onChange={(e) => updField(cur.id, f.id, { minLen: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0) })} placeholder="이상" /> 자
                  </label>
                  <label className="flex items-center gap-1">최대
                    <input type="number" inputMode="numeric" min={0} className="input-field !w-20 text-xs !py-1" value={f.maxLen ?? ""} onChange={(e) => updField(cur.id, f.id, { maxLen: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0) })} placeholder="이하" /> 자
                  </label>
                </div>
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
            <div>
              <button onClick={() => setAddOpen(addOpen === cur.id ? null : cur.id)} className="w-full rounded-2xl border-2 border-dashed py-2.5 text-sm font-medium flex items-center justify-center gap-1.5" style={{ borderColor: `${accent}55`, color: accent }}>
                <Plus className="w-4 h-4" /> 항목 추가 (종류 선택)
              </button>
              {addOpen === cur.id && (
                <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 space-y-3">
                  <p className="text-[11px] text-gray-400">추가할 항목 종류를 선택하세요. 기본정보·개인정보동의·계좌정보·서명 등 필수 항목은 새 폼에 기본 포함되어 있습니다.</p>
                  {ADD_GROUPS.map((grp) => (
                    <div key={grp.title}>
                      <p className="text-[11px] font-semibold text-gray-500 mb-1">{grp.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {grp.types.map((t) => (
                          <button key={t} onClick={() => addField(cur.id, t)} className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 bg-white/70 text-gray-600 hover:text-indigo-600 hover:border-indigo-300 transition">
                            {FIELD_TYPE_LABELS[t]}{FIELD_DEFAULT_REQUIRED[t] ? " *" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
