// 사이트 설정(푸터·사이드바 바로가기) — Supabase app_config 테이블(key='site')에 저장.
// 읽기/쓰기는 /api/site-config 경유(GET 공개, POST 관리자).

export interface SiteLink {
  id: string;
  label: string;     // 줄바꿈은 \n
  href: string;
  iconName: string;  // Globe | BookOpen | GraduationCap | MessageCircle | Mail | Phone | Award | FileText | Link
  color: string;
  isKakao?: boolean;
  fileName?: string; // 업로드한 파일(PDF·이미지)명 — href가 업로드 파일을 가리킬 때 표시·식별용
  inWindow?: boolean; // 클릭 시 새 탭 대신 크기조절·이동 가능한 작은 창(미리보기)으로 열기 (가이드북 등)
}

// 푸터 연락처 항목 (사이드바 링크처럼 추가·수정·삭제 가능)
export interface FooterItem {
  id: string;
  type: "email" | "phone" | "address" | "link";  // 클릭 동작 결정
  iconName: string;   // Mail | Phone | MapPin | Globe | Link ...
  label: string;      // 표시 텍스트
  value: string;      // 이메일 / 전화 / 주소(지도검색) / URL
}

export interface FooterConfig {
  organization: string;
  items: FooterItem[];
  version: string;
  updateDate: string;
  // 구버전 호환(있으면 items로 자동 변환)
  email?: string;
  phone?: string;
  address?: string;
}

export interface SiteConfig {
  footer: FooterConfig;
  sidebarLinks: SiteLink[];
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  footer: {
    organization: "강원대학교 데이터보안·활용 혁신융합대학사업단",
    items: [
      { id: "f1", type: "email", iconName: "Mail", label: "sducoss@kangwon.ac.kr", value: "sducoss@kangwon.ac.kr" },
      { id: "f2", type: "phone", iconName: "Phone", label: "033-250-7879", value: "033-250-7879" },
      { id: "f3", type: "address", iconName: "MapPin", label: "강원대학교 한빛관 1층 105호", value: "강원대학교춘천캠퍼스한빛관" },
    ],
    // 빌드(업데이트)마다 자동 갱신 (next.config.mjs 주입)
    version: process.env.NEXT_PUBLIC_BUILD_VERSION || "v1.0.0",
    updateDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().slice(0, 16).replace("T", " "),
  },
  sidebarLinks: [
    { id: "guide", label: "이용\n안내", href: "/guide", iconName: "BookOpen", color: "#6366f1" },
    { id: "1", label: "사업단\n홈페이지", href: "https://sducoss.ac.kr/ko/index", iconName: "Globe", color: "#4f8cff" },
    { id: "2", label: "LMS\n사이트", href: "https://lms.sducoss.ac.kr/login.php", iconName: "BookOpen", color: "#2dd4bf" },
    { id: "3", label: "이루리\n로그인", href: "https://iruri.kangwon.ac.kr", iconName: "GraduationCap", color: "#a78bfa" },
    { id: "4", label: "카톡\n문의", href: "http://pf.kakao.com/_YnXnn/chat", iconName: "MessageCircle", color: "#FEE500", isKakao: true },
  ],
};

// 구버전(email/phone/address) 설정을 items 리스트로 변환
function normalizeFooter(footer: any): FooterConfig {
  const base = { ...DEFAULT_SITE_CONFIG.footer, ...(footer || {}) };
  let items: FooterItem[] = Array.isArray(footer?.items) ? footer.items : [];
  if (items.length === 0) {
    items = [];
    if (base.email) items.push({ id: "f1", type: "email", iconName: "Mail", label: base.email, value: base.email });
    if (base.phone) items.push({ id: "f2", type: "phone", iconName: "Phone", label: base.phone, value: base.phone });
    if (base.address) items.push({ id: "f3", type: "address", iconName: "MapPin", label: base.address, value: "강원대학교춘천캠퍼스한빛관" });
    if (items.length === 0) items = DEFAULT_SITE_CONFIG.footer.items;
  }
  return {
    organization: base.organization,
    items,
    // version/updateDate는 항상 빌드 시점 값 사용 (DB 박제 방지)
    version: DEFAULT_SITE_CONFIG.footer.version,
    updateDate: DEFAULT_SITE_CONFIG.footer.updateDate,
  };
}

// 클라이언트에서 현재 사이트 설정 조회 (실패 시 기본값)
export async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const r = await fetch("/api/site-config");
    if (r.ok) {
      const d = await r.json();
      return {
        footer: normalizeFooter(d?.footer),
        sidebarLinks: d?.sidebarLinks || DEFAULT_SITE_CONFIG.sidebarLinks,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_SITE_CONFIG;
}
