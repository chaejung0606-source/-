"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, User, Lock } from "lucide-react";
import { login, register } from "@/lib/auth";
import { formatPhone } from "@/lib/validation";
import CampusDeptSelect from "@/components/common/CampusDeptSelect";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");

  // 로그인
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  // 회원가입
  const [reg, setReg] = useState({ studentId: "", password: "", password2: "", name: "", campus: "춘천", department: "", phone: "", email: "", bankName: "", accountNumber: "", accountHolder: "" });
  const setR = (k: keyof typeof reg, v: string) => setReg((p) => ({ ...p, [k]: v }));
  const [agree, setAgree] = useState(false);

  const [loading, setLoading] = useState(false);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const r = await login(loginId, loginPw);
    setLoading(false);
    if (r.ok) router.push(next);
    else setError(r.error || "로그인 실패");
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (reg.password !== reg.password2) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (!agree) { setError("개인정보 수집·이용에 동의해야 회원가입이 가능합니다."); return; }
    setLoading(true);
    const r = await register(reg);
    setLoading(false);
    if (r.ok) router.push(next);
    else setError(r.error || "회원가입 실패");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </Link>
        <div className="text-center mb-6">
          <div className="glass-pill w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-extrabold holo-text">신청자 로그인</h1>
          <p className="text-gray-500 text-sm mt-1">지원금 신청을 위해 로그인이 필요합니다.</p>
        </div>

        <div className="card">
          <div className="flex gap-2 mb-5">
            <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition ${mode === "login" ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>로그인</button>
            <button onClick={() => { setMode("register"); setError(""); }} className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition ${mode === "register" ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>회원가입</button>
          </div>

          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

          {mode === "login" ? (
            <form onSubmit={doLogin} className="space-y-4">
              <div>
                <label className="label">학번</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="input-field pl-10" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="학번" autoFocus />
                </div>
              </div>
              <div>
                <label className="label">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" className="input-field pl-10" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="비밀번호" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "처리 중..." : "로그인"}</button>
            </form>
          ) : (
            <form onSubmit={doRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">학번 <span className="text-red-500">*</span></label><input className="input-field" value={reg.studentId} onChange={(e) => setR("studentId", e.target.value)} placeholder="숫자만" /></div>
                <div><label className="label">이름 <span className="text-red-500">*</span></label><input className="input-field" value={reg.name} onChange={(e) => setR("name", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">비밀번호 <span className="text-red-500">*</span></label><input type="password" className="input-field" value={reg.password} onChange={(e) => setR("password", e.target.value)} placeholder="8자 이상" /></div>
                <div><label className="label">비밀번호 확인 <span className="text-red-500">*</span></label><input type="password" className="input-field" value={reg.password2} onChange={(e) => setR("password2", e.target.value)} /></div>
              </div>
              <div>
                <label className="label">캠퍼스 · 단과대학 · 학과</label>
                <CampusDeptSelect
                  campus={reg.campus}
                  department={reg.department}
                  onCampusChange={(v) => setR("campus", v)}
                  onDepartmentChange={(v) => setR("department", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">연락처</label><input className="input-field" value={reg.phone} onChange={(e) => setR("phone", formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" /></div>
                <div><label className="label">이메일</label><input className="input-field" value={reg.email} onChange={(e) => setR("email", e.target.value)} placeholder="id@kangwon.ac.kr" /></div>
              </div>

              {/* 계좌 정보 (지원금 입금 계좌) — 신청 시 자동입력 */}
              <div>
                <label className="label">계좌 정보 (지원금 입금 계좌)</label>
                <div className="grid grid-cols-2 gap-3">
                  <select className="input-field" value={reg.bankName} onChange={(e) => setR("bankName", e.target.value)}>
                    <option value="">은행 선택</option>
                    {["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "SC제일은행", "대구은행", "부산은행", "기타"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <input className="input-field" value={reg.accountHolder} onChange={(e) => setR("accountHolder", e.target.value)} placeholder="예금주" />
                </div>
                <input className="input-field mt-3" value={reg.accountNumber} onChange={(e) => setR("accountNumber", e.target.value)} placeholder="계좌번호 (- 없이)" inputMode="numeric" />
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 leading-relaxed">
                  ⚠️ 지원금 신청 시 제출하는 <strong>통장 사본의 정보(예금주·은행·계좌번호)와 반드시 일치</strong>해야 합니다. 본인 명의 계좌만 지급 가능하며, 정보가 다르면 지급이 보류될 수 있습니다. (신청 시 자동으로 입력됩니다.)
                </div>
              </div>

              {/* 개인정보 수집·이용 동의 (수집 시점 고지) */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed border border-gray-100">
                <p className="font-semibold text-gray-800 mb-1">개인정보 수집·이용 안내</p>
                <p>· 수집 항목: 학번, 이름, 학과, 연락처, 이메일</p>
                <p>· 수집 목적: 회원 식별 및 지원금 신청·관리</p>
                <p>· 보유 기간: 회원 탈퇴 또는 지원금 지급 완료 후 5년</p>
                <p className="mt-1">· 동의를 거부할 수 있으나, 미동의 시 회원가입 및 신청이 불가합니다. 자세한 내용은 <Link href="/privacy" className="text-indigo-600 underline">개인정보 처리방침</Link>을 확인하세요.</p>
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>위 개인정보 수집·이용에 동의합니다. <span className="text-red-500 font-medium">[필수]</span></span>
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">{loading ? "처리 중..." : "회원가입 후 시작하기"}</button>
            </form>
          )}
        </div>
        <div className="text-center mt-5">
          <Link href="/admin/login" className="text-sm font-medium text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> 관리자 로그인
          </Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">강원대학교 데이터보안·활용 혁신융합대학사업단</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <LoginInner />
    </Suspense>
  );
}
