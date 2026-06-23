import { NextResponse } from "next/server";

// 관리자 로그아웃: admin_auth 쿠키 삭제
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
