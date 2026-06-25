"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Trash2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { ApplicationType, ApplicationPhase, UploadedFile, WorkLogEntry, CostDetail, EventLocation } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, calcSupportTotal } from "@/types";
import type { FormSchema, FormField } from "@/lib/form-schema";
import { workLogGroupOfGrade } from "@/lib/form-schema";
import { currentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toRow } from "@/lib/app-mapper";
import { validateBasicFormat, formatPhone } from "@/lib/validation";
import { ACCEPT_DOC, isAllowedDoc } from "@/lib/upload";
import BasicInfoSection from "./BasicInfoSection";
import ConsentChecklist from "./ConsentChecklist";
import ConsentSection from "./ConsentSection";
import EventLocationSection from "./EventLocationSection";

interface Props {
  schema: FormSchema;
  type: ApplicationType;
  mode: ApplicationPhase;
  programId: string;
  programName: string;
  isAdmin?: boolean;   // 관리자 확인용(제약·제출 없이 신청자 화면 그대로 보기)
  onBack: () => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "SC제일은행", "대구은행", "부산은행", "기타"];
const DAILY_MAX_HOURS = 8; // 일일 최대 근무시간
const toMin = (t: string) => { const [h, m] = (t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };

// 근무상황부 입력 (관리자 미리보기와 동일한 양식)
function WorkLogField({ field, entries, onChange, group, isPre }: { field: FormField; entries: WorkLogEntry[]; onChange: (e: WorkLogEntry[]) => void; group: string; isPre: boolean; }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const byGrade = field.unitPriceMode === "byGrade";
  const unit = byGrade ? (field.unitPriceByGrade?.[group] || 0) : (field.unitPrice || 0);
  const maxH = byGrade ? (field.maxHoursByGrade?.[group] || 0) : (field.maxHours || 0);
  const totalHours = Math.round(entries.reduce((s, e) => s + (Number(e.hours) || 0), 0) * 10) / 10;
  const cappedHours = maxH > 0 ? Math.min(totalHours, maxH) : totalHours;
  const amount = Math.round(cappedHours * unit);

  const add = () => {
    if (!date || !start || !end) { alert("근무일자·시작·종료 시간을 모두 입력해주세요."); return; }
    const mins = toMin(end) - toMin(start);
    if (mins <= 0) { alert("종료 시간이 시작 시간보다 늦어야 합니다."); return; }
    const hours = Math.round((mins / 60) * 10) / 10;
    if (hours > DAILY_MAX_HOURS) { alert(`일일 최대 근무시간은 ${DAILY_MAX_HOURS}시간입니다. (입력: ${hours}시간)`); return; }
    const dayTotal = entries.filter((x) => x.date === date).reduce((s, x) => s + (Number(x.hours) || 0), 0) + hours;
    if (dayTotal > DAILY_MAX_HOURS) { alert(`같은 날짜 합계가 일일 최대 ${DAILY_MAX_HOURS}시간을 초과합니다. (${date} 합계 ${dayTotal}시간)`); return; }
    onChange([...entries, { date, startTime: start, endTime: end, hours, detail: "" }].sort((a, b) => a.date.localeCompare(b.date)));
    setStart(""); setEnd("");
  };
  const weekday = (d: string) => { try { return WEEKDAYS[new Date(d + "T00:00:00").getDay()]; } catch { return ""; } };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div><span className="text-[11px] text-gray-500">근무일자</span><input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><span className="text-[11px] text-gray-500">시작</span><input type="time" className="input-field" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><span className="text-[11px] text-gray-500">종료</span><input type="time" className="input-field" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div className="flex items-end"><button type="button" onClick={add} className="btn-secondary text-sm w-full">＋ 등록</button></div>
      </div>
      <p className="text-[11px] text-gray-400">※ 일일 최대 근무시간은 {DAILY_MAX_HOURS}시간입니다.</p>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">근무 기록을 등록해주세요.</p>
      ) : entries.map((e, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
          <span className="font-medium w-32">{e.date} ({weekday(e.date)})</span>
          <span className="text-gray-600">{e.startTime} ~ {e.endTime}</span>
          <span className="text-primary-700 font-semibold">{e.hours}시간</span>
          <input className="flex-1 min-w-[120px] border-b border-gray-200 bg-transparent text-xs" placeholder="상세내역" value={e.detail || ""} onChange={(ev) => onChange(entries.map((x, idx) => idx === i ? { ...x, detail: ev.target.value } : x))} />
          <button type="button" onClick={() => onChange(entries.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
        <span className="text-gray-500">합계 근무시간 <strong className="text-gray-700">{totalHours}시간</strong>{maxH > 0 ? <span className="text-amber-600"> · 최대 {maxH}시간</span> : null}</span>
        {!isPre && unit ? <span className="text-gray-700 font-semibold">합계 <span className="text-primary-700">{amount.toLocaleString()}원</span></span> : null}
      </div>
      {maxH > 0 && totalHours > maxH && <p className="text-[11px] text-amber-600">최대 {maxH}시간까지만 지급에 반영됩니다.</p>}
    </div>
  );
}

// 항목별 단순 파일 업로드 (관리자 미리보기와 동일)
function FileField({ label, files, onChange }: { label: string; files: UploadedFile[]; onChange: (f: UploadedFile[]) => void; }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const process = async (list: File[]) => {
    if (list.length === 0) return;
    const bad = list.find((f) => !isAllowedDoc(f));
    if (bad) { alert(`이미지(JPG·PNG·WEBP) 또는 PDF만 업로드할 수 있습니다.\n(거부됨: ${bad.name})`); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("로그인이 필요합니다. 다시 로그인해 주세요."); return; }
      const uploaded: UploadedFile[] = [];
      for (const f of list) {
        const ext = f.name.includes(".") ? f.name.split(".").pop() : "";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;
        const { error } = await supabase.storage.from("documents").upload(path, f, { upsert: false });
        if (error) { alert(`${f.name} 업로드 실패: ${error.message}`); continue; }
        uploaded.push({ id: `${Date.now()}-${Math.random()}`, name: `${label} · ${f.name}`, type: "other", size: f.size, path });
      }
      if (uploaded.length) onChange([...files, ...uploaded]);
    } finally { setUploading(false); }
  };
  return (
    <div className="space-y-2">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
          <span className="flex-1 truncate">{f.name}</span>
          <button type="button" onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); process(Array.from(e.dataTransfer.files || [])); }}
        className={`upload-card flex flex-col items-center justify-center gap-1 p-6 text-center text-sm cursor-pointer ${dragOver ? "ring-2 ring-indigo-300" : ""}`}
      >
        <Upload className="w-6 h-6 opacity-60 text-gray-400" />
        <span className="text-gray-400">{uploading ? "업로드 중..." : "파일을 끌어다 놓거나 클릭하여 업로드"}</span>
        <span className="text-[11px] text-gray-300">PDF · JPG · PNG · WEBP</span>
        <input type="file" className="hidden" accept={ACCEPT_DOC} multiple onChange={(e) => { process(Array.from(e.target.files || [])); e.currentTarget.value = ""; }} />
      </label>
    </div>
  );
}

