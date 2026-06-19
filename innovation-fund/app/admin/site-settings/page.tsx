"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DEFAULT_SITE_CONFIG, fetchSiteConfig, type SiteConfig, type SiteLink } from "@/lib/site-config";

const TABS = ["푸터 설정", "사이드바 링크"] as const;
type Tab = typeof TABS[number];
const ICONS = ["Globe", "BookOpen", "GraduationCap", "MessageCircle", "Mail", "Phone", "Award", "FileText", "Link"];
const newId = () => Math.random().toString(36).slice(2, 10);

export default function SiteSettingsPage() {
  const [tab, setTab] = useState<Tab>("푸터 설정");
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchSiteConfig().then(setConfig); }, []);

  const updateFooter = (k: keyof SiteConfig["footer"], v: string) => {
    setConfig((c) => ({ ...c, footer: { ...c.footer, [k]: v } })); setSaved(false);
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
        <div className="card grid sm:grid-cols-2 gap-4">
          <div><label className="label">조직명</label><input className="input-field" value={config.footer.organization} onChange={(e) => updateFooter("organization", e.target.value)} /></div>
          <div><label className="label">이메일</label><input className="input-field" value={config.footer.email} onChange={(e) => updateFooter("email", e.target.value)} /></div>
          <div><label className="label">전화</label><input className="input-field" value={config.footer.phone} onChange={(e) => updateFooter("phone", e.target.value)} /></div>
          <div><label className="label">주소</label><input className="input-field" value={config.footer.address} onChange={(e) => updateFooter("address", e.target.value)} /></div>
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
              <div className="sm:col-span-1 flex justify-end"><button onClick={() => removeLink(l.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button></div>
              <label className="sm:col-span-12 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={!!l.isKakao} onChange={(e) => updateLink(l.id, { isKakao: e.target.checked })} /> 카카오 스타일(노란 버튼)</label>
            </div>
          ))}
          <button onClick={addLink} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 링크 추가</button>
        </div>
      )}
    </AdminLayout>
  );
}
