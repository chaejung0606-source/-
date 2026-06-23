"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home as HomeIcon, LogOut, FileText, RefreshCw, ChevronRight, UserCog, ChevronDown, CalendarClock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/auth";
import { fromRow } from "@/lib/app-mapper";
import { formatPhone } from "@/lib/validation";
import TimetableEditor from "@/components/mypage/TimetableEditor";
import type { Application, ClassTime } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS } from "@/types";
import { REVIEW_STATUS_META, PAYMENT_STATUS_META, REVIEW_STATUS_ORDER } from "@/config/status";

const UNIVERSITIES = ["강원대학교", "한림대학교", "강릉원주대학교", "연세대학교(미래)", "상지대학교", "가톨릭관동대학교", "경동대학교"];
const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "SC제일은행", "대구은행", "부산은행", "기타"];

interface Profile {
  name: string; department: string; phone: string; email: string;
  university: string; bankName: string; accountNumber: string; accountHolder: string;
}

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [apps, setApps] = useState<Application[]>([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: "", department: "", phone: "", email: "", university: "강원대학교", bankName: "", accountNumber: "", accountHolder: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileOk, setProfileOk] = useState(false);

  // 수강 시간표 (근로장학금)
  const [ttOpen, setTtOpen] = useState(false);
  const [timetable, setTimetable] = useState<ClassTime[]>([]);
  const [ttSaving, setTtSaving] = useState(false);
  const [ttOk, setTtOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      router.replace("/login?next=/mypage");
      return;
    }
    const m = (user.user_metadata || {}) as Record<string, string>;
    setName(m.name || "");
    setStudentId(m.studentId || "");
    setProfile({
      name: m.name || "",
      department: m.department || "",
      phone: m.phone || "",
      email: m.realEmail || "",
      university: m.university || "강원대학교",
      bankName: m.bankName || "",
      accountNumber: m.accountNumber || "",
      accountHolder: m.accountHolder || "",
    });
    setTimetable(Array.isArray((m as any).timetable) ? (m as any).timetable : []);
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false });
    setApps((data || []).map(fromRow));
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const doLogout = async () => {
    await logout();
    router.push("/");
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(profile),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (j.ok) {
        setProfileOk(true);
        setProfileOpen(false);
        setName(profile.name);
        setTimeout(() => setProfileOk(false), 3000);
      } else {
        alert("저장 실패: " + (j.error || "알 수 없는 오류"));
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const saveTimetable = async () => {
    setTtSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ timetableOnly: true, timetable }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (j.ok) { setTtOk(true); setTimeout(() => setTtOk(false), 3000); }
      else alert("저장 실패: " + (j.error || "알 수 없는 오류"));
    } finally {
      setTtSaving(false);
    }
  };

  const setP = (key: keyof Profile, val: string) => setProfile((p) => ({ ...p, [key]: val }));

  const fmt = (n: number) => (n || 0).toLocaleString("ko-KR");
  const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("ko-KR") : "-");

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sdu-shield.png" alt="SDU" className="w-full h-full object-contain" />
            </div>
            <div className="font-bold text-sm sm:text-lg leading-tight holo-text truncate">내 신청 현황</div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="glass-pill px-3 sm:px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
              <HomeIcon className="w-4 h-4" /> 홈
            </Link>
            <button onClick={doLogout} className="glass-pill px-3 sm:px-4 h-10 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 인사 */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">
              {name ? `${name}님` : "신청자"}의 마이페이지
            </h1>
            <p className="text-sm text-gray-500 mt-1">학번 {studentId || "-"} · 신청 내역 {apps.length}건</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-secondary text-sm flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> 새로고침
            </button>
            <Link href="/apply" className="btn-primary text-sm flex items-center gap-1.5">
              새 신청 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 개인정보 수정 */}
        <div className="card">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-800">개인정보 수정</span>
              {profileOk && <span className="text-xs text-green-600 font-medium">✓ 저장되었습니다</span>}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className="mt-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">이름 <span className="text-red-500">*</span></label>
                  <input className="input-field" value={profile.name} onChange={(e) => setP("name", e.target.value)} placeholder="홍길동" />
                </div>
                <div>
                  <label className="label">학번</label>
                  <input className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" value={studentId} readOnly title="학번은 변경할 수 없습니다." />
                </div>
                <div>
                  <label className="label">소속 대학</label>
                  <select className="input-field" value={profile.university} onChange={(e) => setP("university", e.target.value)}>
                    {UNIVERSITIES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">학과/전공</label>
                  <input className="input-field" value={profile.department} onChange={(e) => setP("department", e.target.value)} placeholder="컴퓨터공학과" />
                </div>
                <div>
                  <label className="label">연락처</label>
                  <input className="input-field" value={profile.phone} onChange={(e) => setP("phone", formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" />
                </div>
                <div>
                  <label className="label">이메일</label>
                  <input className="input-field" type="email" value={profile.email} onChange={(e) => setP("email", e.target.value)} placeholder="example@kangwon.ac.kr" />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">본인 명의 계좌 정보</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-3">
                  ※ 계좌정보는 지원금 신청 시 자동 입력됩니다. 제출하는 통장사본과 예금주가 반드시 일치해야 합니다.
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">은행명</label>
                    <select className="input-field" value={profile.bankName} onChange={(e) => setP("bankName", e.target.value)}>
                      <option value="">선택</option>
                      {BANKS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">계좌번호</label>
                    <input className="input-field" value={profile.accountNumber} onChange={(e) => setP("accountNumber", e.target.value)} placeholder="000000-00-000000" />
                  </div>
                  <div>
                    <label className="label">예금주</label>
                    <input className="input-field" value={profile.accountHolder} onChange={(e) => setP("accountHolder", e.target.value)} placeholder="홍길동" />
                  </div>
                </div>
                {profile.name && profile.accountHolder && profile.name.replace(/\s/g, "") !== profile.accountHolder.replace(/\s/g, "") && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl p-3 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    ⚠️ 예금주({profile.accountHolder})와 이름({profile.name})이 다릅니다. 본인 명의 계좌인지 확인해주세요.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setProfileOpen(false)} className="btn-secondary text-sm">취소</button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={profileSaving || !profile.name}
                  className="btn-primary text-sm disabled:opacity-60"
                >
                  {profileSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 수강 시간표 (근로장학금) */}
        <div className="card">
          <button
            type="button"
            onClick={() => setTtOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-800">수강 시간표 (근로장학금)</span>
              {ttOk && <span className="text-xs text-green-600 font-medium">✓ 저장되었습니다</span>}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${ttOpen ? "rotate-180" : ""}`} />
          </button>

          {ttOpen && (
            <div className="mt-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                ※ 근로장학금 신청자는 수강 시간표를 입력해주세요. 지원금 신청 시 근무상황부에서 <strong>수업시간과 겹치는 시간은 근로로 등록할 수 없습니다.</strong>
              </div>
              <TimetableEditor value={timetable} onChange={setTimetable} />
              <div className="flex justify-end">
                <button type="button" onClick={saveTimetable} disabled={ttSaving} className="btn-primary text-sm disabled:opacity-60">
                  {ttSaving ? "저장 중..." : "시간표 저장"}
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : apps.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">아직 신청 내역이 없습니다.</p>
            <Link href="/apply" className="btn-primary inline-flex items-center gap-1.5">
              지원금 신청하기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => {
              const rm = REVIEW_STATUS_META[app.reviewStatus];
              const pm = PAYMENT_STATUS_META[app.paymentStatus];
              const stepIdx = REVIEW_STATUS_ORDER.indexOf(app.reviewStatus);
              const totalSteps = REVIEW_STATUS_ORDER.length;
              return (
                <div key={app.id} className="card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${app.applicationPhase === "pre" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>{APPLICATION_PHASE_LABELS[app.applicationPhase || "fund"]}</span>
                        <span className="font-bold text-gray-800">{APPLICATION_TYPE_LABELS[app.applicationType]}</span>
                        <span className="text-xs text-gray-400">접수번호 {app.receiptNumber || "-"}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">신청일 {fmtDate(app.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rm?.badge || "bg-gray-100 text-gray-600"}`}>검토: {rm?.label || app.reviewStatus}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${pm?.badge || "bg-gray-100 text-gray-600"}`}>지급: {pm?.label || app.paymentStatus}</span>
                    </div>
                  </div>

                  {/* 진행 단계 바 */}
                  <div className="mt-4">
                    <div className="flex gap-1">
                      {REVIEW_STATUS_ORDER.map((s, i) => (
                        <div
                          key={s}
                          className="flex-1 h-1.5 rounded-full"
                          style={{ background: app.reviewStatus === "rejected" ? "#fca5a5" : i <= stepIdx ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "rgba(0,0,0,0.08)" }}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">진행 {Math.max(0, stepIdx) + 1} / {totalSteps} 단계</div>
                  </div>

                  {/* 금액 (지원금 신청만) */}
                  {app.applicationPhase !== "pre" && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
                      <div className="text-[11px] text-gray-500">신청 금액</div>
                      <div className="font-bold text-gray-700 text-sm">{fmt(app.requestAmount)}원</div>
                    </div>
                    <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.65)" }}>
                      <div className="text-[11px] text-gray-500">자동 산정액</div>
                      <div className="font-bold text-gray-700 text-sm">{fmt(app.calculatedAmount)}원</div>
                    </div>
                    <div className="rounded-xl p-2.5 text-center" style={{ background: app.approvedAmount != null ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.65)" }}>
                      <div className="text-[11px] text-gray-500">최종 승인액</div>
                      <div className="font-bold text-indigo-700 text-sm">{app.approvedAmount != null ? `${fmt(app.approvedAmount)}원` : "-"}</div>
                    </div>
                  </div>
                  )}

                  {/* 지원신청 → 지원금 신청 연계 */}
                  {app.applicationPhase === "pre" && (
                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span className="text-xs text-gray-600">활동을 마치셨다면 이 내역으로 지원금을 신청하세요. 중복 항목이 자동 입력됩니다.</span>
                      <Link href={`/apply?from=${app.id}`} className="btn-primary text-sm flex items-center gap-1.5 shrink-0">
                        지원금 신청 <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  {app.adminMemo && (
                    <div className="mt-3 text-xs text-gray-600 rounded-xl px-3 py-2" style={{ background: "rgba(99,102,241,0.06)" }}>
                      <span className="font-semibold text-indigo-600">안내: </span>{app.adminMemo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          ※ 신청 내역과 진행 상황은 본인 계정에서만 조회됩니다. 처리 상태는 사업단 검토에 따라 갱신됩니다.
        </p>
      </main>
    </div>
  );
}
