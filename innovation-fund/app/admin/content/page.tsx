"use client";
import { useEffect, useState } from "react";
import { Save, Eye, EyeOff } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { fetchSiteContent, htmlFromContent, type TypeContent } from "@/lib/site-content";

const TYPES: ApplicationType[] = ["labor", "program", "staff", "grade", "contest", "certificate"];

export default function ContentAdminPage() {
  const [content, setContent] = useState<Record<string, TypeContent>>({});
  const [saved, setSaved] = useState(false);
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    fetchSiteContent().then((c) => setContent(c as Record<string, TypeContent>));
  }, []);

  const setType = (t: ApplicationType, tc: TypeContent) => { setContent((c) => ({ ...c, [t]: tc })); setSaved(false); };

  const save = async () => {
    const res = await fetch("/api/admin/content", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else alert("저장 실패: " + (j.error || res.status));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">유형별 지급 기준</h1>
        <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
      </div>
      <p className="text-gray-500 text-sm mb-4">홈 화면에서 각 지원금 유형을 클릭하면 표시되는 세부내용(모달)을 편집합니다. 글자 크기·모양·정렬·표 삽입 등 간단한 한글 작업으로 자유롭게 작성하세요.</p>

      {/* 유형 선택 — 선택한 유형만 아래에서 수정 */}
      <div className="card mb-5">
        <p className="text-xs font-semibold text-gray-500 mb-2">유형 선택 (클릭하면 해당 유형만 수정)</p>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${selectedType === t ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"}`}
            >
              {APPLICATION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      {saved && <div className="mb-4 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}
      {!selectedType && <p className="text-sm text-gray-400 mb-4">위에서 유형을 선택하면 해당 유형의 세부내용을 수정할 수 있습니다.</p>}

      {selectedType && content[selectedType] && (() => {
        const t = selectedType;
        const tc = content[t];
        const previewHtml = tc.html ?? htmlFromContent(tc);
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-bold text-gray-800">{APPLICATION_TYPE_LABELS[t]}</h2>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full px-3 py-1 hover:text-indigo-600 hover:border-indigo-300 transition"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? "프리뷰 숨기기" : "프리뷰 보기"}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={!!tc.showPrograms} onChange={(e) => setType(t, { ...tc, showPrograms: e.target.checked })} />
              기준일에 신청 가능한 프로그램 목록 표시
            </label>
            <div className={showPreview ? "grid grid-cols-1 lg:grid-cols-2 gap-5" : ""}>
              <div>
                <label className="label">세부 내용</label>
                <RichTextEditor
                  key={t}
                  initialHtml={htmlFromContent(tc)}
                  onChange={(html) => setType(t, { ...tc, html })}
                />
                <p className="text-[11px] text-gray-400 mt-2">표 삽입·표 넓이·셀 색상·글자색·정렬 등은 위 도구막대를 사용하세요. 저장하면 홈 화면 모달에 그대로 표시됩니다.</p>
              </div>
              {showPreview && (
                <div>
                  <label className="label flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> 미리보기 (홈 화면 모달 모습)</label>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 min-h-[220px] overflow-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <h3 className="font-bold text-gray-800 mb-3">{APPLICATION_TYPE_LABELS[t]}</h3>
                      {previewHtml.replace(/<[^>]*>/g, "").trim() ? (
                        <div className="rich-content text-sm text-gray-700 overflow-x-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      ) : (
                        <p className="text-sm text-gray-400">내용을 입력하면 여기에서 미리 볼 수 있습니다.</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">편집한 내용이 실시간으로 반영됩니다.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </AdminLayout>
  );
}
