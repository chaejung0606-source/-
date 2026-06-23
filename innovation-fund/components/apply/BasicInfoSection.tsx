"use client";
import { formatPhone } from "@/lib/validation";
import CampusDeptSelect from "@/components/common/CampusDeptSelect";

interface BasicInfo {
  name: string; studentId: string; university: string; campus: string; department: string;
  grade: string; academicStatus: string; phone: string; email: string;
  applicationDate: string; bankName: string; accountNumber: string; accountHolder: string;
  gradCompletion: string; completedYears: string; currentSemester: string;
  privacyAgree: string;
}

interface Props {
  values: BasicInfo;
  onChange: (v: BasicInfo) => void;
  hideAccount?: boolean;  // 지원신청(활동 전): 계좌 정보 입력 생략
}

const UNIVERSITIES = ["강원대학교", "한림대학교", "강릉원주대학교", "연세대학교(미래)", "상지대학교", "가톨릭관동대학교", "경동대학교"];
const GRADES = ["1", "2", "3", "4", "대학원"];
const STATUSES = ["재학", "수료"];
const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "카카오뱅크", "토스뱅크", "SC제일은행", "대구은행", "부산은행", "기타"];

export default function BasicInfoSection({ values, onChange, hideAccount = false }: Props) {
  const set = (key: keyof BasicInfo, val: string) => onChange({ ...values, [key]: val });

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="card">
        <h2 className="section-title">기본 정보</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">이름 <span className="text-red-500">*</span></label>
            <input className="input-field" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="홍길동" />
          </div>
          <div>
            <label className="label">학번 <span className="text-red-500">*</span></label>
            <input className="input-field" value={values.studentId} onChange={(e) => set("studentId", e.target.value)} placeholder="2021xxxxxxx" />
          </div>
          <div>
            <label className="label">소속 대학 <span className="text-red-500">*</span></label>
            <select className="input-field" value={values.university} onChange={(e) => set("university", e.target.value)}>
              {UNIVERSITIES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          {values.university === "강원대학교" ? (
            <div>
              <label className="label">캠퍼스 · 단과대학 · 학과 <span className="text-red-500">*</span></label>
              <CampusDeptSelect
                campus={values.campus || ""}
                department={values.department}
                onCampusChange={(v) => set("campus", v)}
                onDepartmentChange={(v) => set("department", v)}
              />
            </div>
          ) : (
            <div>
              <label className="label">학과/전공 <span className="text-red-500">*</span></label>
              <input className="input-field" value={values.department} onChange={(e) => set("department", e.target.value)} placeholder="컴퓨터공학과" />
            </div>
          )}
          <div>
            <label className="label">학년</label>
            <select className="input-field" value={values.grade} onChange={(e) => set("grade", e.target.value)}>
              {GRADES.map((g) => <option key={g} value={g}>{g === "대학원" ? "대학원" : `${g}학년`}</option>)}
            </select>
          </div>
          <div>
            <label className="label">학적 상태</label>
            <select className="input-field" value={values.academicStatus} onChange={(e) => set("academicStatus", e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* 대학원생 전용 추가 필드 */}
          {values.grade === "대학원" && (
            <div className="sm:col-span-2 rounded-2xl p-4 space-y-4" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <p className="text-sm font-semibold text-indigo-700">대학원생 추가 정보</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">재학/수료 여부</label>
                  <select className="input-field" value={values.gradCompletion} onChange={(e) => set("gradCompletion", e.target.value)}>
                    <option value="재학">재학</option>
                    <option value="수료">수료</option>
                  </select>
                </div>
                {values.gradCompletion === "수료" && (
                  <div>
                    <label className="label">수료 후 경과</label>
                    <select className="input-field" value={values.completedYears} onChange={(e) => set("completedYears", e.target.value)}>
                      <option value="">선택</option>
                      <option value="1년 이내">1년 이내</option>
                      <option value="2년 이내">2년 이내</option>
                      <option value="2년 초과">2년 초과</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">현재 학기</label>
                  <select className="input-field" value={values.currentSemester} onChange={(e) => set("currentSemester", e.target.value)}>
                    <option value="">선택</option>
                    {["1학기", "2학기", "3학기", "4학기", "5학기 이상"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {values.gradCompletion === "수료" && values.completedYears === "2년 초과" && (
                <div className="flex items-start gap-2 text-sm text-red-700 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <span>⚠️ 대학원 수료생은 <strong>수료 후 2년 이내</strong>만 지원 가능합니다. 지원 자격을 확인해주세요.</span>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="label">연락처 <span className="text-red-500">*</span></label>
            <input className="input-field" value={values.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" />
          </div>
          <div>
            <label className="label">이메일 <span className="text-red-500">*</span></label>
            <input className="input-field" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="example@kangwon.ac.kr" />
          </div>
          <div>
            <label className="label">신청일</label>
            <input className="input-field" type="date" value={values.applicationDate} onChange={(e) => set("applicationDate", e.target.value)} />
          </div>
        </div>
      </div>

      {/* 계좌 정보 (지원신청 시 생략) */}
      {!hideAccount && (
      <div className="card">
        <h2 className="section-title">본인 명의 계좌 정보</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">
          ※ 반드시 본인 명의 계좌로만 지급됩니다. 타인 명의 계좌로는 지급이 불가합니다.
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">은행명 <span className="text-red-500">*</span></label>
            <select className="input-field" value={values.bankName} onChange={(e) => set("bankName", e.target.value)}>
              <option value="">선택</option>
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">계좌번호 <span className="text-red-500">*</span></label>
            <input className="input-field" value={values.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} placeholder="000000-00-000000" />
          </div>
          <div>
            <label className="label">예금주 <span className="text-red-500">*</span></label>
            <input className="input-field" value={values.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} placeholder="홍길동" />
          </div>
        </div>
        {values.name && values.accountHolder && values.name.replace(/\s/g, "") !== values.accountHolder.replace(/\s/g, "") && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl p-3 text-sm text-red-700" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <span>⚠️ <strong>예금주({values.accountHolder})와 신청자 성명({values.name})이 다릅니다.</strong> 혁신인재지원금은 <u>본인 명의 계좌로만</u> 지급됩니다. 제출하는 통장 사본의 예금주가 본인과 동일한지 다시 확인해주세요. (불일치 시 지급 보류될 수 있습니다.)</span>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
