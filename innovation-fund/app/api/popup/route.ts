import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KEY = "popup";

export interface PopupItem {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  startDate?: string; // YYYY-MM-DD (포함). 비우면 제한 없음
  endDate?: string;   // YYYY-MM-DD (포함). 비우면 제한 없음
}

// 구버전 단일 팝업 {enabled,title,content} → 신버전 {popups:[...]} 로 정규화
function normalize(value: unknown): { popups: PopupItem[] } {
  const v = (value || {}) as Record<string, unknown>;
  if (Array.isArray(v.popups)) {
    return {
      popups: (v.popups as unknown[]).map((p, i) => {
        const o = (p || {}) as Record<string, unknown>;
        return {
          id: String(o.id || `popup-${i}`),
          enabled: !!o.enabled,
          title: String(o.title || ""),
          content: String(o.content || ""),
          startDate: o.startDate ? String(o.startDate) : "",
          endDate: o.endDate ? String(o.endDate) : "",
        };
      }),
    };
  }
  // 구버전 호환 (단일 팝업)
  if (v.title || v.content || v.enabled) {
    return {
      popups: [{
        id: "popup-legacy",
        enabled: !!v.enabled,
        title: String(v.title || ""),
        content: String(v.content || ""),
        startDate: "",
        endDate: "",
      }],
    };
  }
  return { popups: [] };
}

// GET: 공개 — 홈 팝업 공지 목록
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  return NextResponse.json(normalize(data?.value));
}

// POST: 관리자 — 팝업 공지 목록 저장
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const value = normalize(b);
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
