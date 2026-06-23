import { NextRequest, NextResponse } from "next/server";

// 관리자 로그인 여부 확인 (홈 화면에서 '관리자 페이지' 버튼 노출용)
export async function GET(req: NextRequest) {
  return NextResponse.json({ admin: req.cookies.get("admin_auth")?.value === "true" });
}
