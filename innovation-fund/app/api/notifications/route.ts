import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NOTIFICATIONS_KEY, normalizeNotifications, notificationsFor } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 신청자 본인: 자신에게 온 관리자 알림(요청 건) 목록 (JWT 인증)
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json([]);

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json([]);

  const studentId = String((user.user_metadata as Record<string, unknown>)?.studentId || "");
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", NOTIFICATIONS_KEY).maybeSingle();
  const mine = notificationsFor(normalizeNotifications(data?.value), user.id, studentId);
  return NextResponse.json(mine);
}
