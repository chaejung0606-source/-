"use client";
import { useEffect, useState } from "react";
import { fetchPrograms, programMatchesType, applyWindow, type Program } from "@/lib/programs";
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/types";
import { FIELD_TYPE_LABELS, type FormSchema, type FormField } from "@/lib/form-schema";

// 신청 유형별 상세 안내를 '현재 프로그램·신청폼 데이터'에서 실시간 생성한다.
// 관리자가 신청폼(항목·서류)이나 프로그램을 바꾸면 이 안내도 자동으로 바뀐다(자동 반영).

type FormsMap = Record<string, { pre?: FormSchema; fund?: FormSchema }>;

const PHASES: { phase: "pre" | "fund"; label: string; types: { t: ApplicationType | "club"; desc: string }[] }[] = [
  {
    phase: "pre", label: "지원신청 (활동 전 사전 신청)",
    types: [
      { t: "labor", desc: "사업단 프로그램에 근로학생으로 참여" },
      { t: "program", desc: "교과·비교과, 현장실습, 인턴십, 학회 참석 등" },
      { t: "staff", desc: "사업단 프로그램 운영 보조(진행요원)" },
      { t: "etc", desc: "위 유형에 속하지 않는 기타 지원 프로그램" },
    ],
  },
  {
    phase: "fund", label: "지원금 신청 (활동/이수 후)",
    types: [
      { t: "labor", desc: "근무상황부 기준 근로장학금" },
      { t: "program", desc: "교과·비교과·현장실습·인턴십·학회 등" },
      { t: "staff", desc: "프로그램 진행요원" },
      { t: "etc", desc: "위 유형에 속하지 않는 기타 지원 프로그램" },
      { t: "club", desc: "첨단 ICT 소학회(동아리) 활동" },
    ],
  },
];

// 고정 양식(관리자 폼이 아닌) 유형 — 별도 안내
const FIXED_TYPES: { t: ApplicationType; path: string; fill: string; docs: string }[] = [
  { t: "grade", path: "홈 → [지원금 신청] → [성적 우수 지원금]", fill: "세부 유형(마이크로디그리/부전공/복수전공) 선택 → 이수 교과목·학점·성적 입력(목록에 없으면 ‘직접입력’). 평점·인정학점·지급액 자동 계산.", docs: "성적/이수 확인 서류 등 (안내에 따름)" },
  { t: "contest", path: "홈 → [지원금 신청] → [경진대회 입상 우수성과 지원금]", fill: "대회명·입상 내역 등 입력.", docs: "입상 증빙(상장·결과 등)" },
  { t: "certificate", path: "홈 → [지원금 신청] → [자격증 취득 우수성과 지원금] (미래융합가상학과 학생)", fill: "자격증명·취득일 등 입력.", docs: "자격증 사본" },
];

// select 조건부 하위질문까지 펼쳐서 필드 나열
function flatten(fields: FormField[]): { f: FormField; cond?: string }[] {
  const out: { f: FormField; cond?: string }[] = [];
  for (const f of fields) {
    out.push({ f });
    if (f.branches) {
      for (const [opt, subs] of Object.entries(f.branches)) {
        for (const s of subs) out.push({ f: s, cond: `${f.label} = "${opt}"` });
      }
    }
  }
  return out;
}

const DOC_TYPES = new Set(["file"]);
const SKIP_TYPES = new Set(["fileDownload"]); // 다운로드는 '작성 항목'이 아님

function typeName(f: FormField): string {
  return FIELD_TYPE_LABELS[f.type] || f.type;
}

