export type ApplicationType =
  | "program"      // 프로그램 참여지원비 (혁신인재지원금)
  | "staff"        // 진행요원비 (혁신인재지원금)
  | "grade"        // 성적 우수 지원금 (혁신인재지원금)
  | "contest"      // 경진대회 입상 우수성과 지원금 (혁신인재지원금)
  | "certificate"  // 자격증 취득 우수성과 지원금 (혁신인재지원금)
  | "labor"        // 근로장학금
  | "activity"     // 학생활동지원비
  | "club";        // 첨단 ICT 소학회 활동 지원

// 최상위 지원금 카테고리
export type FundCategory = "labor" | "innovation" | "activity";

export const FUND_CATEGORY_LABELS: Record<FundCategory, string> = {
  labor: "근로장학금",
  innovation: "혁신인재지원금",
  activity: "학생활동지원비",
};

// 카테고리별 신청 유형
export const CATEGORY_TYPES: Record<FundCategory, ApplicationType[]> = {
  labor: ["labor"],
  innovation: ["program", "staff", "grade", "contest", "certificate"],
  activity: ["activity", "club"],
};

export function categoryOfType(t: ApplicationType): FundCategory {
  if (t === "labor") return "labor";
  if (t === "activity" || t === "club") return "activity";
  return "innovation";
}

// 신청 단계: 지원신청(활동 전) / 지원금 신청(활동 후)
export type ApplicationPhase = "pre" | "fund";
export const APPLICATION_PHASE_LABELS: Record<ApplicationPhase, string> = {
  pre: "지원신청",
  fund: "지원금 신청",
};
// 지원신청(pre) 시 카테고리 → 기본 신청 유형 (참여 기반 유형으로 직접 매핑)
export const PRE_CATEGORY_TYPE: Record<FundCategory, ApplicationType> = {
  labor: "labor",
  innovation: "program",
  activity: "activity",
};

// 지원금 종류 선택(평탄화): 혁신인재지원금 그룹 대신 유형을 개별 카드로 노출
// (소학회는 독립 메뉴로 분리 — 지원신청/지원금신청 하위 목록에는 포함하지 않음)
export const PICK_TYPES_FUND: ApplicationType[] = ["labor", "program", "staff", "grade", "contest", "certificate"];
// 지원신청(활동 전) 가능 유형
export const PICK_TYPES_PRE: ApplicationType[] = ["labor", "program", "staff"];

export type GradeSubType = "microdegree" | "minor" | "double";
export type ContestScale = "A" | "B";
export type ContestAward = "grand" | "silver" | "bronze" | "participation";
export type CertificateLevel = "high" | "mid" | "low" | "review";
export type StudentType = "undergraduate" | "graduate";

export type ReviewStatus =
  | "received"    // 접수완료
  | "reviewing"   // 검토중
  | "supplement"  // 보완요청
  | "supplemented" // 보완완료(보완요청 후 신청자가 재제출)
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
  url?: string;   // 표시용 (구버전 base64 또는 관리자 서명 URL)
  path?: string;  // Supabase Storage 경로 (신버전)
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

// 신청자 입력 항목 종류: 서술형 / 파일 / 서약(동의) / 서명 / 드롭다운(선택)
export type ReportFieldType = "text" | "file" | "agreement" | "signature" | "select";

// 프로그램별 신청자 보고서 입력값 (관리자가 설정한 항목에 대응)
export interface ReportEntry {
  fieldId: string;
  label: string;
  type: ReportFieldType;
  value?: string;      // 서술형 입력값 / 서약 동의("동의") / 서명 이미지(dataURL)
  filePath?: string;   // 파일 업로드 경로
  fileName?: string;   // 파일명(표시용)
}

