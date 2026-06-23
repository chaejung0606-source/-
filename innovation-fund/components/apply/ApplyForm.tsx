"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ApplicationType, ApplicationPhase, UploadedFile, WorkLogEntry, EventLocation, ActivityKind, PaperDetail, CostDetail, ReportEntry, Application, ClassTime } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS, calcSupportTotal } from "@/types";
import {
  calcContestAmount, calcCertAmount, calcGradeAmount, calcStaffAmount,
} from "@/lib/amount-calculator";
import { getProgramById, validateMD, type GradeValue } from "@/lib/md-courses";
import { currentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toRow } from "@/lib/app-mapper";
import { validateBasicFormat, formatPhone } from "@/lib/validation";
import BasicInfoSection from "./BasicInfoSection";
import ProgramDetailSection from "./ProgramDetailSection";
import StaffDetailSection from "./StaffDetailSection";
import LaborDetailSection from "./LaborDetailSection";
import ActivityDetailSection from "./ActivityDetailSection";
import CostSection from "./CostSection";
import ReportSection from "./ReportSection";
import GradeDetailSection from "./GradeDetailSection";
import ContestDetailSection from "./ContestDetailSection";
import CertificateDetailSection from "./CertificateDetailSection";
import FileUploadSection from "./FileUploadSection";
import ConsentSection from "./ConsentSection";
import ConsentChecklist from "./ConsentChecklist";

interface Props {
  applicationType: ApplicationType;
  mode?: ApplicationPhase;
  prefill?: Application | null;  // 이전 지원신청 내역 → 중복 항목 자동입력
  draft?: Application | null;    // 임시저장 이어쓰기 → 전체 복원
  onBack: () => void;
}

