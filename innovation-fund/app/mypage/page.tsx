"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home as HomeIcon, LogOut, FileText, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/auth";
import { fromRow } from "@/lib/app-mapper";
import type { Application } from "@/types";
import { APPLICATION_TYPE_LABELS, APPLICATION_PHASE_LABELS } from "@/types";
import { REVIEW_STATUS_META, PAYMENT_STATUS_META, REVIEW_STATUS_ORDER } from "@/config/status";

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [apps, setApps] = useState<Application[]>([]);

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

                  {/* 금액 */}
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
