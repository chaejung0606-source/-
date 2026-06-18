"use client";
import { Plane } from "lucide-react";
import type { TransportInfo, TransportMode, TransportRegion } from "@/types";
import { TRANSPORT_MODE_LABELS, canSelectAir } from "@/types";

interface Props { values: TransportInfo; onChange: (v: TransportInfo) => void; }

const MODES = Object.keys(TRANSPORT_MODE_LABELS) as TransportMode[];

export default function TransportSection({ values, onChange }: Props) {
  const airAllowed = canSelectAir(values.region, values.isJeju);

  const update = (patch: Partial<TransportInfo>) => {
    const next = { ...values, ...patch };
    // 항공 선택 불가 상태가 되면 교통수단 초기화
    if (next.mode === "air" && !canSelectAir(next.region, next.isJeju)) {
      next.mode = "bus";
    }
    onChange(next);
  };

  return (
    <div className="card space-y-4">
      <h2 className="section-title">교통비 (선택)</h2>
      <p className="text-sm text-gray-500 -mt-2">행사·학회 참석 등 이동이 발생한 경우 작성하세요. 항공은 국외 또는 제주도일 때만 선택할 수 있습니다.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">지역 구분</label>
          <select
            className="input-field"
            value={values.region}
            onChange={(e) => update({ region: e.target.value as TransportRegion, isJeju: e.target.value === "overseas" ? false : values.isJeju })}
          >
            <option value="domestic">국내</option>
            <option value="overseas">국외</option>
          </select>
        </div>
        {values.region === "domestic" && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 pb-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={values.isJeju} onChange={(e) => update({ isJeju: e.target.checked })} />
              제주도 (항공 선택 가능)
            </label>
          </div>
        )}
        <div>
          <label className="label">이동 구간</label>
          <input className="input-field" value={values.route} onChange={(e) => update({ route: e.target.value })} placeholder="예: 춘천 → 제주" />
        </div>
        <div>
          <label className="label">교통수단</label>
          <select className="input-field" value={values.mode} onChange={(e) => update({ mode: e.target.value as TransportMode })}>
            {MODES.map((m) => (
              <option key={m} value={m} disabled={m === "air" && !airAllowed}>
                {TRANSPORT_MODE_LABELS[m]}{m === "air" && !airAllowed ? " (국외·제주만)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">교통비 금액 (원)</label>
          <input className="input-field" type="number" min="0" value={values.amount || ""} onChange={(e) => update({ amount: Number(e.target.value) })} placeholder="0" />
        </div>
      </div>

      {values.mode === "air" && (
        <div className="flex items-center gap-2 text-sm text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
          <Plane className="w-4 h-4" /> 항공 교통편이 선택되었습니다. 탑승권·영수증 등 증빙을 첨부해주세요.
        </div>
      )}
    </div>
  );
}
