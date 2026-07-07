import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { GUIDE_KEY, DEFAULT_GUIDE, normalizeGuide } from "@/lib/guide";

export const dynamic = "force-dynamic";

// 공개: 신청자 이용안내. 관리자가 저장한 값이 있으면 그것을, 없으면 코드 기본값을 반환.
export async function GET() {
  // 저장 직후 미리보기에 옛 내용이 보이지 않도록 캐시 금지
  const noStore = { headers: { "Cache-Control": "no-store" } };
  try {
    const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", GUIDE_KEY).maybeSingle();
    const saved = normalizeGuide(data?.value);
    if (saved && saved.sections.length) return NextResponse.json({ ...saved, customized: true }, noStore);
  } catch { /* app_config 접근 실패 시 기본값 */ }
  return NextResponse.json({ ...DEFAULT_GUIDE, customized: false }, noStore);
}
