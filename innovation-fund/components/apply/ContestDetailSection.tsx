"use client";

interface ContestDetail {
  contestName: string; contestTheme: string; relevanceDescription: string; organizer: string;
  scale: "A" | "B"; isTeam: boolean;
  teamMembers: { studentId: string; name: string }[];
  awardLevel: "grand" | "silver" | "bronze" | "participation"; awardDate: string; hasMonetaryPrize: boolean;
}

interface Props { values: ContestDetail; onChange: (v: ContestDetail) => void; calculatedAmount: number; teamTotal: number; }

const AWARD_LEVELS = [
  { value: "grand", label: "대상/최우수" },
  { value: "silver", label: "은상/우수상" },
  { value: "bronze", label: "동상/장려상" },
  { value: "participation", label: "입상" },
] as const;

export default function ContestDetailSection({ values, onChange, calculatedAmount, teamTotal }: Props) {
  const set = <K extends keyof ContestDetail>(k: K, v: ContestDetail[K]) => onChange({ ...values, [k]: v });
  const members = values.teamMembers || [];
  const setMembers = (m: { studentId: string; name: string }[]) => set("teamMembers", m);
  const addMember = () => setMembers([...members, { studentId: "", name: "" }]);
  const updMember = (i: number, patch: Partial<{ studentId: string; name: string }>) =>
    setMembers(members.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i));

  return (
    <div className="card space-y-4">
      <h2 className="section-title">경진대회 입상 우수성과 지원금 신청 정보</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 space-y-1">
        <p>• 경진대회 입상 주제가 사업단 분야에 부합하는지는 심의 후 결정됩니다.</p>
        <p>• 부상 또는 상금을 받은 경우 중복 지급이 불가합니다.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">대회명 <span className="text-red-500">*</span></label>
          <input className="input-field" value={values.contestName} onChange={(e) => set("contestName", e.target.value)} placeholder="대회명" />
        </div>
        <div>
          <label className="label">개최기관</label>
          <input className="input-field" value={values.organizer} onChange={(e) => set("organizer", e.target.value)} placeholder="한국정보보호학회" />
        </div>
        <div>
          <label className="label">대회 주제</label>
          <input className="input-field" value={values.contestTheme} onChange={(e) => set("contestTheme", e.target.value)} placeholder="대회 주제 입력" />
        </div>
        <div>
          <label className="label">수상일</label>
          <input className="input-field" type="date" value={values.awardDate} onChange={(e) => set("awardDate", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">사업단 분야 적합성 설명</label>
          <textarea className="input-field h-20 resize-none" value={values.relevanceDescription} onChange={(e) => set("relevanceDescription", e.target.value)} placeholder="대회 주제가 사업단 분야(데이터보안·활용)와 어떻게 연관되는지 설명해주세요." />
        </div>
        <div>
          <label className="label">대회 규모</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: "A" as const, label: "A규모", sub: "대학 내/지자체/컨소시엄 내 이하" }, { v: "B" as const, label: "B규모", sub: "전국/컨소시엄 간 이상" }].map((s) => (
              <button key={s.v} type="button" onClick={() => set("scale", s.v)} className={`border-2 rounded-lg p-3 text-left transition-colors ${values.scale === s.v ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">개인/팀 여부</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: false, label: "개인" }, { v: true, label: "팀" }].map((t) => (
              <button key={String(t.v)} type="button" onClick={() => set("isTeam", t.v)} className={`border-2 rounded-lg p-3 text-center transition-colors ${values.isTeam === t.v ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                <span className="font-medium text-sm">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 팀 선택 시 팀원 정보 입력 — 본인 포함 전체 팀원 기준 n분의 1 지급 */}
        {values.isTeam && (
          <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
            <div className="text-sm text-amber-800">
              <strong>팀 신청은 시상금(팀 총액)을 본인 포함 전체 팀원 수로 나누어(n분의 1) 1인당 지급</strong>됩니다. 본인을 포함한 모든 팀원의 학번·이름을 입력해주세요.
            </div>
            <div className="space-y-2">
              {members.length === 0 && <p className="text-xs text-amber-600">‘팀원 추가’를 눌러 본인을 포함한 팀원을 모두 입력하세요.</p>}
              {members.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input-field flex-1" value={m.studentId} onChange={(e) => updMember(i, { studentId: e.target.value })} placeholder={`팀원 ${i + 1} 학번`} />
                  <input className="input-field flex-1" value={m.name} onChange={(e) => updMember(i, { name: e.target.value })} placeholder="이름" />
                  <button type="button" onClick={() => removeMember(i)} className="text-gray-400 hover:text-red-500 text-xs px-2">삭제</button>
                </div>
              ))}
              <button type="button" onClick={addMember} className="btn-secondary text-xs">+ 팀원 추가</button>
            </div>
          </div>
        )}
        <div>
          <label className="label">시상 등급</label>
          <div className="grid grid-cols-2 gap-2">
            {AWARD_LEVELS.map((a) => (
              <button key={a.value} type="button" onClick={() => set("awardLevel", a.value)} className={`border-2 rounded-lg p-2 text-center transition-colors ${values.awardLevel === a.value ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}>
                <span className="text-sm font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">지급 예정액 (자동 계산)</label>
          <div className="input-field bg-gray-50 text-primary-700 font-bold">{calculatedAmount.toLocaleString()}원{values.isTeam ? " (1인당)" : ""}</div>
          {values.isTeam ? (
            <p className="text-xs text-gray-500 mt-1">
              {values.scale}규모 / 팀 · 팀 총액 {teamTotal.toLocaleString()}원 ÷ {Math.max(1, members.length)}명 = 1인당 {calculatedAmount.toLocaleString()}원
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">{values.scale}규모 / 개인</p>
          )}
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="prize" checked={values.hasMonetaryPrize} onChange={(e) => set("hasMonetaryPrize", e.target.checked)} className="w-4 h-4 accent-primary-600" />
          <label htmlFor="prize" className="text-sm text-gray-700">상금 또는 부상을 수령하였습니다 (중복 지급 불가)</label>
        </div>
      </div>
    </div>
  );
}
