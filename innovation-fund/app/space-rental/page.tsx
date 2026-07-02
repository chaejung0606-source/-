"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home as HomeIcon, LogOut, User, CalendarClock, MapPin, Clock } from "lucide-react";
import { currentUser, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { slotInt, overlaps, textMatchesSpace, type RentalSpace, type BookedSlot } from "@/lib/space-rental";

const fmtSlot = (n: number) => {
  const s = String(n);
  return `${s.slice(4, 6)}/${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
};

export default function SpaceRentalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [spaces, setSpaces] = useState<RentalSpace[]>([]);
  const [booked, setBooked] = useState<BookedSlot[]>([]);
  const [calendarError, setCalendarError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    spaceId: "", date: "", start: "", end: "",
    applicantName: "", studentId: "", phone: "", email: "", purpose: "", headcount: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await currentUser();
      if (!u) { router.replace("/login?next=/space-rental"); return; }
      setUserName(u.name);
      setForm((f) => ({ ...f, applicantName: u.name, studentId: u.studentId, phone: u.phone || "", email: u.email || "" }));
      setReady(true);
    })();
  }, [router]);

  const loadAvailability = () => {
    setLoading(true);
    fetch("/api/space-rental").then((r) => r.json()).then((d) => {
      setSpaces(Array.isArray(d.spaces) ? d.spaces : []);
      setBooked(Array.isArray(d.booked) ? d.booked : []);
      setCalendarError(!!d.calendarError);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { if (ready) loadAvailability(); }, [ready]);

  const space = spaces.find((s) => s.id === form.spaceId);

  // 선택한 장소·날짜의 예약 현황
  const daySlots = useMemo(() => {
    if (!space || !form.date) return [];
    const dayPrefix = Number(form.date.replace(/-/g, "") + "0000");
    const dayEnd = dayPrefix + 2400;
    return booked
      .filter((b) => b.start < dayEnd && b.end > dayPrefix)
      .filter((b) => b.source === "request" ? b.spaceName === space.name : textMatchesSpace(b.label, space.name))
      .sort((a, b) => a.start - b.start);
  }, [booked, space, form.date]);

  // 현재 입력한 시간이 기존 예약과 겹치는지
  const conflict = useMemo(() => {
    if (!space || !form.date || !form.start || !form.end) return null;
    const rs = slotInt(form.date, form.start), re = slotInt(form.date, form.end);
    if (re <= rs) return null;
    return daySlots.find((b) => overlaps(rs, re, b.start, b.end)) || null;
  }, [space, form.date, form.start, form.end, daySlots]);

  const timeInvalid = form.start && form.end && slotInt(form.date, form.end) <= slotInt(form.date, form.start);

  const submit = async () => {
    if (!form.spaceId) return alert("대여 장소를 선택해주세요.");
    if (!form.date || !form.start || !form.end) return alert("날짜와 시간을 입력해주세요.");
    if (timeInvalid) return alert("종료 시간이 시작 시간보다 늦어야 합니다.");
    if (!form.applicantName.trim() || !form.studentId.trim()) return alert("신청자 정보를 입력해주세요.");
    if (conflict) return alert("이미 신청된 시간대입니다. 다른 시간을 선택해주세요.");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...form, headcount: Number(form.headcount) || 0 }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("신청 실패: " + (j.error || res.status) + (j.conflict ? `\n(${j.conflict})` : "")); loadAvailability(); return; }
      setDone(true);
    } finally { setBusy(false); }
  };

  const doLogout = async () => { await logout(); router.replace("/"); };

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-gray-400">확인 중...</div>;

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-indigo-500 hover:text-indigo-700"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold holo-text">공간대여 신청</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-gray-500 hidden sm:inline mr-1">{userName}님</span>
            <Link href="/mypage" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"><User className="w-4 h-4" /> 마이페이지</Link>
            <Link href="/" className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-indigo-600"><HomeIcon className="w-4 h-4" /> 홈</Link>
            <button onClick={doLogout} className="glass-pill px-3 h-9 flex items-center gap-1.5 text-gray-700 hover:text-red-500"><LogOut className="w-4 h-4" /> 로그아웃</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold holo-text mb-1 flex items-center gap-2"><CalendarClock className="w-6 h-6 text-indigo-500" /> 공간대여 신청</h1>
          <p className="text-gray-600">대여할 공간과 일시를 선택해 신청합니다. 이미 예약된 시간대는 신청할 수 없습니다.</p>
        </div>

        {done ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">공간대여 신청이 접수되었습니다.</h2>
            <p className="text-sm text-gray-500 mb-5">사업단 검토 후 확정됩니다. 결과는 별도 안내됩니다.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => { setDone(false); loadAvailability(); }} className="btn-secondary">추가 신청</button>
              <Link href="/" className="btn-primary">홈으로</Link>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : spaces.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            현재 대여 가능한 공간이 등록되어 있지 않습니다. 사업단에 문의해주세요.
          </div>
        ) : (
          <div className="card space-y-4">
            <div>
              <label className="label">대여 공간 <span className="text-red-500">*</span></label>
              <select className="input-field" value={form.spaceId} onChange={(e) => set("spaceId", e.target.value)}>
                <option value="">공간을 선택하세요</option>
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {space?.note && <p className="text-xs text-gray-400 mt-1">{space.note}</p>}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">날짜 <span className="text-red-500">*</span></label>
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

            {/* 선택한 공간·날짜의 예약 현황 */}
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

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="label">신청자 이름 <span className="text-red-500">*</span></label>
                <input className="input-field" value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} />
              </div>
              <div>
                <label className="label">학번 <span className="text-red-500">*</span></label>
                <input className="input-field" value={form.studentId} onChange={(e) => set("studentId", e.target.value)} />
              </div>
              <div>
                <label className="label">연락처</label>
                <input className="input-field" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="label">사용 인원</label>
                <input type="number" min={0} className="input-field" value={form.headcount} onChange={(e) => set("headcount", e.target.value)} placeholder="예: 6" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">사용 목적</label>
                <textarea className="input-field h-20 resize-none" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="예: 소학회 정기 모임 / 스터디 / 회의 등" />
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={submit} disabled={busy || !!conflict || !!timeInvalid} className="btn-primary disabled:opacity-50">
                {busy ? "신청 중..." : "공간대여 신청"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
