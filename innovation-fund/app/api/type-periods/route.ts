import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 프로그램이 없는 성과형 지원(성적 우수·경진대회·자격증)의 학기별 신청기한.
// app_config 'fund_type_periods' = { grade:{start,end}, contest:{...}, certificate:{...} }
const KEY = "fund_type_periods";
const TYPES = ["grade", "contest", "certificate"] as const;
type Period = { start: string; end: string };
type Periods = Record<string, Period>;

function normalize(value: unknown): Periods {
  const v = (value || {}) as Record<string, unknown>;
  const out: Periods = {};
  for (const t of TYPES) {
    const p = (v[t] || {}) as Record<string, unknown>;
    out[t] = { start: String(p.start || ""), end: String(p.end || "") };
  }
  return out;
}

// GET: 공개 — 유형별 신청기한 조회
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json({ periods: normalize(data?.value) });
}

// POST: 관리자 — 신청기한 저장
export async function POST(req: NextRequest) {
  if (!(await getAdminSession(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const periods = normalize(body.periods);
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value: periods }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, periods });
}
