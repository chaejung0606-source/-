"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchSiteContent, type TypeContent, type ContentSection } from "@/lib/site-content";

const TYPES: ApplicationType[] = ["labor", "program", "staff", "grade", "contest", "certificate", "activity"];

export default function ContentAdminPage() {
  const [content, setContent] = useState<Record<string, TypeContent>>({});
  const [saved, setSaved] = useState(false);
  const [selectedType, setSelectedType] = useState<ApplicationType | null>(null);

  useEffect(() => {
    fetchSiteContent().then((c) => setContent(c as Record<string, TypeContent>));
  }, []);

  const setType = (t: ApplicationType, tc: TypeContent) => { setContent((c) => ({ ...c, [t]: tc })); setSaved(false); };

  const setSection = (t: ApplicationType, i: number, sec: ContentSection) => {
    const tc = content[t]; if (!tc) return;
    setType(t, { ...tc, sections: tc.sections.map((s, idx) => idx === i ? sec : s) });
  };
  const addSection = (t: ApplicationType) => {
    const tc = content[t]; if (!tc) return;
    setType(t, { ...tc, sections: [...tc.sections, { heading: "새 섹션", items: [] }] });
  };
  const removeSection = (t: ApplicationType, i: number) => {
    const tc = content[t]; if (!tc) return;
    setType(t, { ...tc, sections: tc.sections.filter((_, idx) => idx !== i) });
  };

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
        <h1 className="text-2xl font-bold text-gray-800">지원금 유형 안내</h1>
        <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
      </div>
      <p className="text-gray-500 text-sm mb-4">홈 화면에서 각 지원금 유형을 클릭하면 표시되는 세부내용(모달)을 편집합니다. 항목은 한 줄에 하나씩 입력하세요.</p>

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

      <div className="space-y-5">
        {TYPES.filter((t) => t === selectedType).map((t) => {
          const tc = content[t];
          if (!tc) return null;
          return (
            <div key={t} id={`type-${t}`} className="card scroll-mt-20">
              <h2 className="font-bold text-gray-800 mb-3">{APPLICATION_TYPE_LABELS[t]}</h2>
              <div className="mb-4">
                <label className="label">소개 문구</label>
                <textarea className="input-field h-16 resize-none" value={tc.intro} onChange={(e) => setType(t, { ...tc, intro: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={!!tc.showPrograms} onChange={(e) => setType(t, { ...tc, showPrograms: e.target.checked })} />
                기준일에 신청 가능한 프로그램 목록 표시
              </label>

              <div className="space-y-3">
                {tc.sections.map((sec, i) => (
                  <div key={i} className="rounded-2xl p-3 bg-white/60 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <input className="input-field flex-1" value={sec.heading} onChange={(e) => setSection(t, i, { ...sec, heading: e.target.value })} placeholder="섹션 제목" />
                      <button onClick={() => removeSection(t, i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <textarea
                      className="input-field h-24 resize-none text-sm"
                      value={sec.items.join("\n")}
                      onChange={(e) => setSection(t, i, { ...sec, items: e.target.value.split("\n").filter((x) => x.trim() !== "") })}
                      placeholder="한 줄에 하나씩 입력"
                    />
                  </div>
                ))}
                <button onClick={() => addSection(t)} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 섹션 추가</button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
