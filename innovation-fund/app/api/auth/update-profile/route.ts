import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const b = await req.json();
  const admin = supabaseAdmin();

  const meta = {
    name: String(b.name || "").trim(),
    department: String(b.department || "").trim(),
    phone: String(b.phone || "").trim(),
    realEmail: String(b.email || "").trim(),
    university: String(b.university || "강원대학교").trim(),
    bankName: String(b.bankName || "").trim(),
    accountNumber: String(b.accountNumber || "").trim(),
    accountHolder: String(b.accountHolder || "").trim(),
  };

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, ...meta },
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  await admin.from("student_profiles").upsert({
    id: user.id,
    student_id: user.user_metadata?.studentId,
    name: meta.name,
    department: meta.department,
    phone: meta.phone,
    email: meta.realEmail,
    university: meta.university,
    bank_name: meta.bankName,
    account_number: meta.accountNumber,
    account_holder: meta.accountHolder,
  });

  return NextResponse.json({ ok: true });
}
