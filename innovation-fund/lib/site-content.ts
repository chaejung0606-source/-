// 홈 '유형 분석' 카드 → 상세 모달 내용. 관리자가 편집 가능 (localStorage).
import type { ApplicationType } from "@/types";

export interface ContentSection { heading: string; items: string[]; }
export interface TypeContent {
  intro: string;
  sections: ContentSection[];
  showPrograms?: boolean;  // 클릭한 날짜 기준 신청 가능 프로그램 목록 표시 여부
}
export type SiteContent = Partial<Record<ApplicationType, TypeContent>>;

const KEY = "siteContentV1";

export const DEFAULT_CONTENT: Record<ApplicationType, TypeContent> = {
  program: {
    intro: "사업단이 승인한 교과·비교과, 실험실습, 현장실습, 인턴십, 기업체 연계 프로젝트, 학회 참석 등에 참여하는 학생에게 지급합니다.",
    showPrograms: true,
    sections: [
      { heading: "지원 범위", items: ["교과·비교과", "실험실습", "현장실습", "인턴십", "기업체 연계 방문·프로젝트", "학회 참석", "기타"] },
      { heading: "유의사항", items: ["진행요원비와 중복 계상 불가", "참여 증빙자료 필수"] },
    ],
  },
  staff: {
    intro: "사업단 프로그램 운영 보조 업무를 수행하는 진행요원에게 근로시간 기준으로 지급합니다.",
    showPrograms: true,
    sections: [
      { heading: "지급 단가", items: ["대학생 15,000원/시간", "대학원생 20,000원/시간"] },
      { heading: "유의사항", items: ["근로시간은 수업시간과 중복 불가", "프로그램 참여지원비와 중복 계상 불가", "근무상황부 제출 필수"] },
    ],
  },
  grade: {
    intro: "마이크로디그리·부전공·복수전공을 이수한 우수 학생에게 지급합니다. (평점 평균 3.0 이상)",
    sections: [
      { heading: "지급 금액", items: ["마이크로디그리(MD): 30만원", "부전공: 100만원", "복수전공: 150만원"] },
      { heading: "이수 기준 학점", items: ["마이크로디그리: 12학점", "부전공: 21학점", "복수전공: 36학점"] },
      { heading: "교과목·평점", items: ["MD 과정별 필수 교과목 이수 필요", "평점 평균 3.0 이상", "부전공/복수전공: 미래융합가상학과 이수(예정)자 + MD 1개 이상 이수"] },
    ],
  },
  contest: {
    intro: "사업단 분야와 관련된 경진대회에서 입상한 학생에게 규모·등급별로 차등 지급합니다.",
    sections: [
      { heading: "A규모 (개인)", items: ["대상/최우수 100만원", "은상/우수 70만원", "동상/장려 50만원", "입상 30만원"] },
      { heading: "B규모 (개인)", items: ["대상/최우수 150만원", "은상/우수 100만원", "동상/장려 70만원", "입상 50만원"] },
      { heading: "팀 입상", items: ["A규모 팀: 100~200만원", "B규모 팀: 150~300만원"] },
    ],
  },
  certificate: {
    intro: "미래융합가상학과 학생이 사업 분야 자격증을 취득한 경우 난이도별로 지급합니다.",
    sections: [
      { heading: "신청 가능 자격증 (난이도/금액)", items: ["상(70만원): 정보보안기사, 빅데이터분석기사 등", "중(40만원): 정보처리기사, SQLD 등", "하(10만원): 정보처리산업기사, ADsP 등"] },
      { heading: "심의대장 자격증", items: ["목록에 없는 자격증은 심의위원회 검토 후 결정"] },
      { heading: "불가 자격증", items: ["사업 분야와 무관한 자격증", "어학 성적(TOEIC 등) 단독 신청"] },
    ],
  },
  labor: {
    intro: "사업단 프로그램에 근로학생으로 참여하고, 근무상황부를 증빙으로 근로장학금을 지급합니다.",
    showPrograms: true,
    sections: [
      { heading: "지급 단가", items: ["학부생 15,000원/시간 (월 40시간 이내)", "대학원생 20,000원/시간 (월 40시간 이내)"] },
      { heading: "운영 절차", items: ["모집 및 교수 추천 → 서류 검토 → 선발·운영 → 근무상황부 제출 → 근로장학금 지원"] },
      { heading: "제출 서류", items: ["근무상황부(지도교수·근로감독 담당자 확인)", "개인정보 수집·이용 동의서", "신분증·통장 사본", "재학증명서"] },
      { heading: "작성 유의사항", items: ["근로시간은 수업시간과 겹치지 않아야 함", "근로일시: 평일 09:00~18:00 사이", "본인 명의 통장"] },
    ],
  },
  activity: {
    intro: "학생 자치·동아리 활동, 학술 행사·학회 참가 등 학생 활동을 지원합니다.",
    showPrograms: true,
    sections: [
      { heading: "지원 대상", items: ["사업단 분야 관련 학생 활동", "학술 행사·학회 참가"] },
      { heading: "제출 서류", items: ["활동 계획서 또는 결과보고서", "지출 증빙(영수증 등)", "참가 증빙"] },
    ],
  },
};

export function getSiteContent(): SiteContent {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function getTypeContent(type: ApplicationType): TypeContent {
  const stored = getSiteContent()[type];
  return stored || DEFAULT_CONTENT[type];
}

export function saveSiteContent(content: SiteContent): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(content));
}
