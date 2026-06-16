"use client";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
  MD_DEPARTMENTS, getProgramsByDept, getProgramById,
  GRADE_OPTIONS, validateMD, type GradeValue,
} from "@/lib/md-courses";

interface MDCourseGrade { name: string; grade: string; isBase: boolean; }
interface GradeDetail {
  subType: "microdegree" | "minor" | "double";
  courseName: string; credits: number; gpa: number; microDegreeCompleted: boolean;
  mdDepartment: string; mdProgramId: string; mdProgramName: string;
  mdCourses: MDCourseGrade[];
  minorMajorName: string; minorMajorCredits: number;
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
      {(values.subType === "minor" || values.subType === "double") && (
        <div className="space-y-4">
          <div className="rounded-2xl p-3 text-sm text-blue-700 space-y-1" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <p>• {values.subType === "minor" ? "부전공" : "복수전공"} 이수자에게 지급됩니다. (평점 평균 3.0 이상)</p>
            <p>• 세부 지원 조건은 사업단 계획안 및 세부지침에 따라 심의됩니다.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{values.subType === "minor" ? "부전공" : "복수전공"} 전공명 <span className="text-red-500">*</span></label>
              <input className="input-field" value={values.minorMajorName} onChange={(e) => set("minorMajorName", e.target.value)} placeholder="예: 사이버보안" />
            </div>
            <div>
              <label className="label">이수 학점</label>
              <input className="input-field" type="number" min="0" value={values.minorMajorCredits || ""} onChange={(e) => set("minorMajorCredits", Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className="label">평점 평균 (4.5 만점)</label>
              <input className="input-field" type="number" min="0" max="4.5" step="0.01" value={values.gpa || ""} onChange={(e) => set("gpa", Number(e.target.value))} placeholder="0.00" />
              {values.gpa > 0 && values.gpa < 3.0 && (
                <p className="text-xs text-red-500 mt-1">⚠️ 평점 평균 3.0 이상이어야 지원 가능합니다.</p>
              )}
            </div>
            <div>
              <label className="label">지급 예정액</label>
              <div className="input-field font-bold text-indigo-700">{calculatedAmount.toLocaleString()}원</div>
            </div>
          </div>
        </div>
      )}
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
