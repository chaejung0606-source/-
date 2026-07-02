"use client";
import { useEffect, useState } from "react";
import type { ApplicationType } from "@/types";
import { fetchTypeContent, htmlFromContent, type TypeContent } from "@/lib/site-content";

// 신청기준 안내 — 유형별 세부 지급 기준을 인라인(독립 칸)으로 표시 (모달 대신)
export default function TypeCriteria({ type }: { type: ApplicationType }) {
  const [content, setContent] = useState<TypeContent | null>(null);
  useEffect(() => { fetchTypeContent(type).then(setContent).catch(() => {}); }, [type]);

  if (!content) return <p className="text-sm text-gray-400">신청기준을 불러오는 중...</p>;
  const html = htmlFromContent(content);
  const hasText = html.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <div>
      {content.intro && !content.html && <p className="text-sm text-gray-700 mb-2">{content.intro}</p>}
      {hasText ? (
        <div className="rich-content text-sm text-gray-700 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-gray-400">등록된 신청기준 안내가 없습니다.</p>
      )}
    </div>
  );
}