// 유형별 상세 데이터
export interface ProgramDetail {
  programName: string;
  programType: string;
  startDate?: string;            // 참여 시작일 (yyyy-mm-dd)
  endDate?: string;              // 참여 종료일 (yyyy-mm-dd)
  participationPeriod: string;   // "{start} ~ {end}" 자동
  participationContent: string;
  supervisorName: string;
  requestAmount: number;
  transport?: TransportInfo;     // 교통비 (구버전)
  extraCosts?: ExtraCosts;       // 등록비·숙박비 (구버전)
  costDetail?: CostDetail;       // 비용 입력 (신버전: 등록비·교통비 다중·숙박비)
  eventLocation?: EventLocation; // 행사(학회) 장소
  programId?: string;            // 선택한 사업단 프로그램 ID
  reportEntries?: ReportEntry[]; // 프로그램별 보고서 입력값
  workLog?: WorkLogEntry[];      // 스키마 폼 근무상황부 (근로/진행요원 등)
  formAnswers?: { programId?: string; programName?: string; fields: { id: string; label: string; type: string; value: string; step?: string }[] }; // 스키마 폼 답변(컬럼 미마이그레이션 환경 보존용)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemaState?: any;             // 임시저장 이어서 작성용 원본 입력 상태
}

// 근로장학금 상세
export interface LaborDetail {
  programId?: string;     // 선택한 근로 프로그램
  programName: string;    // 프로그램명
  role: string;           // 역할 (예: 공간관리)
  workPeriod: string;     // 근로기간
  totalHours: number;     // 총 근로시간 (자동 합산)
  studentType: StudentType;
  calculatedAmount: number;
  workLog: WorkLogEntry[];      // 근무상황부 (일괄 등록 지원)
  workDetail: string;           // 근로 상세내역
  supervisorName: string;       // 확인자(교수/담당자)
  reportEntries?: ReportEntry[]; // 프로그램별 보고서 입력값
}

// 학생활동지원비 신청 구분 (학회참석 등 / 논문게재료)
export type ActivityKind = "conference" | "paper";

// 논문게재료 신청 정보
export interface PaperDetail {
  paperTitle: string;   // 논문명
  journalName: string;  // 학술지명
  issn: string;         // ISSN 번호
  volumeIssue: string;  // 발행권(호)
  publishDate: string;  // 발행일
  publisher: string;    // 발행기관
  requestFee: number;   // 신청금액(게재료)
}

// 등록비·숙박비 등 부가 비용 (교통비와 별도)
export interface ExtraCosts {
  registrationFee?: number;  // 등록비·참가비
  lodgingFee?: number;       // 숙박비
  lodgingNights?: number;    // 숙박 일수 (선택)
}

// 교통비 1건 (일자별·동일 일자에도 여러 건 가능)
export interface TransportItem {
  id: string;
  date: string;        // 사용일자 (yyyy-mm-dd)
  mode: TransportMode; // 교통수단
  region?: TransportRegion; // 국내/국외 (항공 가능 여부 판단)
  isJeju?: boolean;    // 국내 중 제주도 여부 (항공 가능)
  route?: string;      // 이동구간 (구버전 호환)
  departure?: string;  // 출발지
  arrival?: string;    // 도착지
  amount: number;      // 금액
  proofPath?: string;  // 행별 증빙 Supabase storage 경로
  proofName?: string;  // 증빙 파일명(표시용)
}

// 숙박비 (개인사용 / 단체사용)
export interface LodgingDetail {
  usage: "personal" | "group";  // 개인사용 / 단체사용
  roomAmount: number;     // 개인사용: 숙소 결제금액 / 단체사용: 숙소 전체금액
  personalAmount: number; // 단체사용 시 개인 부담금액 (개인사용이면 미사용)
  proofPath?: string;     // 숙박비 증빙 Supabase storage 경로
  proofName?: string;     // 증빙 파일명(표시용)
}

// 비용 입력 통합 (등록비·교통비·숙박비)
export interface CostDetail {
  registrationFee: number;          // 등록비
  registrationProofPath?: string;   // 등록비 증빙(학회 참가확인서) Supabase storage 경로
  registrationProofName?: string;   // 증빙 파일명(표시용)
  transports: TransportItem[];      // 교통비(다중)
  lodging?: LodgingDetail;          // 숙박비
}

