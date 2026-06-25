// 서버 전용 Supabase 클라이언트 (service_role). RLS를 우회하므로 절대 클라이언트로 보내지 말 것.
// 서버 라우트(app/api/**)에서만 import 하세요.
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Next.js의 fetch 데이터 캐시 우회 — 관리자 계정 등 인증·권한 데이터는 항상 최신값을 읽어야 함
    // (캐시된 옛 admin_accounts를 읽으면 새로 추가한 프로그램 관리자가 로그인에 실패함)
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
