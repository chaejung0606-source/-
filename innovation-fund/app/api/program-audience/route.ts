import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// 공개 읽기 — 프로그램별 단계별 신청대상 맵 { [programId]: { pre, fund } }
// programs 테이블에 audience_pre/audience_fund 컬럼이 없어도 신청대상이 보존되도록 app_config에 별도 저장한다.
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", "program_audience").maybeSingle();
  const map = (data?.value && typeof data.value === "object") ? data.value : {};
  return NextResponse.json({ map });
}
