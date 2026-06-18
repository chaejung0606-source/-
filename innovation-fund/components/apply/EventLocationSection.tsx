"use client";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { EventLocation } from "@/types";
import { DOMESTIC, PROVINCES, COUNTRIES, searchDomestic, searchCountries } from "@/lib/locations";

interface Props { values: EventLocation; onChange: (v: EventLocation) => void; }

export default function EventLocationSection({ values, onChange }: Props) {
  const [domQuery, setDomQuery] = useState("");
  const [intlQuery, setIntlQuery] = useState("");
  const [showDom, setShowDom] = useState(false);
  const [showIntl, setShowIntl] = useState(false);

  const update = (patch: Partial<EventLocation>) => onChange({ ...values, ...patch });

  const domResults = showDom ? searchDomestic(domQuery) : [];
  const intlResults = showIntl ? searchCountries(intlQuery) : [];

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
      <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-500" /> 행사(학회) 장소</h3>

      {/* 국내/국외 */}
      <div className="flex gap-2">
        {(["domestic", "overseas"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => update({ scope: s })}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${values.scope === s ? "bg-indigo-500 text-white" : "bg-white/70 text-gray-600"}`}
          >
            {s === "domestic" ? "국내" : "국외"}
          </button>
        ))}
      </div>

      {values.scope === "domestic" ? (
        <div className="space-y-2">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-10"
              value={domQuery}
              onChange={(e) => { setDomQuery(e.target.value); setShowDom(true); }}
              onFocus={() => setShowDom(true)}
              placeholder="지역 검색 (예: 춘천, 강남)"
            />
            {showDom && domResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl bg-white shadow-lg border border-gray-100">
                {domResults.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => { update({ province: m.province, city: m.city }); setDomQuery(m.label); setShowDom(false); }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 드롭다운 */}
          <div className="grid grid-cols-2 gap-2">
            <select className="input-field" value={values.province || ""} onChange={(e) => update({ province: e.target.value, city: "" })}>
              <option value="">도/시 선택</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input-field" value={values.city || ""} onChange={(e) => update({ city: e.target.value })} disabled={!values.province}>
              <option value="">시/군/구 선택</option>
              {(values.province ? DOMESTIC[values.province] || [] : []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {values.province && values.city && (
            <p className="text-xs text-indigo-600">선택: {values.province} {values.city}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-10"
              value={intlQuery}
              onChange={(e) => { setIntlQuery(e.target.value); setShowIntl(true); }}
              onFocus={() => setShowIntl(true)}
              placeholder="국가 검색 (예: 미국, 일본)"
            />
            {showIntl && intlResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl bg-white shadow-lg border border-gray-100">
                {intlResults.map((c) => (
                  <button key={c} type="button" onClick={() => { update({ country: c }); setIntlQuery(c); setShowIntl(false); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50">{c}</button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="input-field" value={values.country || ""} onChange={(e) => update({ country: e.target.value })}>
              <option value="">국가 선택</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input-field" value={values.cityName || ""} onChange={(e) => update({ cityName: e.target.value })} placeholder="세부 도시 (직접 입력)" />
          </div>
          {values.country && (
            <p className="text-xs text-indigo-600">선택: {values.country}{values.cityName ? ` · ${values.cityName}` : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}
