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
  | "lodging"       // 표준 블록: 숙박비(개인/단체 한도)
  | "eventLocation";// 표준 블록: 활동(참여) 장소(국내/국외)

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
  eventLocation: "활동 장소(표준)",
};

// 표준 블록(여러 칸이 묶여있는) 타입 — 라벨/필수만 의미가 있고 옵션 없음
export const STANDARD_TYPES: FormFieldType[] = ["applicantInfo", "account", "privacyConsent", "workLog", "transport", "registration", "lodging", "eventLocation"];

// 근무상황부 구분별 단가/시간 — 재학생(1~4학년 통합) / 대학원생
export const WORKLOG_GROUPS: { key: string; label: string }[] = [
  { key: "재학생", label: "재학생(1~4학년)" }, { key: "대학원생", label: "대학원생" },
];
// 기본정보 학년 → 구분 매핑 (1~4 → 재학생, 대학원 → 대학원생)
export function workLogGroupOfGrade(grade: string): string {
  return grade === "대학원" ? "대학원생" : "재학생";
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];      // select
  branches?: Record<string, FormField[]>; // select: 선택지별 조건부 하위질문(선택지 값 → 하위 항목 목록)
  text?: string;           // agreement 본문
  placeholder?: string;
  uploadNotice?: string;   // file: 업로드 직전 띄울 안내창 문구(예: 재학증명서는 직인 날인본 제출)
  minLen?: number;         // shortText/longText: 최소 글자수(이상)
  maxLen?: number;         // shortText/longText: 최대 글자수(이하)
  range?: boolean;         // date: 기간(시작일~종료일) 선택 여부
  unitPrice?: number;      // workLog: 시간당 단가(원, 고정) — 근무시간 합계 × 단가 = 합계 자동 계산
  unitPriceMode?: "flat" | "byGrade"; // workLog: 단가 방식(고정 / 구분별)
  unitPriceByGrade?: Record<string, number>; // workLog: 구분별 시간당 단가 (키: 재학생/대학원생)
  maxHours?: number;       // workLog: 입력 가능한 최대 근무시간(합계 상한, 고정)
  maxHoursByGrade?: Record<string, number>; // workLog: 구분별 최대 입력 시간
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
        fields: [
          { id: newSchemaId("f"), label: "신청자 기본정보", type: "applicantInfo", required: true },
          { id: newSchemaId("f"), label: "개인정보 수집·이용 및 신청 동의", type: "privacyConsent", required: true },
        ],
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

// 혁신인재지원금 — 기존(코드 내장) 신청서 양식을 모두 수정 가능한 항목으로 옮긴 기본 폼.
// 프로그램 참여(교과·비교과/현장실습/학회 등) 기준의 종합 양식. 모든 항목 편집·삭제 가능.
export function defaultInnovationSchema(programName: string, phase: "pre" | "fund"): FormSchema {
  const isPre = phase === "pre";
  const f = (label: string, type: FormFieldType, extra: Partial<FormField> = {}): FormField => ({ id: newSchemaId("f"), label, type, ...extra });
  const steps: FormStep[] = [
    { id: newSchemaId(), title: "기본 정보", fields: [
      f("신청자 기본정보", "applicantInfo", { required: true }),
      f("개인정보 수집·이용 및 신청 동의", "privacyConsent", { required: true }),
    ] },
    { id: newSchemaId(), title: "프로그램 정보", fields: [
      f("역할/직무", "shortText", {}),
      f("활동 기간", "date", { required: true, range: true }),
      f("활동 실적/성과", "longText", {}),
    ] },
  ];
  if (!isPre) {
    steps.push({ id: newSchemaId(), title: "비용", fields: [
      f("등록비", "registration"),
      f("교통비", "transport"),
      f("숙박비", "lodging"),
    ] });
  }
  steps.push({ id: newSchemaId(), title: "서류 업로드", fields: [
    f("증빙 서류 (참가확인서·결과보고 등)", "file", { required: !isPre }),
  ] });
  steps.push({ id: newSchemaId(), title: isPre ? "동의 및 서명" : "계좌 및 서명", fields: [
    ...(isPre ? [] : [f("입금 계좌 정보", "account", { required: true })]),
    f("신청인 서명", "signature", { required: true }),
  ] });
  return { submitLabel: isPre ? "지원신청 제출" : "신청 제출", steps };
}

// 필드 깊은 복사 (options 배열 / branches(선택지별 하위질문) 객체까지 새 참조로 복제)
function cloneField(f: FormField): FormField {
  const c: FormField = { ...f, id: newSchemaId("f") };
  if (f.options) c.options = [...f.options];
  if (f.unitPriceByGrade) c.unitPriceByGrade = { ...f.unitPriceByGrade };
  if (f.maxHoursByGrade) c.maxHoursByGrade = { ...f.maxHoursByGrade };
  if (f.branches) {
    c.branches = {};
    for (const [opt, subs] of Object.entries(f.branches)) c.branches[opt] = (subs || []).map(cloneField);
  }
  return c;
}

// 스키마를 새 id로 깊은 복사 (템플릿 복사용 — 원본/복사본 id·참조 충돌 방지)
export function cloneSchema(schema: FormSchema): FormSchema {
  return {
    submitLabel: schema.submitLabel,
    steps: (schema.steps || []).map((s) => ({
      id: newSchemaId(),
      title: s.title,
      fields: (s.fields || []).map(cloneField),
    })),
  };
}
