import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { toRow } from "@/lib/app-mapper";

// 관리자 테스트 신청: admin_auth 쿠키 확인 후 service_role로 is_test=true 신청 생성
export async function POST(req: NextRequest) {
  if (req.cookies.get("admin_auth")?.value !== "true") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });

  const row = { ...toRow({ ...payload, isTest: true }, null), is_test: true, is_draft: false };
  const { data, error } = await supabaseAdmin()
    .from("applications").insert(row).select("id,receipt_number").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, receiptNumber: data.receipt_number });
}
