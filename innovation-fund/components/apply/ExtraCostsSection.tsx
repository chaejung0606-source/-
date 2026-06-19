"use client";
import type { ExtraCosts } from "@/types";

interface Props { value?: ExtraCosts; onChange: (v: ExtraCosts) => void; }

const LODGING_CAP = 70000;

export default function ExtraCostsSection({ value, onChange }: Props) {
  const v: ExtraCosts = value || {};
  const update = (patch: Partial<ExtraCosts>) => onChange({ ...v, ...patch });

  const overCap = (v.lodgingFee || 0) > LODGING_CAP;

  return (
    <div className="card space-y-4">
      <h2 className="section-title">등록비·숙박비 (선택)</h2>
      <p className="text-sm text-gray-500 -mt-2">학술대회 등록비·참가비 및 숙박비가 발생한 경우 작성하세요. 교통비와 별도로 합산됩니다.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">등록비·참가비 (원)</label>
          <input className="input-field" type="number" min="0" value={v.registrationFee || ""} onChange={(e) => update({ registrationFee: Number(e.target.value) })} placeholder="0" />
        </div>
        <div>
          <label className="label">숙박비 (원)</label>
          <input className="input-field" type="number" min="0" value={v.lodgingFee || ""} onChange={(e) => update({ lodgingFee: Number(e.target.value) })} placeholder="0" />
        </div>
        <div>
          <label className="label">숙박 일수 (선택)</label>
          <input className="input-field" type="number" min="0" value={v.lodgingNights || ""} onChange={(e) => update({ lodgingNights: Number(e.target.value) })} placeholder="예: 1" />
        </div>
      </div>

      <p className="text-xs text-gray-500">※ 숙박비는 1인 70,000원 한도 내 실비 지원됩니다.</p>
      {overCap && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          입력한 숙박비가 1인 한도(70,000원)를 초과합니다. 합산 시 70,000원까지만 반영됩니다.
        </div>
      )}
    </div>
  );
}
