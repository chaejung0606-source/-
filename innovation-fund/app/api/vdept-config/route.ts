import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireMenu } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const KEY = "vdept_required_types";
// 기본: 성과형(성적 우수·경진대회 입상·자격증 취득)만 미래융합가상학과 학생 전용,
// 그 외(참여지원비·진행요원비·근로 등 지원신청/지원금 신청)는 누구나 신청 가능
const DEFAULT_TYPES = ["grade", "contest", "certificate"];

// GET: 공개 — 가상학과 학생만 신청 가능한 지원유형 목록
export async function GET() {
  const { data } = await supabaseAdmin().from("app_config").select("value").eq("key", KEY).maybeSingle();
  const types = Array.isArray(data?.value) ? data!.value : DEFAULT_TYPES;
  return NextResponse.json({ requiredTypes: types });
}

// POST: 관리자 — 목록 저장
export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, ["/admin/applicants", "/admin/virtual-students"]))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const types = Array.isArray(body.requiredTypes) ? body.requiredTypes : [];
  const { error } = await supabaseAdmin().from("app_config").upsert({ key: KEY, value: types }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
