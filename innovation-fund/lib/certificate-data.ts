// 자격증 취득 우수성과 지원금 - 자격증 목록 데이터
// 출처: 데이터보안·활용 혁신융합대학 사업단 컨소시엄 우수성과 자격증 목록
// 난이도: 상(70만원) / 중(40만원) / 하(10만원)

export type CertEligibility = "supported" | "review" | "unsupported";
export type CertDifficulty = "high" | "mid" | "low" | "review";

export interface CertItem {
  name: string;
  eligibility: CertEligibility;
  difficulty: CertDifficulty; // review = 심의 후 결정
  field?: string;
}

// 지원가능 자격증 (난이도 확정)
export const SUPPORTED_CERTS: CertItem[] = [
  // 사이버보안
  { name: "CCNA (Cisco Certified Network Associate)", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "Cisco Certified CyberOps Associate", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "CCNP Security", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "SC-900 (Security·Compliance·Identity Fundamentals)", eligibility: "supported", difficulty: "low", field: "사이버보안" },
  { name: "SC-200 (보안 운영 분석가)", eligibility: "supported", difficulty: "low", field: "사이버보안" },
  { name: "SC-300 (ID·접근 관리자)", eligibility: "supported", difficulty: "mid", field: "사이버보안" },
  { name: "SC-401 (정보 보안 관리자)", eligibility: "supported", difficulty: "mid", field: "사이버보안" },
  { name: "SC-100 (사이버보안 아키텍트)", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "정보보안기사", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "정보보안산업기사", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "산업보안관리사", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "디지털포렌식 전문가 2급", eligibility: "supported", difficulty: "high", field: "사이버보안" },
  { name: "정보보호위험관리사 (ISRM)", eligibility: "supported", difficulty: "mid", field: "사이버보안" },
  { name: "정보보호능력검정 (TOLIS)", eligibility: "supported", difficulty: "low", field: "사이버보안" },
  // 클라우드
  { name: "AWS Certified Cloud Practitioner (Foundational)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "AWS Certified Solutions Architect (Associate)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "AWS Certified AI Practitioner (Foundational)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Microsoft Azure Fundamentals (AZ-900)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Microsoft Azure AI Fundamentals (AI-900)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Google Cloud Cloud Digital Leader", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Google Cloud Associate Cloud Engineer", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Naver Cloud Platform Certified Associate (NCA)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Naver Cloud Platform Certified Professional (NCP)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  { name: "Naver Cloud Platform Certified Expert (NCE)", eligibility: "supported", difficulty: "low", field: "클라우드" },
  // 개인정보보호
  { name: "개인정보관리사 (CPPG)", eligibility: "supported", difficulty: "high", field: "개인정보보호" },
  // 데이터·AI
  { name: "데이터 분석 준전문가 (ADsP)", eligibility: "supported", difficulty: "low", field: "데이터·AI" },
  { name: "SQL 개발자 (SQLD)", eligibility: "supported", difficulty: "low", field: "데이터·AI" },
  { name: "빅데이터분석기사", eligibility: "supported", difficulty: "mid", field: "데이터·AI" },
  { name: "SQL 전문가 (SQLP)", eligibility: "supported", difficulty: "high", field: "데이터·AI" },
  { name: "데이터 분석 전문가 (ADP)", eligibility: "supported", difficulty: "high", field: "데이터·AI" },
];

// 심의대상 자격증 (난이도/지급 여부 심의 후 확정)
export const REVIEW_CERTS: CertItem[] = [
  { name: "정보통신기사", eligibility: "review", difficulty: "review", field: "공통·네트워크" },
  { name: "정보통신산업기사", eligibility: "review", difficulty: "review", field: "공통·네트워크" },
  { name: "리눅스마스터 1급", eligibility: "review", difficulty: "review", field: "공통·네트워크" },
  { name: "네트워크관리사 1급", eligibility: "review", difficulty: "review", field: "공통·네트워크" },
  { name: "네트워크관리사 2급", eligibility: "review", difficulty: "review", field: "공통·네트워크" },
  { name: "정보관리기술사", eligibility: "review", difficulty: "review", field: "공통·네트워크" },
  { name: "AWS Certified Developer (Associate)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified Data Engineer (Associate)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified SysOps Administrator (Associate)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified DevOps Engineer (Professional)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified Solutions Architect (Professional)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified Machine Learning (Specialty)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified Security (Specialty)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "AWS Certified ML Engineer (Associate)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Microsoft Azure Developer Associate (AZ-204)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Microsoft Azure Data Fundamentals (DP-900)", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Microsoft 365 Certified: Fundamentals", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Microsoft Power Platform Fundamentals", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Google Cloud Professional Cloud Architect", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Google Cloud Professional Data Engineer", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Google Cloud Professional Cloud Security Engineer", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "Google Cloud Professional ML Engineer", eligibility: "review", difficulty: "review", field: "클라우드" },
  { name: "ISMS/ISMS-P 인증심사원", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "CCSP (Certified Cloud Security Professional)", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "SW보안약점진단원", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "ISO/IEC 27001 내부인증심사원", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "Splunk Core Certified User / Power User", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "Splunk Enterprise Certified Admin", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "금융보안관리사 (CFSE)", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "디지털포렌식전문가 1급", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "정보보안관제사 1·2·3급", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "정보보호관리사", eligibility: "review", difficulty: "review", field: "사이버보안" },
  { name: "개인정보보호관리사", eligibility: "review", difficulty: "review", field: "개인정보보호" },
  { name: "개인정보보호사", eligibility: "review", difficulty: "review", field: "개인정보보호" },
  { name: "개인정보보호전문가 (PIPS)", eligibility: "review", difficulty: "review", field: "개인정보보호" },
  { name: "데이터아키텍처 전문가 (DAP)", eligibility: "review", difficulty: "review", field: "데이터·AI" },
  { name: "데이터아키텍처 준전문가 (DAsP)", eligibility: "review", difficulty: "review", field: "데이터·AI" },
  { name: "AICE - Associate", eligibility: "review", difficulty: "review", field: "데이터·AI" },
  { name: "AICE - Professional", eligibility: "review", difficulty: "review", field: "데이터·AI" },
  { name: "블록체인관리사 (CBM)", eligibility: "review", difficulty: "review", field: "블록체인" },
  { name: "NFT관리사 (CNM)", eligibility: "review", difficulty: "review", field: "블록체인" },
];

// 지원불가 자격증 (입력 시 경고)
export const UNSUPPORTED_CERTS: string[] = [
  "금융보안관리사",
  "CISSP (Certified Information Systems Security Professional)",
  "CISSP",
  "SSCP (Systems Security Certified Practitioner)",
  "SSCP",
  "CISA (Certified Information Systems Auditor)",
  "CISA",
  "정보처리기사",
  "정보처리산업기사",
  "AICE - Junior",
  "AICE - Basic",
  "AI-POT (AI프롬프트활용능력) 2급",
  "AI-POT 2급",
  "리눅스마스터 2급",
];

export const ALL_LISTED_CERTS: CertItem[] = [...SUPPORTED_CERTS, ...REVIEW_CERTS];

// 수기 입력값이 지원불가 목록에 해당하는지 검사 (공백/대소문자 무시 부분 일치)
export function checkUnsupported(input: string): boolean {
  const normalized = input.replace(/\s/g, "").toLowerCase();
  if (!normalized) return false;
  return UNSUPPORTED_CERTS.some((c) => {
    const target = c.replace(/\s/g, "").toLowerCase();
    return normalized.includes(target) || target.includes(normalized);
  });
}

// 난이도별 지급액은 config/payment 단일 소스를 재export
export { CERT_AMOUNT as CERT_DIFFICULTY_AMOUNT } from "@/config/payment";
