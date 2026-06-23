import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 임시저장(작성 중) 신청의 생성/갱신/최종제출.
// RLS상 신청자는 UPDATE가 불가하므로 JWT 인증 후 service_role로 처리한다.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const { id, row, finalize } = await req.json().catch(() => ({}));
  if (!row || typeof row !== "object") return NextResponse.json({ ok: false, error: "데이터가 필요합니다." }, { status: 400 });

  const admin = supabaseAdmin();
  // 보안: 본인 소유로 강제, 임시저장 여부는 서버가 결정
  const payload = { ...row, applicant_id: user.id, is_draft: !finalize };

  if (id) {
    const { data: existing } = await admin.from("applications").select("applicant_id").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ ok: false, error: "내역을 찾을 수 없습니다." }, { status: 404 });
    if (existing.applicant_id !== user.id) return NextResponse.json({ ok: false, error: "본인 신청만 수정할 수 있습니다." }, { status: 403 });
    const { data, error } = await admin.from("applications").update(payload).eq("id", id).select("id,receipt_number").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, receiptNumber: data.receipt_number });
  }

  const { data, error } = await admin.from("applications").insert(payload).select("id,receipt_number").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, receiptNumber: data.receipt_number });
}
