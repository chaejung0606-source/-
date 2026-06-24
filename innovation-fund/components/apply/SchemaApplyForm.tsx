"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ApplicationType, ApplicationPhase, UploadedFile, WorkLogEntry, CostDetail } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, calcSupportTotal } from "@/types";
import type { FormSchema, FormField } from "@/lib/form-schema";
import { workLogGroupOfGrade } from "@/lib/form-schema";
import { currentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toRow } from "@/lib/app-mapper";
import { validateBasicFormat, formatPhone } from "@/lib/validation";
import BasicInfoSection from "./BasicInfoSection";
import ConsentChecklist from "./ConsentChecklist";
import ConsentSection from "./ConsentSection";
import FileUploadSection from "./FileUploadSection";
import CostSection from "./CostSection";
import WorkLogEditor from "./WorkLogEditor";

interface Props {
  schema: FormSchema;
  type: ApplicationType;
  mode: ApplicationPhase;
  programId: string;
  programName: string;
  onBack: () => void;
}

export default function SchemaApplyForm({ schema, type, mode, programId, programName, onBack }: Props) {
  const router = useRouter();
  const isPre = mode === "pre";
  const [submitting, setSubmitting] = useState(false);

  const [basicInfo, setBasicInfo] = useState({
    name: "", studentId: "", university: "강원대학교", campus: "춘천", department: "", grade: "1",
    academicStatus: "재학", phone: "", email: "", applicationDate: new Date().toISOString().split("T")[0],
    bankName: "", accountNumber: "", accountHolder: "", gradCompletion: "재학", completedYears: "", currentSemester: "", privacyAgree: "",
  });
  const [consent, setConsent] = useState({ privacy: false, truth: false, account: false });
  const [signature, setSignature] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);
  const [cost, setCost] = useState<CostDetail>({ registrationFee: 0, transports: [] });
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

  const allFields = useMemo(() => schema.steps.flatMap((s) => s.fields), [schema]);
  const hasAccount = allFields.some((f) => f.type === "account");
  const hasCost = allFields.some((f) => ["registration", "transport", "lodging"].includes(f.type));
  const workLogField = allFields.find((f) => f.type === "workLog");

  // 근무상황부 금액 = 합계 시간(상한 적용) × 단가(고정/구분별)
  const workLogAmount = useMemo(() => {
    if (!workLogField) return 0;
    const group = workLogGroupOfGrade(basicInfo.grade);
    const maxH = workLogField.unitPriceMode === "byGrade" ? (workLogField.maxHoursByGrade?.[group] || 0) : (workLogField.maxHours || 0);
    let hours = workLog.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    if (maxH > 0) hours = Math.min(hours, maxH);
    const unit = workLogField.unitPriceMode === "byGrade" ? (workLogField.unitPriceByGrade?.[group] || 0) : (workLogField.unitPrice || 0);
    return Math.round(hours * unit);
  }, [workLogField, workLog, basicInfo.grade]);

  const costAmount = hasCost ? calcSupportTotal(cost) : 0;
  const requestAmount = isPre ? 0 : workLogAmount + costAmount;

  const setAns = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  const customField = (f: FormField) => {
    const label = <label className="label">{f.label || "(제목 없음)"}{f.required && <span className="text-red-500"> *</span>}</label>;
    const v = answers[f.id] || "";
    switch (f.type) {
      case "shortText": return <div key={f.id}>{label}<input className="input-field" value={v} onChange={(e) => setAns(f.id, e.target.value)} placeholder={f.placeholder || ""} /></div>;
      case "number": return <div key={f.id}>{label}<input className="input-field" inputMode="numeric" value={v} onChange={(e) => setAns(f.id, e.target.value.replace(/[^\d]/g, ""))} placeholder={f.placeholder || "0"} /></div>;
      case "longText": return <div key={f.id}>{label}<textarea className="input-field h-24 resize-none" value={v} onChange={(e) => setAns(f.id, e.target.value)} placeholder={f.placeholder || ""} /></div>;
      case "date":
        if (f.range) {
          const [a = "", b = ""] = v.split("~");
          return <div key={f.id}>{label}<div className="flex items-center gap-2"><input type="date" className="input-field" value={a} onChange={(e) => setAns(f.id, `${e.target.value}~${b}`)} /><span className="text-gray-400">~</span><input type="date" className="input-field" value={b} onChange={(e) => setAns(f.id, `${a}~${e.target.value}`)} /></div></div>;
        }
        return <div key={f.id}>{label}<input type="date" className="input-field" value={v} onChange={(e) => setAns(f.id, e.target.value)} /></div>;
      case "select": return <div key={f.id}>{label}<select className="input-field" value={v} onChange={(e) => setAns(f.id, e.target.value)}><option value="">선택하세요</option>{(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
      case "agreement": return (
        <div key={f.id}>{label}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="text-gray-600 whitespace-pre-line mb-2">{f.text || ""}</p>
            <label className="flex items-center gap-2 text-gray-700"><input type="checkbox" checked={v === "동의"} onChange={(e) => setAns(f.id, e.target.checked ? "동의" : "")} /> 위 내용에 동의합니다</label>
          </div>
        </div>
      );
      default: return null;
    }
  };

  const summary = { name: basicInfo.name, type: APPLICATION_TYPE_LABELS[type], amount: requestAmount, calculatedAmount: requestAmount };

  const submit = async () => {
    // 표준 동의/서명 검증
    if (allFields.some((f) => f.type === "privacyConsent")) {
      if (!consent.privacy || !consent.truth || (!isPre && hasAccount && !consent.account)) { alert("개인정보 수집·이용 및 신청 동의 항목에 모두 체크해주세요."); return; }
    }
    if (allFields.some((f) => f.type === "signature") && !signature) { alert("서명을 완료하거나 서명 이미지를 업로드해주세요."); return; }
    // 기본정보 형식 검증
    if (allFields.some((f) => f.type === "applicantInfo")) {
      let errs = validateBasicFormat({ name: basicInfo.name, studentId: basicInfo.studentId, department: basicInfo.department, phone: basicInfo.phone, email: basicInfo.email, accountNumber: basicInfo.accountNumber, applicationDate: basicInfo.applicationDate });
      if (isPre || !hasAccount) errs = errs.filter((e) => !e.includes("계좌번호"));
      if (errs.length) { alert("작성 예시와 동일한 형식으로 정확히 입력해주세요.\n\n" + errs.join("\n")); return; }
    }
    // 필수 커스텀 항목 검증
    for (const f of allFields) {
      if (!f.required) continue;
      if (["shortText", "longText", "number", "date", "select"].includes(f.type) && !(answers[f.id] || "").replace("~", "").trim()) { alert(`[${f.label || "필수 항목"}] 항목을 작성해주세요.`); return; }
      if (f.type === "agreement" && answers[f.id] !== "동의") { alert(`[${f.label || "서약"}] 항목에 동의해주세요.`); return; }
      if (f.type === "file" && files.length === 0) { alert(`[${f.label || "서류"}] 항목에 파일을 업로드해주세요.`); return; }
      if (f.type === "workLog" && workLog.length === 0) { alert(`[${f.label || "근무상황부"}] 근무 기록을 1건 이상 등록해주세요.`); return; }
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("로그인이 필요합니다. 다시 로그인해 주세요."); router.push("/login?next=/apply"); return; }
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
        programDetail: { programId, programName, costDetail: hasCost ? cost : undefined, workLog: workLogField ? workLog : undefined },
        files,
        privacyConsent: consent.privacy, truthConsent: consent.truth, accountConsent: consent.account,
        signature,
        accountMismatch: isPre || !hasAccount ? false : basicInfo.name.replace(/\s/g, "") !== basicInfo.accountHolder.replace(/\s/g, ""),
        requestAmount, calculatedAmount: requestAmount,
        formAnswers,
      };
      const { data, error } = await supabase.from("applications").insert(toRow(payload, user.id)).select("id,receipt_number").single();
      if (error) { alert("신청 저장 중 오류가 발생했습니다.\n" + error.message); return; }
      try { await fetch("/api/drive-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.id }) }); } catch { /* ignore */ }
      router.push(`/apply/complete?receipt=${data.receipt_number}&date=${basicInfo.applicationDate}&type=${encodeURIComponent(APPLICATION_TYPE_LABELS[type])}&amount=${requestAmount}&phase=${mode}`);
    } catch {
      alert("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally { setSubmitting(false); }
  };

  let basicRendered = false, costRendered = false;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <div className="text-sm text-primary-600 font-medium">{APPLICATION_PHASE_LABELS[mode]} · {APPLICATION_TYPE_LABELS[type]}</div>
          <h1 className="text-xl font-bold text-gray-800">{programName || "신청서 작성"}</h1>
        </div>
      </div>

      {schema.steps.map((s) => (
        <div key={s.id} className="card space-y-4">
          <h2 className="section-title mb-0">{s.title}</h2>
          {s.fields.map((f) => {
            if (f.type === "applicantInfo" || f.type === "account") {
              if (basicRendered) return null; basicRendered = true;
              return <BasicInfoSection key={f.id} values={basicInfo} onChange={setBasicInfo} hideAccount={!hasAccount || isPre} />;
            }
            if (f.type === "privacyConsent") return <ConsentChecklist key={f.id} values={consent} onChange={setConsent} isPre={isPre || !hasAccount} />;
            if (f.type === "signature") return <ConsentSection key={f.id} signature={signature} onSignatureChange={setSignature} isPre={isPre} summary={summary} />;
            if (f.type === "file") return <FileUploadSection key={f.id} files={files} onChange={setFiles} applicationType={type} />;
            if (f.type === "workLog") return (
              <div key={f.id}>
                <label className="label">{f.label || "근무상황부"}{f.required && <span className="text-red-500"> *</span>}</label>
                <WorkLogEditor entries={workLog} onChange={setWorkLog} />
                {!isPre && (workLogField?.unitPrice || workLogField?.unitPriceMode === "byGrade") && (
                  <p className="text-sm text-gray-600 mt-2">합계 지급 예정액: <strong className="text-primary-700">{workLogAmount.toLocaleString()}원</strong></p>
                )}
              </div>
            );
            if (["registration", "transport", "lodging"].includes(f.type)) {
              if (costRendered) return null; costRendered = true;
              return <CostSection key={f.id} value={cost} onChange={setCost} />;
            }
            return customField(f);
          })}
        </div>
      ))}

      {!isPre && (workLogField || hasCost) && (
        <div className="card flex items-center justify-between">
          <span className="font-semibold text-gray-700">신청 금액</span>
          <span className="text-xl font-bold text-primary-700">{requestAmount.toLocaleString()}원</span>
        </div>
      )}

      <button onClick={submit} disabled={submitting} className="btn-primary w-full">
        {submitting ? "제출 중..." : (schema.submitLabel || (isPre ? "지원신청 제출" : "신청 제출"))}
      </button>
    </div>
  );
}
