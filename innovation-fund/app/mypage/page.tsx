"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home as HomeIcon, LogOut, FileText, RefreshCw, ChevronRight, UserCog, ChevronDown, CalendarClock, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout, verifyPassword } from "@/lib/auth";
import { fromRow } from "@/lib/app-mapper";
import { formatPhone } from "@/lib/validation";
import TimetableEditor from "@/components/mypage/TimetableEditor";
import CampusDeptSelect from "@/components/common/CampusDeptSelect";
import type { Application, ClassTime } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS } from "@/types";
import { type StatusConfig, DEFAULT_STATUS_CONFIG, statusMeta } from "@/lib/status-config";

// 검토 상태별 '지금 신청자가 할 일' — 상태 badge 툴팁으로 안내
const REVIEW_TODO: Record<string, string> = {
  received: "접수되었습니다. 검토 결과를 기다려주세요.",
  reviewing: "담당자가 검토 중입니다. 기다려주세요.",
  supplement: "보완이 필요합니다. 아래 안내를 확인하고 수정 후 다시 제출해주세요.",
  supplemented: "보완한 신청서가 제출되었습니다. 담당자의 재검토 결과를 기다려주세요.",
  committee: "위원회 심의 대상입니다. 별도 요청이 없으면 기다려주세요.",
  approved: "승인되었습니다. (지원신청이면 지원금 신청을 진행하세요.)",
  rejected: "반려되었습니다. 사유를 확인하고 필요하면 사업단에 문의하세요.",
};

const UNIVERSITIES = ["강원대학교", "한림대학교", "강릉원주대학교", "연세대학교(미래)", "상지대학교", "가톨릭관동대학교", "경동대학교"];
const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "SC제일은행", "대구은행", "부산은행", "기타"];

