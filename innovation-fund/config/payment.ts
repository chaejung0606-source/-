// 지급액 단일 소스 (모든 금액 상수는 여기서만 정의)
import type {
  ContestScale, ContestAward, CertificateLevel, GradeSubType, StudentType,
} from "@/types";

// 진행요원 시간당 단가
export const STAFF_HOURLY_RATE: Record<StudentType, number> = {
  undergraduate: 15000,
  graduate: 20000,
};

// 성적 우수 지원금 (세부유형별)
export const GRADE_AMOUNT: Record<GradeSubType, number> = {
  microdegree: 300000,
  minor: 1000000,
  double: 1500000,
};

// 성적 우수 기준 학점
export const GRADE_REQUIRED_CREDITS: Record<GradeSubType, number> = {
  microdegree: 12,
  minor: 21,
  double: 36,
};

// 자격증 난이도별 지급액
export const CERT_AMOUNT: Record<CertificateLevel, number> = {
  high: 700000,
  mid: 400000,
  low: 100000,
  review: 0,
};

// 경진대회: [규모-개인/팀][시상등급]
export const CONTEST_AMOUNT: Record<string, Record<ContestAward, number>> = {
  "A-individual": { grand: 1000000, silver: 700000, bronze: 500000, participation: 300000 },
  "B-individual": { grand: 1500000, silver: 1000000, bronze: 700000, participation: 500000 },
  "A-team": { grand: 2000000, silver: 1500000, bronze: 1300000, participation: 1000000 },
  "B-team": { grand: 3000000, silver: 2000000, bronze: 1800000, participation: 1500000 },
};

export function contestKey(scale: ContestScale, isTeam: boolean): string {
  return `${scale}-${isTeam ? "team" : "individual"}`;
}

// 성적 우수 최소 평점
export const MIN_GPA = 3.0;
