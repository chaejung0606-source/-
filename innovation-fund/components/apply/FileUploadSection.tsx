"use client";
import { useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import type { ApplicationType, DocumentType, UploadedFile } from "@/types";
import { DOCUMENT_TYPE_LABELS } from "@/types";
import { supabase } from "@/lib/supabase";
import { ACCEPT_DOC, DOC_GUIDE as UPLOAD_GUIDE, isAllowedDoc } from "@/lib/upload";

interface Props {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  applicationType: ApplicationType;
}

// 공통 제출서류 (외부 발급)
const COMMON_DOC_TYPES: DocumentType[] = [
  "id_card", "bankbook", "enrollment_certificate", "other",
];

// 유형별 추가 제출서류 (외부 발급)
const TYPE_SPECIFIC: Record<ApplicationType, DocumentType[]> = {
  program: ["participation_proof", "achievement_proof"],
  staff: ["work_log"],
  grade: ["transcript", "completion_proof"],
  contest: ["award_certificate", "contest_notice", "achievement_proof"],
  certificate: ["certificate_copy", "achievement_proof"],
  labor: ["work_log", "achievement_proof"],
  activity: ["participation_proof", "achievement_proof"],
};

// 유형별 제출서류 안내 문구
const DOC_GUIDE: Record<ApplicationType, string[]> = {
  program: ["신분증 사본", "통장 사본", "재학증명서", "프로그램 참여 증빙자료 (참여확인서 등)"],
  staff: ["신분증 사본", "통장 사본", "재학증명서", "근무상황부 (담당자 확인)"],
  grade: ["신분증 사본", "통장 사본", "재학증명서", "성적증명서", "이수증빙자료 (해당 시)"],
  contest: ["신분증 사본", "통장 사본", "재학증명서", "상장 사본", "대회 공고문", "기타 수상 증빙"],
  certificate: ["신분증 사본", "통장 사본", "재학증명서", "자격증 사본", "취득 증빙자료"],
  labor: ["신분증 사본", "통장 사본", "재학증명서", "근무상황부 (지도교수·담당자 확인)"],
  activity: ["신분증 사본", "통장 사본", "재학증명서", "활동 계획서/결과보고서", "지출 증빙(영수증 등)"],
};

const FALLBACK_GUIDE = ["신분증 사본", "통장 사본", "재학증명서"];

export default function FileUploadSection({ files, onChange, applicationType }: Props) {
  const [selectedType, setSelectedType] = useState<DocumentType>("other");
  const docTypes = [...(TYPE_SPECIFIC[applicationType] || []), ...COMMON_DOC_TYPES];

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const bad = newFiles.find((f) => !isAllowedDoc(f));
    if (bad) { alert(`${UPLOAD_GUIDE}\n(거부됨: ${bad.name})`); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("로그인이 필요합니다. 다시 로그인해 주세요."); return; }
      const uploaded: UploadedFile[] = [];
      for (const f of newFiles) {
        const ext = f.name.includes(".") ? f.name.split(".").pop() : "";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;
        const { error } = await supabase.storage.from("documents").upload(path, f, { upsert: false });
        if (error) { alert(`${f.name} 업로드 실패: ${error.message}`); continue; }
        uploaded.push({ id: `${Date.now()}-${Math.random()}`, name: f.name, type: selectedType, size: f.size, path });
      }
      if (uploaded.length) onChange([...files, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await processFiles(Array.from(e.dataTransfer.files || []));
  };

  const removeFile = (id: string) => onChange(files.filter((f) => f.id !== id));

  return (
    <div className="space-y-4">
      <div className={`card transition-colors ${dragOver ? "ring-2 ring-indigo-300" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <h2 className="section-title">서류 업로드</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
          여러 파일을 개별로 업로드하고 자료 유형을 선택해주세요. <strong>{UPLOAD_GUIDE}</strong>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="label">자료 유형 선택</label>
            <select className="input-field" value={selectedType} onChange={(e) => setSelectedType(e.target.value as DocumentType)}>
              {docTypes.map((t) => (
                <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className={`btn-secondary cursor-pointer flex items-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              <Upload className="w-4 h-4" /> {uploading ? "업로드 중..." : "파일 선택"}
              <input type="file" multiple className="hidden" onChange={handleFileChange} accept={ACCEPT_DOC} disabled={uploading} />
            </label>
          </div>
        </div>

        {files.length === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`upload-card p-8 text-center flex flex-col items-center justify-center transition-colors ${dragOver ? "bg-indigo-50 border-indigo-300 text-indigo-500" : "text-gray-400"}`}
            style={{ minHeight: 160 }}
          >
            <Upload className="w-10 h-10 mx-auto mb-2 text-[#4f8cff] opacity-60" />
            <p className="text-sm">{dragOver ? "여기에 놓으면 첨부됩니다" : "자료 유형을 선택하고 파일을 업로드하거나, 이곳에 끌어다 놓으세요."}</p>
            <p className="text-xs text-gray-300 mt-1">PDF · JPG · PNG · WEBP</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-gray-400">{DOCUMENT_TYPE_LABELS[file.type]} · {(file.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 제출 서류 안내 (유형별) */}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-2">이 신청 유형의 제출 서류</h3>
        <p className="text-xs text-gray-500 mb-3">지급신청서·개인정보 동의서는 온라인으로 작성되므로, 아래 외부 발급 서류만 업로드하면 됩니다.</p>
        <ul className="text-sm text-gray-600 space-y-1.5">
          {(DOC_GUIDE[applicationType] || FALLBACK_GUIDE).map((doc) => (
            <li key={doc} className="flex items-center gap-2">
              <span className="text-indigo-500">✓</span> {doc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
