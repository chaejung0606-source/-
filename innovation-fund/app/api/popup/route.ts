import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KEY = "popup";

// 팝업 첨부: kind="image"는 팝업 안에 바로 표시, kind="file"은 다운로드 버튼으로 표시
export interface PopupAttachment {
  url: string;   // /api/site-file?path=... (같은 출처 스트리밍)
  name: string;  // 표시용 원본 파일명
  kind: "image" | "file";
}

export interface PopupItem {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  startDate?: string; // YYYY-MM-DD (포함). 비우면 제한 없음
  endDate?: string;   // YYYY-MM-DD (포함). 비우면 제한 없음
  attachments?: PopupAttachment[]; // 팝업에 표시할 이미지 / 다운로드 파일
}

function normalizeAttachments(value: unknown): PopupAttachment[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .map((a) => {
      const o = (a || {}) as Record<string, unknown>;
      const url = String(o.url || "");
      if (!url) return null;
      const kind = o.kind === "image" ? "image" : "file";
      return { url, name: String(o.name || "첨부파일"), kind } as PopupAttachment;
    })
    .filter(Boolean) as PopupAttachment[];
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
          attachments: normalizeAttachments(o.attachments),
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
        attachments: [],
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
  if (!(await requireMenu(req, "/admin/site-settings"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const value = normalize(b);
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
