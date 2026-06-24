"use client";
import { useEffect, useState } from "react";
import { X, CalendarDays } from "lucide-react";
import type { ApplicationType } from "@/types";
import { APPLICATION_TYPE_LABELS, categoryOfType } from "@/types";
import { fetchTypeContent, type TypeContent } from "@/lib/site-content";
import { fetchPrograms, filterActive, type Program } from "@/lib/programs";

interface Props { type: ApplicationType | null; onClose: () => void; }

export default function FundTypeModal({ type, onClose }: Props) {
  const [content, setContent] = useState<TypeContent | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [preProgs, setPreProgs] = useState<Program[]>([]);
  const [fundProgs, setFundProgs] = useState<Program[]>([]);

  useEffect(() => {
    if (!type) return;
    fetchTypeContent(type).then(setContent);
  }, [type]);

  useEffect(() => {
    if (!type) return;
    const cat = categoryOfType(type);
    fetchPrograms().then((all) => {
      setPreProgs(filterActive(all, cat, date, "pre"));
      setFundProgs(filterActive(all, cat, date, "fund"));
    });
  }, [type, date]);

  if (!type || !content) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />
      <div className={`modal relative w-full ${content.showPrograms ? "max-w-3xl" : "max-w-lg"} max-h-[85vh] overflow-y-auto p-6`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold holo-text mb-2 pr-8">{APPLICATION_TYPE_LABELS[type]}</h2>
        {!content.html && <p className="text-sm text-gray-600 mb-5">{content.intro}</p>}

        {content.showPrograms && (
          <div className="mb-5 rounded-2xl p-4 bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <span className="text-sm font-bold text-indigo-700 flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> 신청 가능 프로그램</span>
              <label className="text-xs text-gray-500 flex items-center gap-1.5">기준일
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {/* 지원신청 가능 (활동 전) */}
              <div className="rounded-xl p-2.5 bg-white/70 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-700 mb-1.5">지원신청 가능 (활동 전)</p>
                {preProgs.length === 0 ? (
                  <p className="text-xs text-gray-400">해당 날짜에 지원신청 가능한 프로그램이 없습니다.</p>
                ) : (
                  <div className="space-y-1">
                    {preProgs.map((p) => (
                      <div key={p.id} className="text-sm bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                        <div className="font-semibold text-gray-800">{p.name}</div>
                        <div className="text-[11px] text-gray-400">{(p.preApplyStart || p.applyStart)} ~ {(p.preApplyEnd || p.applyEnd)}{p.note ? ` · ${p.note}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* 지원금 신청 가능 (활동 후) */}
              <div className="rounded-xl p-2.5 bg-white/70 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-700 mb-1.5">지원금 신청 가능 (활동 후)</p>
                {fundProgs.length === 0 ? (
                  <p className="text-xs text-gray-400">해당 날짜에 지원금 신청 가능한 프로그램이 없습니다.</p>
                ) : (
                  <div className="space-y-1">
                    {fundProgs.map((p) => (
                      <div key={p.id} className="text-sm bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                        <div className="font-semibold text-gray-800">{p.name}</div>
                        <div className="text-[11px] text-gray-400">{p.applyStart} ~ {p.applyEnd}{p.note ? ` · ${p.note}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {content.html ? (
          <div className="rich-content text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: content.html }} />
        ) : (
          <div className="space-y-4">
            {content.sections.map((sec, i) => (
              <div key={i}>
                <h3 className="font-bold text-gray-800 text-sm mb-2">{sec.heading}</h3>
                <ul className="space-y-1">
                  {sec.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-indigo-400 mt-1">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
