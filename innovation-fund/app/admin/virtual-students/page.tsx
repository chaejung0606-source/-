"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import VirtualStudentsPanel from "@/components/admin/VirtualStudentsPanel";

// 가상학과 학생 기능은 '신청자 정보' 메뉴 탭으로 통합됨. 이 경로는 직접 접근용으로 유지(진입 시 비밀번호 확인).
export default function VirtualStudentsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [gatePw, setGatePw] = useState("");
  const [gateErr, setGateErr] = useState("");
  const tryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: gatePw }) });
    const j = await res.json().catch(() => ({ success: false }));
    if (j.success) { setUnlocked(true); setGatePw(""); }
    else setGateErr("비밀번호가 올바르지 않습니다.");
  };
  if (!unlocked) return (
    <AdminLayout>
      <div className="max-w-sm mx-auto mt-16 card text-center">
        <div className="glass-pill w-14 h-14 flex items-center justify-center mx-auto mb-3"><Lock className="w-7 h-7 text-indigo-600" /></div>
        <h1 className="text-lg font-bold text-gray-800 mb-1">가상학과 학생 접근 확인</h1>
        <p className="text-sm text-gray-500 mb-4">개인정보 보호를 위해 메뉴 진입 시마다 관리자 비밀번호를 입력해주세요.</p>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input type="password" className="input-field" value={gatePw} onChange={(e) => setGatePw(e.target.value)} placeholder="관리자 비밀번호" autoFocus />
          {gateErr && <p className="text-red-500 text-sm">{gateErr}</p>}
          <button type="submit" disabled={!gatePw} className="btn-primary w-full">확인</button>
        </form>
      </div>
    </AdminLayout>
  );
  return <AdminLayout><VirtualStudentsPanel /></AdminLayout>;
}
