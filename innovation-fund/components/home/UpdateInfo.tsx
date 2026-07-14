"use client";
import { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { CHANGELOG, LATEST_CHANGELOG, displayVersion, formatKoreanDate } from "@/lib/changelog";

// 엔드바 버전 표기 → 클릭 시 업데이트 내역 모달.
// 현재 버전·최근 업데이트 날짜·변경사항은 lib/changelog.ts 최신 항목에서 자동 표시.
export default function UpdateInfo() {
  const [open, setOpen] = useState(false);
  const latest = LATEST_CHANGELOG;
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 모달 열림: 배경 스크롤 잠금 + ESC 닫기 + 닫기 버튼 포커스, 닫힘: 트리거로 포커스 복귀
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  // changelog가 비어도 오류 없이 기본 표기
  const versionText = displayVersion(latest?.version);
  const dateText = formatKoreanDate(latest?.date);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
        title="업데이트 내역 보기"
      >
        <Sparkles className="w-3 h-3" />
        <span className="font-medium">{versionText}</span>
        {dateText && <span className="text-gray-400">· 최근 업데이트: {dateText}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-modal-title"
        >
          <div className="modal-backdrop absolute inset-0" onClick={() => setOpen(false)} />
          <div className="modal relative w-full max-w-md max-h-[80vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-white/40">
              <div className="min-w-0">
                <h2 id="update-modal-title" className="text-lg font-bold holo-text flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> 업데이트 내역
                </h2>
                {latest ? (
                  <p className="text-xs text-gray-500 mt-1">
                    현재 <b className="text-indigo-600">{versionText}</b>
                    {dateText && <> · 최근 업데이트 {dateText}</>}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">등록된 업데이트 내역이 없습니다.</p>
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="shrink-0 text-gray-400 hover:text-gray-700 rounded-lg p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 내역 목록 — 길어지면 내부 스크롤 (최신이 위) */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {CHANGELOG.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">표시할 업데이트 내역이 없습니다.</p>
              ) : (
                CHANGELOG.map((e, i) => (
                  <div key={e.version} className={i === 0 ? "" : "pt-4 border-t border-gray-100"}>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-sm font-bold ${i === 0 ? "text-indigo-600" : "text-gray-700"}`}>{displayVersion(e.version)}</span>
                      {i === 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">최신</span>}
                      <span className="text-xs text-gray-400">{formatKoreanDate(e.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">{e.title}</p>
                    {e.changes.length > 0 && (
                      <ul className="space-y-0.5">
                        {e.changes.map((c, j) => (
                          <li key={j} className="text-[13px] text-gray-600 flex gap-1.5">
                            <span className="text-indigo-300 shrink-0">·</span>
                            <span className="break-words">{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 pt-3 border-t border-white/40">
              <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full">확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
