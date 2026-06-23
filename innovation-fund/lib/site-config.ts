// 사이트 설정(푸터·사이드바 바로가기) — Supabase app_config 테이블(key='site')에 저장.
// 읽기/쓰기는 /api/site-config 경유(GET 공개, POST 관리자).

export interface SiteLink {
  id: string;
  label: string;     // 줄바꿈은 \n
  href: string;
  iconName: string;  // Globe | BookOpen | GraduationCap | MessageCircle | Mail | Phone | Award | FileText | Link
  color: string;
  isKakao?: boolean;
}

export interface FooterConfig {
  organization: string;
  email: string;
  phone: string;
  address: string;
  version: string;
  updateDate: string;
}

export interface SiteConfig {
  footer: FooterConfig;
  sidebarLinks: SiteLink[];
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  footer: {
    organization: "강원대학교 데이터보안·활용 혁신융합대학사업단",
    email: "sducoss@kangwon.ac.kr",
    phone: "033-250-7879",
    address: "강원대학교 한빛관 1층 105호",
    // 빌드(업데이트)마다 자동 갱신 (next.config.mjs 주입)
    version: process.env.NEXT_PUBLIC_BUILD_VERSION || "v1.0.0",
    updateDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().slice(0, 16).replace("T", " "),
  },
  sidebarLinks: [
    { id: "1", label: "사업단\n홈페이지", href: "https://sducoss.ac.kr/ko/index", iconName: "Globe", color: "#4f8cff" },
    { id: "2", label: "LMS\n사이트", href: "https://lms.sducoss.ac.kr/login.php", iconName: "BookOpen", color: "#2dd4bf" },
    { id: "3", label: "이루리\n로그인", href: "https://iruri.kangwon.ac.kr", iconName: "GraduationCap", color: "#a78bfa" },
    { id: "4", label: "카톡\n문의", href: "http://pf.kakao.com/_YnXnn/chat", iconName: "MessageCircle", color: "#FEE500", isKakao: true },
  ],
};

// 클라이언트에서 현재 사이트 설정 조회 (실패 시 기본값)
// version/updateDate는 DB 저장값을 무시하고 항상 빌드 시점 값을 사용한다.
// (관리자가 사이트 설정을 저장할 때 옛 버전이 DB에 박제되어 버전이 고정되는 문제 방지)
export async function fetchSiteConfig(): Promise<SiteConfig> {
  const buildMeta = { version: DEFAULT_SITE_CONFIG.footer.version, updateDate: DEFAULT_SITE_CONFIG.footer.updateDate };
  try {
    const r = await fetch("/api/site-config");
    if (r.ok) {
      const d = await r.json();
      return {
        footer: { ...DEFAULT_SITE_CONFIG.footer, ...(d?.footer || {}), ...buildMeta },
        sidebarLinks: d?.sidebarLinks || DEFAULT_SITE_CONFIG.sidebarLinks,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_SITE_CONFIG;
}
