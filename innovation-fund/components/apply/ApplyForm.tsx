"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ApplicationType, DocumentType, UploadedFile } from "@/types";
import { APPLICATION_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from "@/types";
import {
  calcContestAmount, calcCertAmount, calcGradeAmount, calcStaffAmount,
} from "@/lib/amount-calculator";
import BasicInfoSection from "./BasicInfoSection";
import ProgramDetailSection from "./ProgramDetailSection";
import StaffDetailSection from "./StaffDetailSection";
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
  });

  // 유형별 상세
  const [programDetail, setProgramDetail] = useState({
    programName: "", programType: "", participationPeriod: "", participationContent: "",
    supervisorName: "", requestAmount: 0,
  });
  const [staffDetail, setStaffDetail] = useState({
    programName: "", workPeriod: "", workDates: "", totalHours: 0,
    studentType: "undergraduate" as "undergraduate" | "graduate", taskDescription: "",
  });
  const [gradeDetail, setGradeDetail] = useState({
    subType: "microdegree" as "microdegree" | "minor" | "double",
    courseName: "", credits: 0, gpa: 0, microDegreeCompleted: false,
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

  // 계산 금액
  const getCalculatedAmount = (): number => {
    if (applicationType === "staff") return calcStaffAmount(staffDetail.totalHours, staffDetail.studentType);
    if (applicationType === "grade") return calcGradeAmount(gradeDetail.subType);
    if (applicationType === "contest") return calcContestAmount(contestDetail.scale, contestDetail.awardLevel, contestDetail.isTeam);
    if (applicationType === "certificate") return calcCertAmount(certDetail.difficulty);
    return programDetail.requestAmount;
  };

  const getRequestAmount = (): number => {
    if (applicationType === "program") return programDetail.requestAmount;
    return getCalculatedAmount();
  };

  const handleSubmit = async () => {
    if (!consent.privacy || !consent.truth || !consent.account) {
      alert("모든 동의 항목에 체크해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: basicInfo.name, studentId: basicInfo.studentId, university: basicInfo.university,
        department: basicInfo.department, grade: basicInfo.grade, academicStatus: basicInfo.academicStatus,
        phone: basicInfo.phone, email: basicInfo.email, applicationDate: basicInfo.applicationDate,
        bankInfo: { bankName: basicInfo.bankName, accountNumber: basicInfo.accountNumber, accountHolder: basicInfo.accountHolder },
        applicationType,
        programDetail: applicationType === "program" ? programDetail : undefined,
        staffDetail: applicationType === "staff" ? { ...staffDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        gradeDetail: applicationType === "grade" ? { ...gradeDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        contestDetail: applicationType === "contest" ? { ...contestDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        certificateDetail: applicationType === "certificate" ? { ...certDetail, calculatedAmount: getCalculatedAmount() } : undefined,
        files,
        privacyConsent: consent.privacy,
        truthConsent: consent.truth,
        accountConsent: consent.account,
        requestAmount: getRequestAmount(),
        calculatedAmount: getCalculatedAmount(),
      };

      const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();

      router.push(
        `/apply/complete?receipt=${data.receiptNumber}&date=${basicInfo.applicationDate}&type=${encodeURIComponent(APPLICATION_TYPE_LABELS[applicationType])}&amount=${getRequestAmount()}`
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
          <div key={i} className={`flex-1 h-1.5 rounded-full ${step > i ? "bg-primary-600" : "bg-gray-200"}`} />
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

      {/* 3단계: 파일 업로드 */}
      {step === 3 && (
        <FileUploadSection files={files} onChange={setFiles} applicationType={applicationType} />
      )}

      {/* 4단계: 동의 */}
      {step === 4 && (
        <ConsentSection
          values={consent}
          onChange={setConsent}
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
                if (!basicInfo.name || !basicInfo.studentId || !basicInfo.department || !basicInfo.phone || !basicInfo.email) {
                  alert("기본 정보를 모두 입력해주세요.");
                  return;
                }
                if (!basicInfo.bankName || !basicInfo.accountNumber || !basicInfo.accountHolder) {
                  alert("계좌 정보를 모두 입력해주세요.");
                  return;
                }
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
            disabled={submitting || !consent.privacy || !consent.truth || !consent.account}
            className="btn-primary flex-1"
          >
            {submitting ? "제출 중..." : "신청 제출"}
          </button>
        )}
      </div>
    </div>
  );
}
