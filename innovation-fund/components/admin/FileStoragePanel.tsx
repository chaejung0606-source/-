"use client";
import { useEffect, useState } from "react";
import { Save, Info, FolderOpen } from "lucide-react";
import {
  type ExportSetting, type ExportSettings, type ExportKindInfo,
  EXCEL_KINDS, PDF_KINDS, getExportSettings, saveExportSettings,
} from "@/lib/export-settings";

// '파일 저장 경로' 본문 — 사이트 설정 메뉴 탭 및 독립 페이지에서 사용
// 관리자 화면에서 실제 내려받을 수 있는 파일 종류만 나열한다. (export-settings의 EXCEL_KINDS·PDF_KINDS와 1:1)
export default function FileStoragePanel() {
  const [settings, setSettings] = useState<ExportSettings>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getExportSettings());
  }, []);

  const updateKind = (key: string, field: keyof ExportSetting, value: string, def: string) => {
    setSettings((prev) => ({ ...prev, [key]: { ...(prev[key] || { filename: def, path: "" }), [field]: value } }));
    setSaved(false);
  };

  const save = () => {
    saveExportSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const kindCard = (k: ExportKindInfo) => (
    <div key={k.key} className="card">
      <h3 className="font-bold text-gray-800">{k.label}</h3>
      <p className="text-xs text-gray-400 mb-1">{k.desc}</p>
      <p className="text-[11px] text-gray-400 mb-3">사용 가능 변수: {k.vars.map((v) => <code key={v} className="mr-1">{`{${v}}`}</code>)}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">파일명 형식</label>
          <input className="input-field" value={settings[k.key]?.filename ?? k.defaultName} onChange={(e) => updateKind(k.key, "filename", e.target.value, k.defaultName)} placeholder={k.defaultName} />
        </div>
        <div>
          <label className="label">보관 경로 (메모)</label>
          <input className="input-field" value={settings[k.key]?.path ?? ""} onChange={(e) => updateKind(k.key, "path", e.target.value, k.defaultName)} placeholder="예: 2026 지출자료" />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">파일 저장 경로</h1>
      <p className="text-gray-500 text-sm mb-6">관리자 화면에서 다운로드할 수 있는 파일별로 저장 파일명과 보관 경로(메모)를 설정합니다. 아래 목록은 현재 다운로드 가능한 항목과 1:1로 대응합니다.</p>

      <div className="card mb-4 flex items-start gap-2 text-sm text-blue-700" style={{ background: "rgba(59,130,246,0.08)" }}>
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-1">파일명 변수</p>
          <p>각 항목의 &lsquo;사용 가능 변수&rsquo;를 파일명 형식에 넣으면 다운로드 시 실제 값으로 채워집니다. 예: <code>{"{접수번호} {유형} 지출자료_({이름}_{학번})"}</code></p>
        </div>
      </div>

      <div className="card mb-6 flex items-start gap-2 text-sm text-amber-700" style={{ background: "rgba(245,158,11,0.08)" }}>
        <FolderOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-1">보관 경로에 자동 저장하는 방법</p>
          <p className="mb-1">브라우저 보안상 플랫폼이 특정 폴더에 파일을 직접 저장할 수는 없습니다. 대신 아래처럼 설정하면 다운로드할 때마다 원하는 폴더를 지정할 수 있습니다.</p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>크롬/엣지 설정 → 다운로드 → <b>&lsquo;다운로드 전에 각 파일의 저장 위치 확인&rsquo;</b>을 켭니다.</li>
            <li>다운로드/인쇄(PDF 저장) 시 저장 대화상자가 뜨면, 여기 적어둔 <b>보관 경로(메모)</b>를 참고해 해당 폴더를 선택합니다. 파일명은 위 형식대로 자동으로 채워집니다.</li>
            <li>보관 경로 메모는 인쇄·다운로드 창에도 함께 표시되어 저장할 폴더를 바로 확인할 수 있습니다.</li>
          </ol>
        </div>
      </div>

      {/* 엑셀 다운로드 */}
      <h2 className="font-bold text-gray-800 mb-2">엑셀 다운로드</h2>
      <p className="text-gray-500 text-sm mb-3">버튼을 누르면 파일이 바로 저장되는 엑셀 다운로드 항목입니다.</p>
      <div className="space-y-3 mb-8">
        {EXCEL_KINDS.map(kindCard)}
      </div>

      {/* PDF 인쇄 · 일괄 ZIP */}
      <h2 className="font-bold text-gray-800 mb-2">PDF 인쇄 · 일괄 다운로드</h2>
      <p className="text-gray-500 text-sm mb-3">지출자료·심의요청서는 단건이면 인쇄 창에서 &lsquo;PDF로 저장&rsquo;, 여러 건 선택 시 건별 PDF가 담긴 ZIP 파일로 다운로드됩니다.</p>
      <div className="space-y-3">
        {PDF_KINDS.map(kindCard)}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> 설정 저장
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ 저장되었습니다.</span>}
      </div>
    </div>
  );
}
