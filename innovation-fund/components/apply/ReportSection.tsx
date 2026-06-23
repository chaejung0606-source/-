"use client";
import { useEffect, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import type { ReportEntry } from "@/types";
import { fetchPrograms, type ReportField } from "@/lib/programs";
import { supabase } from "@/lib/supabase";

interface Props {
  programId?: string;
  value?: ReportEntry[];
  onChange: (v: ReportEntry[]) => void;
}

export default function ReportSection({ programId, value, onChange }: Props) {
  const [fields, setFields] = useState<ReportField[]>([]);
  const [uploading, setUploading] = useState(false);
  const entries = value || [];

  useEffect(() => {
    if (!programId) { setFields([]); return; }
    fetchPrograms().then((all) => {
      const p = all.find((x) => x.id === programId);
      setFields(p?.reportFields || []);
    });
  }, [programId]);

  if (!programId || fields.length === 0) return null;

  const entryFor = (f: ReportField): ReportEntry =>
    entries.find((e) => e.fieldId === f.id) || { fieldId: f.id, label: f.label, type: f.type };

  const setEntry = (f: ReportField, patch: Partial<ReportEntry>) => {
    const base = entryFor(f);
    const next = { ...base, label: f.label, type: f.type, ...patch };
    onChange([...entries.filter((e) => e.fieldId !== f.id), next]);
  };

  const uploadDoc = async (file: File): Promise<{ path: string; name: string } | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("로그인이 필요합니다."); return null; }
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
    if (error) { alert(`업로드 실패: ${error.message}`); return null; }
    return { path, name: file.name };
  };

  const handleFile = async (f: ReportField, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadDoc(file);
      if (r) setEntry(f, { filePath: r.path, fileName: r.name });
    } finally { setUploading(false); }
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">프로그램 보고서 / 증빙</h2>
      <p className="text-sm text-gray-500 -mt-2">선택한 프로그램에서 요구하는 항목을 작성·업로드해주세요.</p>
      {fields.map((f) => {
        const en = entryFor(f);
        return (
          <div key={f.id}>
            <label className="label">{f.label || "항목"} {f.required && <span className="text-red-500">*</span>}</label>
            {f.type === "text" ? (
              <textarea className="input-field h-24 resize-none" value={en.value || ""} onChange={(e) => setEntry(f, { value: e.target.value })} placeholder="내용을 입력해주세요." />
            ) : en.filePath ? (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{en.fileName || "업로드 파일"}</span>
                <button type="button" onClick={() => setEntry(f, { filePath: undefined, fileName: undefined })} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className={`btn-secondary cursor-pointer flex items-center justify-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                <Upload className="w-4 h-4" /> {uploading ? "업로드 중..." : "파일 선택"}
                <input type="file" className="hidden" onChange={(e) => handleFile(f, e)} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.hwp" disabled={uploading} />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