interface Profile {
  name: string; campus: string; department: string; phone: string; email: string;
  university: string; bankName: string; accountNumber: string; accountHolder: string;
}

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [apps, setApps] = useState<Application[]>([]);
  const [statusCfg, setStatusCfg] = useState<StatusConfig>(DEFAULT_STATUS_CONFIG);
  useEffect(() => { fetch("/api/admin/status-config").then((r) => r.json()).then(setStatusCfg).catch(() => {}); }, []);

  const [profileOpen, setProfileOpen] = useState(false);
  const [canceledOpen, setCanceledOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: "", campus: "", department: "", phone: "", email: "", university: "강원대학교", bankName: "", accountNumber: "", accountHolder: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileOk, setProfileOk] = useState(false);

  // 비밀번호 변경
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ newPassword: "", confirmPassword: "", currentPassword: "" });
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginOk, setLoginOk] = useState(false);
  const [loginErr, setLoginErr] = useState("");

  // 학적상태변경 (대학원 진학 등으로 학번 변경)
  const [academicStatus, setAcademicStatus] = useState("재학생");
  const [acOpen, setAcOpen] = useState(false);
  const [acForm, setAcForm] = useState({ newStudentId: "", academicStatus: "재학생", currentPassword: "" });
  const [acSaving, setAcSaving] = useState(false);
  const [acErr, setAcErr] = useState("");

  // 수강 시간표 (근로장학금)
  const [ttOpen, setTtOpen] = useState(false);
  const [timetable, setTimetable] = useState<ClassTime[]>([]);
  const [ttSaving, setTtSaving] = useState(false);
  const [ttOk, setTtOk] = useState(false);

  // 비밀번호 확인 모달 (개인정보·시간표 수정 전 본인 확인)
  const [pwOpen, setPwOpen] = useState(false);
  const [pwValue, setPwValue] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwChecking, setPwChecking] = useState(false);
  const pendingAction = useRef<null | (() => void)>(null);

  const requirePassword = (action: () => void) => {
    pendingAction.current = action;
    setPwValue(""); setPwError(""); setPwOpen(true);
  };
  const confirmPassword = async () => {
    setPwChecking(true);
    setPwError("");
    try {
      const ok = await verifyPassword(pwValue);
      if (!ok) { setPwError("비밀번호가 올바르지 않습니다."); return; }
      setPwOpen(false);
      const act = pendingAction.current;
      pendingAction.current = null;
      act?.();
    } finally {
      setPwChecking(false);
    }
  };

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
      campus: m.campus || "",
      department: m.department || "",
      phone: m.phone || "",
      email: m.realEmail || "",
      university: m.university || "강원대학교",
      bankName: m.bankName || "",
      accountNumber: m.accountNumber || "",
      accountHolder: m.accountHolder || "",
    });
    setTimetable(Array.isArray((m as any).timetable) ? (m as any).timetable : []);
    setAcademicStatus((m as any).academicStatus || "재학생");
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false });
    setApps((data || []).map(fromRow));
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // 회원 탈퇴
  const [wdOpen, setWdOpen] = useState(false);
  const [wdPw, setWdPw] = useState("");
  const [wdBusy, setWdBusy] = useState(false);
  const submitWithdraw = async () => {
    if (!wdPw) { alert("본인 확인을 위해 현재 비밀번호를 입력해주세요."); return; }
    if (!confirm("정말 탈퇴하시겠습니까?\n\n지급 완료되지 않은 지원신청 기록은 모두 삭제되며 되돌릴 수 없습니다.")) return;
    setWdBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/withdraw", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ currentPassword: wdPw }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("탈퇴 실패: " + (j.error || res.status)); return; }
      alert(`탈퇴가 완료되었습니다.\n\n삭제된 지원신청 ${j.deleted}건${j.kept > 0 ? ` · 지급 완료로 보존된 기록 ${j.kept}건` : ""}\n그동안 이용해 주셔서 감사합니다.`);
      await logout();
      router.replace("/");
    } finally { setWdBusy(false); }
  };

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

  // 비밀번호 변경 패널 열기 — 본인 확인 후 열림
  const openLoginEditor = () => {
    requirePassword(() => {
      setLoginForm({ newPassword: "", confirmPassword: "", currentPassword: "" });
      setLoginErr(""); setLoginOk(false); setLoginOpen(true);
    });
  };

  const saveLogin = async () => {
    setLoginErr("");
    if (!loginForm.newPassword) { setLoginErr("새 비밀번호를 입력해주세요."); return; }
    if (loginForm.newPassword.length < 6) { setLoginErr("새 비밀번호는 6자 이상이어야 합니다."); return; }
    if (loginForm.newPassword !== loginForm.confirmPassword) { setLoginErr("새 비밀번호가 일치하지 않습니다."); return; }
    if (!loginForm.currentPassword) { setLoginErr("현재 비밀번호를 입력해주세요."); return; }
    setLoginSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/update-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ newPassword: loginForm.newPassword, currentPassword: loginForm.currentPassword }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { setLoginErr(j.error || "변경에 실패했습니다."); return; }
      setLoginOk(true);
      setLoginOpen(false);
      alert("비밀번호가 변경되었습니다.\n보안을 위해 다시 로그인해주세요.");
      await logout();
      router.replace("/login");
    } finally {
      setLoginSaving(false);
    }
  };

  // 학적상태변경 패널 열기 — 본인 확인 후 현재 학번/상태를 기본값으로
  const openAcademicEditor = () => {
    requirePassword(() => {
      setAcForm({ newStudentId: studentId, academicStatus, currentPassword: "" });
      setAcErr(""); setAcOpen(true);
    });
  };

  const saveAcademicStatus = async () => {
    setAcErr("");
    const newSid = acForm.newStudentId.trim();
    if (!newSid) { setAcErr("새 학번을 입력해주세요."); return; }
    if (!/^[A-Za-z0-9]{4,20}$/.test(newSid)) { setAcErr("학번은 영문/숫자 4~20자로 입력해주세요."); return; }
    if (!acForm.currentPassword) { setAcErr("현재 비밀번호를 입력해주세요."); return; }
    const changingId = newSid !== studentId;
    if (!changingId && acForm.academicStatus === academicStatus) { setAcErr("변경된 내용이 없습니다."); return; }
    setAcSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/change-student-id", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ newStudentId: newSid, academicStatus: acForm.academicStatus, currentPassword: acForm.currentPassword }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { setAcErr(j.error || "변경에 실패했습니다."); return; }
      setAcOpen(false);
      if (changingId) {
        // 학번(로그인 아이디)이 바뀌면 다시 로그인 필요. 기존 신청기록은 그대로 보존됩니다.
        alert(`학적상태가 변경되었습니다.\n새 학번: ${newSid}\n\n기존 신청 기록은 모두 유지되며, 새 학번으로 다시 로그인해주세요.`);
        await logout();
        router.replace("/login");
      } else {
        setAcademicStatus(acForm.academicStatus);
        alert("학적상태가 변경되었습니다.");
        load();
      }
    } finally {
      setAcSaving(false);
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

  // 삭제(취소) 확인 모달
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

  const doCancel = async (app: Application) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/applications/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id: app.id }),
    });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) load();
    else alert("실패: " + (j.error || "알 수 없는 오류"));
  };
  const requestDelete = (app: Application, isDraft: boolean) => {
    if (app.canceled) return;
    setConfirmState({
      title: isDraft ? "임시저장 삭제" : "신청 취소",
      message: isDraft
        ? "이 임시저장 내용을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다."
        : `이 신청(${app.receiptNumber || "-"})을 취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다.`,
      confirmLabel: isDraft ? "삭제" : "신청 취소",
      onConfirm: () => doCancel(app),
    });
  };

  const setP = (key: keyof Profile, val: string) => setProfile((p) => ({ ...p, [key]: val }));

  const fmt = (n: number) => (n || 0).toLocaleString("ko-KR");
  const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("ko-KR") : "-");

  const drafts = apps.filter((a) => a.isDraft && !a.canceled);
  const submitted = apps.filter((a) => !a.isDraft && !a.canceled);
  // 신청 취소·임시저장 삭제한 건은 한 묶음으로 모아서 보여줌
  const canceled = apps.filter((a) => a.canceled);

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
            <p className="text-sm text-gray-500 mt-1">학번 {studentId || "-"} · 신청 내역 {submitted.length}건{drafts.length > 0 ? ` · 임시저장 ${drafts.length}건` : ""}</p>
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

        {/* 보완요청 알림 배너 — 보완요청 상태 신청이 있으면 상단에 고정 노출 */}
        {submitted.some((a) => a.reviewStatus === "supplement") && (
          <div className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-2.5">
            <span className="text-lg leading-none mt-0.5">✍️</span>
            <div className="text-sm text-orange-800">
              <strong>보완 요청이 있는 신청이 {submitted.filter((a) => a.reviewStatus === "supplement").length}건 있습니다.</strong> 아래 ‘신청 내역’에서 해당 신청의 안내를 확인하고 <strong>수정 후 다시 제출</strong>해주세요.
            </div>
          </div>
        )}

        {/* 개인정보 수정 */}
        <div className="card">
          <button
            type="button"
            onClick={() => { if (profileOpen) setProfileOpen(false); else requirePassword(() => setProfileOpen(true)); }}
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
                {profile.university === "강원대학교" ? (
                  <div>
                    <label className="label">캠퍼스 · 단과대학 · 학과</label>
                    <CampusDeptSelect
                      campus={profile.campus}
                      department={profile.department}
                      onCampusChange={(v) => setP("campus", v)}
                      onDepartmentChange={(v) => setP("department", v)}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">학과/전공</label>
                    <input className="input-field" value={profile.department} onChange={(e) => setP("department", e.target.value)} placeholder="컴퓨터공학과" />
                  </div>
                )}
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

        {/* 비밀번호 변경 */}
        <div className="card">
          <button
            type="button"
            onClick={() => { if (loginOpen) setLoginOpen(false); else openLoginEditor(); }}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-800">비밀번호 변경</span>
              {loginOk && <span className="text-xs text-green-600 font-medium">✓ 변경되었습니다</span>}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${loginOpen ? "rotate-180" : ""}`} />
          </button>

          {loginOpen && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-gray-500">로그인 비밀번호를 변경합니다. 변경 후에는 새 비밀번호로 다시 로그인해야 합니다.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">새 비밀번호 <span className="text-red-500">*</span></label>
                  <input className="input-field" type="password" value={loginForm.newPassword} onChange={(e) => setLoginForm((f) => ({ ...f, newPassword: e.target.value }))} placeholder="6자 이상" autoComplete="new-password" />
                </div>
                <div>
                  <label className="label">새 비밀번호 확인 <span className="text-red-500">*</span></label>
                  <input className="input-field" type="password" value={loginForm.confirmPassword} onChange={(e) => setLoginForm((f) => ({ ...f, confirmPassword: e.target.value }))} placeholder="새 비밀번호 재입력" autoComplete="new-password" />
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <label className="label">현재 비밀번호 <span className="text-red-500">*</span></label>
                <input className="input-field sm:max-w-xs" type="password" value={loginForm.currentPassword} onChange={(e) => setLoginForm((f) => ({ ...f, currentPassword: e.target.value }))} placeholder="본인 확인을 위해 현재 비밀번호 입력" autoComplete="current-password" />
              </div>
              {loginErr && <p className="text-red-500 text-sm">{loginErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setLoginOpen(false)} className="btn-secondary text-sm">취소</button>
                <button type="button" onClick={saveLogin} disabled={loginSaving} className="btn-primary text-sm disabled:opacity-60">
                  {loginSaving ? "변경 중..." : "변경"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 학적상태변경 (대학원 진학 등으로 학번 변경) */}
        <div className="card">
          <button
            type="button"
            onClick={() => { if (acOpen) setAcOpen(false); else openAcademicEditor(); }}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-800">학적상태변경</span>
              <span className="badge bg-indigo-100 text-indigo-700">{academicStatus}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${acOpen ? "rotate-180" : ""}`} />
          </button>

          {acOpen && (
            <div className="mt-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                대학원 진학 등으로 학번이 바뀌는 경우 새 학번과 학적상태를 변경합니다. <strong>이전에 신청한 기록은 모두 그대로 유지·확인 가능</strong>합니다. 학번(로그인 아이디)이 바뀌면 변경 후 새 학번으로 다시 로그인해야 합니다.
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">학번 (로그인 아이디)</label>
                  <input className="input-field" value={acForm.newStudentId} onChange={(e) => setAcForm((f) => ({ ...f, newStudentId: e.target.value }))} placeholder="새 학번" autoComplete="off" />
                </div>
                <div>
                  <label className="label">학적상태</label>
                  <select className="input-field" value={acForm.academicStatus} onChange={(e) => setAcForm((f) => ({ ...f, academicStatus: e.target.value }))}>
                    {["재학생", "대학원생", "졸업생", "휴학생", "수료생", "기타"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <label className="label">현재 비밀번호 <span className="text-red-500">*</span></label>
                <input className="input-field sm:max-w-xs" type="password" value={acForm.currentPassword} onChange={(e) => setAcForm((f) => ({ ...f, currentPassword: e.target.value }))} placeholder="본인 확인을 위해 현재 비밀번호 입력" autoComplete="current-password" />
              </div>
              {acErr && <p className="text-red-500 text-sm">{acErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAcOpen(false)} className="btn-secondary text-sm">취소</button>
                <button type="button" onClick={saveAcademicStatus} disabled={acSaving} className="btn-primary text-sm disabled:opacity-60">
                  {acSaving ? "변경 중..." : "변경"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 수강 시간표 (근로장학금) */}
        <div className="card">
          <button
            type="button"
            onClick={() => { if (ttOpen) setTtOpen(false); else requirePassword(() => setTtOpen(true)); }}
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

        {/* 임시저장 (작성 중) */}
        {!loading && drafts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700">임시저장 (작성 중)</h2>
            {drafts.map((d) => (
              <div key={d.id} className="card flex items-center justify-between gap-3 flex-wrap" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-amber-100 text-amber-700">임시저장</span>
                    <span className="badge bg-gray-100 text-gray-600">{APPLICATION_PHASE_LABELS[d.applicationPhase || "fund"]}</span>
                    <span className="font-bold text-gray-800">{APPLICATION_TYPE_LABELS[d.applicationType]}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">마지막 저장 {fmtDate(d.updatedAt || d.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => requestDelete(d, true)} className="text-xs text-gray-400 hover:text-rose-500">삭제</button>
                  <Link href={`/apply?draft=${d.id}&mode=${d.applicationPhase || "fund"}`} className="btn-primary text-sm flex items-center gap-1.5">
                    이어서 신청 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : submitted.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">아직 제출한 신청 내역이 없습니다.</p>
            <Link href="/apply" className="btn-primary inline-flex items-center gap-1.5">
              지원금 신청하기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {submitted.map((app) => {
              const rm = statusMeta(statusCfg, "review", app.reviewStatus);
              const pm = statusMeta(statusCfg, "payment", app.paymentStatus);
              const stepIdx = statusCfg.review.findIndex((o) => o.key === app.reviewStatus);
              const totalSteps = statusCfg.review.length;
              return (
                <div key={app.id} className={`card ${app.canceled ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${app.applicationPhase === "pre" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>{APPLICATION_PHASE_LABELS[app.applicationPhase || "fund"]}</span>
                        <span className="font-bold text-gray-800">{APPLICATION_TYPE_LABELS[app.applicationType]}</span>
                        <span className="text-xs text-gray-400">접수번호 {app.receiptNumber || "-"}</span>
                        {app.canceled && <span className="badge bg-rose-100 text-rose-700">취소됨</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        신청일 {fmtDate(app.createdAt)}
                        {app.canceled && app.canceledAt && ` · 취소 일시 ${new Date(app.canceledAt).toLocaleString("ko-KR")}`}
                      </div>
                    </div>
                    {!app.canceled && (
                    <div className="flex items-center gap-2">
                      <span title={REVIEW_TODO[app.reviewStatus] || ""} className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-help ${rm?.badge || "bg-gray-100 text-gray-600"}`}>검토: {rm?.label || app.reviewStatus}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${pm?.badge || "bg-gray-100 text-gray-600"}`}>지급: {pm?.label || app.paymentStatus}</span>
                    </div>
                    )}
                  </div>

                  {/* 진행 단계 바 */}
                  {!app.canceled && (
                  <div className="mt-4">
                    <div className="flex gap-1">
                      {statusCfg.review.map((o, i) => (
                        <div
                          key={o.key}
                          className="flex-1 h-1.5 rounded-full"
                          style={{ background: app.reviewStatus === "rejected" ? "#fca5a5" : i <= stepIdx ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "rgba(0,0,0,0.08)" }}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">진행 {Math.max(0, stepIdx) + 1} / {totalSteps} 단계</div>
                  </div>
                  )}

                  {/* 금액 (지원금 신청만) */}
                  {!app.canceled && app.applicationPhase !== "pre" && (
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

                  {/* 지원신청 → 지원금 신청 연계 (관리자 승인 시에만 가능) */}
                  {!app.canceled && app.applicationPhase === "pre" && (
                    app.reviewStatus === "approved" ? (
                      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <span className="text-xs text-gray-600">✅ 지원신청이 <strong>승인</strong>되었습니다. 활동을 마치셨다면 이 내역으로 지원금을 신청하세요. (중복 항목 자동 입력)</span>
                        <Link href={`/apply?from=${app.id}`} className="btn-primary text-sm flex items-center gap-1.5 shrink-0">
                          지원금 신청하기 <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : app.reviewStatus === "rejected" ? (
                      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl px-3 py-2.5" style={{ background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.25)" }}>
                        <span className="text-xs text-rose-700">⛔ 지원신청이 <strong>반려</strong>되어 지원금 신청을 진행할 수 없습니다.</span>
                        <button
                          onClick={() => alert(`지원금 신청 불가\n\n사유: ${app.adminMemo || "지원신청이 반려되었습니다. 자세한 사항은 사업단에 문의해주세요."}`)}
                          className="btn-secondary text-sm shrink-0"
                        >
                          사유 보기
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl px-3 py-2.5 text-xs text-gray-500" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
                        ⏳ 관리자 <strong>승인</strong> 후 지원금 신청이 가능합니다. (현재 검토 상태: {statusMeta(statusCfg, "review", app.reviewStatus).label})
                      </div>
                    )
                  )}

                  {!app.canceled && app.reviewStatus === "supplement" && (
                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-xl px-3 py-2.5" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)" }}>
                      <span className="text-xs text-orange-700">✍️ <strong>보완 요청</strong>이 있습니다. 아래 안내를 확인하고 신청서를 수정해 다시 제출해주세요.</span>
                      <Link href={`/apply?draft=${app.id}&mode=${app.applicationPhase || "fund"}`} className="btn-primary text-sm flex items-center gap-1.5 shrink-0">
                        수정 후 재제출 <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  {app.adminMemo && (
                    <div className="mt-3 text-xs text-gray-600 rounded-xl px-3 py-2" style={{ background: "rgba(99,102,241,0.06)" }}>
                      <span className="font-semibold text-indigo-600">안내: </span>{app.adminMemo}
                    </div>
                  )}

                  {/* 신청 취소 */}
                  {!app.canceled && (
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => requestDelete(app, false)} className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> 신청 취소
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 신청 취소 내역 (취소·삭제한 건 한 묶음) */}
        {!loading && canceled.length > 0 && (
          <div className="card">
            <button
              type="button"
              onClick={() => setCanceledOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <span className="font-semibold text-gray-800">신청 취소 내역</span>
                <span className="badge bg-rose-100 text-rose-700">{canceled.length}건</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${canceledOpen ? "rotate-180" : ""}`} />
            </button>

            {canceledOpen && (
              <div className="mt-4 space-y-2 pt-3 border-t border-gray-100">
                {canceled.map((app) => (
                  <div key={app.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap" style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.18)" }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge bg-rose-100 text-rose-700">{app.isDraft ? "임시저장 삭제" : "신청 취소"}</span>
                        <span className="badge bg-gray-100 text-gray-600">{APPLICATION_PHASE_LABELS[app.applicationPhase || "fund"]}</span>
                        <span className="font-semibold text-gray-700">{APPLICATION_TYPE_LABELS[app.applicationType]}</span>
                        {!app.isDraft && <span className="text-xs text-gray-400">접수번호 {app.receiptNumber || "-"}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        신청일 {fmtDate(app.createdAt)}
                        {app.canceledAt && ` · 취소 일시 ${new Date(app.canceledAt).toLocaleString("ko-KR")}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 회원 탈퇴 (위험 구역) */}
        <div className="card border border-rose-200">
          <button type="button" onClick={() => { setWdOpen((v) => !v); setWdPw(""); }} className="w-full flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span className="font-semibold text-rose-700">회원 탈퇴</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${wdOpen ? "rotate-180" : ""}`} />
          </button>
          {wdOpen && (
            <div className="mt-4 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 leading-relaxed">
                <p className="font-semibold mb-1">탈퇴 시 안내 (되돌릴 수 없습니다)</p>
                <p>• 작성·제출한 <strong>지원신청 기록은 플랫폼 신청목록에서 모두 삭제</strong>됩니다(임시저장·증빙 파일 포함).</p>
                <p>• 단, <strong>이미 지급 완료된 건</strong>은 정산·증빙을 위해 기록으로 보존됩니다.</p>
                <p>• 계정 정보(프로필·계좌·비밀번호)는 삭제되며, 같은 학번으로 다시 가입할 수 있습니다.</p>
              </div>
              <div className="max-w-sm">
                <label className="label">현재 비밀번호</label>
                <input type="password" className="input-field" value={wdPw} onChange={(e) => setWdPw(e.target.value)} placeholder="본인 확인을 위해 현재 비밀번호 입력" autoComplete="off" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setWdOpen(false); setWdPw(""); }} className="btn-secondary text-sm">취소</button>
                <button onClick={submitWithdraw} disabled={wdBusy} className="text-sm px-4 py-2 rounded-xl font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60">{wdBusy ? "처리 중..." : "탈퇴하기"}</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          ※ 신청 내역과 진행 상황은 본인 계정에서만 조회됩니다. 처리 상태는 사업단 검토에 따라 갱신됩니다.
        </p>
      </main>

      {/* 삭제/취소 확인 모달 */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="modal-backdrop absolute inset-0" onClick={() => setConfirmState(null)} />
          <div className="modal relative w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">{confirmState.title}</h2>
            <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">{confirmState.message}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmState(null)} className="btn-secondary flex-1">돌아가기</button>
              <button
                onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn(); }}
                className="btn-primary flex-1"
                style={{ background: "linear-gradient(90deg,#f43f5e,#e11d48)" }}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 확인 모달 */}
      {pwOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="modal-backdrop absolute inset-0" onClick={() => setPwOpen(false)} />
          <div className="modal relative w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">본인 확인</h2>
            <p className="text-sm text-gray-500 mb-4">정보를 수정하려면 비밀번호를 입력해주세요.</p>
            <input
              type="password"
              className="input-field"
              value={pwValue}
              autoFocus
              onChange={(e) => setPwValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && pwValue && !pwChecking) confirmPassword(); }}
              placeholder="비밀번호"
            />
            {pwError && <p className="text-red-500 text-sm mt-2">{pwError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPwOpen(false)} className="btn-secondary flex-1">취소</button>
              <button onClick={confirmPassword} disabled={!pwValue || pwChecking} className="btn-primary flex-1 disabled:opacity-60">
                {pwChecking ? "확인 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
