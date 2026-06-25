import { NextResponse } from "next/server";

// 관리자 로그아웃: admin_auth 쿠키 삭제
export async function POST() {
  const res = NextResponse.json({ success: true });
  const clear = (k: string) => res.cookies.set(k, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  clear("admin_sess");
  clear("admin_auth");
  clear("admin_role");
  clear("admin_id");
  return res;
}
