"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DEFAULT_SITE_CONFIG, fetchSiteConfig, type SiteConfig, type SiteLink, type FooterItem } from "@/lib/site-config";

const TABS = ["푸터 설정", "사이드바 링크"] as const;
type Tab = typeof TABS[number];
const ICONS = ["Globe", "BookOpen", "GraduationCap", "MessageCircle", "Mail", "Phone", "Award", "FileText", "Link"];
const FOOTER_ICONS = ["Mail", "Phone", "MapPin", "Globe", "Link2", "MessageCircle", "GraduationCap", "BookOpen"];
const FOOTER_TYPES: { v: FooterItem["type"]; label: string }[] = [
  { v: "email", label: "이메일(클릭 복사)" },
  { v: "phone", label: "전화(통화)" },
  { v: "address", label: "주소(지도검색)" },
  { v: "link", label: "링크(URL)" },
];
const newId = () => Math.random().toString(36).slice(2, 10);

export default function SiteSettingsPage() {
  const [tab, setTab] = useState<Tab>("푸터 설정");
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchSiteConfig().then(setConfig); }, []);

  const updateFooter = (k: keyof SiteConfig["footer"], v: string) => {
    setConfig((c) => ({ ...c, footer: { ...c.footer, [k]: v } })); setSaved(false);
  };
  const updateFooterItem = (id: string, patch: Partial<FooterItem>) => {
    setConfig((c) => ({ ...c, footer: { ...c.footer, items: c.footer.items.map((it) => it.id === id ? { ...it, ...patch } : it) } })); setSaved(false);
  };
  const addFooterItem = () => {
    setConfig((c) => ({ ...c, footer: { ...c.footer, items: [...c.footer.items, { id: newId(), type: "link", iconName: "Globe", label: "", value: "" }] } })); setSaved(false);
  };
  const removeFooterItem = (id: string) => {
    setConfig((c) => ({ ...c, footer: { ...c.footer, items: c.footer.items.filter((it) => it.id !== id) } })); setSaved(false);
  };
  const moveFooterItem = (id: string, dir: -1 | 1) => {
    setConfig((c) => {
      const arr = [...c.footer.items]; const i = arr.findIndex((x) => x.id === id); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return c;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...c, footer: { ...c.footer, items: arr } };
    }); setSaved(false);
  };
  const moveLink = (id: string, dir: -1 | 1) => {
    setConfig((c) => {
      const arr = [...c.sidebarLinks]; const i = arr.findIndex((x) => x.id === id); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return c;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...c, sidebarLinks: arr };
    }); setSaved(false);
  };
  const updateLink = (id: string, patch: Partial<SiteLink>) => {
    setConfig((c) => ({ ...c, sidebarLinks: c.sidebarLinks.map((l) => l.id === id ? { ...l, ...patch } : l) })); setSaved(false);
  };
  const addLink = () => {
    setConfig((c) => ({ ...c, sidebarLinks: [...c.sidebarLinks, { id: newId(), label: "새\n링크", href: "https://", iconName: "Link", color: "#4f8cff" }] })); setSaved(false);
  };
  const removeLink = (id: string) => { setConfig((c) => ({ ...c, sidebarLinks: c.sidebarLinks.filter((l) => l.id !== id) })); setSaved(false); };

  const save = async () => {
    const res = await fetch("/api/site-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    const j = await res.json().catch(() => ({}));
    if (j.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else alert("저장 실패: " + (j.error || res.status));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">사이트 설정</h1>
        <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
      </div>
      <p className="text-gray-500 text-sm mb-4">홈 화면의 푸터(연락처)와 우측 바로가기 링크를 수정합니다. 저장하면 사이트에 즉시 반영됩니다.</p>
      {saved && <div className="mb-4 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}

      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${tab === t ? "bg-indigo-500 text-white" : "bg-white/60 text-gray-600"}`}>{t}</button>
        ))}
      </div>

      {tab === "푸터 설정" && (
        <div className="space-y-3">
          <div className="card">
            <label className="label">조직명</label>
            <input className="input-field" value={config.footer.organization} onChange={(e) => updateFooter("organization", e.target.value)} />
          </div>
          <p className="text-sm text-gray-500">연락처 항목을 사이드바 링크처럼 추가·수정·삭제할 수 있습니다. (유형에 따라 클릭 동작이 달라집니다)</p>
          {config.footer.items.map((it) => (
            <div key={it.id} className="card grid sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3"><label className="label">유형</label>
                <select className="input-field" value={it.type} onChange={(e) => updateFooterItem(it.id, { type: e.target.value as FooterItem["type"] })}>
                  {FOOTER_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="label">아이콘</label>
                <select className="input-field" value={it.iconName} onChange={(e) => updateFooterItem(it.id, { iconName: e.target.value })}>{FOOTER_ICONS.map((i) => <option key={i}>{i}</option>)}</select>
              </div>
              <div className="sm:col-span-3"><label className="label">표시 텍스트</label><input className="input-field" value={it.label} onChange={(e) => updateFooterItem(it.id, { label: e.target.value })} placeholder="예: sducoss@kangwon.ac.kr" /></div>
              <div className="sm:col-span-3"><label className="label">값(이메일/전화/주소/URL)</label><input className="input-field" value={it.value} onChange={(e) => updateFooterItem(it.id, { value: e.target.value })} placeholder={it.type === "address" ? "지도 검색어" : "값"} /></div>
              <div className="sm:col-span-1 flex justify-end items-center gap-1">
                <button onClick={() => moveFooterItem(it.id, -1)} className="text-gray-300 hover:text-indigo-500" title="위로"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveFooterItem(it.id, 1)} className="text-gray-300 hover:text-indigo-500" title="아래로"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => removeFooterItem(it.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <button onClick={addFooterItem} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 연락처 항목 추가</button>
        </div>
      )}

      {tab === "사이드바 링크" && (
        <div className="space-y-3">
          {config.sidebarLinks.map((l) => (
            <div key={l.id} className="card grid sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3"><label className="label">라벨 (줄바꿈 \n)</label><input className="input-field" value={l.label.replace(/\n/g, "\\n")} onChange={(e) => updateLink(l.id, { label: e.target.value.replace(/\\n/g, "\n") })} /></div>
              <div className="sm:col-span-4"><label className="label">링크(URL)</label><input className="input-field" value={l.href} onChange={(e) => updateLink(l.id, { href: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">아이콘</label><select className="input-field" value={l.iconName} onChange={(e) => updateLink(l.id, { iconName: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="label">색상</label><input type="color" className="input-field h-[52px] p-1" value={l.color} onChange={(e) => updateLink(l.id, { color: e.target.value })} /></div>
              <div className="sm:col-span-1 flex justify-end items-center gap-1">
                <button onClick={() => moveLink(l.id, -1)} className="text-gray-300 hover:text-indigo-500" title="위로"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveLink(l.id, 1)} className="text-gray-300 hover:text-indigo-500" title="아래로"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => removeLink(l.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <label className="sm:col-span-12 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={!!l.isKakao} onChange={(e) => updateLink(l.id, { isKakao: e.target.checked })} /> 카카오 스타일(노란 버튼)</label>
            </div>
          ))}
          <button onClick={addLink} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 링크 추가</button>
        </div>
      )}
    </AdminLayout>
  );
}
