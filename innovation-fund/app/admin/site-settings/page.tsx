"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, ChevronUp, ChevronDown, Globe, BookOpen, GraduationCap, MessageCircle, Mail, Phone, Award, FileText, Link as LinkIcon } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DEFAULT_SITE_CONFIG, fetchSiteConfig, type SiteConfig, type SiteLink, type FooterItem } from "@/lib/site-config";
import type { PopupItem } from "@/app/api/popup/route";
import FileStoragePanel from "@/components/admin/FileStoragePanel";

const TABS = ["푸터 설정", "사이드바 링크", "팝업 공지", "파일 저장 경로"] as const;
type Tab = typeof TABS[number];
const ICON_MAP: Record<string, typeof Globe> = { Globe, BookOpen, GraduationCap, MessageCircle, Mail, Phone, Award, FileText, Link: LinkIcon };
const ICONS = Object.keys(ICON_MAP);
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
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [popupSaved, setPopupSaved] = useState(false);

  useEffect(() => { fetchSiteConfig().then(setConfig); }, []);
  useEffect(() => { fetch("/api/popup").then((r) => r.json()).then((d) => setPopups(Array.isArray(d.popups) ? d.popups : [])).catch(() => {}); }, []);
  const updatePopup = (id: string, patch: Partial<PopupItem>) => setPopups((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addPopup = () => setPopups((ps) => [...ps, { id: newId(), enabled: true, title: "", content: "", startDate: "", endDate: "" }]);
  const removePopup = (id: string) => setPopups((ps) => ps.filter((p) => p.id !== id));
  const savePopup = async () => {
    const res = await fetch("/api/popup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ popups }) });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) { setPopupSaved(true); setTimeout(() => setPopupSaved(false), 2500); } else alert("저장 실패: " + (j.error || ""));
  };

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

  // 사이드바 항목에 파일(PDF·이미지) 업로드 → 클릭 시 파일을 여는 링크로 설정
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadLinkFile = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/site-upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("업로드 실패: " + (j.error || res.status)); return; }
      updateLink(id, { href: `/api/site-file?path=${encodeURIComponent(j.path)}`, fileName: j.name, iconName: "FileText" });
    } finally { setUploadingId(null); }
  };

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
        {/* 상단 저장은 푸터·사이드바 설정에만 적용. 팝업·파일 저장 경로 탭은 자체 저장 버튼 사용 */}
        {(tab === "푸터 설정" || tab === "사이드바 링크") && (
          <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
        )}
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
              <div className="sm:col-span-4">
                <label className="label">링크(URL) 또는 파일</label>
                <input className="input-field" value={l.href} onChange={(e) => updateLink(l.id, { href: e.target.value, fileName: undefined })} placeholder="https:// 또는 아래에서 파일 업로드" />
                <div className="flex items-center gap-2 mt-1.5">
                  <label className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${uploadingId === l.id ? "opacity-60 pointer-events-none" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"}`}>
                    {uploadingId === l.id ? "업로드 중..." : "📎 파일 업로드(PDF·이미지)"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLinkFile(l.id, f); e.target.value = ""; }} />
                  </label>
                  {l.fileName && <span className="text-[11px] text-emerald-600 truncate max-w-[160px]" title={l.fileName}>✓ {l.fileName}</span>}
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="label">아이콘 (모양 선택)</label>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map((name) => {
                    const Ic = ICON_MAP[name];
                    const on = l.iconName === name;
                    return (
                      <button key={name} type="button" title={name} onClick={() => updateLink(l.id, { iconName: name })}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border transition ${on ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300" : "border-gray-200 bg-white hover:border-indigo-300"}`}>
                        <Ic className="w-5 h-5" style={{ color: l.color }} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-1">
                <label className="label">색상(아이콘 선)</label>
                <input type="color" className="input-field h-[44px] p-1 w-full" value={l.color} onChange={(e) => updateLink(l.id, { color: e.target.value })} title="아이콘 선 색상" />
              </div>
              <div className="sm:col-span-1 flex justify-end items-center gap-1">
                <button onClick={() => moveLink(l.id, -1)} className="text-gray-300 hover:text-indigo-500" title="위로"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveLink(l.id, 1)} className="text-gray-300 hover:text-indigo-500" title="아래로"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => removeLink(l.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="sm:col-span-12 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={!!l.isKakao} onChange={(e) => updateLink(l.id, { isKakao: e.target.checked })} /> 카카오 스타일(노란 버튼)</label>
                <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={!!l.inWindow} onChange={(e) => updateLink(l.id, { inWindow: e.target.checked })} /> 작은 창으로 보기(새 탭 대신 이동·크기조절 가능한 미리보기 창)</label>
              </div>
            </div>
          ))}
          <button onClick={addLink} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 링크 추가</button>
        </div>
      )}

      {tab === "팝업 공지" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">홈 화면 진입 시 표시되는 팝업 공지를 여러 개 추가·삭제할 수 있습니다. 팝업별로 사용 여부와 표시 기간을 설정하세요. 방문자는 팝업창에서 &lsquo;오늘 하루만 보기 / 다시 보지 않기 / 닫기&rsquo;를 선택할 수 있습니다.</p>
          {popupSaved && <div className="text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}
          {popups.length === 0 && <p className="text-sm text-gray-400">등록된 팝업이 없습니다. 아래 버튼으로 추가하세요.</p>}
          {popups.map((p, idx) => (
            <div key={p.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={p.enabled} onChange={(e) => updatePopup(p.id, { enabled: e.target.checked })} /> 팝업 {idx + 1} 사용함
                </label>
                <button onClick={() => removePopup(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div><label className="label">제목</label><input className="input-field" value={p.title} onChange={(e) => updatePopup(p.id, { title: e.target.value })} placeholder="예: 2026-1학기 지원금 신청 안내" /></div>
              <div><label className="label">내용</label><textarea className="input-field h-28 resize-none" value={p.content} onChange={(e) => updatePopup(p.id, { content: e.target.value })} placeholder="팝업에 표시할 내용을 입력하세요. (줄바꿈 가능)" /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">표시 시작일 <span className="text-gray-400 font-normal">(비우면 제한 없음)</span></label><input type="date" className="input-field" value={p.startDate || ""} onChange={(e) => updatePopup(p.id, { startDate: e.target.value })} /></div>
                <div><label className="label">표시 종료일 <span className="text-gray-400 font-normal">(비우면 제한 없음)</span></label><input type="date" className="input-field" value={p.endDate || ""} onChange={(e) => updatePopup(p.id, { endDate: e.target.value })} /></div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={addPopup} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 팝업 추가</button>
            <button onClick={savePopup} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 팝업 저장</button>
          </div>
        </div>
      )}

      {tab === "파일 저장 경로" && <FileStoragePanel />}
    </AdminLayout>
  );
}
