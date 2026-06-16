"use client";
import { useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import type { ApplicationType, DocumentType, UploadedFile } from "@/types";
import { DOCUMENT_TYPE_LABELS } from "@/types";

interface Props {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  applicationType: ApplicationType;
}

const COMMON_DOC_TYPES: DocumentType[] = [
  "application_form", "privacy_consent", "id_card", "bankbook", "enrollment_certificate", "other",
];

const TYPE_SPECIFIC: Record<ApplicationType, DocumentType[]> = {
  program: ["participation_proof", "achievement_proof"],
  staff: ["work_log"],
  grade: ["transcript", "completion_proof"],
  contest: ["award_certificate", "contest_notice", "achievement_proof"],
  certificate: ["certificate_copy", "achievement_proof"],
};

export default function FileUploadSection({ files, onChange, applicationType }: Props) {
  const [selectedType, setSelectedType] = useState<DocumentType>("other");
  const docTypes = [...(TYPE_SPECIFIC[applicationType] || []), ...COMMON_DOC_TYPES];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const uploaded: UploadedFile[] = newFiles.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name,
      type: selectedType,
      size: f.size,
    }));
    onChange([...files, ...uploaded]);
    e.target.value = "";
  };

  const removeFile = (id: string) => onChange(files.filter((f) => f.id !== id));

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="section-title">서류 업로드</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
          여러 파일을 개별로 업로드하고 자료 유형을 선택해주세요. (PDF, 이미지, 엑셀 등 가능)
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
            <label className="btn-secondary cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" /> 파일 선택
              <input type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" />
            </label>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">업로드된 파일이 없습니다.</p>
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

      {/* 제출 서류 안내 */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-700 mb-3">제출 서류 안내</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ 지급신청서 (서명 필수)</li>
          <li>✓ 개인정보 수집·이용 동의서</li>
          <li>✓ 신분증 사본</li>
          <li>✓ 본인 명의 통장 사본</li>
          <li>✓ 재학증명서</li>
          <li>✓ 성과 증빙자료 (유형별 해당 서류)</li>
        </ul>
      </div>
    </div>
  );
}
