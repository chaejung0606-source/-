"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ApplicationType, UploadedFile, WorkLogEntry, EventLocation, ActivityKind, PaperDetail, CostDetail } from "@/types";
import { APPLICATION_TYPE_LABELS, calcSupportTotal } from "@/types";
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
import GradeDetailSection from "./GradeDetailSection";
import ContestDetailSection from "./ContestDetailSection";
import CertificateDetailSection from "./CertificateDetailSection";
import FileUploadSection from "./FileUploadSection";
import ConsentSection from "./ConsentSection";

interface Props {
  applicationType: ApplicationType;
  onBack: () => void;
}

export default function ApplyForm({ applicationType, onBack }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

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
    programName: "", programType: "", startDate: "", endDate: "", participationPeriod: "", participationContent: "",
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

  // 로그인한 신청자 정보 자동 채움
  useEffect(() => {
    (async () => {
      const u = await currentUser();
      if (u) {
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

  // 계산 금액
  const getCalculatedAmount = (): number => {
    if (applicationType === "staff") return calcStaffAmount(staffDetail.totalHours, staffDetail.studentType);
    if (applicationType === "labor") return calcStaffAmount(Math.min(laborDetail.totalHours, 40), laborDetail.studentType); // 월 40시간 이내
    if (applicationType === "grade") return calcGradeAmount(gradeDetail.subType);
    if (applicationType === "contest") return calcContestAmount(contestDetail.scale, contestDetail.awardLevel, contestDetail.isTeam);
    if (applicationType === "certificate") return calcCertAmount(certDetail.difficulty);
    if (applicationType === "activity") return activityDetail.requestAmount;
    return calcSupportTotal(costDetail);
  };

  const getRequestAmount = (): number => {
    if (applicationType === "program") return calcSupportTotal(costDetail);
    if (applicationType === "activity") return activityDetail.requestAmount;
    return getCalculatedAmount();
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
    if (!consent.privacy || !consent.truth || !consent.account) {
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
      const payload = {
        name: basicInfo.name, studentId: basicInfo.studentId, university: basicInfo.university,
        department: basicInfo.department, grade: basicInfo.grade, academicStatus: basicInfo.academicStatus,
        gradCompletion: basicInfo.gradCompletion, completedYears: basicInfo.completedYears, currentSemester: basicInfo.currentSemester,
        phone: basicInfo.phone, email: basicInfo.email, applicationDate: basicInfo.applicationDate,
        bankInfo: { bankName: basicInfo.bankName, accountNumber: basicInfo.accountNumber, accountHolder: basicInfo.accountHolder },
        applicationType,
        programDetail: applicationType === "program" ? { ...programDetail, requestAmount: calcSupportTotal(costDetail), costDetail } : undefined,
        staffDetail: applicationType === "staff" ? { ...staffDetail, calculatedAmount: getCalculatedAmount(), costDetail } : undefined,
        laborDetail: applicationType === "labor" ? { ...laborDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        activityDetail: applicationType === "activity" ? { ...activityDetail, costDetail } : undefined,
        gradeDetail: applicationType === "grade" ? { ...gradeDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        contestDetail: applicationType === "contest" ? { ...contestDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        certificateDetail: applicationType === "certificate" ? { ...certDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        files,
        privacyConsent: consent.privacy,
        truthConsent: consent.truth,
        accountConsent: consent.account,
        signature,
        accountMismatch: basicInfo.name.replace(/\s/g, "") !== basicInfo.accountHolder.replace(/\s/g, ""),
        requestAmount: getRequestAmount(),
        calculatedAmount: getCalculatedAmount(),
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("로그인이 필요합니다. 다시 로그인해 주세요.");
        router.push("/login?next=/apply");
        return;
      }
      const { data: inserted, error } = await supabase
        .from("applications")
        .insert(toRow(payload, user.id))
        .select("id,receipt_number")
        .single();
      if (error) {
        alert("신청 저장 중 오류가 발생했습니다.\n" + error.message);
        return;
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
        `/apply/complete?receipt=${inserted.receipt_number}&date=${basicInfo.applicationDate}&type=${encodeURIComponent(APPLICATION_TYPE_LABELS[applicationType])}&amount=${getRequestAmount()}`
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
          <div className="text-sm text-primary-600 font-medium">{APPLICATION_TYPE_LABELS[applicationType]}</div>
          <h1 className="text-xl font-bold text-gray-800">지원금 신청서 작성</h1>
        </div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex gap-1">
        {["기본 정보", "신청 내용", "서류 업로드", "동의 및 제출"].map((s, i) => (
          <div key={i} className="flex-1 h-2 rounded-full" style={{ background: step > i ? "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)" : "rgba(255,255,255,0.5)" }} />
        ))}
      </div>

      {/* 1단계: 기본 정보 */}
      {step === 1 && (
        <BasicInfoSection values={basicInfo} onChange={setBasicInfo} />
      )}

      {/* 2단계: 유형별 상세 */}
      {step === 2 && applicationType === "program" && (
        <ProgramDetailSection values={programDetail} onChange={setProgramDetail} />
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
        <LaborDetailSection values={laborDetail} onChange={setLaborDetail} calculatedAmount={getCalculatedAmount()} />
      )}
      {step === 2 && applicationType === "activity" && (
        <ActivityDetailSection values={activityDetail} onChange={setActivityDetail} />
      )}
      {step === 2 && (applicationType === "program" || applicationType === "staff" || applicationType === "activity") && (
        <CostSection value={costDetail} onChange={setCostDetail} />
      )}

      {/* 3단계: 파일 업로드 */}
      {step === 3 && (
        <FileUploadSection files={files} onChange={setFiles} applicationType={applicationType} />
      )}

      {/* 4단계: 동의 */}
      {step === 4 && (
        <ConsentSection
          values={consent}
          onChange={setConsent}
          signature={signature}
          onSignatureChange={setSignature}
          summary={{
            name: basicInfo.name,
            type: APPLICATION_TYPE_LABELS[applicationType],
            amount: getRequestAmount(),
            calculatedAmount: getCalculatedAmount(),
          }}
        />
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1">
            이전
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 1) {
                const errs = validateBasicFormat({
                  name: basicInfo.name, studentId: basicInfo.studentId, department: basicInfo.department,
                  phone: basicInfo.phone, email: basicInfo.email,
                  accountNumber: basicInfo.accountNumber, applicationDate: basicInfo.applicationDate,
                });
                if (!basicInfo.bankName.trim()) errs.push("• 은행명을 입력해주세요.");
                if (!basicInfo.accountHolder.trim()) errs.push("• 예금주를 입력해주세요.");
                if (basicInfo.privacyAgree !== "동의") errs.push("• 개인정보 수집·이용에 동의해야 합니다.");
                if (errs.length) { alert("작성 예시와 동일한 형식으로 정확히 입력해주세요.\n\n" + errs.join("\n")); return; }
                setConsent((c) => ({ ...c, privacy: true }));
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
            disabled={submitting || !consent.privacy || !consent.truth || !consent.account || !signature}
            className="btn-primary flex-1"
          >
            {submitting ? "제출 중..." : "신청 제출"}
          </button>
        )}
      </div>
    </div>
  );
}
