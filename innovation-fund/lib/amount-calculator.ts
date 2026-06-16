import type { ContestScale, ContestAward, CertificateLevel, GradeSubType, StudentType } from "@/types";
import {
  STAFF_HOURLY_RATE, GRADE_AMOUNT, CERT_AMOUNT, CONTEST_AMOUNT, contestKey,
} from "@/config/payment";

export function calcContestAmount(scale: ContestScale, award: ContestAward, isTeam: boolean): number {
  return CONTEST_AMOUNT[contestKey(scale, isTeam)]?.[award] ?? 0;
}

export function calcCertAmount(level: CertificateLevel): number {
  return CERT_AMOUNT[level];
}

export function calcGradeAmount(subType: GradeSubType): number {
  return GRADE_AMOUNT[subType];
}

export function calcStaffAmount(hours: number, studentType: StudentType): number {
  return hours * STAFF_HOURLY_RATE[studentType];
}
