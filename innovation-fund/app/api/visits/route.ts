import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// KST 기준 날짜(YYYY-MM-DD). offsetDays: 며칠 전.
function kstDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 - offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

// 일일 방문자 집계 — 브라우저당 하루 1회만 +1(쿠키 dedupe), 오늘/누적/최근 7일 추세 반환.
// visit_stats 테이블/함수가 없으면 { ready:false } 로 안전하게 응답(푸터에서 표시 안 함).
export async function GET(req: NextRequest) {
  const today = kstDateStr(0);
  const seen = req.cookies.get("vs_seen")?.value;
  const isNew = seen !== today;
  try {
    const admin = supabaseAdmin();
    if (isNew) await admin.rpc("bump_visit", { d: today });
    const { data: rows, error } = await admin.from("visit_stats").select("date, count");
    if (error) return NextResponse.json({ ready: false });
    const byDate: Record<string, number> = {};
    let total = 0;
    for (const r of rows || []) {
      const c = Number((r as { count?: number }).count) || 0;
      byDate[String((r as { date?: string }).date).slice(0, 10)] = c;
      total += c;
    }
    const spark: number[] = [];
    for (let i = 6; i >= 0; i--) spark.push(byDate[kstDateStr(i)] || 0);
    const res = NextResponse.json({ ready: true, today: byDate[today] || 0, total, spark });
    if (isNew) res.cookies.set("vs_seen", today, { maxAge: 86400, httpOnly: true, sameSite: "lax", path: "/" });
    return res;
  } catch {
    return NextResponse.json({ ready: false });
  }
}
