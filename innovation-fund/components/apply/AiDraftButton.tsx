"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  label: string;                 // 작성할 항목명 (예: 활동계획)
  context: { programName?: string; applicantName?: string; department?: string; grade?: string };
  maxLen?: number;
  onText: (text: string) => void;
}

// 관리자 대리 신청 시, 신청자별로 달라지는 서술형 항목 초안을 AI가 작성해 채워준다.
export default function AiDraftButton({ label, context, maxLen, onText }: Props) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const instruction = window.prompt(`[${label}] AI 초안 작성\n\n행사 내용·신청자 수준 등 반영할 내용을 적어주세요. (선택, 비워도 됨)`, "");
    if (instruction === null) return; // 취소
    setBusy(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, maxLen, context: { ...context, instruction } }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("AI 초안 작성 실패: " + (j.error || "알 수 없는 오류")); return; }
      if (j.text) onText(j.text);
    } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={run} disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-60">
      <Sparkles className="w-3.5 h-3.5" /> {busy ? "작성 중..." : "AI 초안"}
    </button>
  );
}