// 지원비 합계: 교통비 합 + min(숙박 개인부담, 70000). 등록비 제외.
export function calcSupportTotal(c?: CostDetail): number {
  if (!c) return 0;
  const trans = (c.transports || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const lodgingPersonal = c.lodging ? (c.lodging.usage === "personal" ? c.lodging.roomAmount : c.lodging.personalAmount) : 0;
  const lodge = Math.min(Number(lodgingPersonal) || 0, 70000);
  return trans + lodge;
}

// 학생활동지원비 상세
export interface ActivityDetail {
  programId?: string;
  activityKind?: ActivityKind; // 신청 구분 (미지정 시 conference 취급)
  activityName: string;        // 활동명
  activityType: string;        // 활동 유형
  activityPeriod: string;      // 활동 기간
  activityContent: string;     // 활동 내용
  requestAmount: number;
  transport?: TransportInfo;
  eventLocation?: EventLocation;
  extraCosts?: ExtraCosts;     // 등록비·숙박비 (구버전)
  costDetail?: CostDetail;     // 비용 입력 (신버전)
  paper?: PaperDetail;         // 논문게재료 신청 시 사용
  reportEntries?: ReportEntry[]; // 프로그램별 보고서 입력값
}

// 첨단 ICT 소학회 활동 지원
export type ClubField = "security" | "privacy" | "cloud" | "blockchain";
export const CLUB_FIELD_LABELS: Record<ClubField, string> = {
  security: "사이버 보안",
  privacy: "개인정보 보호",
  cloud: "클라우드",
  blockchain: "블록체인",
};
// 소학회 회장 혁신인재지원금 월 지급액 (진행요원비 기준)
export const CLUB_PRESIDENT_MONTHLY = 240000;

export interface ClubMember {
  role: string;        // 회장 / 팀원
  name: string;
  studentId: string;
  department: string;
  isMirae: boolean;    // 미래융합가상학과 소속 여부
  phone: string;
}

export interface ClubDetail {
  clubName: string;              // 소학회명
  field: ClubField;              // 활동 분야
  topic: string;                 // 활동 주제
  advisor: string;               // 지도교수
  intro?: string;                // 소학회 소개 (200자 이내)
  achievements?: string;         // 특이사항(수상 경력 등)
  members: ClubMember[];         // 회장 + 팀원 (최소 6명)
  goals?: string;                // 활동 목표(정량·정성)
  plan?: string;                 // 활동 계획
  expectedOutcome?: string;      // 기대 성과
  // 지원금 신청(fund) 단계
  presidentMonths?: number;      // 소학회 회장 혁신인재지원금 신청 개월 수
  budgetNote?: string;           // 운영비(회의비·재료·학회 참가 등) 사용 계획/비고
  requestAmount: number;         // 총 신청 금액
}

// 근무상황부 1회 근무 기록
export interface WorkLogEntry {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  hours: number;      // 해당 일자 근무 시간 (자동 계산)
  detail?: string;    // 근로 상세내역 (근로장학금 근무상황부)
}

// 수강 시간표 1칸 (근로장학금: 수업시간에는 근로 불가)
export interface ClassTime {
  day: number;    // 0=일 ~ 6=토
  start: string;  // HH:mm
  end: string;    // HH:mm
  label?: string; // 과목명(선택)
}

export interface StaffDetail {
  programName: string;
  workPeriod: string;
  workDates: string;
  totalHours: number;
  studentType: StudentType;
  calculatedAmount: number;
  taskDescription: string;
  workLog?: WorkLogEntry[];   // 구조화된 근무상황부 (일괄 등록 지원)
  transport?: TransportInfo;  // 교통비 (구버전)
  extraCosts?: ExtraCosts;    // 등록비·숙박비 (구버전)
  costDetail?: CostDetail;    // 비용 입력 (신버전)
  reportEntries?: ReportEntry[]; // 프로그램별 보고서 입력값
}

// 교통비 (행사·학회 참석 등 이동 발생 시)
export type TransportRegion = "domestic" | "overseas";
export type TransportMode =
  | "bus"        // 시내/시외버스
  | "express"    // 고속버스
  | "train"      // 기차/KTX
  | "subway"     // 지하철
  | "taxi"       // 택시
  | "car"        // 자가용
  | "ship"       // 선박
  | "air";       // 항공 (국외 또는 제주도만)

export interface TransportInfo {
  region: TransportRegion;  // 국내/국외
  isJeju: boolean;          // 국내 중 제주도 여부
  mode: TransportMode;      // 교통수단
  route: string;            // 이동 구간 (예: 춘천 → 제주)
  amount: number;           // 교통비 금액
}

// 행사(학회) 장소
export interface EventLocation {
  scope: TransportRegion;  // domestic(국내) / overseas(국외)
  province?: string;       // 국내: 도/특별시/광역시
  city?: string;           // 국내: 시/군/구
  country?: string;        // 국외: 국가
  cityName?: string;       // 국외: 세부 도시 (자유 입력)
}

// 제주도 여부 (항공 교통 선택 가능 판단에 사용)
export function isJejuLocation(loc?: EventLocation): boolean {
  return !!loc && loc.scope === "domestic" && (loc.province ?? "").includes("제주");
}

export interface MDCourseGrade {
  name: string;
  grade: string;
  isBase: boolean;
}

// 부전공/복수전공 이수 교과목 항목
export interface MinorCourse {
  name: string;          // 교과목명 (관리자 설정 카탈로그에서 선택)
  credits: number;       // 학점 (1/2/3)
  grade: string;         // 평점 (A+~F, 가/부)
  mdProgramId?: string;  // 이 과목이 이수한 MD 과정 id (MD 이수과목인 경우)
  excluded?: boolean;    // MD 이수과목 중 학점 불인정 → 이수학점에서 제외
}

export interface GradeDetail {
  subType: GradeSubType;
  courseName: string;
  credits: number;
  gpa: number;
  microDegreeCompleted: boolean;
  calculatedAmount: number;
  // 마이크로디그리 전용
  mdDepartment?: string;
  mdProgramId?: string;
  mdProgramName?: string;
  mdCourses?: MDCourseGrade[];
  // 부전공/복수전공 전용
  minorMajorName?: string;       // 전공명 (3개 중 선택)
  minorMajorCredits?: number;    // 인정 이수 학점 (총 이수 − MD 학점 불인정 제외, 자동 계산)
  minorCourses?: MinorCourse[];  // 이수 교과목 내역 (과목명·학점·평점·MD·불인정)
  minorIsMirae?: boolean;        // 미래융합가상학과 이수(예정)자
  minorMdCompleted?: boolean;    // MD 1개 이상 이수 (과목 MD 지정 시 자동)
  minorMdName?: string;          // 이수한 MD 과정명(들, 자동 집계)
  minorGradDate?: string;        // 졸업(예정) 시기 "YYYY-MM" (2월/8월)
  minorMdYears?: Record<string, string>; // MD 과정 id → 발급 학년도("2025" | "2026")
}

// 부/복수전공 성적우수 MD 인정 기준 (세부지침 2026-07-07 개정, 제7조 ②)
// - 2027년 2월 졸업(예정)자까지: 2025학년도 발급 MD 인정 (학점 불인정 없음)
// - 2027년 8월 졸업(예정)자부터: 2026학년도 개편(총장명의) MD만 인정 (2025학년도 MD 불인정)
export const MD_2026_REQUIRED_FROM = "2027-08";
export function isMdYearRecognized(gradDate: string | undefined, mdYear: string | undefined): boolean {
  if (!gradDate || !mdYear) return false;               // 졸업 시기·발급 학년도 미선택 시 판정 불가
  if (gradDate < MD_2026_REQUIRED_FROM) return true;    // 2027년 2월 졸업까지: 2025·2026 모두 인정
  return mdYear === "2026";                             // 2027년 8월 졸업부터: 2026학년도 개편 MD만
}

export interface ContestDetail {
  contestName: string;
  contestTheme: string;
  relevanceDescription: string;
  organizer: string;
  scale: ContestScale;
  isTeam: boolean;
  teamMembers?: { studentId: string; name: string }[]; // 팀일 경우 본인 포함 전체 팀원 (n분의 1 지급)
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
  campus?: string;           // 강원대 캠퍼스 (춘천/원주/삼척/강릉/도계)
  department: string;
  grade: string;
  academicStatus: string;
  gradCompletion?: string;   // 대학원생: 재학/수료
  completedYears?: string;   // 대학원생: 수료 후 경과 연차
  currentSemester?: string;  // 대학원생: 현재 학기
  phone: string;
  email: string;
  applicationDate: string;

  // 계좌 정보
  bankInfo: BankInfo;

  // 신청 단계 (지원신청 / 지원금 신청)
  applicationPhase?: ApplicationPhase;

  // 신청 유형
  applicationType: ApplicationType;

  // 유형별 상세
  programDetail?: ProgramDetail;
  staffDetail?: StaffDetail;
  gradeDetail?: GradeDetail;
  contestDetail?: ContestDetail;
  certificateDetail?: CertificateDetail;
  laborDetail?: LaborDetail;
  activityDetail?: ActivityDetail;
  clubDetail?: ClubDetail;

  // 파일
  files: UploadedFile[];

  // 동의
  privacyConsent: boolean;
  truthConsent: boolean;
  accountConsent: boolean;

  // 학생 서명 (base64 이미지)
  signature?: string;

  // 계좌 예금주 ≠ 신청자 성명 (본인명의 확인 필요)
  accountMismatch?: boolean;

  // 관리자 필드
  reviewStatus: ReviewStatus;
  paymentStatus: PaymentStatus;
  adminMemo: string;
  approvedAmount?: number;
  requestAmount: number;
  calculatedAmount: number;

  // 검토 단계(서류 인계): "program"=프로그램 관리자 검토중 / "expense"=지출관리자에게 전달됨
  reviewStage?: "program" | "expense";
  handoffNote?: string; // 지출관리자→프로그램관리자 보완 요청 메모
  // 상태 변경 이력(감사 로그) — 검토/지급 상태 변경 시 누적 기록
  statusHistory?: { at: string; by?: string; role?: string; field: "review" | "payment"; from?: string | null; to: string; memo?: string }[];
  // 관리자 폼 빌더(스키마)로 작성한 신청의 답변 모음
  formAnswers?: { programId?: string; programName?: string; fields: { id: string; label: string; type: string; value: string; step?: string }[] };

  // 신청 취소
  canceled?: boolean;
  canceledAt?: string;
  canceledIp?: string;

  // 임시저장 (작성 중)
  isDraft?: boolean;
  draftStep?: number;

  // 관리자 테스트 신청
  isTest?: boolean;

  // 관리자가 통장사본 확인 후 입력 (인쇄/내보내기 전용, 화면 마스킹)
  verifiedAccount?: { bankName?: string; accountNumber?: string; accountHolder?: string; residentNumber?: string };
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  received: "신청완료",
  reviewing: "검토중",
  supplement: "보완요청",
  supplemented: "보완완료",
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
  labor: "근로장학금",
  activity: "학생활동지원비",
  club: "첨단 ICT 소학회",
};

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  bus: "시내·시외버스",
  express: "고속버스",
  train: "기차·KTX",
  subway: "지하철",
  taxi: "택시",
  car: "자가용",
  ship: "선박",
  air: "항공",
};

// 항공은 국외이거나 국내 제주도일 때만 선택 가능
export function canSelectAir(region: TransportRegion, isJeju: boolean): boolean {
  return region === "overseas" || (region === "domestic" && isJeju);
}

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
