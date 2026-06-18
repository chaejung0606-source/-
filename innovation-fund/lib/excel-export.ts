import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { Application } from "@/types";
import {
  APPLICATION_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types";

function getSubTypeName(app: Application): string {
  if (app.gradeDetail) {
    const map = { microdegree: "마이크로디그리", minor: "부전공", double: "복수전공" };
    return map[app.gradeDetail.subType];
  }
  if (app.contestDetail) {
    const scaleMap = { A: "A규모", B: "B규모" };
    const awardMap = { grand: "대상/최우수", silver: "은상/우수", bronze: "동상/장려", participation: "입상" };
    return `${scaleMap[app.contestDetail.scale]} ${awardMap[app.contestDetail.awardLevel]}`;
  }
  if (app.certificateDetail) {
    const lvlMap = { high: "상", mid: "중", low: "하", review: "심의필요" };
    return `난이도 ${lvlMap[app.certificateDetail.difficulty]}`;
  }
  if (app.staffDetail) {
    return app.staffDetail.studentType === "graduate" ? "대학원생" : "대학생";
  }
  return "";
}

function getAchievementName(app: Application): string {
  if (app.programDetail) return app.programDetail.programName;
  if (app.staffDetail) return app.staffDetail.programName;
  if (app.gradeDetail) return app.gradeDetail.courseName;
  if (app.contestDetail) return app.contestDetail.contestName;
  if (app.certificateDetail) return app.certificateDetail.certName;
  if (app.laborDetail) return app.laborDetail.programName;
  if (app.activityDetail) return app.activityDetail.activityName;
  return "";
}

export function exportToExcel(apps: Application[], filename?: string): void {
  const rows = apps.map((app) => ({
    접수번호: app.receiptNumber,
    신청일: app.applicationDate,
    이름: app.name,
    학번: app.studentId,
    소속대학: app.university,
    학과: app.department,
    학년: app.grade,
    연락처: app.phone,
    이메일: app.email,
    신청유형: APPLICATION_TYPE_LABELS[app.applicationType],
    세부유형: getSubTypeName(app),
    프로그램명_또는_성과명: getAchievementName(app),
    신청금액: app.requestAmount,
    자동산정금액: app.calculatedAmount,
    최종승인금액: app.approvedAmount ?? "",
    검토상태: REVIEW_STATUS_LABELS[app.reviewStatus],
    지급상태: PAYMENT_STATUS_LABELS[app.paymentStatus],
    관리자메모: app.adminMemo,
    은행명: app.bankInfo.bankName,
    계좌번호: app.bankInfo.accountNumber,
    예금주: app.bankInfo.accountHolder,
    첨부파일목록: app.files.map((f) => f.name).join(", "),
    최종수정일: app.updatedAt ? format(new Date(app.updatedAt), "yyyy-MM-dd HH:mm") : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "신청내역");

  // 컬럼 너비 설정
  ws["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 6 }, { wch: 16 }, { wch: 24 }, { wch: 24 },
    { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 22 },
    { wch: 10 }, { wch: 36 }, { wch: 18 },
  ];

  const today = format(new Date(), "yyyyMMdd");
  const fname = filename || `혁신인재지원금_신청내역_${today}.xlsx`;
  XLSX.writeFile(wb, fname);
}
