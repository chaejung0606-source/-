"use client";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
  MD_DEPARTMENTS, getProgramsByDept, getProgramById,
  GRADE_OPTIONS, GRADE_TO_POINT, MD_PROGRAMS, validateMD, type GradeValue,
} from "@/lib/md-courses";

interface MDCourseGrade { name: string; grade: string; isBase: boolean; }
interface MinorCourse { name: string; credits: number; grade: string; }
interface GradeDetail {
  subType: "microdegree" | "minor" | "double";
  courseName: string; credits: number; gpa: number; microDegreeCompleted: boolean;
  mdDepartment: string; mdProgramId: string; mdProgramName: string;
  mdCourses: MDCourseGrade[];
  minorMajorName: string; minorMajorCredits: number;
  minorCourses: MinorCourse[];
  minorIsMirae: boolean; minorMdCompleted: boolean;
  minorMdProgramId: string; minorMdName: string;
  minorExcludedCourses: string[];
}

// 부전공/복수전공 전공 (3개)
const MINOR_MAJORS = ["클라우드융합학과", "사이버보안융합학과", "블록체인융합학과"];
// 평점 선택지 (가/부 포함 — 가/부는 평점평균 계산에서 제외)
const MINOR_GRADE_OPTIONS = [...GRADE_OPTIONS, "가", "부"];
const CREDIT_OPTIONS = [1, 2, 3];

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
        const excluded = values.minorExcludedCourses || [];
        const courseOptions = coursesForMajor(values.minorMajorName);
        const mdPrograms = programsForMajor(values.minorMajorName);
        const mdProgram = values.minorMdProgramId ? getProgramById(values.minorMdProgramId) : undefined;
        const mdCourseList = mdProgram ? [...mdProgram.baseCourses, ...mdProgram.mainCourses] : [];

        const totalCredits = courses.reduce((s, c) => s + (Number(c.credits) || 0), 0);
        // 학점 불인정(MD) 과목의 학점 제외
        const mdExcluded = courses.filter((c) => excluded.includes(c.name)).reduce((s, c) => s + (Number(c.credits) || 0), 0);
        const netCredits = totalCredits - mdExcluded;
        const autoGpa = calcMinorGpa(courses);

        // 변경 시 평점평균·인정학점 자동 반영
        const apply = (patch: Partial<GradeDetail>) => {
          const next = { ...values, ...patch };
          const cs = next.minorCourses || [];
          const ex = next.minorExcludedCourses || [];
          const tot = cs.reduce((s, c) => s + (Number(c.credits) || 0), 0);
          const exCr = cs.filter((c) => ex.includes(c.name)).reduce((s, c) => s + (Number(c.credits) || 0), 0);
          onChange({
            ...next,
            gpa: calcMinorGpa(cs),
            minorMajorCredits: tot - exCr,
            minorMdCompleted: !!next.minorMdProgramId,
          });
        };
        const addCourse = () => apply({ minorCourses: [...courses, { name: "", credits: 1, grade: "A+" }] });
        const setCourse = (i: number, patch: Partial<MinorCourse>) =>
          apply({ minorCourses: courses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
        const removeCourse = (i: number) => apply({ minorCourses: courses.filter((_, idx) => idx !== i) });
        const selectMd = (id: string) => {
          const p = getProgramById(id);
          apply({ minorMdProgramId: id, minorMdName: p?.name || "", minorExcludedCourses: [] });
        };
        const toggleExcluded = (name: string) =>
          apply({ minorExcludedCourses: excluded.includes(name) ? excluded.filter((n) => n !== name) : [...excluded, name] });
        const selectMajor = (m: string) =>
          apply({ minorMajorName: m, minorCourses: [], minorMdProgramId: "", minorMdName: "", minorExcludedCourses: [] });

        const conditions = [
          { ok: values.minorIsMirae, label: `미래융합가상학과 ${isMinor ? "부전공" : "복수전공"} 이수(예정)자` },
          { ok: autoGpa >= 3.0, label: "이수 교과목 평점 평균 3.0 이상 (4.5 만점)" },
          { ok: !!values.minorMdProgramId, label: "마이크로디그리(MD) 1개 이상 이수" },
          { ok: netCredits >= reqCredits, label: `MD 학점 불인정 제외 인정 학점 ${reqCredits}학점 이상 (현재 ${netCredits}학점)` },
        ];
        const allOk = conditions.every((c) => c.ok);
        return (
        <div className="space-y-4">
          <div className="rounded-2xl p-3 text-sm text-blue-700 space-y-1" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <p className="font-semibold">{isMinor ? "부전공" : "복수전공"} 성적우수 지원 조건 (세부지침 제7조)</p>
            <p>• 미래융합가상학과 {isMinor ? "부전공" : "복수전공"} 이수(예정)자</p>
            <p>• 이수 교과목 평점 평균 3.0 이상 (4.5 만점)</p>
            <p>• 마이크로디그리(MD) 1개 이상 이수</p>
            <p>• 지원금액: {isMinor ? "100만원 (21학점)" : "150만원 (36학점)"}</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
            <input type="checkbox" checked={values.minorIsMirae} onChange={(e) => set("minorIsMirae", e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm">미래융합가상학과 {isMinor ? "부전공" : "복수전공"} 이수(예정)자임을 확인합니다</span>
          </label>

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

          {/* 교과목 이수내역 */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}>
            <div className="flex items-center justify-between">
              <label className="label !mb-0">이수 교과목 내역 <span className="text-red-500">*</span></label>
              <button type="button" onClick={addCourse} disabled={!values.minorMajorName} className="btn-secondary text-sm !h-9 flex items-center gap-1 disabled:opacity-50">+ 과목 추가</button>
            </div>
            {!values.minorMajorName ? (
              <p className="text-sm text-gray-400">먼저 전공을 선택하면 해당 전공 교과목을 추가할 수 있습니다.</p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-gray-400">「과목 추가」로 이수한 교과목을 입력하세요.</p>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                  <div className="col-span-6">교과목명</div>
                  <div className="col-span-2">학점</div>
                  <div className="col-span-3">평점</div>
                  <div className="col-span-1"></div>
                </div>
                {courses.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <select className="input-field !min-h-[40px] col-span-12 sm:col-span-6" value={c.name} onChange={(e) => setCourse(i, { name: e.target.value })}>
                      <option value="">교과목 선택</option>
                      {courseOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select className="input-field !min-h-[40px] col-span-4 sm:col-span-2" value={c.credits || 1} onChange={(e) => setCourse(i, { credits: Number(e.target.value) })}>
                      {CREDIT_OPTIONS.map((n) => <option key={n} value={n}>{n}학점</option>)}
                    </select>
                    <select className="input-field !min-h-[40px] col-span-6 sm:col-span-3" value={c.grade || "A+"} onChange={(e) => setCourse(i, { grade: e.target.value })}>
                      {MINOR_GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <button type="button" onClick={() => removeCourse(i)} className="btn-danger !h-9 !px-2 col-span-2 sm:col-span-1 flex items-center justify-center">✕</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400">※ 평점평균은 입력한 평점·학점으로 자동 계산됩니다. (가/부 과목은 평점평균에서 제외)</p>
          </div>

          {/* MD 과정 이수 + 학점 불인정 과목 */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <label className="label !mb-0">이수한 마이크로디그리(MD) 과정 <span className="text-red-500">*</span></label>
            <select className="input-field" value={values.minorMdProgramId} onChange={(e) => selectMd(e.target.value)} disabled={!values.minorMajorName}>
              <option value="">{values.minorMajorName ? "MD 과정을 선택하세요" : "먼저 전공을 선택하세요"}</option>
              {mdPrograms.map((p) => <option key={p.id} value={p.id}>{p.level} · {p.name}</option>)}
            </select>
            {mdProgram && (
              <div>
                <p className="text-xs text-amber-700 mb-2">
                  ※ MD 과정은 4과목 중 3과목만 학점 인정됩니다. 아래 과정 교과목 중 <strong>학점 불인정 과목</strong>을 선택하면 해당 과목 학점이 {isMinor ? "부전공" : "복수전공"} 인정 학점에서 제외됩니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {mdCourseList.map((name) => {
                    const on = excluded.includes(name);
                    return (
                      <button key={name} type="button" onClick={() => toggleExcluded(name)}
                        className={`text-sm rounded-lg px-3 py-1.5 transition-all ${on ? "bg-red-500 text-white" : "bg-white/70 text-gray-600 hover:bg-white"}`}
                        style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
                        {on ? "✕ 불인정 " : ""}{name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
