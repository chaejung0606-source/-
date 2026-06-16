"use client";
import { useEffect, useState } from "react";
import { Save, Info } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS } from "@/types";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  type ExportSetting, type ExportSettings,
  DEFAULT_FILENAME, getExportSettings, saveExportSettings,
} from "@/lib/export-settings";

const TYPES: ApplicationType[] = ["program", "staff", "grade", "contest", "certificate"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<ExportSettings>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getExportSettings());
  }, []);

  const update = (type: ApplicationType, field: keyof ExportSetting, value: string) => {
    setSettings((prev) => ({ ...prev, [type]: { ...(prev[type] || { filename: DEFAULT_FILENAME, path: "" }), [field]: value } }));
    setSaved(false);
  };

  const save = () => {
    saveExportSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">내보내기 설정</h1>
      <p className="text-gray-500 text-sm mb-6">혁신인재지원금 유형별로 PDF 저장 파일명과 보관 경로(메모)를 설정할 수 있습니다.</p>

      <div className="card mb-4 flex items-start gap-2 text-sm text-blue-700" style={{ background: "rgba(59,130,246,0.08)" }}>
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-1">사용 가능한 변수</p>
          <p><code>{"{접수번호}"}</code> <code>{"{이름}"}</code> <code>{"{학번}"}</code> <code>{"{유형}"}</code> <code>{"{날짜}"}</code></p>
          <p className="mt-1 text-blue-600">※ 브라우저 보안상 폴더에 자동 저장은 불가합니다. 경로는 관리자용 보관 안내(메모)로 사용되며, 저장 시 파일명이 자동으로 채워집니다.</p>
        </div>
      </div>

      <div className="space-y-3">
        {TYPES.map((type) => (
          <div key={type} className="card">
            <h3 className="font-bold text-gray-800 mb-3">{APPLICATION_TYPE_LABELS[type]}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">파일명 형식</label>
                <input
                  className="input-field"
                  value={settings[type]?.filename ?? DEFAULT_FILENAME}
                  onChange={(e) => update(type, "filename", e.target.value)}
                  placeholder={DEFAULT_FILENAME}
                />
              </div>
              <div>
                <label className="label">보관 경로 (메모)</label>
                <input
                  className="input-field"
                  value={settings[type]?.path ?? ""}
                  onChange={(e) => update(type, "path", e.target.value)}
                  placeholder="예: 2026 혁신인재지원금/자격증"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> 설정 저장
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ 저장되었습니다.</span>}
      </div>
    </AdminLayout>
  );
}
