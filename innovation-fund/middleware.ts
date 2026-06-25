import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 관리자 영역 보호: /admin/* (로그인 페이지 제외) 및 관리 API는 admin_auth 쿠키 필요
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = req.cookies.get("admin_auth")?.value === "true";

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  // /api/applications/* 는 관리자 API지만, 신청자 본인용(JWT 자체 인증) 엔드포인트는 제외
  const isApplicantApi = pathname.startsWith("/api/applications/cancel")
    || pathname.startsWith("/api/applications/draft");
  const isAdminApi = pathname.startsWith("/api/applications") && !isApplicantApi;

  if ((isAdminPage || isAdminApi) && !authed) {
    if (isAdminApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/applications/:path*"],
};
