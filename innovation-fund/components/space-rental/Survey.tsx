"use client";
// 공간대여 설문 폼 공용 모듈 — 신청 폼·이용결과 폼(신청자 페이지/이용결과 페이지)에서 공유
import { useState } from "react";
import { Trash2, Upload, Download } from "lucide-react";
import type { FormSchema, FormField } from "@/lib/form-schema";
import { DEFAULT_CONSENT_INTRO } from "@/lib/form-schema";
import { ALL_DAY } from "@/lib/space-rental";

// 관리자가 설정한 설문 폼에서 신청자에게 보여줄 항목 (개인정보동의·파일다운로드·파일 업로드 지원, 서명은 제외)
export const ANSWERABLE: FormField["type"][] = ["shortText", "longText", "number", "date", "time", "datetime", "select", "agreement", "privacyConsent", "fileDownload", "file"];
// 폼 파일 항목으로 업로드된 서류 (필드별)
export interface UploadedDoc { name: string; url: string; }
export function surveyFields(schema: FormSchema | null): FormField[] {
  if (!schema?.steps) return [];
  return schema.steps.flatMap((s) => s.fields || []).filter((f) => ANSWERABLE.includes(f.type));
}
// 드롭다운 선택에 따라 현재 노출 중인 조건부 하위질문까지 펼친 목록 (검증·저장용 — 신청폼·이용결과폼 공용)
export function activeQs(list: FormField[], answers: Record<string, string>): FormField[] {
  return list.flatMap((q) => q.type === "select" ? [q, ...activeQs(q.branches?.[answers[q.id] || ""] || [], answers)] : [q]);
}

