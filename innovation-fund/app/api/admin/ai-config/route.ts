import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpenseOnly } from "@/lib/admin-auth";
import { AI_CONFIG_KEY, DEFAULT_AI_MODEL } from "@/lib/ai-config";

export const dynamic = "force-dynamic";

// 관리자(지출관리자) 전용: AI 키 설정 조회/저장. 보안상 키 원문은 응답에 절대 포함하지 않는다.
export async function GET(req: NextRequest) {
  if (!(await requireExpenseOnly(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", AI_CONFIG_KEY).maybeSingle();
  const c = (data?.value && typeof data.value === "object") ? data.value as { anthropicApiKey?: string; model?: string } : {};
  return NextResponse.json({
    hasKey: !!(process.env.ANTHROPIC_API_KEY || c.anthropicApiKey),
    fromEnv: !!process.env.ANTHROPIC_API_KEY,
    model: (process.env.ANTHROPIC_MODEL || c.model || DEFAULT_AI_MODEL),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireExpenseOnly(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_config").select("value").eq("key", AI_CONFIG_KEY).maybeSingle();
  const cur = (data?.value && typeof data.value === "object") ? data.value as { anthropicApiKey?: string; model?: string } : {};
  const incoming = String(b.anthropicApiKey || "").trim();
  const value = {
    // 빈 값으로 저장 요청 시 기존 키 유지(입력창을 비워도 지워지지 않음). 삭제는 clear 플래그로.
    anthropicApiKey: b.clear ? "" : (incoming || cur.anthropicApiKey || ""),
    model: b.model != null ? String(b.model).trim() : (cur.model || ""),
  };
  const { error } = await admin.from("app_config").upsert({ key: AI_CONFIG_KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
