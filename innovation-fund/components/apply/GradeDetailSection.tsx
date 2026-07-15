"use client";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
  MD_DEPARTMENTS, getProgramsByDept, getProgramById,
  GRADE_OPTIONS, GRADE_TO_POINT, MD_PROGRAMS, validateMD, type GradeValue,
} from "@/lib/md-courses";
import { isMdYearRecognized, MD_2026_REQUIRED_FROM } from "@/types";

interface MDCourseGrade { name: string; grade: string; isBase: boolean; }
interface MinorCourse { name: string; credits: number; grade: string; mdProgramId?: string; excluded?: boolean; custom?: boolean; }
// 교과목 드롭다운에서 '직접입력'을 나타내는 특수값
const CUSTOM_COURSE = "__custom__";
interface GradeDetail {
  subType: "microdegree" | "minor" | "double";
  courseName: string; credits: number; gpa: number; microDegreeCompleted: boolean;
  mdDepartment: string; mdProgramId: string; mdProgramName: string;
  mdCourses: MDCourseGrade[];
  minorMajorName: string; minorMajorCredits: number;
  minorCourses: MinorCourse[];
  minorIsMirae: boolean; minorMdCompleted: boolean;
  minorMdName: string;
  minorGradDate: string;                 // 졸업(예정) 시기 "YYYY-MM"
  minorMdYears: Record<string, string>;  // MD 과정 id → 발급 학년도("2025"|"2026")
}

// 졸업(예정) 연도 선택지 — 올해부터 6개년 (졸업월은 2월/8월)
const GRAD_YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

// 부전공/복수전공 전공 (3개)
const MINOR_MAJORS = ["클라우드융합학과", "사이버보안융합학과", "블록체인융합학과"];
// 평점 선택지 (가/부 포함 — 가/부는 평점평균 계산에서 제외)
const MINOR_GRADE_OPTIONS = [...GRADE_OPTIONS, "가", "부"];
// 학점 선택지 — 기본값 3학점(첫 번째)
const CREDIT_OPTIONS = [3, 2, 1];

// 전공명 → MD 카탈로그 학과(트랙 포함) 매칭
function programsForMajor(major: string) {
  if (!major) return [];
  const key = major.replace("학과", "");
  return MD_PROGRAMS.filter((p) => p.department.includes(key));
}
// 전공의 모든 교과목(관리자 설정 카탈로그) — 중복 제거
function coursesForMajor(major: string): string[] {
  const set = new Set<string>();
  programsForMajor(major).forEach((p) => {
    [...p.baseCourses, ...p.mainCourses].forEach((c) => set.add(c));
  });
  return Array.from(set);
}
// 평점평균(4.5 만점) — 가/부 제외, 학점 가중 평균
function calcMinorGpa(courses: MinorCourse[]): number {
  const graded = courses.filter((c) => c.grade && c.grade !== "가" && c.grade !== "부" && c.grade in GRADE_TO_POINT);
  const totCr = graded.reduce((s, c) => s + (Number(c.credits) || 0), 0);
  if (totCr === 0) return 0;
  const sum = graded.reduce((s, c) => s + GRADE_TO_POINT[c.grade as GradeValue] * (Number(c.credits) || 0), 0);
  return Math.round((sum / totCr) * 100) / 100;
}

interface Props { values: GradeDetail; onChange: (v: GradeDetail) => void; calculatedAmount: number; }

const SUB_TYPES = [
  { value: "microdegree", label: "마이크로디그리", amount: "30만원" },
  { value: "minor", label: "부전공", amount: "100만원" },
  { value: "double", label: "복수전공", amount: "150만원" },
] as const;

