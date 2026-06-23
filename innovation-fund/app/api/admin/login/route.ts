import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPw = process.env.ADMIN_PASSWORD || "admin1234";

  if (password === adminPw) {
    const res = NextResponse.json({ success: true });
    res.cookies.set("admin_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1년 (로그아웃 전까지 유지)
      path: "/",
    });
    return res;
  }
  return NextResponse.json({ success: false, error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
}
