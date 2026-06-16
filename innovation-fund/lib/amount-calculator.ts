import type { ContestScale, ContestAward, CertificateLevel, GradeSubType, StudentType } from "@/types";

export function calcContestAmount(
  scale: ContestScale,
  award: ContestAward,
  isTeam: boolean
): number {
  const table: Record<string, Record<ContestAward, number>> = {
    "A-individual": { grand: 1000000, silver: 700000, bronze: 500000, participation: 300000 },
    "B-individual": { grand: 1500000, silver: 1000000, bronze: 700000, participation: 500000 },
    "A-team":       { grand: 2000000, silver: 1500000, bronze: 1300000, participation: 1000000 },
    "B-team":       { grand: 3000000, silver: 2000000, bronze: 1800000, participation: 1500000 },
  };
  const key = `${scale}-${isTeam ? "team" : "individual"}`;
  return table[key]?.[award] ?? 0;
}

export function calcCertAmount(level: CertificateLevel): number {
  const map: Record<CertificateLevel, number> = {
    high: 700000,
    mid: 400000,
    low: 100000,
    review: 0,
  };
  return map[level];
}

export function calcGradeAmount(subType: GradeSubType): number {
  const map: Record<GradeSubType, number> = {
    microdegree: 300000,
    minor: 1000000,
    double: 1500000,
  };
  return map[subType];
}

export function calcStaffAmount(hours: number, studentType: StudentType): number {
  const rate = studentType === "graduate" ? 20000 : 15000;
  return hours * rate;
}