export default function GradeDetailSection({ values, onChange, calculatedAmount }: Props) {
  const set = <K extends keyof GradeDetail>(k: K, v: GradeDetail[K]) => onChange({ ...values, [k]: v });

  const program = values.mdProgramId ? getProgramById(values.mdProgramId) : undefined;

  // 학과 선택
  const selectDept = (dept: string) => {
    onChange({ ...values, mdDepartment: dept, mdProgramId: "", mdProgramName: "", mdCourses: [], gpa: 0 });
  };

  // MD 과정 선택
  const selectProgram = (id: string) => {
    const p = getProgramById(id);
    onChange({ ...values, mdProgramId: id, mdProgramName: p?.name || "", courseName: p?.name || "", mdCourses: [], gpa: 0 });
  };

  // 과목 체크 토글
  const toggleCourse = (name: string, isBase: boolean) => {
    const exists = values.mdCourses.find((c) => c.name === name);
    let next: MDCourseGrade[];
    if (exists) {
      next = values.mdCourses.filter((c) => c.name !== name);
    } else {
      next = [...values.mdCourses, { name, grade: "A+", isBase }];
    }
    const v = program ? validateMD(program, next.map((c) => ({ ...c, grade: c.grade as GradeValue }))) : { gpa: 0 };
    onChange({ ...values, mdCourses: next, gpa: v.gpa });
  };

  // 성적 변경
  const setGrade = (name: string, grade: string) => {
    const next = values.mdCourses.map((c) => (c.name === name ? { ...c, grade } : c));
    const v = program ? validateMD(program, next.map((c) => ({ ...c, grade: c.grade as GradeValue }))) : { gpa: 0 };
    onChange({ ...values, mdCourses: next, gpa: v.gpa });
  };

  const validation = useMemo(() => {
    if (!program) return null;
    return validateMD(program, values.mdCourses.map((c) => ({ ...c, grade: c.grade as GradeValue })));
  }, [program, values.mdCourses]);

  const isChecked = (name: string) => values.mdCourses.some((c) => c.name === name);
  const gradeOf = (name: string) => values.mdCourses.find((c) => c.name === name)?.grade || "A+";

  return (
    <div className="card space-y-5">
      <h2 className="section-title">성적 우수 지원금 신청 정보</h2>

      {/* 세부 유형 선택 */}
      <div>
        <label className="label">세부 유형 <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-3 gap-3">
          {SUB_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("subType", t.value)}
              className={`rounded-2xl p-3 text-center transition-all ${values.subType === t.value ? "btn-primary" : "btn-secondary"}`}
            >
              <div className="font-semibold text-sm">{t.label}</div>
              <div className={`text-xs mt-1 ${values.subType === t.value ? "text-white/80" : "text-indigo-500"}`}>{t.amount}</div>
            </button>
          ))}
        </div>
      </div>

      {/* === 마이크로디그리 === */}
      {values.subType === "microdegree" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-3 text-sm text-blue-700 space-y-1" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <p>• 평점 평균 3.0 이상이어야 지원 가능합니다. (가/부 과목 제외)</p>
            <p>• 동일 명칭 마이크로디그리는 최초 1회만 지급합니다.</p>
            <p>• 과정을 선택하면 이수 교과목과 성적을 입력해 자동 검증됩니다.</p>
          </div>

          {/* 학과 선택 */}
          <div>
            <label className="label">학과 선택 <span className="text-red-500">*</span></label>
            <select className="input-field" value={values.mdDepartment} onChange={(e) => selectDept(e.target.value)}>
              <option value="">학과를 선택하세요</option>
              {MD_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* MD 과정 선택 */}
          {values.mdDepartment && (
            <div>
              <label className="label">마이크로디그리 과정 <span className="text-red-500">*</span></label>
              <div className="grid sm:grid-cols-3 gap-2">
                {getProgramsByDept(values.mdDepartment).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProgram(p.id)}
                    className={`rounded-xl p-3 text-left transition-all ${values.mdProgramId === p.id ? "btn-primary" : "glass hover:bg-white"}`}
                  >
                    <div className={`text-xs ${values.mdProgramId === p.id ? "text-white/70" : "text-gray-400"}`}>{p.level} MD</div>
                    <div className="font-semibold text-sm">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 과목 선택 + 성적 */}
          {program && (
            <div className="space-y-3">
              <div className="rounded-xl px-3 py-2 text-xs font-medium text-indigo-700" style={{ background: "rgba(99,102,241,0.08)" }}>
                📋 이수조건: {program.rule}
              </div>

              {program.baseCourses.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1.5">기초(전공) 과목 — 최대 {program.baseMaxCount}과목 인정</div>
                  <div className="space-y-1.5">
                    {program.baseCourses.map((name) => (
                      <CourseRow key={name} name={name} checked={isChecked(name)} grade={gradeOf(name)} onToggle={() => toggleCourse(name, true)} onGrade={(g) => setGrade(name, g)} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-gray-500 mb-1.5">{program.level} 과목</div>
                <div className="space-y-1.5">
                  {program.mainCourses.map((name) => (
                    <CourseRow key={name} name={name} checked={isChecked(name)} grade={gradeOf(name)} onToggle={() => toggleCourse(name, false)} onGrade={(g) => setGrade(name, g)} />
                  ))}
                </div>
              </div>

              {/* 평점 + 검증 결과 */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.7)" }}>
                  <div className="text-xs text-gray-500">평점 평균 (자동 계산)</div>
                  <div className={`text-2xl font-extrabold ${validation && validation.gpa >= 3.0 ? "text-indigo-700" : "text-red-500"}`}>
                    {validation ? validation.gpa.toFixed(2) : "0.00"}
                    <span className="text-sm font-normal text-gray-400"> / 4.5</span>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.7)" }}>
                  <div className="text-xs text-gray-500">지급 예정액</div>
                  <div className="text-2xl font-extrabold text-indigo-700">{calculatedAmount.toLocaleString()}<span className="text-sm font-normal">원</span></div>
                </div>
              </div>

              {validation && validation.reasons.length > 0 && (
                <div className="rounded-2xl p-3 text-sm text-red-700 space-y-1" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4" /> 이수조건 미충족</div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {validation.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {validation && validation.ok && (
                <div className="flex items-center gap-2 rounded-2xl p-3 text-sm text-green-700 font-medium" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <CheckCircle className="w-4 h-4" /> 이수조건을 충족합니다. 신청 가능합니다.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === 부전공 / 복수전공 === */}
      {(values.subType === "minor" || values.subType === "double") && (() => {
        const isMinor = values.subType === "minor";
        const reqCredits = isMinor ? 21 : 36;
        const courses = values.minorCourses || [];
        const courseOptions = coursesForMajor(values.minorMajorName);
        const mdPrograms = programsForMajor(values.minorMajorName);
        // 과목이 선택한 MD 과정에 포함되는지 검증
        const inMd = (c: MinorCourse): boolean => {
          if (!c.mdProgramId) return true;
          const p = getProgramById(c.mdProgramId);
          return !!p && [...p.baseCourses, ...p.mainCourses].includes(c.name);
        };

        const totalCredits = courses.reduce((s, c) => s + (Number(c.credits) || 0), 0);
        // 학점 불인정(MD) 과목의 학점 제외
        const mdExcluded = courses.filter((c) => c.mdProgramId && c.excluded).reduce((s, c) => s + (Number(c.credits) || 0), 0);
        const netCredits = totalCredits - mdExcluded;
        const autoGpa = calcMinorGpa(courses);
        const mdNames = Array.from(new Set(courses.filter((c) => c.mdProgramId).map((c) => getProgramById(c.mdProgramId!)?.name).filter(Boolean) as string[]));
        const hasMd = mdNames.length > 0;
        const mismatch = courses.some((c) => !inMd(c));

        // 이수한 MD 과정(중복 제거) — 발급 학년도 선택 대상
        const mdYears = values.minorMdYears || {};
        const usedMdIds = Array.from(new Set(courses.map((c) => c.mdProgramId).filter(Boolean) as string[]));
        const allYearsSelected = usedMdIds.length > 0 && usedMdIds.every((id) => !!mdYears[id]);
        // 졸업(예정) 시기 기준 인정되는 MD가 1개 이상인가 (세부지침 2026-07-07 개정)
        const needs2026Md = !!values.minorGradDate && values.minorGradDate >= MD_2026_REQUIRED_FROM;
        const hasRecognizedMd = usedMdIds.some((id) => isMdYearRecognized(values.minorGradDate, mdYears[id]));

        // 졸업(예정) 시기 옵션 — 현재 달(YYYY-MM) 기준으로 지난 시기만 자동 제외 (당월·이후는 표시). (졸업월: 2·8월)
        const gradNow = new Date();
        const curYm = gradNow.getFullYear() * 100 + (gradNow.getMonth() + 1);
        const gradOpts = GRAD_YEARS.flatMap((y) => ["02", "08"].map((m) => ({ y, m }))).filter((o) => o.y * 100 + Number(o.m) >= curYm);
        const gradYearOpts = Array.from(new Set(gradOpts.map((o) => o.y)));
        const gradMonthsFor = (y: string) => gradOpts.filter((o) => String(o.y) === String(y)).map((o) => o.m);

        // 변경 시 평점평균·인정학점·MD 정보 자동 반영
        // - 사용하지 않는 MD의 발급 학년도 정리
        // - 2025학년도 MD는 불인정 학점이 없으므로 해당 과목의 '학점 불인정' 자동 해제
        const apply = (cs: MinorCourse[], patch: Partial<GradeDetail> = {}) => {
          const ids = Array.from(new Set(cs.map((c) => c.mdProgramId).filter(Boolean) as string[]));
          const yearsRaw = (patch.minorMdYears ?? mdYears) as Record<string, string>;
          const years: Record<string, string> = {};
          ids.forEach((id) => { if (yearsRaw[id]) years[id] = yearsRaw[id]; });
          cs = cs.map((c) => (c.mdProgramId && years[c.mdProgramId] === "2025" && c.excluded ? { ...c, excluded: false } : c));
          const tot = cs.reduce((s, c) => s + (Number(c.credits) || 0), 0);
          const exCr = cs.filter((c) => c.mdProgramId && c.excluded).reduce((s, c) => s + (Number(c.credits) || 0), 0);
          const names = Array.from(new Set(cs.filter((c) => c.mdProgramId).map((c) => getProgramById(c.mdProgramId!)?.name).filter(Boolean) as string[]));
          onChange({
            ...values, ...patch, minorCourses: cs, minorMdYears: years,
            gpa: calcMinorGpa(cs),
            minorMajorCredits: tot - exCr,
            minorMdCompleted: names.length > 0,
            minorMdName: names.join(", "),
          });
        };
        // MD 발급 학년도 선택
        const setMdYear = (id: string, year: string) => apply(courses, { minorMdYears: { ...mdYears, [id]: year } });
        // 새로 추가하는 과목이 맨 위로 오도록 prepend (학점 기본 3)
        const addCourse = () => apply([{ name: "", credits: 3, grade: "A+", mdProgramId: "", excluded: false }, ...courses]);
        // 이미 선택된 교과목은 다른 행의 드롭다운에서 제외(중복 추가 방지)
        const usedNames = new Set(courses.map((c) => c.name).filter(Boolean));
        const setCourse = (i: number, patch: Partial<MinorCourse>) =>
          apply(courses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
        const removeCourse = (i: number) => apply(courses.filter((_, idx) => idx !== i));
        const selectMajor = (m: string) =>
          onChange({ ...values, minorMajorName: m, minorCourses: [], gpa: 0, minorMajorCredits: 0, minorMdCompleted: false, minorMdName: "" });

        const conditions = [
          { ok: autoGpa >= 3.0, label: "이수 교과목 평점 평균 3.0 이상 (4.5 만점)" },
          { ok: !!values.minorGradDate, label: "졸업(예정) 시기 선택" },
          { ok: hasMd && allYearsSelected, label: "마이크로디그리(MD) 1개 이상 이수 + 발급 학년도 선택" },
          {
            ok: hasRecognizedMd,
            label: needs2026Md
              ? "인정되는 MD 이수 — 2027년 8월 졸업(예정)자부터 2026학년도 개편 MD만 인정 (2025학년도 MD 불인정)"
              : "인정되는 MD 이수 — 2027년 2월 졸업(예정)자까지 2025학년도 발급 MD 인정",
          },
          { ok: netCredits >= reqCredits, label: `MD 학점 불인정 제외 인정 학점 ${reqCredits}학점 이상 (현재 ${netCredits}학점)` },
          { ok: !mismatch, label: "MD 이수과목이 선택한 MD 과정에 포함됨" },
        ];
        const allOk = conditions.every((c) => c.ok);
        return (
        <div className="space-y-4">
          <div className="rounded-2xl p-3 text-sm text-blue-700 space-y-1" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <p className="font-semibold">{isMinor ? "부전공" : "복수전공"} 성적우수 지원 조건 (세부지침 제7조)</p>
            <p>• 미래융합가상학과 {isMinor ? "부전공" : "복수전공"} 이수(예정)자</p>
            <p>• 이수 교과목 평점 평균 3.0 이상 (4.5 만점)</p>
            <p>• 마이크로디그리(MD) 1개 이상 이수</p>
            <p className="pl-3">– <b>2027년 2월 졸업(예정)자까지</b>: 2025학년도 발급 MD 인정 (학점 불인정 없음)</p>
            <p className="pl-3">– <b>2027년 8월 졸업(예정)자부터</b>: 2026학년도 개편(총장명의) MD만 인정 (2025학년도 MD 불인정)</p>
            <p>• 지원금액: {isMinor ? "100만원 (21학점)" : "150만원 (36학점)"}</p>
          </div>

          {/* 졸업(예정) 시기 — MD 발급 학년도 인정 판정 기준 */}
          <div>
            <label className="label">졸업(예정) 시기 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-field" value={values.minorGradDate ? values.minorGradDate.slice(0, 4) : ""}
                onChange={(e) => {
                  const y = e.target.value;
                  if (!y) { set("minorGradDate", ""); return; }
                  const ms = gradMonthsFor(y);
                  const cur = values.minorGradDate?.slice(5);
                  const m = cur && ms.includes(cur) ? cur : ms[0] || "02";
                  set("minorGradDate", `${y}-${m}`);
                }}>
                <option value="">졸업 연도</option>
                {gradYearOpts.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select className="input-field" value={values.minorGradDate ? values.minorGradDate.slice(5) : ""}
                disabled={!values.minorGradDate}
                onChange={(e) => set("minorGradDate", `${values.minorGradDate.slice(0, 4)}-${e.target.value}`)}>
                {!values.minorGradDate && <option value="">월</option>}
                {gradMonthsFor(values.minorGradDate ? values.minorGradDate.slice(0, 4) : "").map((m) => (
                  <option key={m} value={m}>{m === "02" ? "2월" : "8월"}</option>
                ))}
              </select>
            </div>
            {needs2026Md && (
              <p className="text-xs text-amber-700 mt-1">※ 2027년 8월 졸업(예정)자부터는 <b>2026학년도 개편 MD만 인정</b>됩니다. (2025학년도 발급 MD 불인정)</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{isMinor ? "부전공" : "복수전공"} 전공명 <span className="text-red-500">*</span></label>
              <select className="input-field" value={values.minorMajorName} onChange={(e) => selectMajor(e.target.value)}>
                <option value="">전공을 선택하세요</option>
                {MINOR_MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">이수 교과목 평점 평균 (4.5 만점, 자동 계산)</label>
              <div className={`input-field font-bold ${autoGpa >= 3.0 ? "text-indigo-700" : "text-red-500"}`}>
                {autoGpa.toFixed(2)} / 4.5
              </div>
              {autoGpa > 0 && autoGpa < 3.0 && (
                <p className="text-xs text-red-500 mt-1">⚠️ 평점 평균 3.0 이상이어야 지원 가능합니다.</p>
              )}
            </div>
          </div>

          {/* 교과목 이수내역 (과목별 MD 지정) */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}>
            <div className="flex items-center justify-between">
              <label className="label !mb-0">이수 교과목 내역 <span className="text-red-500">*</span></label>
              <button type="button" onClick={addCourse} disabled={!values.minorMajorName} className="btn-secondary text-sm !h-9 flex items-center gap-1 disabled:opacity-50">+ 과목 추가</button>
            </div>
            <p className="text-[11px] text-amber-700">
              ※ MD 이수과목이면 「MD 과정」을 선택하세요. <b>2025학년도 발급 MD는 전 학점이 인정</b>되고,
              <b> 2026학년도 개편(총장명의) MD는 이수학점(12학점) 중 절반(6학점)만 인정</b>되므로 불인정 과목을 체크하면 해당 학점이 인정 학점에서 제외됩니다. (선택한 MD 과정에 포함된 교과목인지 자동 확인)
            </p>
            {!values.minorMajorName ? (
              <p className="text-sm text-gray-400">먼저 전공을 선택하면 해당 전공 교과목을 추가할 수 있습니다.</p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-gray-400">「과목 추가」로 이수한 교과목을 입력하세요.</p>
            ) : (
              <div className="space-y-2.5">
                {courses.map((c, i) => {
                  const ok = inMd(c);
                  return (
                  <div key={i} className="rounded-xl p-2.5 space-y-2" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.8)" }}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <select className="input-field !min-h-[40px] col-span-12 sm:col-span-6" value={c.custom ? CUSTOM_COURSE : c.name}
                        onChange={(e) => e.target.value === CUSTOM_COURSE ? setCourse(i, { custom: true, name: "" }) : setCourse(i, { custom: false, name: e.target.value })}>
                        <option value="">교과목 선택</option>
                        {courseOptions.filter((name) => name === c.name || !usedNames.has(name)).map((name) => <option key={name} value={name}>{name}</option>)}
                        <option value={CUSTOM_COURSE}>✏️ 직접입력</option>
                      </select>
                      <select className="input-field !min-h-[40px] col-span-5 sm:col-span-2" value={c.credits || 1} onChange={(e) => setCourse(i, { credits: Number(e.target.value) })}>
                        {CREDIT_OPTIONS.map((n) => <option key={n} value={n}>{n}학점</option>)}
                      </select>
                      <select className="input-field !min-h-[40px] col-span-5 sm:col-span-3" value={c.grade || "A+"} onChange={(e) => setCourse(i, { grade: e.target.value })}>
                        {MINOR_GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <button type="button" onClick={() => removeCourse(i)} className="btn-danger !h-9 !px-2 col-span-2 sm:col-span-1 flex items-center justify-center">✕</button>
                    </div>
                    {c.custom && (
                      <input className="input-field !min-h-[38px] !text-sm" placeholder="교과목명을 직접 입력하세요" value={c.name} onChange={(e) => setCourse(i, { name: e.target.value })} />
                    )}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <select className="input-field !min-h-[38px] !text-sm col-span-8 sm:col-span-7" value={c.mdProgramId || ""} onChange={(e) => setCourse(i, { mdProgramId: e.target.value, excluded: e.target.value ? c.excluded : false })}>
                        <option value="">MD 이수과목 아님</option>
                        {mdPrograms.map((p) => <option key={p.id} value={p.id}>MD: {p.level} · {p.name}</option>)}
                      </select>
                      {c.mdProgramId ? (
                        mdYears[c.mdProgramId] === "2025" ? (
                          // 2025학년도 발급 MD: 불인정 학점 없음 (전 학점 인정)
                          <div className="col-span-4 sm:col-span-5 flex items-center text-xs text-green-700 rounded-lg px-2 py-1.5" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                            2025학년도 MD · 전 학점 인정
                          </div>
                        ) : (
                        <label className="col-span-4 sm:col-span-5 flex items-center gap-1.5 text-sm cursor-pointer rounded-lg px-2 py-1.5" style={{ background: c.excluded ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.5)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <input type="checkbox" checked={!!c.excluded} onChange={(e) => setCourse(i, { excluded: e.target.checked })} className="w-4 h-4 accent-red-500" />
                          학점 불인정
                        </label>
                        )
                      ) : <div className="col-span-4 sm:col-span-5" />}
                    </div>
                    {c.mdProgramId && c.name && !ok && (
                      <p className="text-xs text-red-600">⚠️ 선택한 MD 과정에 포함되지 않은 교과목입니다. MD 과정 또는 교과목을 다시 확인해주세요.</p>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-gray-400">※ 평점평균은 입력한 평점·학점으로 자동 계산됩니다. (가/부 과목은 평점평균에서 제외)</p>
          </div>

          {/* 이수 MD 발급 학년도 — 졸업 시기에 따라 인정 여부 판정 */}
          {usedMdIds.length > 0 && (
            <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}>
              <label className="label !mb-0">이수 MD 발급 학년도 <span className="text-red-500">*</span></label>
              <p className="text-[11px] text-gray-500">이수한 마이크로디그리(MD)를 발급받은 학년도를 선택하세요. 2026학년도부터는 개편된 총장명의 MD만 발급됩니다.</p>
              {usedMdIds.map((id) => {
                const p = getProgramById(id);
                const yr = mdYears[id] || "";
                const recognized = isMdYearRecognized(values.minorGradDate, yr);
                return (
                  <div key={id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-6 text-sm font-medium">{p?.name || id}</div>
                    <select className="input-field !min-h-[40px] col-span-8 sm:col-span-4" value={yr} onChange={(e) => setMdYear(id, e.target.value)}>
                      <option value="">발급 학년도 선택</option>
                      <option value="2025">2025학년도</option>
                      <option value="2026">2026학년도(개편·총장명의)</option>
                    </select>
                    <div className="col-span-4 sm:col-span-2 text-xs font-semibold text-center">
                      {!yr || !values.minorGradDate ? <span className="text-gray-400">-</span>
                        : recognized ? <span className="text-green-700">인정</span>
                        : <span className="text-red-600">불인정</span>}
                    </div>
                  </div>
                );
              })}
              {needs2026Md && hasMd && allYearsSelected && !hasRecognizedMd && (
                <div className="rounded-xl p-3 text-sm text-red-700 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>2027년 8월 졸업(예정)자부터는 <b>2026학년도 개편 MD만 인정</b>됩니다. 2025학년도 발급 MD만 보유한 경우 신청이 불가합니다.</span>
                </div>
              )}
            </div>
          )}

          {/* 학점 요약 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.7)" }}>
              <div className="text-[11px] text-gray-500">총 이수 학점</div>
              <div className="font-bold text-gray-700">{totalCredits}학점</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(251,191,36,0.12)" }}>
              <div className="text-[11px] text-amber-700">MD 학점 불인정</div>
              <div className="font-bold text-amber-700">-{mdExcluded}학점</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: netCredits >= reqCredits ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)" }}>
              <div className="text-[11px] text-gray-500">인정 학점 (기준 {reqCredits})</div>
              <div className={`font-bold ${netCredits >= reqCredits ? "text-green-700" : "text-red-600"}`}>{netCredits}학점</div>
            </div>
          </div>

          <div>
            <label className="label">지급 예정액</label>
            <div className="input-field font-bold text-indigo-700">{calculatedAmount.toLocaleString()}원</div>
          </div>

          {/* 자격 요건 체크리스트 */}
          <div className="rounded-2xl p-3 space-y-1.5" style={{ background: allOk ? "rgba(34,197,94,0.1)" : "rgba(251,191,36,0.1)", border: `1px solid ${allOk ? "rgba(34,197,94,0.3)" : "rgba(251,191,36,0.3)"}` }}>
            <div className="text-xs font-bold text-gray-600 mb-1">지원 자격 확인</div>
            {conditions.map((c, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${c.ok ? "text-green-700" : "text-gray-500"}`}>
                {c.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                {c.label}
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function CourseRow({ name, checked, grade, onToggle, onGrade }: {
  name: string; checked: boolean; grade: string;
  onToggle: () => void; onGrade: (g: string) => void;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${checked ? "" : "opacity-80"}`} style={{ background: checked ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.6)" }}>
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onToggle} className="w-4 h-4 accent-indigo-600" />
        <span className="text-sm font-medium">{name}</span>
      </label>
      {checked && (
        <select value={grade} onChange={(e) => onGrade(e.target.value)} className="rounded-lg px-2 py-1 text-sm font-medium" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(99,102,241,0.3)" }}>
          {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      )}
    </div>
  );
}
