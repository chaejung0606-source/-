import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow } from "@/lib/app-mapper";

// 관리자 전용: 전체 신청 목록 (service_role로 RLS 우회, 쿠키로 관리자 확인)
function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(fromRow));
}
