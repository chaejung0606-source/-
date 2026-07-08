"use client";
// 공간대여 이용결과 제출 페이지 — 전체 신청목록에서 건을 선택해 이용결과를 제출한다.
// (모달이 아닌 독립 페이지. 관리자가 숨김 처리한 건은 목록에 표시되지 않음)
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home as HomeIcon, ClipboardCheck, Plus, Trash2, Upload } from "lucide-react";
import type { FormSchema } from "@/lib/form-schema";
import SignaturePad from "@/components/apply/SignaturePad";
import { surveyFields, activeQs, SurveyQuestion, type UploadedDoc } from "@/components/space-rental/Survey";

interface PublicBooking {
  id: string; receiptNo?: string; spaceName: string; date: string; endDate?: string; start: string; end: string;
  applicantName?: string; studentId?: string; status: string; hasResult: boolean;
  repeat?: { freq: "weekly" | "monthly"; until: string };
}

export default function SpaceRentalResultPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PublicBooking[]>([]);
  const [resultForm, setResultForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<PublicBooking | null>(null);
  const [done, setDone] = useState(false);

  const [users, setUsers] = useState<{ name: string; signature: string }[]>([{ name: "", signature: "" }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [docsByField, setDocsByField] = useState<Record<string, UploadedDoc[]>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rQuestions = surveyFields(resultForm);
  // 관리자가 이용결과 폼을 만들었으면 그 폼만 표시(기본 명단·사진·비고 블록 숨김)
  const resultOnly = rQuestions.length > 0;

  const load = () => {
    setLoading(true);
    fetch("/api/space-rental").then((r) => r.json()).then((d) => {
      setRequests(Array.isArray(d.requests) ? d.requests : []);
      setResultForm(d.resultForm && typeof d.resultForm === "object" ? d.resultForm : null);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const pick = (r: PublicBooking) => {
    setPicked(r);
    setUsers([{ name: "", signature: "" }]); setPhotos([]); setMemo(""); setAnswers({}); setDocsByField({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/space-rental/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("사진 업로드 실패: " + (j.error || res.status)); return; }
      setPhotos((p) => [...p, j.url]);
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!picked) return;
    const cleanUsers = resultOnly ? [] : users.filter((u) => u.name.trim());
    const cleanPhotos = resultOnly ? [] : photos;
    // 조건부 하위질문 포함 필수 검증 (fileDownload는 입력값 없음, file은 업로드 여부 확인)
    for (const q of activeQs(rQuestions, answers)) {
      if (q.type === "fileDownload") continue;
      if (q.type === "file") {
        if (q.required && !(docsByField[q.id] || []).length) return alert(`'${q.label}' 파일을 업로드해주세요.`);
        continue;
      }
      if (q.required && !(answers[q.id] || "").trim()) return alert(`'${q.label}' 항목을 입력/동의해주세요.`);
    }
    const answerList = activeQs(rQuestions, answers)
      .map((q) => ({ id: q.id, label: q.label, value: q.type === "file" ? (docsByField[q.id] || []).map((d) => d.name).join(", ") : (answers[q.id] || "").trim() }))
      .filter((a) => a.value);
    const rFiles = activeQs(rQuestions, answers).filter((q) => q.type === "file")
      .flatMap((q) => (docsByField[q.id] || []).map((d) => ({ ...d, label: q.label })));
    if (resultOnly) {
      if (answerList.length === 0 && rFiles.length === 0) return alert("이용결과 항목을 입력해주세요.");
    } else if (cleanUsers.length === 0 && cleanPhotos.length === 0 && answerList.length === 0) {
      return alert("이용자 명단(서명)·이용 사진·설문 중 하나 이상 제출해주세요.");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/space-rental", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submitResult", requestId: picked.id, users: cleanUsers, photos: cleanPhotos, answers: answerList, files: rFiles, memo: resultOnly ? "" : memo }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (!j.ok) { alert("제출 실패: " + (j.error || res.status)); return; }
      setDone(true);
      window.scrollTo({ top: 0 });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/space-rental" className="text-indigo-500 hover:text-indigo-700"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sdu-shield.png" alt="SDU 사업단 로고" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold holo-text">공간대여 이용결과 제출</span>
          <Link href="/" className="ml-auto glass-pill px-3 h-9 flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600"><HomeIcon className="w-4 h-4" /> 홈</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold holo-text mb-1 flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-indigo-500" /> 이용결과 제출</h1>

        {done ? (
          <div className="card text-center py-16 mt-5">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">이용결과가 제출되었습니다.</h2>
            <p className="text-sm text-gray-500 mb-5">제출해 주셔서 감사합니다.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => { setDone(false); setPicked(null); load(); }} className="btn-secondary">다른 건 제출</button>
              <button onClick={() => router.push("/space-rental")} className="btn-primary">공간대여로 돌아가기</button>
            </div>
          </div>
        ) : picked ? (
          <div className="card mt-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 text-sm text-gray-700 flex-1 min-w-0">
                {picked.receiptNo && <span className="font-mono text-xs text-indigo-600 mr-1.5">{picked.receiptNo}</span>}
                <strong>{picked.spaceName || "(공간 미정)"}</strong>
                {picked.applicantName && <span className="ml-2">{picked.applicantName}</span>}
                {picked.date && <span className="ml-2">{picked.date} {picked.start}~{picked.endDate && picked.endDate !== picked.date ? `${picked.endDate} ` : ""}{picked.end}</span>}
              </div>
              <button onClick={() => setPicked(null)} className="btn-secondary text-sm shrink-0">← 목록으로</button>
            </div>

            {/* 기본 블록(이용자 명단·서명/사진/비고) — 관리자 이용결과 폼이 없을 때만 표시 */}
            {!resultOnly && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">이용자 명단 및 서명</label>
                    <button onClick={() => setUsers((u) => [...u, { name: "", signature: "" }])} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" /> 이용자 추가</button>
                  </div>
                  <div className="space-y-3">
                    {users.map((u, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input className="input-field flex-1" value={u.name} onChange={(e) => setUsers((arr) => arr.map((x, k) => k === i ? { ...x, name: e.target.value } : x))} placeholder="이용자 이름" />
                          {users.length > 1 && <button onClick={() => setUsers((arr) => arr.filter((_, k) => k !== i))} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                        <SignaturePad onChange={(sig) => setUsers((arr) => arr.map((x, k) => k === i ? { ...x, signature: sig } : x))} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">대여공간 이용 사진</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {photos.map((p, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        <button onClick={() => setPhotos((ps) => ps.filter((_, k) => k !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-rose-500 text-xs flex items-center justify-center shadow">✕</button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer flex flex-col items-center justify-center text-[11px] text-center">
                      {uploading ? "…" : <><Upload className="w-4 h-4" />사진</>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
                    </label>
                  </div>
                </div>
              </>
            )}
            {/* 관리자가 설정한 이용결과 폼 항목 — 폼이 있으면 이것만 표시 */}
            <div className="space-y-4">
              {rQuestions.map((q) => <SurveyQuestion key={q.id} q={q} answers={answers} setAnswers={setAnswers} docsByField={docsByField} setDocsByField={setDocsByField} />)}
            </div>
            {!resultOnly && (
              <div>
                <label className="label">비고 (선택)</label>
                <textarea className="input-field h-16 resize-none" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="특이사항이 있으면 적어주세요." />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-60">{busy ? "제출 중..." : "이용결과 제출"}</button>
            </div>
          </div>
        ) : (
          <div className="card mt-5 space-y-2">
            <p className="text-sm text-gray-600">신청목록에서 <strong>본인 신청 건</strong>을 찾아 [이용결과 제출]을 눌러주세요.</p>
            {loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">불러오는 중...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">접수된 공간대여 신청이 없습니다.</p>
            ) : requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 truncate">
                    {r.receiptNo && <span className="font-mono text-xs text-indigo-600 mr-1.5">{r.receiptNo}</span>}
                    {r.spaceName || "(공간 미정)"}
                    {r.applicantName && <span className="ml-2 font-normal text-gray-600">{r.applicantName}</span>}
                    {r.studentId && <span className="ml-1 font-normal text-xs text-gray-400">{r.studentId}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.date ? `${r.date} ${r.start}~${r.endDate && r.endDate !== r.date ? `${r.endDate} ` : ""}${r.end}` : "일정 미정"}
                    {r.repeat && ` · ${r.repeat.freq === "weekly" ? "매주" : "매월"} 반복(~${r.repeat.until})`}
                    {" · "}{r.status === "approved" ? "승인" : r.status === "pending" ? "대기" : r.status === "supplement" ? "보완요청" : r.status}
                    {r.hasResult ? " · 이미 제출됨(재제출 시 갱신)" : ""}
                  </div>
                </div>
                <button onClick={() => pick(r)}
                  className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-lg ${r.hasResult ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                  {r.hasResult ? "다시 제출" : "이용결과 제출"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
