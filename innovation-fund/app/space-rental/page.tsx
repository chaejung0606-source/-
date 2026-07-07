"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home as HomeIcon, CalendarClock, MapPin, Clock, Users, ChevronRight, X, ImageIcon } from "lucide-react";
import { slotInt, overlaps, textMatchesSpace, ALL_DAY } from "@/lib/space-rental";
import type { FormSchema, FormField } from "@/lib/form-schema";
import { DEFAULT_CONSENT_INTRO } from "@/lib/form-schema";
import SpaceCalendar from "@/components/home/SpaceCalendar";
import SignaturePad from "@/components/apply/SignaturePad";
import { ClipboardCheck, Plus, Trash2, Upload, Download } from "lucide-react";

interface PublicSpace { id: string; name: string; capacity?: number; photos?: string[]; }
interface Booked { start: number; end: number; label: string; source: "calendar" | "request"; spaceName?: string; }

const fmtSlot = (n: number) => {
  const s = String(n);
  return `${s.slice(4, 6)}/${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
};

// 관리자가 설정한 설문 폼에서 신청자에게 보여줄 항목 (표준 블록 중 개인정보동의·파일다운로드 지원, 파일 업로드·서명은 제외)
const ANSWERABLE: FormField["type"][] = ["shortText", "longText", "number", "date", "time", "datetime", "select", "agreement", "privacyConsent", "fileDownload"];
function surveyFields(schema: FormSchema | null): FormField[] {
  if (!schema?.steps) return [];
  return schema.steps.flatMap((s) => s.fields || []).filter((f) => ANSWERABLE.includes(f.type));
}
// 드롭다운 선택에 따라 현재 노출 중인 조건부 하위질문까지 펼친 목록 (검증·저장용 — 신청폼·이용결과폼 공용)
function activeQs(list: FormField[], answers: Record<string, string>): FormField[] {
  return list.flatMap((q) => q.type === "select" ? [q, ...activeQs(q.branches?.[answers[q.id] || ""] || [], answers)] : [q]);
}

// 설문 항목 렌더 — 신청폼·이용결과폼 공용 (드롭다운 조건부 하위질문 재귀, 종일·범위·동의·파일다운로드 지원)
function SurveyQuestion({ q, answers, setAnswers }: {
  q: FormField;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const renderInput = () => {
    if (q.type === "fileDownload") return (
      <div>
        {q.text && <p className="text-xs text-gray-600 whitespace-pre-line mb-1">{q.text}</p>}
        {q.downloadUrl ? (
          <a href={q.downloadUrl} download={q.downloadName || undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
            <Download className="w-4 h-4" /> {q.downloadName || "파일 다운로드"}
          </a>
        ) : <p className="text-sm text-gray-400">등록된 파일이 없습니다.</p>}
      </div>
    );
    if (q.type === "longText") return <textarea className="input-field h-20 resize-none" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder={q.placeholder} />;
    if (q.type === "select") return (
      <select className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)}>
        <option value="">선택하세요</option>
        {(q.options || []).filter((o) => o.trim()).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (q.type === "agreement") return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        {q.text && <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed mb-2">{q.text}</p>}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={answers[q.id] === "동의함"} onChange={(e) => setAnswer(q.id, e.target.checked ? "동의함" : "")} /> 동의합니다.
        </label>
      </div>
    );
    if (q.type === "privacyConsent") return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <p className="text-sm font-semibold text-gray-800 mb-1">{q.label || "개인정보 수집·이용 동의"} {q.required && <span className="text-red-500">*</span>}</p>
        <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed mb-2">{q.consentIntro?.trim() || DEFAULT_CONSENT_INTRO}</p>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={answers[q.id] === "동의함"} onChange={(e) => setAnswer(q.id, e.target.checked ? "동의함" : "")} /> {q.consentPrivacyLabel?.trim() || "위 내용에 동의합니다."}
        </label>
      </div>
    );
    if (q.type === "time" || q.type === "datetime") {
      const it = q.type === "time" ? "time" : "datetime-local";
      // 종일 체크 상태는 별도 키로 추적(전송 안 됨). datetime 종일이면 날짜만 입력받아 날짜를 보존한다.
      const allDayOn = answers["__allday__" + q.id] === "1";
      const setAllDay = (on: boolean) => setAnswers((a) => ({ ...a, ["__allday__" + q.id]: on ? "1" : "", [q.id]: on && q.type === "time" ? ALL_DAY : "" }));
      const [va = "", vb = ""] = (answers[q.id] || "").split("~");
      return (
        <div className="space-y-1.5">
          {q.allowAllDay && (
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={allDayOn} onChange={(e) => setAllDay(e.target.checked)} /> 종일
            </label>
          )}
          {allDayOn && q.type === "time" ? (
            <p className="text-sm text-gray-500">종일 사용</p>
          ) : allDayOn ? ( // datetime 종일 → 날짜만 선택
            q.range ? (
              <div className="flex items-center gap-2 flex-wrap"><input type="date" className="input-field" value={va} onChange={(e) => setAnswer(q.id, `${e.target.value}~${vb}`)} /><span className="text-gray-400">~</span><input type="date" className="input-field" value={vb} onChange={(e) => setAnswer(q.id, `${va}~${e.target.value}`)} /></div>
            ) : (
              <input type="date" className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
            )
          ) : q.range ? (
            <div className="flex items-center gap-2 flex-wrap"><input type={it} className="input-field" value={va} onChange={(e) => setAnswer(q.id, `${e.target.value}~${vb}`)} /><span className="text-gray-400">~</span><input type={it} className="input-field" value={vb} onChange={(e) => setAnswer(q.id, `${va}~${e.target.value}`)} /></div>
          ) : (
            <input type={it} className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}
        </div>
      );
    }
    if (q.type === "date" && q.range) {
      const [a = "", b = ""] = (answers[q.id] || "").split("~");
      return <div className="flex items-center gap-2 flex-wrap"><input type="date" className="input-field" value={a} onChange={(e) => setAnswer(q.id, `${e.target.value}~${b}`)} /><span className="text-gray-400">~</span><input type="date" className="input-field" value={b} onChange={(e) => setAnswer(q.id, `${a}~${e.target.value}`)} /></div>;
    }
    return <input type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"} className="input-field" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder={q.placeholder} />;
  };

  const subs = q.type === "select" ? (q.branches?.[answers[q.id] || ""] || []) : [];
  const wide = ["longText", "agreement", "privacyConsent"].includes(q.type) || subs.length > 0;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      {q.type !== "privacyConsent" && <label className="label">{q.label} {q.required && <span className="text-red-500">*</span>}</label>}
      {renderInput()}
      {subs.length > 0 && (
        <div className="mt-3 ml-3 pl-3 border-l-2 border-indigo-200 space-y-4">
          {subs.map((sf) => <SurveyQuestion key={sf.id} q={sf} answers={answers} setAnswers={setAnswers} />)}
        </div>
      )}
    </div>
  );
}

export default function SpaceRentalPage() {
  const [spaces, setSpaces] = useState<PublicSpace[]>([]);
  const [booked, setBooked] = useState<Booked[]>([]);
  const [calendarError, setCalendarError] = useState(false);
  const [survey, setSurvey] = useState<FormSchema | null>(null);
  const [resultForm, setResultForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [photoSpace, setPhotoSpace] = useState<PublicSpace | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    spaceId: "", date: "", start: "", end: "",
    applicantName: "", studentId: "", phone: "", email: "", purpose: "", headcount: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  // 관리자 설정 설문 답변 (fieldId → 값)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const questions = useMemo(() => surveyFields(survey), [survey]);

  const load = () => {
    setLoading(true);
    fetch("/api/space-rental").then((r) => r.json()).then((d) => {
      setSpaces(Array.isArray(d.spaces) ? d.spaces : []);
      setBooked(Array.isArray(d.booked) ? d.booked : []);
      setCalendarError(!!d.calendarError);
      setSurvey(d.form && typeof d.form === "object" ? d.form : null);
      setResultForm(d.resultForm && typeof d.resultForm === "object" ? d.resultForm : null);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openForm = (spaceId?: string) => {
    if (spaceId) set("spaceId", spaceId);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const space = spaces.find((s) => s.id === form.spaceId);

  const daySlots = useMemo(() => {
    if (!space || !form.date) return [];
    const dayPrefix = Number(form.date.replace(/-/g, "") + "0000");
    const dayEnd = dayPrefix + 2400;
    return booked
      .filter((b) => b.start < dayEnd && b.end > dayPrefix)
      .filter((b) => b.source === "request" ? b.spaceName === space.name : textMatchesSpace(b.label, space.name))
      .sort((a, b) => a.start - b.start);
  }, [booked, space, form.date]);

  const conflict = useMemo(() => {
    if (!space || !form.date || !form.start || !form.end) return null;
    const rs = slotInt(form.date, form.start), re = slotInt(form.date, form.end);
    if (re <= rs) return null;
    return daySlots.find((b) => overlaps(rs, re, b.start, b.end)) || null;
  }, [space, form.date, form.start, form.end, daySlots]);

  const timeInvalid = !!(form.start && form.end && slotInt(form.date, form.end) <= slotInt(form.date, form.start));
  const overCap = !!(space?.capacity && Number(form.headcount) > space.capacity);
  // 관리자가 신청폼을 만들었으면 그 폼만 표시(완전히 관리자 폼). 없으면 기본 폼.
  const formOnly = questions.length > 0;

  const answerList = () => activeQs(questions, answers)
    .map((q) => ({ id: q.id, label: q.label, value: (answers[q.id] || "").trim() }))
    .filter((a) => a.value);

  const submit = async () => {
    // 필수 설문 항목 검증(공통) — 현재 노출 중인 조건부 하위질문 포함
    for (const q of activeQs(questions, answers)) {
      if (q.type === "fileDownload") continue; // 다운로드 제공 항목은 입력값이 없음
      if (q.required && !(answers[q.id] || "").trim()) return alert(`'${q.label}' 항목을 입력/동의해주세요.`);
    }
    setBusy(true);
    try {
      // 관리자 폼만: 답변만 전송(서버가 bookingRole 태그로 장소·날짜·시간 추출)
      // 기본 폼: 기존 필드 + 답변 전송
      const body = formOnly
        ? { answers: answerList() }
        : { ...form, headcount: Number(form.headcount) || 0, answers: answerList() };
      if (!formOnly) {
        if (!form.spaceId) return alert("대여 장소를 선택해주세요.");
        if (!form.date || !form.start || !form.end) return alert("사용일과 시간을 입력해주세요.");
        if (timeInvalid) return alert("종료 시간이 시작 시간보다 늦어야 합니다.");
        if (!form.applicantName.trim() || !form.studentId.trim()) return alert("신청자 이름과 학번/소속을 입력해주세요.");
        if (overCap) return alert(`수용 인원(${space?.capacity}명)을 초과했습니다.`);
        if (conflict) return alert("이미 신청된 시간대입니다. 다른 시간을 선택해주세요.");
      }
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("신청 실패: " + (j.error || res.status) + (j.conflict ? `\n(${j.conflict})` : "")); load(); return; }
      setDone(true);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-indigo-500 hover:text-indigo-700"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold holo-text">공간대여 신청</span>
          <Link href="/" className="ml-auto glass-pill px-3 h-9 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600"><HomeIcon className="w-4 h-4" /> 홈</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 제목 + 신청하기 버튼 */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-extrabold holo-text mb-1 flex items-center gap-2"><CalendarClock className="w-6 h-6 text-indigo-500" /> 공간대여 신청</h1>
            <p className="text-gray-600">로그인 없이 신청할 수 있습니다. 대여 가능한 장소와 예약 현황을 확인하고 신청하세요.</p>
          </div>
          {!done && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openForm()} className="btn-primary flex items-center gap-1.5">
                신청하기 <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setResultOpen(true)} className="btn-secondary flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" /> 이용결과 제출
              </button>
            </div>
          )}
        </div>

        {/* 대여 가능한 장소 정보 (공간명·수용 인원) — 클릭 시 장소 사진 보기 */}
        <div className="card mb-6">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-500" /> 대여 가능한 장소</h2>
          {loading ? (
            <p className="text-sm text-gray-400">불러오는 중...</p>
          ) : spaces.length === 0 ? (
            <p className="text-sm text-gray-400">등록된 대여 장소가 없습니다.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {spaces.map((s) => (
                  <button key={s.id} onClick={() => setPhotoSpace(s)} className="text-left rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-3 transition">
                    <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">{s.name}{!!(s.photos && s.photos.length) && <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}</div>
                    {s.capacity != null && <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 수용 인원 {s.capacity}명</div>}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">장소를 클릭하면 사진을 볼 수 있습니다. 신청은 위 ‘신청하기’ 버튼을 눌러주세요.</p>
            </>
          )}
        </div>

        {/* 신청서류 다운로드 */}
        <div className="card mb-6">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Download className="w-5 h-5 text-indigo-500" /> 신청서류 다운로드</h2>
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              { href: "/space-rental/space-rental-application-student.hwp", save: "공간 대여 신청서(학생용).hwp", label: "공간 대여 신청서", sub: "학생용" },
              { href: "/space-rental/space-rental-application-dept.hwp", save: "공간 대여 신청서(부서·외부용).hwp", label: "공간 대여 신청서", sub: "부서·외부용" },
              { href: "/space-rental/space-rental-user-list.hwp", save: "공간대여 명단.hwp", label: "공간대여 명단", sub: "이용자 명단·서명" },
            ].map((d) => (
              <a key={d.href} href={d.href} download={d.save}
                className="rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 p-3 transition flex items-center gap-2.5">
                <Download className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  <span className="block font-semibold text-sm text-gray-800">{d.label}</span>
                  <span className="block text-[11px] text-gray-500">{d.sub} · HWP</span>
                </span>
              </a>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-gray-50/80 border border-gray-100 p-3 text-xs text-gray-600 space-y-0.5">
            <p>• <strong>신청 시 제출서류</strong>: 공간 대여 신청서 1부, 공간대여 명단 1부</p>
            <p>• <strong>이용결과 제출서류</strong>: 공간 이용 사진 2장</p>
          </div>
        </div>

        {/* 대여일정 캘린더 — 장소·시간별 예약 현황 (플랫폼 자체 캘린더) */}
        <div className="mb-6">
          <SpaceCalendar />
        </div>

        {/* 신청 폼 — '신청하기' 클릭 시 표시 */}
        {done ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">공간대여 신청이 접수되었습니다.</h2>
            <p className="text-sm text-gray-500 mb-5">관리자 승인 후 캘린더에 반영됩니다.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => { setDone(false); setShowForm(true); setForm((f) => ({ ...f, date: "", start: "", end: "", purpose: "", headcount: "" })); setAnswers({}); load(); }} className="btn-secondary">추가 신청</button>
              <Link href="/" className="btn-primary">홈으로</Link>
            </div>
          </div>
        ) : showForm ? (
          <div ref={formRef} className="card space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><CalendarClock className="w-5 h-5 text-indigo-500" /> 신청서 작성</h2>
            {/* 기본 폼: 관리자가 신청폼을 만들지 않았을 때만 표시. 만들었으면 그 폼만 노출(formOnly). */}
            {!formOnly && (<>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">대여 공간 <span className="text-red-500">*</span></label>
                <select className="input-field" value={form.spaceId} onChange={(e) => set("spaceId", e.target.value)}>
                  <option value="">공간을 선택하세요</option>
                  {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {space?.capacity != null && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 수용 인원 {space.capacity}명</p>}
              </div>
              <div>
                <label className="label">사용 인원</label>
                <input type="number" min={0} className="input-field" value={form.headcount} onChange={(e) => set("headcount", e.target.value)} placeholder="예: 6" />
                {overCap && <p className="text-xs text-rose-600 mt-1">수용 인원({space?.capacity}명)을 초과했습니다.</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">사용일 <span className="text-red-500">*</span></label>
                <input type="date" className="input-field" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </div>
              <div>
                <label className="label">시작 시간 <span className="text-red-500">*</span></label>
                <input type="time" className="input-field" value={form.start} onChange={(e) => set("start", e.target.value)} />
              </div>
              <div>
                <label className="label">종료 시간 <span className="text-red-500">*</span></label>
                <input type="time" className="input-field" value={form.end} onChange={(e) => set("end", e.target.value)} />
              </div>
            </div>

            {space && form.date && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {space.name} · {form.date} 예약 현황</p>
                {calendarError && <p className="text-[11px] text-amber-600 mb-1">※ 캘린더를 불러오지 못했습니다. 접수된 신청 기준으로만 표시됩니다.</p>}
                {daySlots.length === 0 ? (
                  <p className="text-xs text-gray-400">이 날짜에 예약된 건이 없습니다.</p>
                ) : (
                  <ul className="space-y-1">
                    {daySlots.map((b, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400" /> {fmtSlot(b.start)} ~ {fmtSlot(b.end)} <span className="text-gray-400">· {b.label || "예약"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {timeInvalid && <p className="text-sm text-rose-600">종료 시간이 시작 시간보다 늦어야 합니다.</p>}
            {conflict && (
              <div className="rounded-xl px-3 py-2.5 text-sm text-rose-700" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)" }}>
                ⛔ 선택한 시간이 이미 예약된 건({fmtSlot(conflict.start)} ~ {fmtSlot(conflict.end)})과 겹칩니다. 다른 시간을 선택해주세요.
              </div>
            )}

            {/* 신청자 기본정보 */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="label">신청자 이름 <span className="text-red-500">*</span></label>
                <input className="input-field" value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} placeholder="홍길동" />
              </div>
              <div>
                <label className="label">학번 / 소속 <span className="text-red-500">*</span></label>
                <input className="input-field" value={form.studentId} onChange={(e) => set("studentId", e.target.value)} placeholder="학번 또는 소속" />
              </div>
              <div>
                <label className="label">연락처</label>
                <input className="input-field" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="label">이메일</label>
                <input className="input-field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="example@kangwon.ac.kr" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">사용 목적</label>
                <textarea className="input-field h-20 resize-none" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="예: 소학회 정기 모임 / 스터디 / 회의 등" />
              </div>
            </div>
            </>)}

            {/* 관리자가 '신청폼 편집'에서 만든 항목 (formOnly일 때 이것만 표시) — 드롭다운 조건부 하위질문 포함 */}
            {questions.length > 0 && (
              <div className={`grid sm:grid-cols-2 gap-4 ${formOnly ? "" : "pt-2 border-t border-gray-100"}`}>
                {questions.map((q) => <SurveyQuestion key={q.id} q={q} answers={answers} setAnswers={setAnswers} />)}
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={submit} disabled={busy || !!conflict || timeInvalid || overCap} className="btn-primary disabled:opacity-50">
                {busy ? "신청 중..." : "공간대여 신청"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 이용결과 제출 모달 */}
      {resultOpen && <UsageResultModal resultForm={resultForm} onClose={() => setResultOpen(false)} />}

      {/* 장소 사진 보기 모달 */}
      {photoSpace && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="modal-backdrop absolute inset-0" onClick={() => setPhotoSpace(null)} />
          <div className="modal relative w-full max-w-2xl max-h-[88vh] overflow-y-auto p-5">
            <button onClick={() => setPhotoSpace(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-gray-800 mb-1 pr-8">{photoSpace.name}</h2>
            {photoSpace.capacity != null && <p className="text-sm text-gray-500 mb-3 flex items-center gap-1"><Users className="w-4 h-4" /> 수용 인원 {photoSpace.capacity}명</p>}
            {photoSpace.photos && photoSpace.photos.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {photoSpace.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={p} alt={`${photoSpace.name} 사진 ${i + 1}`} className="w-full rounded-xl border border-gray-100" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                <ImageIcon className="w-8 h-8 text-gray-300" />
                등록된 사진이 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 이용결과 제출 — 로그인 없이 연락처로 본인 신청 건 조회 후 이용자 명단·서명·이용 사진 제출
interface MyBooking { id: string; spaceName: string; date: string; start: string; end: string; status: string; hasResult: boolean; }
function UsageResultModal({ resultForm, onClose }: { resultForm: FormSchema | null; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"phone" | "pick" | "form" | "done">("phone");
  const [list, setList] = useState<MyBooking[]>([]);
  const [picked, setPicked] = useState<MyBooking | null>(null);
  const [users, setUsers] = useState<{ name: string; signature: string }[]>([{ name: "", signature: "" }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rQuestions = surveyFields(resultForm);
  // 관리자가 이용결과 폼을 만들었으면 그 폼만 표시(기본 명단·사진·비고 블록 숨김)
  const resultOnly = rQuestions.length > 0;

  const lookup = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/space-rental", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lookupByPhone", phone }) });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert(j.error || "조회 실패"); return; }
      if (!j.requests?.length) { alert("해당 연락처로 접수된 공간대여 신청이 없습니다.\n신청 시 입력한 연락처를 확인해주세요."); return; }
      setList(j.requests); setStage("pick");
    } finally { setBusy(false); }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/space-rental/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("사진 업로드 실패: " + (j.error || res.status)); return; }
      setPhotos((p) => [...p, j.url]);
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!picked) return;
    const cleanUsers = resultOnly ? [] : users.filter((u) => u.name.trim());
    const cleanPhotos = resultOnly ? [] : photos;
    // 조건부 하위질문 포함 필수 검증 (fileDownload는 입력값 없음)
    for (const q of activeQs(rQuestions, answers)) {
      if (q.type === "fileDownload") continue;
      if (q.required && !(answers[q.id] || "").trim()) return alert(`'${q.label}' 항목을 입력/동의해주세요.`);
    }
    const answerList = activeQs(rQuestions, answers).map((q) => ({ id: q.id, label: q.label, value: (answers[q.id] || "").trim() })).filter((a) => a.value);
    if (resultOnly) {
      if (answerList.length === 0) return alert("이용결과 항목을 입력해주세요.");
    } else if (cleanUsers.length === 0 && cleanPhotos.length === 0 && answerList.length === 0) {
      return alert("이용자 명단(서명)·이용 사진·설문 중 하나 이상 제출해주세요.");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitResult", requestId: picked.id, phone, users: cleanUsers, photos: cleanPhotos, answers: answerList, memo: resultOnly ? "" : memo }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("제출 실패: " + (j.error || res.status)); return; }
      setStage("done");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />
      <div className="modal relative w-full max-w-lg max-h-[88vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-gray-800 mb-1 pr-8 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-indigo-500" /> 이용결과 제출</h2>

        {stage === "phone" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">공간대여 신청 시 입력한 <strong>연락처</strong>로 본인 신청 건을 조회합니다. (로그인 불필요)</p>
            <div>
              <label className="label">연락처 <span className="text-red-500">*</span></label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" onKeyDown={(e) => { if (e.key === "Enter") lookup(); }} />
            </div>
            <div className="flex justify-end"><button onClick={lookup} disabled={busy} className="btn-primary text-sm disabled:opacity-60">{busy ? "조회 중..." : "내 신청 조회"}</button></div>
          </div>
        )}

        {stage === "pick" && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">이용결과를 제출할 신청 건을 선택하세요.</p>
            {list.map((r) => (
              <button key={r.id} onClick={() => { setPicked(r); setStage("form"); }} className="w-full text-left rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 p-3 transition">
                <div className="font-semibold text-sm text-gray-800">{r.spaceName || "(공간)"}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.date} {r.start}~{r.end} · {r.status === "approved" ? "승인" : r.status === "pending" ? "대기" : r.status}{r.hasResult ? " · 이미 제출됨(재제출 시 갱신)" : ""}</div>
              </button>
            ))}
            <button onClick={() => setStage("phone")} className="text-xs text-gray-500 hover:underline mt-1">← 연락처 다시 입력</button>
          </div>
        )}

        {stage === "form" && picked && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 text-sm text-gray-700">
              <strong>{picked.spaceName}</strong> · {picked.date} {picked.start}~{picked.end}
            </div>
            {/* 기본 블록(이용자 명단·서명/사진/비고) — 관리자 이용결과 폼이 없을 때만 표시 */}
            {!resultOnly && (
              <>
                {/* 이용자 명단 및 서명 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">이용자 명단 및 서명</label>
                    <button onClick={() => setUsers((u) => [...u, { name: "", signature: "" }])} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" /> 이용자 추가</button>
                  </div>
                  <div className="space-y-3">
                    {users.map((u, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input className="input-field flex-1" value={u.name} onChange={(e) => setUsers((arr) => arr.map((x, k) => k === i ? { ...x, name: e.target.value } : x))} placeholder="이용자 이름" />
                          {users.length > 1 && <button onClick={() => setUsers((arr) => arr.filter((_, k) => k !== i))} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                        <SignaturePad onChange={(sig) => setUsers((arr) => arr.map((x, k) => k === i ? { ...x, signature: sig } : x))} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* 이용 사진 */}
                <div>
                  <label className="label">대여공간 이용 사진</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {photos.map((p, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        <button onClick={() => setPhotos((ps) => ps.filter((_, k) => k !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-rose-500 text-xs flex items-center justify-center shadow">✕</button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer flex flex-col items-center justify-center text-[11px] text-center">
                      {uploading ? "…" : <><Upload className="w-4 h-4" />사진</>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
                    </label>
                  </div>
                </div>
              </>
            )}
            {/* 관리자가 설정한 이용결과 폼 항목 — 폼이 있으면 이것만 표시 (조건부 하위질문·종일·범위·파일다운로드 지원) */}
            {rQuestions.map((q) => <SurveyQuestion key={q.id} q={q} answers={answers} setAnswers={setAnswers} />)}
            {!resultOnly && (
              <div>
                <label className="label">비고 (선택)</label>
                <textarea className="input-field h-16 resize-none" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="특이사항이 있으면 적어주세요." />
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStage("pick")} className="btn-secondary text-sm">← 목록</button>
              <button onClick={submit} disabled={busy} className="btn-primary text-sm disabled:opacity-60">{busy ? "제출 중..." : "이용결과 제출"}</button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">이용결과가 제출되었습니다.</h3>
            <p className="text-sm text-gray-500 mb-5">제출해 주셔서 감사합니다.</p>
            <button onClick={onClose} className="btn-primary">닫기</button>
          </div>
        )}
      </div>
    </div>
  );
}