export default function ApplyForm({ applicationType, mode = "fund", prefill = null, draft = null, onBack }: Props) {
  const router = useRouter();
  const isPre = mode === "pre";  // 지원신청(활동 전): 계좌·비용·금액 제외
  const [step, setStep] = useState(draft?.draftStep || 1);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(draft?.id || null);
  const [draftSavedAt, setDraftSavedAt] = useState<string>("");

  // 기본 정보
  const [basicInfo, setBasicInfo] = useState({
    name: "", studentId: "", university: "강원대학교", department: "", grade: "1",
    academicStatus: "재학", phone: "", email: "", applicationDate: new Date().toISOString().split("T")[0],
    bankName: "", accountNumber: "", accountHolder: "",
    gradCompletion: "재학", completedYears: "", currentSemester: "",
    privacyAgree: "",
  });

  // 유형별 상세
  const [programDetail, setProgramDetail] = useState({
    programId: "", programName: "", programType: "", startDate: "", endDate: "", participationPeriod: "", participationContent: "",
    supervisorName: "", requestAmount: 0,
  });
  const [staffDetail, setStaffDetail] = useState({
    programName: "", workPeriod: "", workDates: "", totalHours: 0,
    studentType: "undergraduate" as "undergraduate" | "graduate", taskDescription: "",
    workLog: [] as WorkLogEntry[],
  });

  // 근로장학금 상세
  const [laborDetail, setLaborDetail] = useState({
    programId: "", programName: "", role: "", workPeriod: "", totalHours: 0,
    studentType: "undergraduate" as "undergraduate" | "graduate",
    workLog: [] as WorkLogEntry[], workDetail: "", supervisorName: "",
  });
  // 학생활동지원비 상세
  const [activityDetail, setActivityDetail] = useState({
    programId: "", activityKind: "conference" as ActivityKind,
    activityName: "", activityType: "", activityPeriod: "",
    activityContent: "", requestAmount: 0,
    eventLocation: undefined as EventLocation | undefined,
    paper: {
      paperTitle: "", journalName: "", issn: "", volumeIssue: "",
      publishDate: "", publisher: "", requestFee: 0,
    } as PaperDetail,
  });

  // 비용 입력 (등록비·교통비 다중·숙박비) — program/staff/activity 공통
  const [costDetail, setCostDetail] = useState<CostDetail>({
    registrationFee: 0,
    transports: [],
    lodging: { usage: "personal", roomAmount: 0, personalAmount: 0 },
  });

  // 프로그램별 보고서 입력값 (관리자가 설정한 항목)
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const selectedProgramId =
    applicationType === "program" ? programDetail.programId :
    applicationType === "labor" ? laborDetail.programId :
    applicationType === "activity" ? activityDetail.programId :
    undefined;

  // 근로장학금: 마이페이지에서 입력한 수강 시간표 (수업시간엔 근로 불가)
  const [classTimes, setClassTimes] = useState<ClassTime[]>([]);

  // 로그인한 신청자 정보 자동 채움
  useEffect(() => {
    (async () => {
      const u = await currentUser();
      if (u) {
        setClassTimes(u.timetable || []);
        setBasicInfo((b) => ({
          ...b,
          name: b.name || u.name,
          studentId: b.studentId || u.studentId,
          department: b.department || u.department,
          phone: b.phone || formatPhone(u.phone),
          email: b.email || u.email,
          university: u.university || b.university,
          bankName: b.bankName || u.bankName,
          accountNumber: b.accountNumber || u.accountNumber,
          accountHolder: b.accountHolder || u.accountHolder,
        }));
      }
    })();
  }, []);
  // 이전 지원신청 내역에서 중복 항목 자동입력 (금액·계좌·비용 등 지원금 전용 항목 제외)
  useEffect(() => {
    if (!prefill) return;
    setBasicInfo((b) => ({
      ...b,
      name: prefill.name || b.name,
      studentId: prefill.studentId || b.studentId,
      university: prefill.university || b.university,
      department: prefill.department || b.department,
      grade: prefill.grade || b.grade,
      academicStatus: prefill.academicStatus || b.academicStatus,
      gradCompletion: prefill.gradCompletion || b.gradCompletion,
      completedYears: prefill.completedYears || b.completedYears,
      currentSemester: prefill.currentSemester || b.currentSemester,
      phone: prefill.phone || b.phone,
      email: prefill.email || b.email,
    }));
    if (applicationType === "program" && prefill.programDetail) {
      const d = prefill.programDetail;
      setProgramDetail((p) => ({
        ...p,
        programId: d.programId || "", programName: d.programName || "", programType: d.programType || "",
        startDate: d.startDate || "", endDate: d.endDate || "", participationPeriod: d.participationPeriod || "",
        participationContent: d.participationContent || "", supervisorName: d.supervisorName || "",
        eventLocation: d.eventLocation,
      }));
      if (d.reportEntries) setReportEntries(d.reportEntries);
    }
    if (applicationType === "labor" && prefill.laborDetail) {
      const d = prefill.laborDetail;
      setLaborDetail((p) => ({
        ...p,
        programId: d.programId || "", programName: d.programName || "", role: d.role || "",
        workPeriod: d.workPeriod || "", studentType: d.studentType || "undergraduate",
        workDetail: d.workDetail || "", supervisorName: d.supervisorName || "",
      }));
      if (d.reportEntries) setReportEntries(d.reportEntries);
    }
    if (applicationType === "activity" && prefill.activityDetail) {
      const d = prefill.activityDetail;
      setActivityDetail((p) => ({
        ...p,
        programId: d.programId || "", activityName: d.activityName || "", activityType: d.activityType || "",
        activityPeriod: d.activityPeriod || "", activityContent: d.activityContent || "",
        eventLocation: d.eventLocation, activityKind: d.activityKind || "conference",
      }));
      if (d.reportEntries) setReportEntries(d.reportEntries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, applicationType]);

  const [gradeDetail, setGradeDetail] = useState<{
    subType: "microdegree" | "minor" | "double";
    courseName: string; credits: number; gpa: number; microDegreeCompleted: boolean;
    mdDepartment: string; mdProgramId: string; mdProgramName: string;
    mdCourses: { name: string; grade: string; isBase: boolean }[];
    minorMajorName: string; minorMajorCredits: number;
    minorCourses: { name: string; credits: number; grade: string; mdProgramId?: string; excluded?: boolean }[];
    minorIsMirae: boolean; minorMdCompleted: boolean;
    minorMdName: string;
  }>({
    subType: "microdegree",
    courseName: "", credits: 0, gpa: 0, microDegreeCompleted: false,
    mdDepartment: "", mdProgramId: "", mdProgramName: "", mdCourses: [],
    minorMajorName: "", minorMajorCredits: 0, minorCourses: [],
    minorIsMirae: false, minorMdCompleted: false, minorMdName: "",
  });
  const [contestDetail, setContestDetail] = useState({
    contestName: "", contestTheme: "", relevanceDescription: "", organizer: "",
    scale: "A" as "A" | "B", isTeam: false,
    awardLevel: "grand" as "grand" | "silver" | "bronze" | "participation",
    awardDate: "", hasMonetaryPrize: false,
  });
  const [certDetail, setCertDetail] = useState({
    certName: "", issuingOrg: "", acquisitionDate: "", certField: "",
    difficulty: "mid" as "high" | "mid" | "low" | "review", isMirae: false,
  });

  // 파일
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // 동의
  const [consent, setConsent] = useState({ privacy: false, truth: false, account: false });

  // 학생 서명 (base64)
  const [signature, setSignature] = useState<string>("");

  // 임시저장 이어쓰기: 전체 상태 복원
  useEffect(() => {
    if (!draft) return;
    setBasicInfo((b) => ({
      ...b,
      name: draft.name || b.name, studentId: draft.studentId || b.studentId, university: draft.university || b.university,
      department: draft.department || b.department, grade: draft.grade || b.grade, academicStatus: draft.academicStatus || b.academicStatus,
      gradCompletion: draft.gradCompletion || b.gradCompletion, completedYears: draft.completedYears || b.completedYears, currentSemester: draft.currentSemester || b.currentSemester,
      phone: draft.phone || b.phone, email: draft.email || b.email, applicationDate: draft.applicationDate || b.applicationDate,
      bankName: draft.bankInfo?.bankName || b.bankName, accountNumber: draft.bankInfo?.accountNumber || b.accountNumber, accountHolder: draft.bankInfo?.accountHolder || b.accountHolder,
    }));
    setConsent({ privacy: !!draft.privacyConsent, truth: !!draft.truthConsent, account: !!draft.accountConsent });
    if (draft.signature) setSignature(draft.signature);
    if (draft.files) setFiles(draft.files);
    const pd = draft.programDetail as any, ld = draft.laborDetail as any, ad = draft.activityDetail as any, sd = draft.staffDetail as any;
    if (pd) { setProgramDetail((p) => ({ ...p, ...pd })); if (pd.costDetail) setCostDetail(pd.costDetail); if (pd.reportEntries) setReportEntries(pd.reportEntries); }
    if (sd) { setStaffDetail((p) => ({ ...p, ...sd })); if (sd.costDetail) setCostDetail(sd.costDetail); }
    if (ld) { setLaborDetail((p) => ({ ...p, ...ld })); if (ld.reportEntries) setReportEntries(ld.reportEntries); }
    if (ad) { setActivityDetail((p) => ({ ...p, ...ad })); if (ad.costDetail) setCostDetail(ad.costDetail); if (ad.reportEntries) setReportEntries(ad.reportEntries); }
    if (draft.gradeDetail) setGradeDetail((p) => ({ ...p, ...(draft.gradeDetail as any) }));
    if (draft.contestDetail) setContestDetail((p) => ({ ...p, ...(draft.contestDetail as any) }));
    if (draft.certificateDetail) setCertDetail((p) => ({ ...p, ...(draft.certificateDetail as any) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // 계산 금액 (지원신청은 활동 전이므로 금액 없음)
  const getCalculatedAmount = (): number => {
    if (isPre) return 0;
    if (applicationType === "staff") return calcStaffAmount(staffDetail.totalHours, staffDetail.studentType);
    if (applicationType === "labor") return calcStaffAmount(Math.min(laborDetail.totalHours, 40), laborDetail.studentType); // 월 40시간 이내
    if (applicationType === "grade") return calcGradeAmount(gradeDetail.subType);
    if (applicationType === "contest") return calcContestAmount(contestDetail.scale, contestDetail.awardLevel, contestDetail.isTeam);
    if (applicationType === "certificate") return calcCertAmount(certDetail.difficulty);
    if (applicationType === "activity") return activityDetail.requestAmount;
    return calcSupportTotal(costDetail);
  };

  const getRequestAmount = (): number => {
    if (isPre) return 0;
    if (applicationType === "program") return calcSupportTotal(costDetail);
    if (applicationType === "activity") return activityDetail.requestAmount;
    return getCalculatedAmount();
  };

  // 제출/임시저장 공통 payload 생성
  const buildPayload = (asDraft: boolean) => ({
    name: basicInfo.name, studentId: basicInfo.studentId, university: basicInfo.university,
    department: basicInfo.department, grade: basicInfo.grade, academicStatus: basicInfo.academicStatus,
    gradCompletion: basicInfo.gradCompletion, completedYears: basicInfo.completedYears, currentSemester: basicInfo.currentSemester,
    phone: basicInfo.phone, email: basicInfo.email, applicationDate: basicInfo.applicationDate,
    bankInfo: { bankName: basicInfo.bankName, accountNumber: basicInfo.accountNumber, accountHolder: basicInfo.accountHolder },
    applicationPhase: mode,
    applicationType,
    programDetail: applicationType === "program" ? { ...programDetail, requestAmount: calcSupportTotal(costDetail), costDetail, reportEntries } : undefined,
    staffDetail: applicationType === "staff" ? { ...staffDetail, calculatedAmount: getCalculatedAmount(), costDetail } : undefined,
    laborDetail: applicationType === "labor" ? { ...laborDetail, calculatedAmount: getCalculatedAmount(), reportEntries } : undefined,
    activityDetail: applicationType === "activity" ? { ...activityDetail, costDetail, reportEntries } : undefined,
    gradeDetail: applicationType === "grade" ? { ...gradeDetail, calculatedAmount: getCalculatedAmount() } : undefined,
    contestDetail: applicationType === "contest" ? { ...contestDetail, calculatedAmount: getCalculatedAmount() } : undefined,
    certificateDetail: applicationType === "certificate" ? { ...certDetail, calculatedAmount: getCalculatedAmount() } : undefined,
    files,
    privacyConsent: consent.privacy,
    truthConsent: consent.truth,
    accountConsent: consent.account,
    signature,
    accountMismatch: isPre ? false : basicInfo.name.replace(/\s/g, "") !== basicInfo.accountHolder.replace(/\s/g, ""),
    requestAmount: getRequestAmount(),
    calculatedAmount: getCalculatedAmount(),
    isDraft: asDraft,
    draftStep: asDraft ? step : undefined,
  });

  // 임시저장 (검증 없이 현재까지 작성 내용 저장)
  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const { data: { user }, } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!user || !session) { alert("로그인이 필요합니다."); router.push("/login?next=/apply"); return; }
      const row = toRow(buildPayload(true), user.id);
      const res = await fetch("/api/applications/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: draftId, row, finalize: false }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (j.ok) { setDraftId(j.id); setDraftSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })); }
      else alert("임시저장 실패: " + (j.error || "알 수 없는 오류"));
    } finally {
      setSavingDraft(false);
    }
  };

  // 2단계(신청 내용) 필수·형식 검증
  const validateStep2 = (): string[] => {
    const e: string[] = [];
    if (applicationType === "program") {
      if (!programDetail.programName) e.push("• 신청 가능한 프로그램을 선택해주세요.");
    }
    if (applicationType === "staff") {
      if (!staffDetail.programName) e.push("• 신청 가능한 프로그램을 선택해주세요.");
      if (staffDetail.workLog.length === 0) e.push("• 근무상황부에 근무 기록을 1건 이상 등록해주세요.");
    }
    if (applicationType === "labor") {
      if (!laborDetail.programId) e.push("• 신청 가능한 근로 프로그램을 선택해주세요.");
      if (!laborDetail.supervisorName.trim()) e.push("• 확인자(지도교수·담당자)를 입력해주세요.");
      if (laborDetail.workLog.length === 0) e.push("• 근무상황부에 근무 기록을 1건 이상 등록해주세요.");
    }
    if (applicationType === "activity") {
      if (!activityDetail.activityName.trim()) e.push("• 활동명을 입력해주세요.");
      if (!(activityDetail.requestAmount > 0)) e.push("• 신청 금액을 입력해주세요.");
    }
    if (applicationType === "certificate") {
      if (!certDetail.certName.trim()) e.push("• 자격증명을 입력해주세요.");
      if (certDetail.acquisitionDate && !/^\d{4}-\d{2}-\d{2}$/.test(certDetail.acquisitionDate)) e.push("• 취득일은 YYYY-MM-DD 형식으로 입력해주세요.");
    }
    if (applicationType === "contest") {
      if (!contestDetail.contestName.trim()) e.push("• 대회명을 입력해주세요.");
    }
    return e;
  };

  const handleSubmit = async () => {
    if (!consent.privacy || !consent.truth || (!isPre && !consent.account)) {
      alert("모든 동의 항목에 체크해주세요.");
      return;
    }
    if (!signature) {
      alert("신청인 서명 이미지를 업로드해주세요. (필수)");
      return;
    }
    // 마이크로디그리 이수조건 검증
    if (applicationType === "grade" && gradeDetail.subType === "microdegree") {
      const program = gradeDetail.mdProgramId ? getProgramById(gradeDetail.mdProgramId) : undefined;
      if (!program) {
        alert("마이크로디그리 학과와 과정을 선택해주세요.");
        return;
      }
      const v = validateMD(program, gradeDetail.mdCourses.map((c) => ({ ...c, grade: c.grade as GradeValue })));
      if (!v.ok) {
        alert("이수조건을 충족하지 않아 제출할 수 없습니다.\n\n" + v.reasons.join("\n"));
        return;
      }
    }
    // 부전공/복수전공 자격 검증
    if (applicationType === "grade" && (gradeDetail.subType === "minor" || gradeDetail.subType === "double")) {
      const reasons: string[] = [];
      const reqCredits = gradeDetail.subType === "minor" ? 21 : 36;
      const courses = gradeDetail.minorCourses || [];
      const netCredits = courses.reduce((s, c) => s + (Number(c.credits) || 0), 0)
        - courses.filter((c) => c.mdProgramId && c.excluded).reduce((s, c) => s + (Number(c.credits) || 0), 0);
      const hasMd = courses.some((c) => c.mdProgramId);
      if (!gradeDetail.minorMajorName) reasons.push("• 부전공/복수전공 전공명을 선택해야 합니다.");
      if (!gradeDetail.minorIsMirae) reasons.push("• 미래융합가상학과 이수(예정)자 확인이 필요합니다.");
      if (gradeDetail.gpa < 3.0) reasons.push("• 평점 평균이 3.0 이상이어야 합니다.");
      if (!hasMd) reasons.push("• 이수한 마이크로디그리(MD) 과정을 1개 이상 지정해야 합니다.");
      if (courses.length === 0) reasons.push("• 이수 교과목 내역을 입력해야 합니다.");
      else if (netCredits < reqCredits) reasons.push(`• MD 학점 불인정 제외 인정 학점이 ${reqCredits}학점 이상이어야 합니다. (현재 ${netCredits}학점)`);
      if (reasons.length > 0) {
        alert("지원 자격을 충족하지 않아 제출할 수 없습니다.\n\n" + reasons.join("\n"));
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("로그인이 필요합니다. 다시 로그인해 주세요.");
        router.push("/login?next=/apply");
        return;
      }
      const row = toRow(buildPayload(false), user.id);

      let inserted: { id: string; receipt_number: string };
      if (draftId) {
        // 임시저장 건을 최종 제출로 전환 (RLS상 서버 라우트로 update)
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/applications/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({ id: draftId, row, finalize: true }),
        });
        const j = await res.json().catch(() => ({ ok: false }));
        if (!j.ok) { alert("신청 제출 중 오류가 발생했습니다.\n" + (j.error || "")); return; }
        inserted = { id: j.id, receipt_number: j.receiptNumber };
      } else {
        const { data, error } = await supabase
          .from("applications")
          .insert(row)
          .select("id,receipt_number")
          .single();
        if (error) {
          alert("신청 저장 중 오류가 발생했습니다.\n" + error.message);
          return;
        }
        inserted = data;
      }

      // Google Drive 동기화 (비민감 정보만, 실패해도 신청은 정상 처리)
      try {
        await fetch("/api/drive-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: inserted.id }),
        });
      } catch { /* 동기화 실패는 무시 */ }

      router.push(
        `/apply/complete?receipt=${inserted.receipt_number}&date=${basicInfo.applicationDate}&type=${encodeURIComponent(APPLICATION_TYPE_LABELS[applicationType])}&amount=${getRequestAmount()}&phase=${mode}`
      );
    } catch (e) {
      alert("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="text-sm text-primary-600 font-medium">{APPLICATION_PHASE_LABELS[mode]} · {APPLICATION_TYPE_LABELS[applicationType]}</div>
          <h1 className="text-xl font-bold text-gray-800">{isPre ? "지원신청서 작성" : "지원금 신청서 작성"}</h1>
        </div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex gap-1">
        {["기본 정보", "신청 내용", "서류 업로드", "동의 및 제출"].map((s, i) => (
          <div key={i} className="flex-1 h-2 rounded-full" style={{ background: step > i ? "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)" : "rgba(255,255,255,0.5)" }} />
        ))}
      </div>

      {/* 1단계: 기본 정보 + 개인정보 동의(한 번에) */}
      {step === 1 && (
        <>
          <BasicInfoSection values={basicInfo} onChange={setBasicInfo} hideAccount={isPre} />
          <ConsentChecklist values={consent} onChange={setConsent} isPre={isPre} />
        </>
      )}

      {/* 2단계: 유형별 상세 */}
      {step === 2 && applicationType === "program" && (
        <ProgramDetailSection values={programDetail} onChange={setProgramDetail} preOnly={isPre} />
      )}
      {step === 2 && applicationType === "staff" && (
        <StaffDetailSection values={staffDetail} onChange={setStaffDetail} calculatedAmount={getCalculatedAmount()} />
      )}
      {step === 2 && applicationType === "grade" && (
        <GradeDetailSection values={gradeDetail} onChange={setGradeDetail} calculatedAmount={getCalculatedAmount()} />
      )}
      {step === 2 && applicationType === "contest" && (
        <ContestDetailSection values={contestDetail} onChange={setContestDetail} calculatedAmount={getCalculatedAmount()} />
      )}
      {step === 2 && applicationType === "certificate" && (
        <CertificateDetailSection values={certDetail} onChange={setCertDetail} calculatedAmount={getCalculatedAmount()} />
      )}
      {step === 2 && applicationType === "labor" && (
        <LaborDetailSection values={laborDetail} onChange={setLaborDetail} calculatedAmount={getCalculatedAmount()} preOnly={isPre} classTimes={classTimes} />
      )}
      {step === 2 && applicationType === "activity" && (
        <ActivityDetailSection values={activityDetail} onChange={setActivityDetail} preOnly={isPre} />
      )}
      {step === 2 && !isPre && (applicationType === "program" || applicationType === "staff" || applicationType === "activity") && (
        <CostSection value={costDetail} onChange={setCostDetail} />
      )}
      {step === 2 && (applicationType === "program" || applicationType === "labor" || applicationType === "activity") && (
        <ReportSection programId={selectedProgramId} value={reportEntries} onChange={setReportEntries} />
      )}

      {/* 3단계: 파일 업로드 */}
      {step === 3 && (
        <FileUploadSection files={files} onChange={setFiles} applicationType={applicationType} />
      )}

      {/* 4단계: 신청 내용 확인 + 서명 (동의는 1단계에서 완료) */}
      {step === 4 && (
        <ConsentSection
          signature={signature}
          onSignatureChange={setSignature}
          isPre={isPre}
          summary={{
            name: basicInfo.name,
            type: APPLICATION_TYPE_LABELS[applicationType],
            amount: getRequestAmount(),
            calculatedAmount: getCalculatedAmount(),
          }}
        />
      )}

      {/* 임시저장 안내 */}
      {draftSavedAt && (
        <p className="text-xs text-emerald-600 text-right -mb-2">임시저장됨 · {draftSavedAt} (마이페이지에서 이어서 작성할 수 있습니다)</p>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1">
            이전
          </button>
        )}
        <button onClick={saveDraft} disabled={savingDraft} className="btn-secondary flex-1 disabled:opacity-60">
          {savingDraft ? "저장 중..." : "임시저장"}
        </button>
        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 1) {
                let errs = validateBasicFormat({
                  name: basicInfo.name, studentId: basicInfo.studentId, department: basicInfo.department,
                  phone: basicInfo.phone, email: basicInfo.email,
                  accountNumber: basicInfo.accountNumber, applicationDate: basicInfo.applicationDate,
                });
                if (isPre) errs = errs.filter((e) => !e.includes("계좌번호"));
                if (!isPre && !basicInfo.bankName.trim()) errs.push("• 은행명을 입력해주세요.");
                if (!isPre && !basicInfo.accountHolder.trim()) errs.push("• 예금주를 입력해주세요.");
                if (!consent.privacy || !consent.truth || (!isPre && !consent.account)) errs.push("• 개인정보 수집·이용 및 신청 동의 항목에 모두 체크해야 합니다.");
                if (errs.length) { alert("작성 예시와 동일한 형식으로 정확히 입력해주세요.\n\n" + errs.join("\n")); return; }
              }
              if (step === 2) {
                const e2 = validateStep2();
                if (e2.length) { alert("신청 내용을 작성 예시와 동일하게 정확히 입력해주세요.\n\n" + e2.join("\n")); return; }
              }
              setStep(step + 1);
            }}
            className="btn-primary flex-1"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !consent.privacy || !consent.truth || (!isPre && !consent.account) || !signature}
            className="btn-primary flex-1"
          >
            {submitting ? "제출 중..." : "신청 제출"}
          </button>
        )}
      </div>
    </div>
  );
}
