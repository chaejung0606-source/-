"use client";
import { useState } from "react";
import JSZip from "jszip";
import { NotebookPen, Upload, X, Download, AlertTriangle, CheckCircle2, Plus, Trash2, FileArchive } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { Meeting } from "@/lib/meeting-minutes";

interface InFile { name: string; mediaType: string; dataBase64: string; }
interface InGroup { name: string; files: InFile[] }

const IMG_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
const mediaOf = (name: string): string => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  return IMG_EXT[ext] || "";
};
const fileToB64 = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = reject;
  r.readAsDataURL(file);
});

export default function MeetingMinutesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [err, setErr] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list)]);
    setMeetings(null); setErr("");
  };
  const removeFile = (i: number) => setFiles((f) => f.filter((_, k) => k !== i));

  // 업로드 파일 → 회의 그룹(zip 1개 = 회의 1건, 나머지 낱개 파일들 = 회의 1건)
  const buildGroups = async (): Promise<InGroup[]> => {
    const groups: InGroup[] = [];
    const loose: InFile[] = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        try {
          const zip = await JSZip.loadAsync(f);
          const gfiles: InFile[] = [];
          const entries = Object.values(zip.files).filter((e) => !e.dir && !e.name.includes("__MACOSX") && !e.name.split("/").pop()!.startsWith("."));
          for (const e of entries) {
            const mt = mediaOf(e.name);
            if (!mt) continue;
            gfiles.push({ name: e.name.split("/").pop() || e.name, mediaType: mt, dataBase64: await e.async("base64") });
          }
          if (gfiles.length) groups.push({ name: f.name.replace(/\.zip$/i, ""), files: gfiles });
        } catch { setErr(`ZIP 파일을 열 수 없습니다: ${f.name}`); }
      } else {
        const mt = mediaOf(f.name);
        if (mt) loose.push({ name: f.name, mediaType: mt, dataBase64: await fileToB64(f) });
      }
    }
    if (loose.length) groups.push({ name: "직접 업로드", files: loose });
    return groups;
  };

  const generate = async () => {
    setBusy(true); setErr(""); setMeetings(null);
    try {
      const groups = await buildGroups();
      if (groups.length === 0) { setErr("PDF·이미지 파일 또는 회의별 ZIP 파일을 업로드해주세요."); return; }
      const res = await fetch("/api/admin/meeting-minutes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groups }) });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { setErr(j.error || `오류 (${res.status})`); return; }
      setMeetings(j.meetings || []);
    } finally { setBusy(false); }
  };

  const setM = (i: number, patch: Partial<Meeting>) => setMeetings((ms) => ms ? ms.map((m, k) => k === i ? { ...m, ...patch } : m) : ms);

  const download = async (m: Meeting) => {
    const res = await fetch("/api/admin/meeting-minutes/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meeting: m }) });
    if (!res.ok) { alert("다운로드 실패"); return; }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const mt = /filename\*=UTF-8''([^;]+)/.exec(cd);
    const name = mt ? decodeURIComponent(mt[1]) : "회의록.docx";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2"><NotebookPen className="w-6 h-6 text-indigo-500" /> 회의록 작성</h1>
      <p className="text-gray-500 text-sm mb-4">회의비 공문·계획서·결과보고서·영수증·서명부(PDF·이미지)를 올리면 AI가 회의록을 작성합니다. <strong>회의가 여러 건이면 회의별로 ZIP으로 묶어</strong> 여러 개 올리세요.</p>

      {/* 업로드 */}
      <div className="card mb-5">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`upload-card flex flex-col items-center justify-center gap-1 p-8 text-center text-sm cursor-pointer ${dragOver ? "ring-2 ring-indigo-300 bg-indigo-50/40" : ""}`}
        >
          <Upload className="w-7 h-7 opacity-60 text-gray-400" />
          <span className="text-gray-500">PDF · 이미지 · ZIP 파일을 끌어다 놓거나 클릭하여 업로드</span>
          <span className="text-[11px] text-gray-300">여러 회의 = 회의별 ZIP 여러 개 · 한 회의 = PDF/이미지 낱개</span>
          <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip" className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
        </label>
        {files.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                {/\.zip$/i.test(f.name) ? <FileArchive className="w-4 h-4 text-indigo-400 shrink-0" /> : <Upload className="w-4 h-4 text-gray-300 shrink-0" />}
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-[11px] text-gray-400">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          {err && <span className="text-sm text-rose-600">{err}</span>}
          <button onClick={generate} disabled={busy || files.length === 0} className="btn-primary text-sm ml-auto flex items-center gap-1.5 disabled:opacity-50">
            <NotebookPen className="w-4 h-4" /> {busy ? "회의록 작성 중..." : "회의록 생성"}
          </button>
        </div>
      </div>

      {busy && <div className="text-center py-10 text-gray-400">서류를 읽고 회의록을 작성하고 있습니다. 잠시만 기다려주세요...</div>}

      {/* 결과 — 회의 건별 */}
      {meetings && meetings.length === 0 && <p className="text-sm text-gray-400">작성된 회의록이 없습니다.</p>}
      {meetings && meetings.map((m, i) => {
        const ok = m.issues.length === 0;
        return (
          <div key={i} className="card mb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{m.groupName}</span>
                {ok
                  ? <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 문제없음</span>
                  : <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 보완요청 {m.issues.length}건</span>}
              </div>
              <button onClick={() => download(m)} className="btn-primary text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> 한글파일 다운로드</button>
            </div>

            {!ok && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 mb-3">
                <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 보완요청 내용 (아래 항목을 직접 확인·수정 후 다운로드)</p>
                <ul className="list-disc pl-5 text-sm text-amber-800 space-y-0.5">
                  {m.issues.map((x, k) => <li key={k}>{x}</li>)}
                </ul>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className="label">회의안건</label><input className="input-field" value={m.agenda} onChange={(e) => setM(i, { agenda: e.target.value })} /></div>
              <div><label className="label">회의일시</label><input className="input-field" value={m.datetime} onChange={(e) => setM(i, { datetime: e.target.value })} placeholder="2026. 4. 8. (수) 17:00 ~ 18:00" /></div>
              <div><label className="label">회의장소</label><input className="input-field" value={m.place} onChange={(e) => setM(i, { place: e.target.value })} /></div>
              <div><label className="label">회의비 사용처(가맹점)</label><input className="input-field" value={m.expenseVendor} onChange={(e) => setM(i, { expenseVendor: e.target.value })} /></div>
              <div><label className="label">참석자 <span className="text-[11px] font-normal text-gray-400">(서명부 서명자 · 쉼표로 구분)</span></label><input className="input-field" value={m.attendees.join(", ")} onChange={(e) => setM(i, { attendees: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="서명부 없으면 비움" /></div>
              <div className="sm:col-span-2"><label className="label">회의내용 및 협의사항</label><textarea className="input-field h-40 resize-y" value={m.content} onChange={(e) => setM(i, { content: e.target.value })} /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-2">
              <div><label className="label text-xs">파일명용 회의일(YYYY-MM-DD)</label><input className="input-field" value={m.date} onChange={(e) => setM(i, { date: e.target.value })} /></div>
              <div><label className="label text-xs">요일</label><input className="input-field" value={m.weekday} onChange={(e) => setM(i, { weekday: e.target.value })} /></div>
              <div><label className="label text-xs">파일명용 안건 요약(10자 이내)</label><input className="input-field" value={m.agendaShort} onChange={(e) => setM(i, { agendaShort: e.target.value })} /></div>
            </div>
          </div>
        );
      })}
    </AdminLayout>
  );
}
