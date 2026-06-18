// 서버 전용 Supabase 클라이언트 (service_role). RLS를 우회하므로 절대 클라이언트로 보내지 말 것.
// 서버 라우트(app/api/**)에서만 import 하세요.
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
