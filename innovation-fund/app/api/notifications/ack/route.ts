import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NOTIFICATIONS_KEY, normalizeNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 신청자 본인: 알림 열람(read)/확인 완료(done) 처리 (JWT 인증)
// body: { id, action: "read" | "done" | "undone" }
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").trim();
  const action = String(b.action || "read");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const sid = String((user.user_metadata as Record<string, unknown>)?.studentId || "").trim().toLowerCase();
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", NOTIFICATIONS_KEY).maybeSingle();
  const all = normalizeNotifications(data?.value);

  const now = new Date().toISOString();
  let found = false;
  const next = all.map((n) => {
    if (n.id !== id) return n;
    // 본인 알림만 변경 가능 (uid 또는 학번 매칭)
    const mine = (n.applicantId && n.applicantId === user.id) || (sid && n.studentId.trim().toLowerCase() === sid);
    if (!mine) return n;
    found = true;
    if (action === "done") return { ...n, readAt: n.readAt || now, doneAt: now };
    if (action === "undone") return { ...n, doneAt: null };
    return { ...n, readAt: n.readAt || now };
  });
  if (!found) return NextResponse.json({ ok: false, error: "알림을 찾을 수 없습니다." }, { status: 404 });

  const { error } = await admin.from("app_config").upsert({ key: NOTIFICATIONS_KEY, value: next }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
