"use client";
import { useState } from "react";
import { Upload, X, FileText, Plus, Trash2 } from "lucide-react";
import type { CostDetail, TransportItem, TransportMode, TransportRegion, LodgingDetail } from "@/types";
import { TRANSPORT_MODE_LABELS, calcSupportTotal, canSelectAir } from "@/types";
import { supabase } from "@/lib/supabase";
import { ACCEPT_DOC, DOC_GUIDE, isAllowedDoc } from "@/lib/upload";

interface Props { value?: CostDetail; onChange: (v: CostDetail) => void; }

const LODGING_CAP = 70000;
const MODES = Object.keys(TRANSPORT_MODE_LABELS) as TransportMode[];

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY: CostDetail = {
  registrationFee: 0,
  transports: [],
  lodging: { usage: "personal", roomAmount: 0, personalAmount: 0 },
};

export default function CostSection({ value, onChange }: Props) {
  const v: CostDetail = value || EMPTY;
  const lodging: LodgingDetail = v.lodging || { usage: "personal", roomAmount: 0, personalAmount: 0 };
  const [uploading, setUploading] = useState(false);

  const update = (patch: Partial<CostDetail>) => onChange({ ...v, ...patch });
  const updateLodging = (patch: Partial<LodgingDetail>) => update({ lodging: { ...lodging, ...patch } });

  // 공통: 증빙 파일 업로드 → { path, name }
  const uploadDoc = async (f: File): Promise<{ path: string; name: string } | null> => {
    if (!isAllowedDoc(f)) { alert(DOC_GUIDE); return null; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("로그인이 필요합니다."); return null; }
    const ext = f.name.includes(".") ? f.name.split(".").pop() : "";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;
    const { error } = await supabase.storage.from("documents").upload(path, f, { upsert: false });
    if (error) { alert(`업로드 실패: ${error.message}`); return null; }
    return { path, name: f.name };
  };

  // ① 등록비 증빙 업로드
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = (e.target.files || [])[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadDoc(f);
      if (r) update({ registrationProofPath: r.path, registrationProofName: r.name });
    } finally { setUploading(false); }
  };
  const removeProof = () => update({ registrationProofPath: undefined, registrationProofName: undefined });

  // 교통비 행별 증빙
  const handleTransportProof = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = (e.target.files || [])[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadDoc(f);
      if (r) updateTransport(id, { proofPath: r.path, proofName: r.name });
    } finally { setUploading(false); }
  };

  // 숙박비 증빙
  const handleLodgingProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = (e.target.files || [])[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const r = await uploadDoc(f);
      if (r) updateLodging({ proofPath: r.path, proofName: r.name });
    } finally { setUploading(false); }
  };

  // ② 교통비 다중
  const addTransport = () => update({
    transports: [...(v.transports || []), { id: uid(), date: "", mode: "bus", region: "domestic", isJeju: false, departure: "", arrival: "", amount: 0 } as TransportItem],
  });
  const updateTransport = (id: string, patch: Partial<TransportItem>) => update({
    transports: (v.transports || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });
  const removeTransport = (id: string) => update({
    transports: (v.transports || []).filter((t) => t.id !== id),
  });

  const personalLodging = lodging.usage === "personal" ? lodging.roomAmount : lodging.personalAmount;
  const overCap = (Number(personalLodging) || 0) > LODGING_CAP;
  const total = calcSupportTotal(v);

  return (
    <div className="space-y-4">
      {/* ① 등록비 */}
      <div className="card space-y-4">
        <h2 className="section-title">① 등록비</h2>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="label">등록비용 (원)</label>
            <input
              className="input-field"
              type="number"
              min="0"
              value={v.registrationFee || ""}
              onChange={(e) => update({ registrationFee: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">증빙 업로드</label>
            {v.registrationProofPath ? (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{v.registrationProofName || "증빙 파일"}</span>
                <button type="button" onClick={removeProof} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`btn-secondary cursor-pointer flex items-center justify-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                <Upload className="w-4 h-4" /> {uploading ? "업로드 중..." : "증빙 파일 선택"}
                <input type="file" className="hidden" onChange={handleProofUpload} accept={ACCEPT_DOC} disabled={uploading} />
              </label>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">증빙: 학회 참가확인서 등 업로드</p>
      </div>

      {/* ② 교통비 (다중) */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-0">② 교통비</h2>
          <button type="button" onClick={addTransport} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> 교통비 추가
          </button>
        </div>
        <p className="text-sm text-gray-500 -mt-2">일자별/동일 일자에도 여러 건 추가 가능합니다.</p>

        {(v.transports || []).length === 0 ? (
          <div className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-6 text-center">
            교통비 내역이 없습니다. &lsquo;교통비 추가&rsquo; 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {(v.transports || []).map((t) => {
              const tRegion = t.region || "domestic";
              const airAllowed = canSelectAir(tRegion, !!t.isJeju);
              return (
              <div key={t.id} className="bg-gray-50 rounded-xl p-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-start">
                  <div>
                    <label className="label">사용일자</label>
                    <input className="input-field" type="date" value={t.date} onChange={(e) => updateTransport(t.id, { date: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">지역 구분</label>
                    <select
                      className="input-field"
                      value={tRegion}
                      onChange={(e) => {
                        const r = e.target.value as TransportRegion;
                        const nextMode = t.mode === "air" && !canSelectAir(r, r === "domestic" ? !!t.isJeju : false) ? "bus" : t.mode;
                        updateTransport(t.id, { region: r, isJeju: r === "overseas" ? false : t.isJeju, mode: nextMode });
                      }}
                    >
                      <option value="domestic">국내</option>
                      <option value="overseas">국외</option>
                    </select>
                    {tRegion === "domestic" && (
                      <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!t.isJeju}
                          onChange={(e) => {
                            const j = e.target.checked;
                            const nextMode = t.mode === "air" && !canSelectAir("domestic", j) ? "bus" : t.mode;
                            updateTransport(t.id, { isJeju: j, mode: nextMode });
                          }}
                        />
                        제주도 (항공 가능)
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="label">교통수단</label>
                    <select className="input-field" value={t.mode} onChange={(e) => updateTransport(t.id, { mode: e.target.value as TransportMode })}>
                      {MODES.map((m) => (
                        <option key={m} value={m} disabled={m === "air" && !airAllowed}>
                          {TRANSPORT_MODE_LABELS[m]}{m === "air" && !airAllowed ? " (국외·제주만)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">금액 (원)</label>
                    <input className="input-field" type="number" min="0" value={t.amount || ""} onChange={(e) => updateTransport(t.id, { amount: Number(e.target.value) })} placeholder="0" />
                  </div>
                  <button type="button" onClick={() => removeTransport(t.id)} className="btn-danger flex items-center justify-center h-[42px] px-3 col-span-2 sm:col-span-1" title="삭제">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">출발지</label>
                    <input className="input-field" value={t.departure || ""} onChange={(e) => updateTransport(t.id, { departure: e.target.value })} placeholder="예: 춘천" />
                  </div>
                  <div>
                    <label className="label">도착지</label>
                    <input className="input-field" value={t.arrival || ""} onChange={(e) => updateTransport(t.id, { arrival: e.target.value })} placeholder="예: 서울" />
                  </div>
                </div>
                <div>
                  <label className="label">증빙 업로드 (해당 일자 교통비 영수증 등)</label>
                  {t.proofPath ? (
                    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5">
                      <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{t.proofName || "증빙 파일"}</span>
                      <button type="button" onClick={() => updateTransport(t.id, { proofPath: undefined, proofName: undefined })} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className={`btn-secondary cursor-pointer flex items-center justify-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                      <Upload className="w-4 h-4" /> 증빙 파일 선택
                      <input type="file" className="hidden" onChange={(e) => handleTransportProof(t.id, e)} accept={ACCEPT_DOC} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ③ 숙박비 */}
      <div className="card space-y-4">
        <h2 className="section-title">③ 숙박비</h2>
        <div>
          <label className="label">사용 형태</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateLodging({ usage: "personal" })}
              className={lodging.usage === "personal" ? "btn-primary flex-1" : "btn-secondary flex-1"}
            >
              개인사용
            </button>
            <button
              type="button"
              onClick={() => updateLodging({ usage: "group" })}
              className={lodging.usage === "group" ? "btn-primary flex-1" : "btn-secondary flex-1"}
            >
              단체사용
            </button>
          </div>
        </div>

        {lodging.usage === "personal" ? (
          <div>
            <label className="label">숙소 결제금액 (원)</label>
            <input className="input-field" type="number" min="0" value={lodging.roomAmount || ""} onChange={(e) => updateLodging({ roomAmount: Number(e.target.value) })} placeholder="0" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">숙소 전체금액 (원)</label>
              <input className="input-field" type="number" min="0" value={lodging.roomAmount || ""} onChange={(e) => updateLodging({ roomAmount: Number(e.target.value) })} placeholder="0" />
            </div>
            <div>
              <label className="label">개인 부담금액 (원)</label>
              <input className="input-field" type="number" min="0" value={lodging.personalAmount || ""} onChange={(e) => updateLodging({ personalAmount: Number(e.target.value) })} placeholder="0" />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">※ 숙박비는 1인 70,000원 한도까지 지원 가능합니다.</p>
        {overCap && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            1인 70,000원 한도까지 지원 가능합니다. 초과분은 합계에서 제외됩니다.
          </div>
        )}

        <div>
          <label className="label">증빙 업로드 (숙박 영수증·숙박확인증 등)</label>
          {lodging.proofPath ? (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
              <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{lodging.proofName || "증빙 파일"}</span>
              <button type="button" onClick={() => updateLodging({ proofPath: undefined, proofName: undefined })} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className={`btn-secondary cursor-pointer flex items-center justify-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              <Upload className="w-4 h-4" /> 증빙 파일 선택
              <input type="file" className="hidden" onChange={handleLodgingProof} accept={ACCEPT_DOC} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      {/* ④ 지원비 합계 */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-0">지원비 합계</h2>
          <span className="text-xl font-bold text-primary-600">{total.toLocaleString()}원</span>
        </div>
        <p className="text-xs text-gray-500">※ 등록비는 합계에 포함되지 않습니다. 숙박비는 1인 70,000원 한도까지만 합산됩니다.</p>
      </div>
    </div>
  );
}
