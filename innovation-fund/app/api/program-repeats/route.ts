import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// 프로그램별 신청 기간 반복 규칙(매주/매월) — programs 테이블에 컬럼이 없어 app_config에 저장.
// app_config 'program_repeat_rules' = { [programId]: { pre?: {freq, until}, fund?: {freq, until} } }
const KEY = "program_repeat_rules";

type Rule = { freq: "weekly" | "monthly"; until?: string };
type RuleMap = Record<string, { pre?: Rule; fund?: Rule }>;

function normRule(v: unknown): Rule | undefined {
  const r = v as { freq?: unknown; until?: unknown } | undefined;
  if (!r || (r.freq !== "weekly" && r.freq !== "monthly")) return undefined;
  const until = typeof r.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.until) ? r.until : undefined;
  return { freq: r.freq, ...(until ? { until } : {}) };
}

function normalize(value: unknown): RuleMap {
  const v = (value || {}) as Record<string, unknown>;
  const out: RuleMap = {};
  for (const [id, raw] of Object.entries(v)) {
    const e = (raw || {}) as { pre?: unknown; fund?: unknown };
    const pre = normRule(e.pre);
    const fund = normRule(e.fund);
    if (pre || fund) out[id] = { ...(pre ? { pre } : {}), ...(fund ? { fund } : {}) };
  }
  return out;
}

// GET: 공개 — 반복 규칙 맵 조회 (홈 캘린더·신청 가능 여부 판정에 사용)
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json({ map: normalize(data?.value) });
}

// POST: 관리자 — 반복 규칙 저장
export async function POST(req: NextRequest) {
  if (!(await getAdminSession(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const map = normalize(body.map);
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value: map }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, map });
}
