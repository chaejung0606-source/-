"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home as HomeIcon, CalendarClock, MapPin, Clock, Users, ChevronRight, X, ImageIcon } from "lucide-react";
import { slotInt, overlaps, textMatchesSpace } from "@/lib/space-rental";
import type { FormSchema } from "@/lib/form-schema";
import SpaceCalendar from "@/components/home/SpaceCalendar";
import { ClipboardCheck, Download } from "lucide-react";
import { surveyFields, activeQs, SurveyQuestion, type UploadedDoc } from "@/components/space-rental/Survey";

interface PublicSpace { id: string; name: string; capacity?: number; photos?: string[]; }
interface Booked { start: number; end: number; label: string; source: "calendar" | "request"; spaceName?: string; }

const fmtSlot = (n: number) => {
  const s = String(n);
  return `${s.slice(4, 6)}/${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
};


export default function SpaceRentalPage() {
  const [spaces, setSpaces] = useState<PublicSpace[]>([]);
  const [booked, setBooked] = useState<Booked[]>([]);
  const [calendarError, setCalendarError] = useState(false);
  const [survey, setSurvey] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [photoSpace, setPhotoSpace] = useState<PublicSpace | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    spaceId: "", date: "", start: "", end: "",
    applicantName: "", studentId: "", phone: "", email: "", purpose: "", headcount: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  // 관리자 설정 설문 답변 (fieldId → 값) + 파일 항목 업로드 서류 (fieldId → 파일들)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [docsByField, setDocsByField] = useState<Record<string, UploadedDoc[]>>({});
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

  // 파일 항목 답변값은 업로드한 파일명(시트 기록용), 실제 파일은 files로 별도 전송
  const answerList = () => activeQs(questions, answers)
    .map((q) => ({ id: q.id, label: q.label, value: q.type === "file" ? (docsByField[q.id] || []).map((d) => d.name).join(", ") : (answers[q.id] || "").trim() }))
    .filter((a) => a.value);
  const fileList = () => activeQs(questions, answers)
    .filter((q) => q.type === "file")
    .flatMap((q) => (docsByField[q.id] || []).map((d) => ({ ...d, label: q.label })));

  const submit = async () => {
    // 필수 설문 항목 검증(공통) — 현재 노출 중인 조건부 하위질문 포함
    for (const q of activeQs(questions, answers)) {
      if (q.type === "fileDownload") continue; // 다운로드 제공 항목은 입력값이 없음
      if (q.type === "file") {
        if (q.required && !(docsByField[q.id] || []).length) return alert(`'${q.label}' 파일을 업로드해주세요.`);
        continue;
      }
      if (q.required && !(answers[q.id] || "").trim()) return alert(`'${q.label}' 항목을 입력/동의해주세요.`);
    }
    setBusy(true);
    try {
      // 관리자 폼만: 답변·서류만 전송 (대여 일정은 관리자가 신청목록에서 직접 입력)
      // 기본 폼: 기존 필드 + 답변 전송
      const body = formOnly
        ? { answers: answerList(), files: fileList() }
        : { ...form, headcount: Number(form.headcount) || 0, answers: answerList(), files: fileList() };
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
              <Link href="/space-rental/result" className="btn-secondary flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" /> 이용결과 제출
              </Link>
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
              <button onClick={() => { setDone(false); setShowForm(true); setForm((f) => ({ ...f, date: "", start: "", end: "", purpose: "", headcount: "" })); setAnswers({}); setDocsByField({}); load(); }} className="btn-secondary">추가 신청</button>
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
                {questions.map((q) => <SurveyQuestion key={q.id} q={q} answers={answers} setAnswers={setAnswers} docsByField={docsByField} setDocsByField={setDocsByField} />)}
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
