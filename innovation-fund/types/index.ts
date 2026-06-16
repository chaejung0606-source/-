export type ApplicationType =
  | "program"      // 프로그램 참여지원비
  | "staff"        // 진행요원비
  | "grade"        // 성적 우수 지원금
  | "contest"      // 경진대회 입상 우수성과 지원금
  | "certificate"; // 자격증 취득 우수성과 지원금

export type GradeSubType = "microdegree" | "minor" | "double";
export type ContestScale = "A" | "B";
export type ContestAward = "grand" | "silver" | "bronze" | "participation";
export type CertificateLevel = "high" | "mid" | "low" | "review";
export type StudentType = "undergraduate" | "graduate";

export type ReviewStatus =
  | "received"    // 접수완료
  | "reviewing"   // 검토중
  | "supplement"  // 보완요청
  | "committee"   // 심의필요
  | "approved"    // 승인
  | "rejected";   // 반려

export type PaymentStatus =
  | "waiting"     // 지급대기
  | "processing"  // 지출결의중
  | "completed"   // 지출완료
  | "hold"        // 지급보류
  | "refund";     // 환수대상

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  url?: string;
}

export type DocumentType =
  | "application_form"        // 지급신청서
  | "privacy_consent"         // 개인정보동의서
  | "id_card"                 // 신분증 사본
  | "bankbook"                // 통장 사본
  | "enrollment_certificate"  // 재학증명서
  | "achievement_proof"       // 성과 증빙자료
  | "participation_proof"     // 참여 증빙자료
  | "work_log"                // 근무상황부
  | "transcript"              // 성적증명서
  | "completion_proof"        // 이수증빙자료
  | "award_certificate"       // 상장
  | "contest_notice"          // 대회공고문
  | "certificate_copy"        // 자격증 사본
  | "other";                  // 기타

// 유형별 상세 데이터
export interface ProgramDetail {
  programName: string;
  programType: string;
  participationPeriod: string;
  participationContent: string;
  supervisorName: string;
  requestAmount: number;
}

export interface StaffDetail {
  programName: string;
  workPeriod: string;
  workDates: string;
  totalHours: number;
  studentType: StudentType;
  calculatedAmount: number;
  taskDescription: string;
}

export interface GradeDetail {
  subType: GradeSubType;
  courseName: string;
  credits: number;
  gpa: number;
  microDegreeCompleted: boolean;
  calculatedAmount: number;
}

export interface ContestDetail {
  contestName: string;
  contestTheme: string;
  relevanceDescription: string;
  organizer: string;
  scale: ContestScale;
  isTeam: boolean;
  awardLevel: ContestAward;
  awardDate: string;
  hasMonetaryPrize: boolean;
  calculatedAmount: number;
}

export interface CertificateDetail {
  certName: string;
  issuingOrg: string;
  acquisitionDate: string;
  certField: string;
  difficulty: CertificateLevel;
  isMirae: boolean;
  calculatedAmount: number;
}

export interface Application {
  id: string;
  receiptNumber: string;
  createdAt: string;
  updatedAt: string;

  // 기본 정보
  name: string;
  studentId: string;
  university: string;
  department: string;
  grade: string;
  academicStatus: string;
  phone: string;
  email: string;
  applicationDate: string;

  // 계좌 정보
  bankInfo: BankInfo;

  // 신청 유형
  applicationType: ApplicationType;

  // 유형별 상세
  programDetail?: ProgramDetail;
  staffDetail?: StaffDetail;
  gradeDetail?: GradeDetail;
  contestDetail?: ContestDetail;
  certificateDetail?: CertificateDetail;

  // 파일
  files: UploadedFile[];

  // 동의
  privacyConsent: boolean;
  truthConsent: boolean;
  accountConsent: boolean;

  // 관리자 필드
  reviewStatus: ReviewStatus;
  paymentStatus: PaymentStatus;
  adminMemo: string;
  approvedAmount?: number;
  requestAmount: number;
  calculatedAmount: number;
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  received: "접수완료",
  reviewing: "검토중",
  supplement: "보완요청",
  committee: "심의필요",
  approved: "승인",
  rejected: "반려",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  waiting: "지급대기",
  processing: "지출결의중",
  completed: "지출완료",
  hold: "지급보류",
  refund: "환수대상",
};

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  program: "프로그램 참여지원비",
  staff: "진행요원비",
  grade: "성적 우수 지원금",
  contest: "경진대회 입상 우수성과 지원금",
  certificate: "자격증 취득 우수성과 지원금",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  application_form: "지급신청서",
  privacy_consent: "개인정보동의서",
  id_card: "신분증 사본",
  bankbook: "통장 사본",
  enrollment_certificate: "재학증명서",
  achievement_proof: "성과 증빙자료",
  participation_proof: "참여 증빙자료",
  work_log: "근무상황부",
  transcript: "성적증명서",
  completion_proof: "이수증빙자료",
  award_certificate: "상장",
  contest_notice: "대회공고문",
  certificate_copy: "자격증 사본",
  other: "기타",
};
