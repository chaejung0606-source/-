import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "개인정보 처리방침 | 강원대학교 데이터보안·활용 혁신융합대학사업단",
};

const sections: { h: string; body: React.ReactNode }[] = [
  {
    h: "1. 수집하는 개인정보 항목",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>회원가입: 학번, 이름, 학과, 연락처, 이메일</li>
        <li>지원금 신청: 소속 대학, 학년, 학적 상태, 계좌정보(은행·계좌번호·예금주), 신청 유형별 활동·성과 정보</li>
        <li>증빙 서류: 신청자가 업로드하는 신분증 사본, 통장 사본, 재학증명서, 성과·참여 증빙 등</li>
        <li>※ 주민등록번호는 신청자가 직접 입력하지 않습니다. 다만 지원금 지급 및 소득세법 등 법령에 따른 소득신고·원천징수 의무 이행을 위해 필요한 경우에 한해, 담당자가 통장사본 등으로 확인 후 입력하며 <strong>암호화하여 안전하게 보관</strong>하고 목적 달성 시 지체 없이 파기합니다.</li>
      </ul>
    ),
  },
  {
    h: "2. 개인정보의 수집·이용 목적",
    body: "회원 식별 및 인증, 혁신융합대학사업단 지원금(근로장학금·혁신인재지원금·학생활동지원비) 신청 접수, 자격 검토·심의, 지급 및 사후관리, 관련 법령에 따른 소득신고·증빙 제출.",
  },
  {
    h: "3. 보유 및 이용 기간",
    body: "수집·이용 목적 달성(지원금 지급 완료) 후 5년간 보관하며, 기간 경과 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다. 회원 탈퇴 시 즉시 파기(법령상 보존 항목 제외).",
  },
  {
    h: "4. 개인정보의 제3자 제공",
    body: "원칙적으로 외부에 제공하지 않습니다. 다만 소득신고(연말정산 포함), 관련 기관 필수 제출 및 통계 목적 등 법령에 근거가 있거나 정보주체의 동의가 있는 경우에 한해 제공할 수 있습니다.",
  },
  {
    h: "5. 개인정보 처리의 위탁 및 보관",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>호스팅·데이터베이스: 신청 정보는 클라우드 인프라(Vercel, Supabase)에 저장·관리되며 접근통제(RLS)·암호화 등 보호조치를 적용합니다.</li>
        <li>업무용 사본(Google Drive): 사업 운영 편의를 위해 <strong>신청 요약(접수번호 기준) 및 일부 증빙 서류</strong>를 운영자의 Google Drive·스프레드시트에 보관할 수 있습니다. 시트 요약에는 <strong>이름·학번·계좌정보·연락처·이메일을 포함하지 않고</strong>, <strong>신분증·통장 사본은 전송하지 않습니다.</strong> 다만 재학증명서·성과/참여 증빙 등 일부 서류의 <strong>내용에는 이름·학번 등 식별정보가 포함될 수 있으며</strong>, 해당 파일은 접수번호 폴더에 분리 보관하고 운영자 계정 외 접근을 제한합니다.</li>
        <li><strong>신청 취소 시</strong> Google Drive에 보관된 해당 신청의 첨부 서류는 삭제되며, 시트에는 ‘삭제 건’으로 표시됩니다.</li>
        <li>위탁 시 관련 법령에 따라 안전한 관리가 이루어지도록 합니다.</li>
      </ul>
    ),
  },
  {
    h: "6. 정보주체의 권리",
    body: "정보주체는 언제든지 본인의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있으며, 아래 개인정보 보호 담당부서를 통해 신청할 수 있습니다.",
  },
  {
    h: "7. 개인정보의 안전성 확보조치",
    body: "비밀번호의 일방향 암호화, 주민등록번호 등 민감정보의 암호화 저장, 접근권한 관리 및 접근통제(역할 기반 서버측 권한 검증·RLS), 전송구간 암호화(HTTPS), 신청 취소 시 첨부서류 즉시 삭제, 접속기록 보관 등 관련 법령에 따른 기술적·관리적 보호조치를 시행합니다.",
  },
  {
    h: "8. 개인정보 보호 담당부서",
    body: (
      <ul className="space-y-1">
        <li>강원대학교 데이터보안·활용 혁신융합대학사업단</li>
        <li>이메일: sducoss@kangwon.ac.kr</li>
        <li>전화: 033-250-7879</li>
        <li>주소: 강원대학교 한빛관 1층 105호</li>
      </ul>
    ),
  },
  {
    h: "9. 처리방침의 변경",
    body: "본 처리방침은 법령·정책 변경에 따라 개정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-indigo-500 hover:text-indigo-700"><ArrowLeft className="w-5 h-5" /></Link>
          <Shield className="w-6 h-6 text-indigo-600" />
          <span className="font-bold holo-text">개인정보 처리방침</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">개인정보 처리방침</h1>
        <p className="text-sm text-gray-500 mb-8">강원대학교 데이터보안·활용 혁신융합대학사업단(이하 “사업단”)은 「개인정보 보호법」에 따라 정보주체의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위해 다음과 같이 처리방침을 둡니다.</p>

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.h} className="card">
              <h2 className="font-bold text-gray-800 mb-2">{s.h}</h2>
              <div className="text-sm text-gray-600 leading-relaxed">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-8">시행일: 2026-03-01</p>
      </div>
    </div>
  );
}
