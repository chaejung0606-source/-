"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, User, Home, LogIn } from "lucide-react";

export default function AdminLoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (data.success) {
        // 편집 내용을 바로 확인할 수 있도록 홈 화면으로 이동 (헤더의 '관리자 페이지' 버튼으로 왕복)
        router.push("/");
      } else {
        setError(data.error || "로그인에 실패했습니다.");
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="glass-pill w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-extrabold holo-text">관리자 로그인</h1>
          <p className="text-gray-500 text-sm mt-1">혁신인재지원금 관리 시스템</p>
        </div>
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">아이디</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="관리자 아이디"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading || !loginId || !password} className="btn-primary w-full">
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-sm">
            <Link href="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 transition">
              <Home className="w-4 h-4" /> 홈으로
            </Link>
            <span className="text-gray-200">|</span>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 transition">
              <LogIn className="w-4 h-4" /> 신청자 로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
