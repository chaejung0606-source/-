// 마이크로디그리(MD) 과정 데이터
// 출처: 학과별 마이크로디그리 과정 PDF

export interface MDProgram {
  id: string;
  department: string;       // 학과
  level: "초급" | "중급" | "고급";
  name: string;             // MD 과정명
  baseCourses: string[];    // 기초(전공) 과목 (없으면 빈 배열)
  mainCourses: string[];    // 해당 레벨 과목
  requiredCount: number;    // 이수해야 할 과목 수
  baseMaxCount: number;     // 기초(전공) 최대 허용 과목 수
  rule: string;             // 이수조건 안내
}

const BASE_3 = ["운영체제", "자료구조", "알고리즘"];
const RULE_FLEX = "기초(전공) 최대 2과목 허용 · (기초 2 + 초급 2) 또는 (기초 1 + 초급 3) · 총 4과목 이수";
const RULE_FIXED = "기초(전공) 최대 2과목 허용 · (기초 2 + 초급 2) · 총 4과목 이수";
const RULE_PICK4 = "해당 과목 중 4과목 이수";

export const MD_PROGRAMS: MDProgram[] = [
  // === 1. 클라우드융합학과 ===
  {
    id: "cloud-1", department: "클라우드융합학과", level: "초급", name: "클라우드서비스",
    baseCourses: BASE_3,
    mainCourses: ["클라우드플랫폼개론", "클라우드응용SW개발", "클라우드활용"],
    requiredCount: 4, baseMaxCount: 2, rule: RULE_FLEX,
  },
  {
    id: "cloud-2", department: "클라우드융합학과", level: "중급", name: "클라우드보안",
    baseCourses: [],
    mainCourses: ["클라우드프로그래밍", "클라우드보안", "클라우드인프라관리", "클라우드AI프로그래밍", "클라우드데이터베이스", "클라우드아키텍처"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },
  {
    id: "cloud-3", department: "클라우드융합학과", level: "고급", name: "클라우드운영",
    baseCourses: [],
    mainCourses: ["분산클라우드컴퓨팅", "엣지컴퓨팅", "빅데이터분석", "클라우드서비스설계", "클라우드캡스톤디자인 1", "클라우드 WE-Meet 1"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },

  // === 2. 블록체인융합학과 (블록체인트랙) ===
  {
    id: "blockchain-1", department: "블록체인융합학과 (블록체인트랙)", level: "초급", name: "블록체인프로그래밍입문",
    baseCourses: BASE_3,
    mainCourses: ["블록체인프로그래밍", "블록체인개론", "블록체인응용"],
    requiredCount: 4, baseMaxCount: 2, rule: RULE_FLEX,
  },
  {
    id: "blockchain-2", department: "블록체인융합학과 (블록체인트랙)", level: "중급", name: "블록체인디지털자산기술",
    baseCourses: [],
    mainCourses: ["디지털자산과블록체인", "블록체인토큰이코노미와법제도", "블록체인플랫폼구조및실습", "블록체인특강"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },
  {
    id: "blockchain-3", department: "블록체인융합학과 (블록체인트랙)", level: "고급", name: "블록체인산업응용",
    baseCourses: [],
    mainCourses: ["블록체인DApp개발과활용", "Web3생태계와서비스", "블록체인WE-Meet 1", "블록체인WE-Meet 2", "블록체인캡스톤디자인 1", "블록체인캡스톤디자인 2"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },

  // === 3. 블록체인융합학과 (개인정보보호트랙) ===
  {
    id: "privacy-1", department: "블록체인융합학과 (개인정보보호트랙)", level: "초급", name: "개인정보보호기술",
    baseCourses: BASE_3,
    mainCourses: ["개인정보보호기술이해", "개인정보보호암호기술"],
    requiredCount: 4, baseMaxCount: 2, rule: RULE_FIXED,
  },
  {
    id: "privacy-2", department: "블록체인융합학과 (개인정보보호트랙)", level: "중급", name: "개인정보보호정책및관리",
    baseCourses: [],
    mainCourses: ["개인정보보호법률이해", "가명및익명처리기술", "개인정보보호솔루션활용", "개인정보영향평가및관리체계"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },
  {
    id: "privacy-3", department: "블록체인융합학과 (개인정보보호트랙)", level: "고급", name: "개인정보전략및설계",
    baseCourses: [],
    mainCourses: ["빅데이터응용및보안", "인간중심개인정보보호", "개인정보보호WE-Meet 1", "개인정보보호WE-Meet 2", "개인정보보호캡스톤디자인 1", "개인정보보호캡스톤디자인 2"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },

  // === 4. 사이버보안융합학과 ===
  {
    id: "security-1", department: "사이버보안융합학과", level: "초급", name: "사이버보안기술",
    baseCourses: BASE_3,
    mainCourses: ["현대암호이론및응용", "사이버보안입문", "정보보호법과정책"],
    requiredCount: 4, baseMaxCount: 2, rule: RULE_FLEX,
  },
  {
    id: "security-2", department: "사이버보안융합학과", level: "중급", name: "사이버보안기술응용",
    baseCourses: [],
    mainCourses: ["해킹과침해대응", "사이버보안관제", "시큐어코딩", "취약점분석", "디지털포렌식", "시스템소프트웨어보안"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },
  {
    id: "security-3", department: "사이버보안융합학과", level: "고급", name: "사이버보안기술활용",
    baseCourses: [],
    mainCourses: ["인공지능보안", "보안아키텍처", "사이버보안사례특강", "침해사고분석", "사이버보안 WE-MEET 1", "사이버보안 WE-MEET 2"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },

  // === 5. 데이터보안활용혁신융합대학 사업단 ===
  {
    id: "group-1", department: "데이터보안활용혁신융합대학 사업단", level: "초급", name: "데이터보안기초",
    baseCourses: [],
    mainCourses: ["데이터보안개론", "첨단ICT기술이해", "AI개론", "컴퓨터아키텍처", "컴퓨터네트워크시스템", "운영체제및시스템소프트웨어"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },
  {
    id: "group-2", department: "데이터보안활용혁신융합대학 사업단", level: "초급", name: "데이터활용 기초",
    baseCourses: [],
    mainCourses: ["데이터활용개론", "컴퓨터개론및활용", "블록코딩과컴퓨팅사고", "데이터활용프로그래밍", "자료구조기초및활용", "데이터보안활용융합진로설계"],
    requiredCount: 4, baseMaxCount: 0, rule: RULE_PICK4,
  },
];

export const MD_DEPARTMENTS = Array.from(new Set(MD_PROGRAMS.map((p) => p.department)));

export function getProgramsByDept(dept: string): MDProgram[] {
  return MD_PROGRAMS.filter((p) => p.department === dept);
}

export function getProgramById(id: string): MDProgram | undefined {
  return MD_PROGRAMS.find((p) => p.id === id);
}

// === 성적 등급 → 평점 (4.5 만점, 0.5 간격, D0 = 1.0) ===
export const GRADE_OPTIONS = ["A+", "A0", "B+", "B0", "C+", "C0", "D+", "D0", "F"] as const;
export type GradeValue = (typeof GRADE_OPTIONS)[number];

export const GRADE_TO_POINT: Record<GradeValue, number> = {
  "A+": 4.5, "A0": 4.0, "B+": 3.5, "B0": 3.0,
  "C+": 2.5, "C0": 2.0, "D+": 1.5, "D0": 1.0, "F": 0.0,
};

export interface CourseGrade {
  name: string;
  grade: GradeValue;
  isBase: boolean; // 기초(전공) 과목 여부
}

export interface MDValidation {
  ok: boolean;
  gpa: number;
  reasons: string[];
}

// 이수조건 + 평점 검증
export function validateMD(program: MDProgram, selected: CourseGrade[]): MDValidation {
  const reasons: string[] = [];
  const count = selected.length;
  const baseCount = selected.filter((c) => c.isBase).length;

  // 평점 평균 계산 — '가/부'(Pass/Fail) 과목은 평점 산정에서 제외.
  // (이수 과목 수/기초 과목 수에는 그대로 포함)
  const graded = selected.filter((c) => (c.grade as string) in GRADE_TO_POINT);
  const gpa = graded.length > 0
    ? Math.round((graded.reduce((s, c) => s + GRADE_TO_POINT[c.grade], 0) / graded.length) * 100) / 100
    : 0;

  if (count !== program.requiredCount) {
    reasons.push(`이수 과목 수가 부족합니다. 총 ${program.requiredCount}과목을 선택해야 합니다. (현재 ${count}과목)`);
  }
  if (program.baseMaxCount > 0 && baseCount > program.baseMaxCount) {
    reasons.push(`기초(전공) 과목은 최대 ${program.baseMaxCount}과목까지만 인정됩니다. (현재 ${baseCount}과목)`);
  }
  // 평점 요건은 점수가 매겨진(가/부 제외) 과목이 하나라도 있을 때만 판정
  if (count === program.requiredCount && graded.length > 0 && gpa < 3.0) {
    reasons.push(`평점 평균이 3.0 미만입니다. (현재 ${gpa.toFixed(2)}) 성적 우수 지원금은 평점 3.0 이상이어야 합니다.`);
  }

  return { ok: reasons.length === 0, gpa, reasons };
}