// 설문 항목 렌더 — 신청폼·이용결과폼 공용 (드롭다운 조건부 하위질문 재귀, 종일·범위·동의·파일다운로드·파일 업로드 지원)
export function SurveyQuestion({ q, answers, setAnswers, docsByField, setDocsByField }: {
  q: FormField;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  docsByField?: Record<string, UploadedDoc[]>;
  setDocsByField?: React.Dispatch<React.SetStateAction<Record<string, UploadedDoc[]>>>;
}) {
  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // 파일 항목: /api/space-rental/upload(kind=doc)로 올리고 필드별 목록에 추가 (여러 개 한꺼번에 가능)
  const uploadDocs = async (files: File[]) => {
    if (!setDocsByField || files.length === 0) return;
    setUploadingDoc(true);
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append("file", file); fd.append("kind", "doc");
        const res = await fetch("/api/space-rental/upload", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({ ok: false }));
        if (!j.ok) { alert(`'${file.name}' 업로드 실패: ` + (j.error || res.status)); continue; }
        setDocsByField((m) => ({ ...m, [q.id]: [...(m[q.id] || []), { name: j.name || file.name, url: j.url }] }));
      }
    } finally { setUploadingDoc(false); }
  };
  const renderInput = () => {
    if (q.type === "file") {
      const docs = docsByField?.[q.id] || [];
      return (
        <div className="space-y-1.5">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-sm">
              <span className="flex-1 truncate text-gray-700">{d.name}</span>
              <button type="button" onClick={() => setDocsByField?.((m) => ({ ...m, [q.id]: (m[q.id] || []).filter((_, k) => k !== i) }))} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {/* 파일 선택 + 끌어다 놓기(드래그 앤 드롭) 모두 지원 */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadDocs(Array.from(e.dataTransfer.files || [])); }}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-sm cursor-pointer transition
              ${dragOver ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"}`}
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">{uploadingDoc ? "업로드 중..." : dragOver ? "여기에 놓으면 업로드됩니다" : "파일을 끌어다 놓거나 클릭하여 선택"}</span>
            <span className="text-[11px] text-gray-400">HWP·PDF·오피스·이미지 · 여러 개 가능 · 15MB 이하</span>
            <input type="file" accept=".hwp,.hwpx,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" className="hidden" multiple
              onChange={(e) => { uploadDocs(Array.from(e.target.files || [])); e.target.value = ""; }} />
          </label>
        </div>
      );
    }
    if (q.type === "fileDownload") return (
      <div>
        {q.text && <p className="text-xs text-gray-600 whitespace-pre-line mb-1">{q.text}</p>}
        {q.downloadUrl ? (
          <a href={q.downloadUrl} download={q.downloadName || undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
            <Download className="w-4 h-4" /> {q.downloadName || "파일 다운로드"}
          </a>
        ) : <p className="text-sm text-gray-400">등록된 파일이 없습니다.</p>}
      </div>
    );
    if (q.type === "longText") return <textarea className="input-field h-20 resize-none" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder={q.placeholder} />;
    if (q.type === "select") return (
      <select className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)}>
        <option value="">선택하세요</option>
        {(q.options || []).filter((o) => o.trim()).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (q.type === "agreement") return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        {q.text && <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed mb-2">{q.text}</p>}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={answers[q.id] === "동의함"} onChange={(e) => setAnswer(q.id, e.target.checked ? "동의함" : "")} /> 동의합니다.
        </label>
      </div>
    );
    if (q.type === "privacyConsent") return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <p className="text-sm font-semibold text-gray-800 mb-1">{q.label || "개인정보 수집·이용 동의"} {q.required && <span className="text-red-500">*</span>}</p>
        <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed mb-2">{q.consentIntro?.trim() || DEFAULT_CONSENT_INTRO}</p>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={answers[q.id] === "동의함"} onChange={(e) => setAnswer(q.id, e.target.checked ? "동의함" : "")} /> {q.consentPrivacyLabel?.trim() || "위 내용에 동의합니다."}
        </label>
      </div>
    );
    if (q.type === "time" || q.type === "datetime") {
      const it = q.type === "time" ? "time" : "datetime-local";
      // 종일 체크 상태는 별도 키로 추적(전송 안 됨). datetime 종일이면 날짜만 입력받아 날짜를 보존한다.
      const allDayOn = answers["__allday__" + q.id] === "1";
      const setAllDay = (on: boolean) => setAnswers((a) => ({ ...a, ["__allday__" + q.id]: on ? "1" : "", [q.id]: on && q.type === "time" ? ALL_DAY : "" }));
      const [va = "", vb = ""] = (answers[q.id] || "").split("~");
      return (
        <div className="space-y-1.5">
          {q.allowAllDay && (
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={allDayOn} onChange={(e) => setAllDay(e.target.checked)} /> 종일
            </label>
          )}
          {allDayOn && q.type === "time" ? (
            <p className="text-sm text-gray-500">종일 사용</p>
          ) : allDayOn ? ( // datetime 종일 → 날짜만 선택
            q.range ? (
              <div className="flex items-center gap-2 flex-wrap"><input type="date" className="input-field" value={va} onChange={(e) => setAnswer(q.id, `${e.target.value}~${vb}`)} /><span className="text-gray-400">~</span><input type="date" className="input-field" value={vb} onChange={(e) => setAnswer(q.id, `${va}~${e.target.value}`)} /></div>
            ) : (
              <input type="date" className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
            )
          ) : q.range ? (
            <div className="flex items-center gap-2 flex-wrap"><input type={it} className="input-field" value={va} onChange={(e) => setAnswer(q.id, `${e.target.value}~${vb}`)} /><span className="text-gray-400">~</span><input type={it} className="input-field" value={vb} onChange={(e) => setAnswer(q.id, `${va}~${e.target.value}`)} /></div>
          ) : (
            <input type={it} className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}
        </div>
      );
    }
    if (q.type === "date" && q.range) {
      const [a = "", b = ""] = (answers[q.id] || "").split("~");
      return <div className="flex items-center gap-2 flex-wrap"><input type="date" className="input-field" value={a} onChange={(e) => setAnswer(q.id, `${e.target.value}~${b}`)} /><span className="text-gray-400">~</span><input type="date" className="input-field" value={b} onChange={(e) => setAnswer(q.id, `${a}~${e.target.value}`)} /></div>;
    }
    return <input type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"} className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder={q.placeholder} />;
  };

  const subs = q.type === "select" ? (q.branches?.[answers[q.id] || ""] || []) : [];
  const wide = ["longText", "agreement", "privacyConsent"].includes(q.type) || subs.length > 0;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      {q.type !== "privacyConsent" && <label className="label">{q.label} {q.required && <span className="text-red-500">*</span>}</label>}
      {renderInput()}
      {subs.length > 0 && (
        <div className="mt-3 ml-3 pl-3 border-l-2 border-indigo-200 space-y-4">
          {subs.map((sf) => <SurveyQuestion key={sf.id} q={sf} answers={answers} setAnswers={setAnswers} docsByField={docsByField} setDocsByField={setDocsByField} />)}
        </div>
      )}
    </div>
  );
}
