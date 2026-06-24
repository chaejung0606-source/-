// 프로그램별 신청 폼 스키마 — 관리자가 구글폼처럼 단계·항목·필수여부를 편집하고
// 신청자에게 보이는 폼을 그대로 구성한다.
import type { ReportField } from "./programs";

export type FormFieldType =
  | "shortText"     // 한 줄 입력
  | "longText"      // 서술형
  | "number"        // 숫자/금액
  | "date"          // 날짜
  | "select"        // 드롭다운
  | "file"          // 파일 업로드
  | "agreement"     // 서약(동의)
  | "signature"     // 서명
  | "applicantInfo" // 표준 블록: 기본정보(이름·학번·학과 등)
  | "account"       // 표준 블록: 계좌 정보
  | "privacyConsent"// 표준 블록: 개인정보 수집·이용 및 신청 동의
  | "workLog"       // 표준 블록: 근무상황부(날짜·시간·근무시간)
  | "transport"     // 표준 블록: 교통비(다중 행)
  | "registration"  // 표준 블록: 등록비(+증빙)
  | "lodging";      // 표준 블록: 숙박비(개인/단체 한도)

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  shortText: "한 줄 입력",
  longText: "서술형",
  number: "숫자/금액",
  date: "날짜",
  select: "드롭다운",
  file: "파일 업로드",
  agreement: "서약(동의)",
  signature: "서명",
  applicantInfo: "기본정보(표준)",
  account: "계좌정보(표준)",
  privacyConsent: "개인정보동의(표준)",
  workLog: "근무상황부(표준)",
  transport: "교통비(표준)",
  registration: "등록비(표준)",
  lodging: "숙박비(표준)",
};

// 표준 블록(여러 칸이 묶여있는) 타입 — 라벨/필수만 의미가 있고 옵션 없음
export const STANDARD_TYPES: FormFieldType[] = ["applicantInfo", "account", "privacyConsent", "workLog", "transport", "registration", "lodging"];

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];      // select
  text?: string;           // agreement 본문
  placeholder?: string;
  range?: boolean;         // date: 기간(시작일~종료일) 선택 여부
}

export interface FormStep {
  id: string;
  title: string;
  fields: FormField[];
}

export interface FormSchema {
  steps: FormStep[];
  submitLabel?: string;   // 신청제출 버튼 라벨
}

export function newSchemaId(prefix = "s"): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

// 구버전 ReportField → FormField 변환
function fieldFromReport(f: ReportField): FormField {
  const typeMap: Record<string, FormFieldType> = {
    text: "longText", file: "file", select: "select", agreement: "agreement", signature: "signature",
  };
  return { id: f.id || newSchemaId("f"), label: f.label, type: typeMap[f.type] || "longText", required: f.required, options: f.options, text: f.text };
}

// 프로그램의 기존 입력 항목(reportFields)으로 기본 폼 스키마 생성
export function defaultSchemaFromFields(programName: string, fields: ReportField[], phase: "pre" | "fund"): FormSchema {
  const custom = (fields || []).map(fieldFromReport);
  return {
    submitLabel: phase === "pre" ? "지원신청 제출" : "신청 제출",
    steps: [
      {
        id: newSchemaId(), title: "기본 정보",
        fields: [{ id: newSchemaId("f"), label: "신청자 기본정보", type: "applicantInfo", required: true }],
      },
      {
        id: newSchemaId(), title: "신청 정보",
        fields: custom.length ? custom : [{ id: newSchemaId("f"), label: "활동 내용", type: "longText", required: true }],
      },
      {
        id: newSchemaId(), title: "서류 업로드",
        fields: [{ id: newSchemaId("f"), label: "증빙 서류", type: "file", required: false }],
      },
      {
        id: newSchemaId(), title: "계좌 및 서명",
        fields: [
          { id: newSchemaId("f"), label: "입금 계좌 정보", type: "account", required: true },
          { id: newSchemaId("f"), label: "신청인 서명", type: "signature", required: true },
        ],
      },
    ],
  };
}

export function emptySchema(): FormSchema {
  return { submitLabel: "신청 제출", steps: [{ id: newSchemaId(), title: "1단계", fields: [] }] };
}

// 스키마를 새 id로 깊은 복사 (템플릿 복사용 — 원본/복사본 id 충돌 방지)
export function cloneSchema(schema: FormSchema): FormSchema {
  return {
    submitLabel: schema.submitLabel,
    steps: (schema.steps || []).map((s) => ({
      id: newSchemaId(),
      title: s.title,
      fields: (s.fields || []).map((f) => ({ ...f, id: newSchemaId("f") })),
    })),
  };
}
