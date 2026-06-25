"use client";
// 신청이 차단된 화면에서 신청자가 다음 행동(문의)을 할 수 있도록 사업단 연락처 버튼을 노출한다.
export default function InquiryButtons({ onBack }: { onBack?: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 justify-center">
      {onBack && <button onClick={onBack} className="btn-secondary">뒤로 가기</button>}
      <a href="tel:033-250-7879" className="btn-secondary">📞 033-250-7879</a>
      <a
        href="http://pf.kakao.com/_YnXnn/chat"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-[#3C1E1E]"
        style={{ background: "#FEE500" }}
      >
        💬 카카오톡으로 문의하기
      </a>
    </div>
  );
}
