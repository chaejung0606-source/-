// AI 초안 작성 키 설정 — 환경변수(ANTHROPIC_API_KEY) 우선, 없으면 관리자 설정(app_config)에서.
// 배포 환경에 환경변수를 넣기 어려운 경우 관리자 페이지에서 키를 저장해 사용할 수 있다.
// 키는 서버에서만 읽고 클라이언트로 절대 반환하지 않는다.
import { supabaseAdmin } from "./supabase-admin";

export const AI_CONFIG_KEY = "ai_config";
export const DEFAULT_AI_MODEL = "claude-sonnet-4-6";

export async function getAnthropic(): Promise<{ apiKey: string; model: string }> {
  let apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  let model = (process.env.ANTHROPIC_MODEL || "").trim();
  if (!apiKey || !model) {
    try {
      const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", AI_CONFIG_KEY).maybeSingle();
      const c = (data?.value && typeof data.value === "object") ? data.value as { anthropicApiKey?: string; model?: string } : {};
      if (!apiKey) apiKey = String(c.anthropicApiKey || "").trim();
      if (!model) model = String(c.model || "").trim();
    } catch { /* app_config 접근 실패 시 무시 */ }
  }
  return { apiKey, model: model || DEFAULT_AI_MODEL };
}
