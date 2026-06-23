"use client";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { EventLocation } from "@/types";
import { DOMESTIC, PROVINCES, COUNTRIES, searchDomestic, searchCountries } from "@/lib/locations";

interface Props { values: EventLocation; onChange: (v: EventLocation) => void; title?: string; }

export default function EventLocationSection({ values, onChange, title = "행사(학회) 장소" }: Props) {
  const [domQuery, setDomQuery] = useState("");
  const [intlQuery, setIntlQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const update = (patch: Partial<EventLocation>) => onChange({ ...values, ...patch });

  const domResults = searchDomestic(domQuery);
  const intlResults = searchCountries(intlQuery);

  const switchScope = (s: EventLocation["scope"]) => { update({ scope: s }); setShowSearch(false); };

  const selectedText = values.scope === "overseas"
    ? [values.country, values.cityName].filter(Boolean).join(" · ")
    : [values.province, values.city, values.cityName].filter(Boolean).join(" ");

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
      <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-500" /> {title}</h3>

      {/* 국내/국외 */}
      <div className="flex gap-2">
        {(["domestic", "overseas"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => switchScope(s)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${values.scope === s ? "bg-indigo-500 text-white" : "bg-white/70 text-gray-600"}`}
          >
            {s === "domestic" ? "국내" : "국외"}
          </button>
        ))}
      </div>

      {values.scope === "domestic" ? (
        <div className="space-y-2">
          {/* 도/시 드롭다운 + 돋보기 + 자세한 주소 */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select className="input-field flex-1 min-w-[120px]" value={values.province || ""} onChange={(e) => update({ province: e.target.value, city: "" })}>
              <option value="">도/시 선택</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input-field flex-1 min-w-[120px]" value={values.city || ""} onChange={(e) => update({ city: e.target.value })} disabled={!values.province}>
              <option value="">시/군/구 선택</option>
              {(values.province ? DOMESTIC[values.province] || [] : []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => setShowSearch((v) => !v)} title="지역 검색"
              className={`shrink-0 w-[46px] h-[46px] rounded-xl flex items-center justify-center border transition ${showSearch ? "bg-indigo-500 border-indigo-500 text-white" : "bg-white/70 border-gray-200 text-gray-500 hover:text-indigo-500"}`}>
              <Search className="w-4 h-4" />
            </button>
            <input className="input-field flex-1 min-w-[140px]" value={values.cityName || ""} onChange={(e) => update({ cityName: e.target.value })} placeholder="자세한 주소 (직접 입력)" />
          </div>

          {/* 돋보기 클릭 시 검색 */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-field pl-10"
                value={domQuery}
                autoFocus
                onChange={(e) => setDomQuery(e.target.value)}
                placeholder="지역 검색 (예: 춘천, 강남)"
              />
              {domResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl bg-white shadow-lg border border-gray-100">
                  {domResults.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => { update({ province: m.province, city: m.city }); setDomQuery(""); setShowSearch(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* 국가 드롭다운 + 돋보기 + 자세한 주소 */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select className="input-field flex-1 min-w-[120px]" value={values.country || ""} onChange={(e) => update({ country: e.target.value })}>
              <option value="">국가 선택</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => setShowSearch((v) => !v)} title="국가 검색"
              className={`shrink-0 w-[46px] h-[46px] rounded-xl flex items-center justify-center border transition ${showSearch ? "bg-indigo-500 border-indigo-500 text-white" : "bg-white/70 border-gray-200 text-gray-500 hover:text-indigo-500"}`}>
              <Search className="w-4 h-4" />
            </button>
            <input className="input-field flex-1 min-w-[140px]" value={values.cityName || ""} onChange={(e) => update({ cityName: e.target.value })} placeholder="자세한 주소 (직접 입력)" />
          </div>

          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input-field pl-10"
                value={intlQuery}
                autoFocus
                onChange={(e) => setIntlQuery(e.target.value)}
                placeholder="국가 검색 (예: 미국, 일본)"
              />
              {intlResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl bg-white shadow-lg border border-gray-100">
                  {intlResults.map((c) => (
                    <button key={c} type="button" onClick={() => { update({ country: c }); setIntlQuery(""); setShowSearch(false); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50">{c}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 선택한 장소 (하단에 잘 보이도록) */}
      {selectedText ? (
        <div className="rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 shrink-0" /> 선택한 장소: {values.scope === "overseas" ? "국외" : "국내"} · {selectedText}
        </div>
      ) : (
        <p className="text-xs text-gray-400">드롭다운에서 선택하거나 돋보기로 검색해주세요.</p>
      )}
    </div>
  );
}
