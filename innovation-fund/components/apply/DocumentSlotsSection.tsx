"use client";
import { useState } from "react";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import type { DocumentType, UploadedFile } from "@/types";
import { supabase } from "@/lib/supabase";
import { ACCEPT_DOC, DOC_GUIDE as UPLOAD_GUIDE, isAllowedDoc } from "@/lib/upload";

export interface DocSlot {
  type: DocumentType;
  label: string;
  required?: boolean;
  notice?: string; // 업로드 직전 띄울 안내(예: 재학증명서는 직인 날인본 제출)
}

interface Props {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  slots: DocSlot[];
  /** 슬롯 외 추가 자료(기타)를 자유롭게 올릴 수 있는 영역 표시 여부 */
  allowExtra?: boolean;
}

// 서류별 개별 업로드 — 각 서류를 같은 화면에서 칸마다 따로 업로드한다(다음 단계로 넘어가지 않음).
export default function DocumentSlotsSection({ files, onChange, slots, allowExtra = true }: Props) {
  const [busy, setBusy] = useState<string>("");
  const [dragKey, setDragKey] = useState<string>(""); // 드래그 중인 슬롯 키

  const fileOfType = (t: DocumentType) => files.find((f) => f.type === t);
  const extraFiles = files.filter((f) => !slots.some((s) => s.type === f.type));

  // 슬롯별 안내창(notice) 확인 후 드롭 처리
  const dropToSlot = (e: React.DragEvent, slot: DocSlot) => {
    e.preventDefault();
    setDragKey("");
    const f = Array.from(e.dataTransfer.files || [])[0];
    if (!f) return;
    if (slot.notice && !window.confirm(`[${slot.label}] 제출 전 확인\n\n${slot.notice}\n\n확인하셨으면 ‘확인’을 눌러 진행하세요.`)) return;
    upload(f, slot.type, true);
  };

  const upload = async (file: File, type: DocumentType, replace: boolean) => {
    if (!isAllowedDoc(file)) { alert(`${UPLOAD_GUIDE}\n(거부됨: ${file.name})`); return; }
    setBusy(type + (replace ? "" : "-extra"));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("로그인이 필요합니다. 다시 로그인해 주세요."); return; }
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (error) { alert(`${file.name} 업로드 실패: ${error.message}`); return; }
      const newFile: UploadedFile = { id: `${Date.now()}-${Math.random()}`, name: file.name, type, size: file.size, path };
      // 슬롯형은 동일 유형을 교체, 기타는 추가
      const base = replace ? files.filter((f) => f.type !== type) : files;
      onChange([...base, newFile]);
    } finally {
      setBusy("");
    }
  };

  const removeFile = (id: string) => onChange(files.filter((f) => f.id !== id));

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="section-title">서류 업로드</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
          아래 서류를 <strong>각 칸에 하나씩 따로</strong> 업로드해주세요. {UPLOAD_GUIDE}
        </div>

        <div className="space-y-3">
          {slots.map((slot) => {
            const cur = fileOfType(slot.type);
            const loading = busy === slot.type;
            return (
              <div
                key={slot.type}
                onDragOver={(e) => { e.preventDefault(); setDragKey(slot.type); }}
                onDragLeave={() => setDragKey((k) => (k === slot.type ? "" : k))}
                onDrop={(e) => dropToSlot(e, slot)}
                className={`rounded-xl border p-3 transition-colors ${dragKey === slot.type ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-200" : "border-gray-200"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {cur ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-4 h-4 rounded-full border border-gray-300 inline-block" />}
                    <span className="text-sm font-semibold text-gray-800">{slot.label}</span>
                    {slot.required && <span className="text-red-500 text-xs">*</span>}
                  </div>
                  <label className={`btn-secondary cursor-pointer flex items-center gap-1.5 text-xs ${loading ? "opacity-60 pointer-events-none" : ""}`}>
                    <Upload className="w-3.5 h-3.5" /> {loading ? "업로드 중..." : cur ? "다시 업로드" : "파일 선택"}
                    <input
                      type="file"
                      className="hidden"
                      accept={ACCEPT_DOC}
                      disabled={loading}
                      onClick={(e) => { if (slot.notice && !window.confirm(`[${slot.label}] 제출 전 확인\n\n${slot.notice}\n\n확인하셨으면 ‘확인’을 눌러 파일을 선택하세요.`)) e.preventDefault(); }}
                      onChange={async (e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) await upload(f, slot.type, true); }}
                    />
                  </label>
                </div>
                {slot.notice && <p className="text-[11px] text-amber-600 mb-2">※ {slot.notice}</p>}
                {cur ? (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cur.name}</div>
                      <div className="text-xs text-gray-400">{(cur.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button onClick={() => removeFile(cur.id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">{dragKey === slot.type ? "여기에 놓으면 첨부됩니다." : "파일을 선택하거나 이 칸으로 끌어다 놓으세요."}</p>
                )}
              </div>
            );
          })}
        </div>

        {allowExtra && (
          <div
            className={`mt-4 pt-4 border-t border-gray-100 rounded-lg transition-colors ${dragKey === "__extra" ? "bg-indigo-50/60 ring-2 ring-indigo-200" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragKey("__extra"); }}
            onDragLeave={() => setDragKey((k) => (k === "__extra" ? "" : k))}
            onDrop={(e) => { e.preventDefault(); setDragKey(""); const f = Array.from(e.dataTransfer.files || [])[0]; if (f) upload(f, "other", false); }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-700">기타 자료 (선택)</span>
              <label className={`btn-secondary cursor-pointer flex items-center gap-1.5 text-xs ${busy === "other-extra" ? "opacity-60 pointer-events-none" : ""}`}>
                <Upload className="w-3.5 h-3.5" /> 추가 업로드
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPT_DOC}
                  onChange={async (e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) await upload(f, "other", false); }}
                />
              </label>
            </div>
            {extraFiles.length === 0 ? (
              <p className="text-xs text-gray-400">필요 시 추가 증빙자료를 올릴 수 있습니다.</p>
            ) : (
              <div className="space-y-2">
                {extraFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{file.name}</div></div>
                    <button onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