export default function SchemaApplyForm({ schema, type, mode, programId, programName, isAdmin = false, onBack }: Props) {
  const router = useRouter();
  const isPre = mode === "pre";
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const [basicInfo, setBasicInfo] = useState({
    name: "", studentId: "", university: "강원대학교", campus: "춘천", department: "", grade: "1",
    academicStatus: "재학", phone: "", email: "", applicationDate: new Date().toISOString().split("T")[0],
    bankName: "", accountNumber: "", accountHolder: "", gradCompletion: "재학", completedYears: "", currentSemester: "", privacyAgree: "",
  });
  const [consent, setConsent] = useState({ privacy: false, truth: false, account: false });
  const [signature, setSignature] = useState("");
  const [filesByField, setFilesByField] = useState<Record<string, UploadedFile[]>>({});
  const [workLogByField, setWorkLogByField] = useState<Record<string, WorkLogEntry[]>>({});
  const [cost, setCost] = useState<CostDetail>({ registrationFee: 0, transports: [] });
  const [eventLocByField, setEventLocByField] = useState<Record<string, EventLocation>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const u = await currentUser();
      if (u) setBasicInfo((b) => ({
        ...b, name: b.name || u.name, studentId: b.studentId || u.studentId, campus: b.campus || u.campus || b.campus,
        department: b.department || u.department, phone: b.phone || formatPhone(u.phone), email: b.email || u.email,
        university: u.university || b.university, bankName: b.bankName || u.bankName, accountNumber: b.accountNumber || u.accountNumber, accountHolder: b.accountHolder || u.accountHolder,
      }));
    })();
  }, []);

  const steps = schema.steps || [];
  const allFields = useMemo(() => steps.flatMap((s) => s.fields), [steps]);
  const hasAccount = allFields.some((f) => f.type === "account");
  const hasCost = allFields.some((f) => ["registration", "transport", "lodging"].includes(f.type));
  const group = workLogGroupOfGrade(basicInfo.grade);

  const workLogAmount = useMemo(() => {
    return allFields.filter((f) => f.type === "workLog").reduce((sum, f) => {
      const byGrade = f.unitPriceMode === "byGrade";
      const unit = byGrade ? (f.unitPriceByGrade?.[group] || 0) : (f.unitPrice || 0);
      const maxH = byGrade ? (f.maxHoursByGrade?.[group] || 0) : (f.maxHours || 0);
      let hours = (workLogByField[f.id] || []).reduce((s, e) => s + (Number(e.hours) || 0), 0);
      if (maxH > 0) hours = Math.min(hours, maxH);
      return sum + Math.round(hours * unit);
    }, 0);
  }, [allFields, workLogByField, group]);

  const costAmount = hasCost ? calcSupportTotal(cost) : 0;
  const requestAmount = isPre ? 0 : workLogAmount + costAmount;
  const setAns = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const summary = { name: basicInfo.name, type: APPLICATION_TYPE_LABELS[type], amount: requestAmount, calculatedAmount: requestAmount };

  // 단계별 필수 검증
  const validateStep = (idx: number): string[] => {
    const e: string[] = [];
    for (const f of (steps[idx]?.fields || [])) {
      if (f.type === "applicantInfo") {
        let errs = validateBasicFormat({ name: basicInfo.name, studentId: basicInfo.studentId, department: basicInfo.department, phone: basicInfo.phone, email: basicInfo.email, accountNumber: basicInfo.accountNumber, applicationDate: basicInfo.applicationDate });
        errs = errs.filter((x) => !x.includes("계좌번호"));
        e.push(...errs);
      } else if (f.type === "account") {
        if (!isPre) { if (!basicInfo.bankName.trim()) e.push("• 은행명을 입력해주세요."); if (!basicInfo.accountNumber.trim()) e.push("• 계좌번호를 입력해주세요."); if (!basicInfo.accountHolder.trim()) e.push("• 예금주를 입력해주세요."); }
      } else if (f.type === "privacyConsent") {
        if (!consent.privacy || !consent.truth || (!isPre && hasAccount && !consent.account)) e.push("• 개인정보 수집·이용 및 신청 동의 항목에 모두 체크해주세요.");
      } else if (f.type === "signature") {
        if (!signature) e.push("• 서명을 완료하거나 서명 이미지를 업로드해주세요.");
      } else if (!f.required) {
        continue;
      } else if (f.type === "file") {
        if ((filesByField[f.id] || []).length === 0) e.push(`• [${f.label || "서류"}] 파일을 업로드해주세요.`);
      } else if (f.type === "workLog") {
        if ((workLogByField[f.id] || []).length === 0) e.push(`• [${f.label || "근무상황부"}] 근무 기록을 1건 이상 등록해주세요.`);
      } else if (f.type === "agreement") {
        if (answers[f.id] !== "동의") e.push(`• [${f.label || "서약"}] 항목에 동의해주세요.`);
      } else if (["shortText", "longText", "number", "date", "select"].includes(f.type)) {
        const val = (answers[f.id] || "");
        if (!val.replace("~", "").trim()) { e.push(`• [${f.label || "항목"}] 항목을 작성해주세요.`); }
        else if (f.type === "shortText" || f.type === "longText") {
          const len = val.length;
          if (typeof f.minLen === "number" && f.minLen > 0 && len < f.minLen) e.push(`• [${f.label || "항목"}] 최소 ${f.minLen}자 이상 입력해주세요. (현재 ${len}자)`);
          if (typeof f.maxLen === "number" && f.maxLen > 0 && len > f.maxLen) e.push(`• [${f.label || "항목"}] 최대 ${f.maxLen}자 이하로 입력해주세요. (현재 ${len}자)`);
        }
      }
    }
    return e;
  };

  const next = () => { if (!isAdmin) { const errs = validateStep(step); if (errs.length) { alert("아래 항목을 확인해주세요.\n\n" + errs.join("\n")); return; } } setStep((s) => Math.min(steps.length - 1, s + 1)); };

  const submit = async () => {
    if (isAdmin) { alert("관리자 확인용 화면입니다. 실제 제출은 신청자 계정으로 진행해주세요."); return; }
    for (let i = 0; i < steps.length; i++) { const errs = validateStep(i); if (errs.length) { setStep(i); alert(`'${steps[i].title}' 단계를 확인해주세요.\n\n` + errs.join("\n")); return; } }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("로그인이 필요합니다. 다시 로그인해 주세요."); router.push("/login?next=/apply"); return; }
      const files = Object.values(filesByField).flat();
      const workLog = Object.values(workLogByField).flat();
      const formAnswers = {
        programId, programName,
        fields: allFields.filter((f) => ["shortText", "longText", "number", "date", "select", "agreement"].includes(f.type))
          .map((f) => ({ id: f.id, label: f.label, type: f.type, value: answers[f.id] || "" })),
      };
      const payload = {
        name: basicInfo.name, studentId: basicInfo.studentId, university: basicInfo.university, campus: basicInfo.campus,
        department: basicInfo.department, grade: basicInfo.grade, academicStatus: basicInfo.academicStatus,
        phone: basicInfo.phone, email: basicInfo.email, applicationDate: basicInfo.applicationDate,
        bankInfo: { bankName: basicInfo.bankName, accountNumber: basicInfo.accountNumber, accountHolder: basicInfo.accountHolder },
        applicationPhase: mode, applicationType: type,
        // programDetail(JSONB)에도 답변을 함께 저장 → form_answers 컬럼 미마이그레이션 환경에서도 보존
        programDetail: { programId, programName, costDetail: hasCost ? cost : undefined, workLog: workLog.length ? workLog : undefined, eventLocation: Object.values(eventLocByField)[0], formAnswers },
        files,
        privacyConsent: consent.privacy, truthConsent: consent.truth, accountConsent: consent.account,
        signature,
        accountMismatch: isPre || !hasAccount ? false : basicInfo.name.replace(/\s/g, "") !== basicInfo.accountHolder.replace(/\s/g, ""),
        requestAmount, calculatedAmount: requestAmount, formAnswers,
      };
      const row = toRow(payload, user.id);
      let { data, error } = await supabase.from("applications").insert(row).select("id,receipt_number").single();
      // form_answers 컬럼이 없으면(마이그레이션 전) 제외하고 재시도 — 답변은 programDetail에 보존됨
      if (error && /form_answers/i.test(error.message)) {
        const { form_answers, ...rest } = row;
        ({ data, error } = await supabase.from("applications").insert(rest).select("id,receipt_number").single());
      }
      if (error) { alert("신청 저장 중 오류가 발생했습니다.\n" + error.message); return; }
      try { await fetch("/api/drive-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.id }) }); } catch { /* ignore */ }
      router.push(`/apply/complete?receipt=${data.receipt_number}&date=${basicInfo.applicationDate}&type=${encodeURIComponent(APPLICATION_TYPE_LABELS[type])}&amount=${requestAmount}&phase=${mode}`);
    } catch {
      alert("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally { setSubmitting(false); }
  };

  const lenHint = (f: FormField) => {
    if (typeof f.minLen !== "number" && typeof f.maxLen !== "number") return null;
    const len = (answers[f.id] || "").length;
    const min = f.minLen || 0;
    const tooShort = min > 0 && len < min;
    const tooLong = !!f.maxLen && len > f.maxLen;
    const rule = [min > 0 ? `${min}자 이상` : "", f.maxLen ? `${f.maxLen}자 이하` : ""].filter(Boolean).join(" · ");
    return (
      <div className={`mt-1 text-[11px] flex justify-between ${tooShort || tooLong ? "text-red-500" : "text-gray-400"}`}>
        <span>{rule}</span>
        <span>{len}{f.maxLen ? ` / ${f.maxLen}` : ""}자</span>
      </div>
    );
  };

  const renderField = (f: FormField) => {
    const req = f.required ? <span className="text-red-500"> *</span> : null;
    const label = <label className="label">{f.label || "(제목 없음)"}{req}</label>;
    switch (f.type) {
      case "applicantInfo": return <BasicInfoSection key={f.id} values={basicInfo} onChange={setBasicInfo} hideAccount={true} />;
      case "account": {
        if (isPre) return null;
        const mismatch = !!basicInfo.accountHolder.trim() && !!basicInfo.name && basicInfo.name.replace(/\s/g, "") !== basicInfo.accountHolder.replace(/\s/g, "");
        return (
          <div key={f.id}>
            <label className="label">{f.label || "본인 명의 계좌 정보"}{req}</label>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">
              ※ 반드시 본인 명의 계좌로만 지급됩니다. 타인 명의 계좌로는 지급이 불가합니다.
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">은행명 <span className="text-red-500">*</span></label>
                <select className="input-field" value={basicInfo.bankName} onChange={(e) => setBasicInfo((b) => ({ ...b, bankName: e.target.value }))}>
                  <option value="">선택</option>
                  {BANKS.map((bk) => <option key={bk}>{bk}</option>)}
                </select>
              </div>
              <div>
                <label className="label">계좌번호 <span className="text-red-500">*</span></label>
                <input className="input-field" value={basicInfo.accountNumber} onChange={(e) => setBasicInfo((b) => ({ ...b, accountNumber: e.target.value }))} placeholder="000000-00-000000" />
              </div>
              <div>
                <label className="label">예금주 <span className="text-red-500">*</span></label>
                <input className="input-field" value={basicInfo.accountHolder} onChange={(e) => setBasicInfo((b) => ({ ...b, accountHolder: e.target.value }))} placeholder="홍길동" />
              </div>
            </div>
            {mismatch && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl p-3 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <span>⚠️ <strong>예금주({basicInfo.accountHolder})와 신청자 성명({basicInfo.name})이 다릅니다.</strong> 본인 명의 계좌로만 지급됩니다. 제출하는 통장 사본의 예금주가 본인과 동일한지 다시 확인해주세요.</span>
              </div>
            )}
          </div>
        );
      }
      case "privacyConsent": return <ConsentChecklist key={f.id} values={consent} onChange={setConsent} isPre={isPre || !hasAccount} />;
      case "signature": return <ConsentSection key={f.id} signature={signature} onSignatureChange={setSignature} isPre={isPre} summary={summary} />;
      case "file": return <div key={f.id}>{label}<FileField label={f.label || "파일"} files={filesByField[f.id] || []} onChange={(fs) => setFilesByField((m) => ({ ...m, [f.id]: fs }))} /></div>;
      case "workLog": return <div key={f.id}>{label}<WorkLogField field={f} entries={workLogByField[f.id] || []} onChange={(en) => setWorkLogByField((m) => ({ ...m, [f.id]: en }))} group={group} isPre={isPre} /></div>;
      case "eventLocation": return <div key={f.id}><EventLocationSection title={f.label || "활동 장소"} values={eventLocByField[f.id] || { scope: "domestic" }} onChange={(v) => setEventLocByField((m) => ({ ...m, [f.id]: v }))} /></div>;
      case "registration": return <div key={f.id}>{label}<div className="grid sm:grid-cols-2 gap-2 items-end"><div><span className="text-[11px] text-gray-500">등록비용(원)</span><input className="input-field" inputMode="numeric" value={cost.registrationFee || ""} onChange={(e) => setCost((c) => ({ ...c, registrationFee: Number(e.target.value.replace(/[^\d]/g, "")) || 0 }))} placeholder="0" /></div></div></div>;
      case "transport": case "lodging": return null; // 비용은 등록비 항목에서 통합 처리(간이) — 필요 시 확장
      case "shortText": return <div key={f.id}>{label}<input className="input-field" value={answers[f.id] || ""} maxLength={f.maxLen || undefined} onChange={(e) => setAns(f.id, e.target.value)} placeholder={f.placeholder || ""} />{lenHint(f)}</div>;
      case "number": return <div key={f.id}>{label}<input className="input-field" inputMode="numeric" value={answers[f.id] || ""} onChange={(e) => setAns(f.id, e.target.value.replace(/[^\d]/g, ""))} placeholder={f.placeholder || "0"} /></div>;
      case "longText": return <div key={f.id}>{label}<textarea className="input-field h-24 resize-none" value={answers[f.id] || ""} maxLength={f.maxLen || undefined} onChange={(e) => setAns(f.id, e.target.value)} placeholder={f.placeholder || ""} />{lenHint(f)}</div>;
      case "date": {
        const v = answers[f.id] || "";
        if (f.range) { const [a = "", b = ""] = v.split("~"); return <div key={f.id}>{label}<div className="flex items-center gap-2"><input type="date" className="input-field" value={a} onChange={(e) => setAns(f.id, `${e.target.value}~${b}`)} /><span className="text-gray-400">~</span><input type="date" className="input-field" value={b} onChange={(e) => setAns(f.id, `${a}~${e.target.value}`)} /></div></div>; }
        return <div key={f.id}>{label}<input type="date" className="input-field" value={v} onChange={(e) => setAns(f.id, e.target.value)} /></div>;
      }
      case "select": return <div key={f.id}>{label}<select className="input-field" value={answers[f.id] || ""} onChange={(e) => setAns(f.id, e.target.value)}><option value="">선택하세요</option>{(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
      case "agreement": return (
        <div key={f.id}>{label}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="text-gray-600 whitespace-pre-line mb-2">{f.text || ""}</p>
            <label className="flex items-center gap-2 text-gray-700"><input type="checkbox" checked={answers[f.id] === "동의"} onChange={(e) => setAns(f.id, e.target.checked ? "동의" : "")} /> 위 내용에 동의합니다</label>
          </div>
        </div>
      );
      default: return null;
    }
  };

  const cur = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <div className="text-sm text-primary-600 font-medium">{APPLICATION_PHASE_LABELS[mode]} · {APPLICATION_TYPE_LABELS[type]}</div>
          <h1 className="text-xl font-bold text-gray-800">{programName || "신청서 작성"}</h1>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-xl px-4 py-2.5 text-sm font-medium text-indigo-800 bg-indigo-50 border border-indigo-200">
          관리자 확인용 — 신청자가 보는 폼 그대로입니다. 입력·제약 없이 모든 단계를 확인할 수 있으며, 실제 제출은 되지 않습니다.
        </div>
      )}

      {/* 단계 진행 표시 */}
      <div className="flex gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <div key={s.id} className={`flex-1 min-w-[60px] h-1.5 rounded-full ${i <= step ? "bg-indigo-500" : "bg-gray-200"}`} title={s.title} />
        ))}
      </div>
      <p className="text-xs text-gray-400">단계 {step + 1} / {steps.length} · {cur?.title}</p>

      {cur && (
        <div className="card space-y-4">
          <h2 className="section-title mb-0">{cur.title}</h2>
          {cur.fields.length === 0 ? <p className="text-sm text-gray-400">이 단계에 항목이 없습니다.</p> : cur.fields.map(renderField)}
        </div>
      )}

      {!isPre && (workLogAmount > 0 || costAmount > 0) && (
        <div className="card flex items-center justify-between">
          <span className="font-semibold text-gray-700">신청 금액</span>
          <span className="text-xl font-bold text-primary-700">{requestAmount.toLocaleString()}원</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button onClick={() => step === 0 ? onBack() : setStep((s) => s - 1)} className="btn-secondary flex items-center gap-1.5"><ChevronLeft className="w-4 h-4" /> {step === 0 ? "이전" : "이전 단계"}</button>
        {isLast ? (
          <button onClick={submit} disabled={submitting} className="btn-primary flex items-center gap-1.5"><Check className="w-4 h-4" /> {submitting ? "제출 중..." : (schema.submitLabel || (isPre ? "지원신청 제출" : "신청 제출"))}</button>
        ) : (
          <button onClick={next} className="btn-primary flex items-center gap-1.5">다음 단계 <ChevronRight className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  );
}