function ProgramGuide({ prog, schema, phase, typeLabel }: { prog: Program; schema: FormSchema; phase: "pre" | "fund"; typeLabel: string }) {
  const steps = schema.steps || [];
  const allFields = steps.flatMap((s) => flatten(s.fields || []));
  const docs = allFields.filter((x) => DOC_TYPES.has(x.f.type));
  const downloads = allFields.filter((x) => x.f.type === "fileDownload");
  const win = applyWindow(prog, phase);
  const period = win.start && win.end ? `${win.start} ~ ${win.end}` : "상시(공고 확인)";
  const phaseLabel = phase === "pre" ? "지원신청" : "지원금 신청";

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 mb-2">
      <div className="font-semibold text-gray-800 text-sm">📋 {prog.name || "(이름 없는 프로그램)"}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">신청 기간: {period}</div>

      <div className="mt-2 text-[13px] text-gray-700">
        <div className="mb-1"><b>① 신청 경로</b> — 홈 상단 <b>[{phaseLabel}]</b> → <b>[{typeLabel}]</b> → 프로그램 <b>“{prog.name}”</b> 선택</div>
        <div className="mb-1"><b>② 작성 항목</b></div>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          {steps.map((s) => {
            const fields = flatten(s.fields || []).filter((x) => !DOC_TYPES.has(x.f.type) && !SKIP_TYPES.has(x.f.type));
            if (fields.length === 0) return null;
            return (
              <li key={s.id}>
                <span className="text-gray-500">[{s.title || "단계"}]</span>{" "}
                {fields.map((x, i) => (
                  <span key={x.f.id}>
                    {i > 0 && ", "}
                    {x.f.label || "(제목 없음)"}
                    {x.f.required ? <span className="text-red-500">*</span> : null}
                    <span className="text-gray-400"> ({typeName(x.f)}{x.cond ? `, ${x.cond}일 때` : ""})</span>
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
        <div className="mt-1"><b>③ 제출 서류(업로드)</b>{" "}
          {docs.length === 0 ? <span className="text-gray-500">없음</span> : (
            <span>{docs.map((x, i) => (
              <span key={x.f.id}>{i > 0 && ", "}<b>{x.f.label}</b>{x.f.required ? <span className="text-red-500">*</span> : null}{x.f.uploadNotice ? ` (${x.f.uploadNotice})` : ""}</span>
            ))}</span>
          )}
          <span className="text-gray-400"> · 형식 PDF·JPG·PNG·WEBP</span>
        </div>
        {downloads.length > 0 && (
          <div className="mt-1"><b>④ 내려받을 양식</b>{" "}
            {downloads.map((x, i) => <span key={x.f.id}>{i > 0 && ", "}{x.f.label || x.f.downloadName || "양식"}</span>)}
            <span className="text-gray-400"> (작성 후 위 ‘제출 서류’에 첨부)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplyGuideDynamic() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [forms, setForms] = useState<FormsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPrograms().catch(() => []),
      fetch("/api/admin/program-forms").then((r) => r.json()).catch(() => ({})),
    ]).then(([progs, f]) => {
      setPrograms(Array.isArray(progs) ? progs : []);
      setForms((f && typeof f === "object") ? f as FormsMap : {});
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400 py-4">신청 안내를 불러오는 중...</p>;

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-gray-500">아래 안내는 <b>현재 등록된 프로그램·신청폼</b>을 기준으로 자동 생성됩니다. (관리자가 폼·서류를 바꾸면 여기도 자동으로 바뀝니다.)</p>

      {PHASES.map((ph) => (
        <div key={ph.phase}>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">{ph.label}</h3>
          {ph.types.map(({ t, desc }) => {
            const progs = programs.filter((p) => programMatchesType(p, t) && forms[p.id]?.[ph.phase]);
            const label = t === "club" ? "소학회" : APPLICATION_TYPE_LABELS[t as ApplicationType];
            return (
              <div key={String(t)} className="mb-3">
                <div className="font-semibold text-indigo-700 text-sm">▸ {label} <span className="text-gray-400 font-normal">— {desc}</span></div>
                {progs.length === 0 ? (
                  <p className="text-[12px] text-gray-400 ml-3 mt-0.5">현재 신청 가능한 프로그램이 없습니다. (공고 기간을 확인하세요)</p>
                ) : (
                  <div className="mt-1.5">
                    {progs.map((p) => (
                      <ProgramGuide key={p.id} prog={p} schema={forms[p.id]![ph.phase]!} phase={ph.phase} typeLabel={label} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* 고정 양식 유형(성적/경진대회/자격증) */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1.5">성과형 지원금 (고정 양식)</h3>
        {FIXED_TYPES.map((x) => (
          <div key={x.t} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 mb-2 text-[13px] text-gray-700">
            <div className="font-semibold text-indigo-700 text-sm">▸ {APPLICATION_TYPE_LABELS[x.t]}</div>
            <div className="mt-1"><b>① 신청 경로</b> — {x.path}</div>
            <div className="mt-0.5"><b>② 작성</b> — {x.fill}</div>
            <div className="mt-0.5"><b>③ 제출 서류</b> — {x.docs}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
