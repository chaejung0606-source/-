import type { Application } from "@/types";

export const mockApplications: Application[] = [
  {
    id: "1",
    receiptNumber: "2024-001",
    createdAt: "2024-09-01T09:00:00Z",
    updatedAt: "2024-09-02T10:00:00Z",
    name: "김혁신",
    studentId: "2021xxxxxx",
    university: "강원대학교",
    department: "컴퓨터공학과",
    grade: "3",
    academicStatus: "재학",
    phone: "010-1234-5678",
    email: "kim@kangwon.ac.kr",
    applicationDate: "2024-09-01",
    bankInfo: { bankName: "국민은행", accountNumber: "123456-78-901234", accountHolder: "김혁신" },
    applicationType: "contest",
    contestDetail: {
      contestName: "전국 데이터보안 경진대회",
      contestTheme: "AI 기반 침입탐지 시스템",
      relevanceDescription: "사이버보안 분야 AI 활용",
      organizer: "한국정보보호학회",
      scale: "B",
      isTeam: false,
      awardLevel: "grand",
      awardDate: "2024-08-20",
      hasMonetaryPrize: false,
      calculatedAmount: 1500000,
    },
    files: [
      { id: "f1", name: "상장.pdf", type: "award_certificate", size: 512000 },
      { id: "f2", name: "대회공고.pdf", type: "contest_notice", size: 256000 },
    ],
    privacyConsent: true,
    truthConsent: true,
    accountConsent: true,
    reviewStatus: "approved",
    paymentStatus: "completed",
    adminMemo: "서류 확인 완료. 지급 완료.",
    requestAmount: 1500000,
    calculatedAmount: 1500000,
    approvedAmount: 1500000,
  },
  {
    id: "2",
    receiptNumber: "2024-002",
    createdAt: "2024-09-05T14:30:00Z",
    updatedAt: "2024-09-05T14:30:00Z",
    name: "이데이터",
    studentId: "2022xxxxxx",
    university: "강원대학교",
    department: "미래융합가상학과",
    grade: "2",
    academicStatus: "재학",
    phone: "010-9876-5432",
    email: "lee@kangwon.ac.kr",
    applicationDate: "2024-09-05",
    bankInfo: { bankName: "신한은행", accountNumber: "987654-32-109876", accountHolder: "이데이터" },
    applicationType: "certificate",
    certificateDetail: {
      certName: "정보보안기사",
      issuingOrg: "한국산업인력공단",
      acquisitionDate: "2024-08-15",
      certField: "정보보안",
      difficulty: "high",
      isMirae: true,
      calculatedAmount: 700000,
    },
    files: [
      { id: "f3", name: "자격증.pdf", type: "certificate_copy", size: 300000 },
    ],
    privacyConsent: true,
    truthConsent: true,
    accountConsent: true,
    reviewStatus: "reviewing",
    paymentStatus: "waiting",
    adminMemo: "미래융합가상학과 소속 확인 중",
    requestAmount: 700000,
    calculatedAmount: 700000,
  },
  {
    id: "3",
    receiptNumber: "2024-003",
    createdAt: "2024-09-10T11:00:00Z",
    updatedAt: "2024-09-10T11:00:00Z",
    name: "박융합",
    studentId: "2020xxxxxx",
    university: "강원대학교",
    department: "정보통신공학과",
    grade: "4",
    academicStatus: "재학",
    phone: "010-5555-6666",
    email: "park@kangwon.ac.kr",
    applicationDate: "2024-09-10",
    bankInfo: { bankName: "우리은행", accountNumber: "555666-77-888999", accountHolder: "박융합" },
    applicationType: "grade",
    gradeDetail: {
      subType: "double",
      courseName: "컴퓨터보안 복수전공",
      credits: 36,
      gpa: 3.8,
      microDegreeCompleted: false,
      calculatedAmount: 1500000,
    },
    files: [
      { id: "f4", name: "성적증명서.pdf", type: "transcript", size: 400000 },
      { id: "f5", name: "이수증명서.pdf", type: "completion_proof", size: 350000 },
    ],
    privacyConsent: true,
    truthConsent: true,
    accountConsent: true,
    reviewStatus: "received",
    paymentStatus: "waiting",
    adminMemo: "",
    requestAmount: 1500000,
    calculatedAmount: 1500000,
  },
  {
    id: "4",
    receiptNumber: "2024-004",
    createdAt: "2024-09-12T09:30:00Z",
    updatedAt: "2024-09-13T15:00:00Z",
    name: "최보안",
    studentId: "2023xxxxxx",
    university: "강원대학교",
    department: "소프트웨어학과",
    grade: "1",
    academicStatus: "재학",
    phone: "010-1111-2222",
    email: "choi@kangwon.ac.kr",
    applicationDate: "2024-09-12",
    bankInfo: { bankName: "하나은행", accountNumber: "111222-33-444555", accountHolder: "최보안" },
    applicationType: "program",
    programDetail: {
      programName: "데이터보안 현장실습",
      programType: "현장실습",
      participationPeriod: "2024-07-01 ~ 2024-08-31",
      participationContent: "기업체 연계 보안 시스템 개발 참여",
      supervisorName: "홍길동 교수",
      requestAmount: 500000,
    },
    files: [
      { id: "f6", name: "참여확인서.pdf", type: "participation_proof", size: 200000 },
    ],
    privacyConsent: true,
    truthConsent: true,
    accountConsent: true,
    reviewStatus: "supplement",
    paymentStatus: "waiting",
    adminMemo: "재학증명서 미첨부. 보완 요청.",
    requestAmount: 500000,
    calculatedAmount: 500000,
  },
  {
    id: "5",
    receiptNumber: "2024-005",
    createdAt: "2024-09-15T16:00:00Z",
    updatedAt: "2024-09-15T16:00:00Z",
    name: "정진행",
    studentId: "2019xxxxxx",
    university: "강원대학교",
    department: "전기전자공학과",
    grade: "대학원",
    academicStatus: "재학",
    phone: "010-7777-8888",
    email: "jung@kangwon.ac.kr",
    applicationDate: "2024-09-15",
    bankInfo: { bankName: "기업은행", accountNumber: "777888-99-001122", accountHolder: "정진행" },
    applicationType: "staff",
    staffDetail: {
      programName: "혁신융합대학 오리엔테이션",
      workPeriod: "2024-09-01 ~ 2024-09-10",
      workDates: "2024-09-02, 2024-09-05, 2024-09-09",
      totalHours: 12,
      studentType: "graduate",
      calculatedAmount: 240000,
      taskDescription: "오리엔테이션 진행 보조, 자료 배포, 참석 확인",
    },
    files: [
      { id: "f7", name: "근무상황부.xlsx", type: "work_log", size: 150000 },
    ],
    privacyConsent: true,
    truthConsent: true,
    accountConsent: true,
    reviewStatus: "received",
    paymentStatus: "waiting",
    adminMemo: "",
    requestAmount: 240000,
    calculatedAmount: 240000,
  },
];

let applications = [...mockApplications];
let nextId = applications.length + 1;

export function getApplications(): Application[] {
  return [...applications];
}

export function getApplicationById(id: string): Application | undefined {
  return applications.find((a) => a.id === id);
}

export function createApplication(
  data: Omit<Application, "id" | "receiptNumber" | "createdAt" | "updatedAt" | "reviewStatus" | "paymentStatus" | "adminMemo">
): Application {
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const receipt = `${year}-${String(nextId).padStart(3, "0")}`;
  const newApp: Application = {
    ...data,
    id: String(nextId),
    receiptNumber: receipt,
    createdAt: now,
    updatedAt: now,
    reviewStatus: "received",
    paymentStatus: "waiting",
    adminMemo: "",
  };
  applications.push(newApp);
  nextId++;
  return newApp;
}

export function updateApplication(id: string, updates: Partial<Application>): Application | null {
  const idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  applications[idx] = { ...applications[idx], ...updates, updatedAt: new Date().toISOString() };
  return applications[idx];
}
