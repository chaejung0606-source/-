"use client";
import { useEffect, useState } from "react";
import { UserCog, Plus, Trash2, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { fetchPrograms, type Program } from "@/lib/programs";
import { FUND_CATEGORY_LABELS } from "@/types";
import type { AdminAccount, ExpenseAdmin } from "@/lib/admin-accounts";
import { GRANTABLE_MENUS } from "@/lib/admin-accounts";

export default function AdminsPage() {
  const [accounts, setAccounts] = useState<(AdminAccount & { hasPassword?: boolean })[]>([]);
  const [expense, setExpense] = useState<ExpenseAdmin & { hasPassword?: boolean }>({ loginId: "", password: "" });
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [saved, setSaved] = useState(false);
  // AI(회의록·초안 작성) 키 설정
  const [aiHasKey, setAiHasKey] = useState(false);
  const [aiFromEnv, setAiFromEnv] = useState(false);
  const [aiModel, setAiModel] = useState("");
  const [aiKey, setAiKey] = useState("");
  const [aiSaved, setAiSaved] = useState(false);
  const saveAi = async () => {
    const res = await fetch("/api/admin/ai-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anthropicApiKey: aiKey.trim(), model: aiModel.trim() }) });
    const j = await res.json().catch(() => ({ ok: false }));
    if (j.ok) { setAiKey(""); setAiHasKey(aiHasKey || !!aiKey.trim()); setAiSaved(true); setTimeout(() => setAiSaved(false), 2500); }
    else alert("저장 실패: " + (j.error || res.status));
  };

  useEffect(() => {
    fetch("/api/admin/status").then((r) => r.json()).then((d) => {
      if (!d?.admin || d.role !== "expense") { setDenied(true); setLoading(false); return; }
      fetch("/api/admin/ai-config").then((r) => r.json()).then((a) => { setAiHasKey(!!a.hasKey); setAiFromEnv(!!a.fromEnv); setAiModel(a.model || ""); }).catch(() => {});
      fetch("/api/admin/admins").then((r) => r.json()).then((j) => {
        // 보안: 서버는 비밀번호를 내려주지 않음(hasPassword만). 비밀번호 칸은 비워두고 '변경 시에만' 입력.
        setAccounts(Array.isArray(j?.accounts) ? j.accounts.map((a: { loginId?: string; name?: string; programIds?: string[]; menus?: string[]; hasPassword?: boolean }) => ({ loginId: a.loginId || "", password: "", name: a.name || "", programIds: a.programIds || [], menus: Array.isArray(a.menus) ? a.menus : [], hasPassword: !!a.hasPassword })) : []);
        if (j?.expense) setExpense({ loginId: j.expense.loginId || "", password: "", hasPassword: !!j.expense.hasPassword });
        setLoading(false);
      });
    });
    fetchPrograms().then(setPrograms).catch(() => {});
  }, []);

  const dirty = () => setSaved(false);
  const add = () => { setAccounts((a) => [...a, { loginId: "", password: "", name: "", programIds: [], menus: [], hasPassword: false }]); dirty(); };
  const upd = (i: number, patch: Partial<AdminAccount>) => { setAccounts((a) => a.map((x, idx) => idx === i ? { ...x, ...patch } : x)); dirty(); };
  const remove = (i: number) => { setAccounts((a) => a.filter((_, idx) => idx !== i)); dirty(); };
  const toggleProgram = (i: number, pid: string) => {
    setAccounts((a) => a.map((x, idx) => idx === i ? { ...x, programIds: x.programIds.includes(pid) ? x.programIds.filter((p) => p !== pid) : [...x.programIds, pid] } : x));
    dirty();
  };
  const toggleMenu = (i: number, key: string) => {
    setAccounts((a) => a.map((x, idx) => idx === i ? { ...x, menus: (x.menus || []).includes(key) ? (x.menus || []).filter((m) => m !== key) : [...(x.menus || []), key] } : x));
    dirty();
  };

  const save = async () => {
    if (!expense.loginId.trim()) { alert("지출관리자 아이디를 입력해주세요."); return; }
    if (!expense.hasPassword && !expense.password.trim()) { alert("지출관리자 비밀번호를 입력해주세요."); return; }
    for (const a of accounts) {
      if (!a.loginId.trim()) { alert("모든 관리자의 아이디를 입력해주세요."); return; }
      if (!a.hasPassword && !a.password.trim()) { alert("새로 추가한 관리자의 비밀번호를 입력해주세요."); return; }
    }
    const ids = [expense.loginId.trim(), ...accounts.map((a) => a.loginId.trim())];
    if (new Set(ids).size !== ids.length) { alert("아이디가 중복됩니다. (지출관리자 포함)"); return; }
    const res = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expense, accounts }) });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      // 저장 후 비밀번호 칸 비우고 '설정됨' 표시로 전환 (서버는 해시만 보관)
      setExpense((x) => ({ ...x, password: "", hasPassword: x.hasPassword || !!x.password.trim() }));
      setAccounts((arr) => arr.map((a) => ({ ...a, password: "", hasPassword: a.hasPassword || !!a.password.trim() })));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } else alert("저장 실패: " + (j.error || res.status));
  };

  const byCat: Record<string, Program[]> = {};
  programs.forEach((p) => { (byCat[p.category] ||= []).push(p); });

  if (loading) return <AdminLayout><div className="text-center py-20 text-gray-400">로딩 중...</div></AdminLayout>;
  if (denied) return <AdminLayout><div className="card text-center py-12 text-gray-500">지출관리자만 접근할 수 있는 메뉴입니다.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><UserCog className="w-6 h-6 text-indigo-500" /> 관리자 설정</h1>
        <div className="flex gap-2">
          <button onClick={add} className="btn-secondary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> 관리자 추가</button>
          <button onClick={save} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> 저장</button>
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-4">프로그램별 관리자 계정(아이디·비밀번호)과 담당 프로그램을 설정합니다. 프로그램별 관리자는 담당 프로그램의 신청 목록만 확인하고, 검토 완료 후 지출관리자에게 넘길 수 있습니다. (지출관리자: 전체 권한)</p>
      {saved && <div className="mb-4 text-green-600 text-sm font-medium">✓ 저장되었습니다.</div>}

      {/* 지출관리자 로그인 설정 */}
      <div className="card mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">지출관리자 로그인 (전체 권한)</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="label text-xs mb-0.5">아이디</label>
            <input className="input-field" value={expense.loginId} onChange={(e) => { setExpense((x) => ({ ...x, loginId: e.target.value })); setSaved(false); }} placeholder="지출관리자 아이디" />
          </div>
          <div>
            <label className="label text-xs mb-0.5">비밀번호</label>
            <input type="password" autoComplete="new-password" className="input-field" value={expense.password} onChange={(e) => { setExpense((x) => ({ ...x, password: e.target.value })); setSaved(false); }} placeholder={expense.hasPassword ? "변경 시에만 입력 (비우면 유지)" : "지출관리자 비밀번호"} />
          </div>
        </div>
        <p className="text-[11px] text-amber-600 mt-2">※ 여기서 설정한 아이디·비밀번호로 지출관리자 로그인 및 모든 비밀번호 확인이 동작합니다. 변경 후 분실에 주의하세요.</p>
      </div>

      {/* AI(회의록·초안 작성) 키 설정 */}
      <div className="card mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <p className="text-xs font-semibold text-gray-500">AI 회의록·초안 작성 키 (Anthropic)</p>
          <span className={`badge ${aiHasKey ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{aiHasKey ? (aiFromEnv ? "설정됨(환경변수)" : "설정됨") : "미설정"}</span>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="label text-xs mb-0.5">Anthropic API 키</label>
            <input type="password" autoComplete="new-password" className="input-field font-mono text-xs" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder={aiHasKey ? "변경 시에만 입력 (비우면 유지)" : "sk-ant-..."} disabled={aiFromEnv} />
          </div>
          <div>
            <label className="label text-xs mb-0.5">모델</label>
            <input className="input-field text-xs" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="claude-sonnet-4-6" disabled={aiFromEnv} />
          </div>
          {!aiFromEnv && <button onClick={saveAi} className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-4 h-4" /> 저장</button>}
          {aiSaved && <span className="text-green-600 text-sm font-medium">✓ 저장됨</span>}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          {aiFromEnv
            ? "환경변수 ANTHROPIC_API_KEY가 설정되어 있어 그 값을 사용합니다. (여기서 수정 불가)"
            : "여기에 키를 저장하면 회의록 작성·AI 초안 기능이 활성화됩니다. 키는 서버에만 저장되고 화면에 다시 표시되지 않습니다. (콘솔: console.anthropic.com 에서 발급)"}
        </p>
      </div>

      <p className="text-xs font-semibold text-gray-500 mb-2">프로그램별 관리자</p>
      {accounts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">등록된 프로그램별 관리자가 없습니다. ‘관리자 추가’로 생성하세요.</div>
      ) : (
        <div className="space-y-4">
          {accounts.map((a, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-end gap-2 flex-wrap">
                <div>
                  <label className="label text-xs mb-0.5">아이디</label>
                  <input className="input-field" value={a.loginId} onChange={(e) => upd(i, { loginId: e.target.value })} placeholder="로그인 아이디" />
                </div>
                <div>
                  <label className="label text-xs mb-0.5">비밀번호</label>
                  <input type="password" autoComplete="new-password" className="input-field" value={a.password} onChange={(e) => upd(i, { password: e.target.value })} placeholder={a.hasPassword ? "변경 시에만 입력 (비우면 유지)" : "비밀번호"} />
                </div>
                <div>
                  <label className="label text-xs mb-0.5">이름/메모</label>
                  <input className="input-field" value={a.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="예: 홍길동" />
                </div>
                <button onClick={() => remove(i)} className="ml-auto text-gray-300 hover:text-red-500 flex items-center gap-1 text-xs"><Trash2 className="w-4 h-4" /> 삭제</button>
              </div>
              {/* 관리자 권한 — 메뉴별 접근 권한 부여 */}
              <div className={`rounded-xl border p-3 ${(a.menus || []).length > 0 ? "border-violet-300 bg-violet-50/60" : "border-gray-200 bg-white/60"}`}>
                <p className="text-sm font-semibold text-gray-800">관리자 권한 부여 <span className="text-[11px] font-normal text-gray-500">(허용할 메뉴만 선택 · {(a.menus || []).length}개)</span></p>
                <p className="text-[11px] text-gray-500 mt-0.5 mb-2">체크한 <strong>관리자 시스템 메뉴</strong>에만 접근할 수 있습니다. (지출관리자 계정 관리 메뉴는 부여 불가)</p>
                <div className="flex flex-wrap gap-1.5">
                  {GRANTABLE_MENUS.map((m) => {
                    const on = (a.menus || []).includes(m.key);
                    return (
                      <button key={m.key} type="button" onClick={() => toggleMenu(i, m.key)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${on ? "bg-violet-500 text-white border-violet-500" : "bg-white/70 border-gray-200 text-gray-600 hover:border-violet-300"}`}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">담당 프로그램 ({a.programIds.length}개)</p>
                {programs.length === 0 ? (
                  <p className="text-xs text-gray-400">등록된 프로그램이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(byCat).map(([cat, ps]) => (
                      <div key={cat}>
                        <p className="text-[11px] font-semibold text-gray-400 mb-1">{FUND_CATEGORY_LABELS[cat as keyof typeof FUND_CATEGORY_LABELS] || cat}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ps.map((p) => (
                            <button key={p.id} onClick={() => toggleProgram(i, p.id)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${a.programIds.includes(p.id) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/70 border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
                              {p.name || "(이름 없음)"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
