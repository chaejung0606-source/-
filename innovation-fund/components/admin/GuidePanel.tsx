"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, RotateCcw, Link as LinkIcon, ExternalLink } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { DEFAULT_GUIDE, type GuideSection } from "@/lib/guide";

// 관리자: 신청자 이용안내(가이드) 편집. 저장 시 app_config('guide')에 보관되어 /guide 페이지에 즉시 반영.
// onSiteConfigChanged: 사이드바 링크 추가 등으로 사이트 설정이 바뀌면 부모(사이트 설정 페이지)의 상태를 새로고침
export default function GuidePanel({ onSiteConfigChanged }: { onSiteConfigChanged?: () => void }) {
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [customized, setCustomized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/guide", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSections(Array.isArray(d?.sections) ? d.sections : DEFAULT_GUIDE.sections);
        setCustomized(!!d?.customized);
      })
      .catch(() => setSections(DEFAULT_GUIDE.sections))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const gid = () => "g-" + Math.random().toString(36).slice(2, 9);
  const upd = (id: string, patch: Partial<GuideSection>) => setSections((ss) => ss.map((s) => s.id === id ? { ...s, ...patch } : s));
  const add = () => setSections((ss) => [...ss, { id: gid(), title: "새 항목", html: "" }]);
  const remove = (id: string) => setSections((ss) => ss.filter((s) => s.id !== id));
  const move = (id: string, dir: -1 | 1) => setSections((ss) => {
    const i = ss.findIndex((s) => s.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= ss.length) return ss;
    const a = [...ss]; [a[i], a[j]] = [a[j], a[i]]; return a;
  });
  const resetDefault = () => { if (confirm("현재 편집 내용을 지우고 기본 안내(최신 플랫폼 기준)로 되돌릴까요?")) setSections(DEFAULT_GUIDE.sections.map((s) => ({ ...s }))); };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections }) });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("저장 실패: " + (j.error || res.status)); return; }
      setSaved(true); setCustomized(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  // 사이드바에 '이용안내' 링크 추가 (새 탭으로 열림)
  const [linking, setLinking] = useState(false);
  const addSidebarLink = async () => {
    setLinking(true);
    try {
      const cfg = await fetch("/api/site-config", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (!cfg) { alert("사이트 설정을 불러오지 못했습니다."); return; }
      const links = Array.isArray(cfg.sidebarLinks) ? cfg.sidebarLinks : [];
      if (links.some((l: { href?: string }) => (l.href || "").replace(/\/+$/, "") === "/guide")) {
        onSiteConfigChanged?.();
        alert("이미 사이드바에 이용안내 링크가 있습니다. ('사이드바 링크' 탭에서 확인하세요)");
        return;
      }
      const newLink = { id: "guide-" + Date.now(), label: "이용\n안내", href: "/guide", iconName: "BookOpen", color: "#6366f1" };
      const next = { ...cfg, sidebarLinks: [...links, newLink] };
      const res = await fetch("/api/site-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!res.ok) { alert("추가 실패: HTTP " + res.status); return; }
      const j = await res.json().catch(() => null);
      if (j && j.ok === false) { alert("추가 실패: " + (j.error || "")); return; }
      // 부모(사이트 설정 페이지)의 config 상태를 새로고침 — '사이드바 링크' 탭에 바로 보이고,
      // 이후 상단 [저장]이 옛 상태로 덮어써 링크가 사라지는 문제를 방지한다.
      onSiteConfigChanged?.();
      alert("사이드바에 '이용안내' 링크를 추가했습니다. 홈 화면 우측 바로가기에서 새 탭으로 열립니다.");
    } finally { setLinking(false); }
  };

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800">
        신청자 <b>이용안내</b>를 편집합니다. 저장하면 <b>/guide</b> 페이지에 즉시 반영되고, 사이드바 ‘이용안내’를 누르면 <b>새 탭</b>으로 열립니다. (작은 창으로 바꾸려면 ‘사이드바 링크’ 탭에서 ‘작은 창으로 보기’ 체크)
        {!customized && <span className="block mt-1 text-xs text-indigo-600">현재는 <b>기본 안내(코드 제공)</b>가 표시 중입니다. 여기서 수정·저장하면 그 내용으로 대체됩니다. (수정 전에는 기능 추가 시 기본 안내가 자동 갱신됩니다.)</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={addSidebarLink} disabled={linking} className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-60"><LinkIcon className="w-4 h-4" /> 사이드바에 이용안내 링크 추가</button>
        <a href="/guide" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> 미리보기</a>
        <button onClick={resetDefault} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 ml-auto"><RotateCcw className="w-4 h-4" /> 기본 안내 불러오기</button>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-3" style={{ borderLeft: "3px solid #6366f1" }}>
            <div className="flex items-center gap-2 mb-2">
              <input className="input-field flex-1 font-semibold text-sm" value={s.title} onChange={(e) => upd(s.id, { title: e.target.value })} placeholder="항목 제목" />
              <button onClick={() => move(s.id, -1)} disabled={i === 0} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => move(s.id, 1)} disabled={i === sections.length - 1} className="text-gray-300 hover:text-indigo-500 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
              <button onClick={() => remove(s.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            <RichTextEditor initialHtml={s.html} onChange={(html) => upd(s.id, { html })} />
          </div>
        ))}
      </div>

      <button onClick={add} className="w-full rounded-2xl border-2 border-dashed border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> 항목 추가</button>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        {saved && <span className="text-sm text-green-600 font-medium">✓ 저장되었습니다</span>}
        <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? "저장 중..." : "이용안내 저장"}</button>
      </div>
    </div>
  );
}
