import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fromRow } from "@/lib/app-mapper";
import { requireAdmin, appRowProgramName } from "@/lib/admin-auth";
import { NOTIFICATIONS_KEY, normalizeNotifications } from "@/lib/notifications";

// '보완완료' 상태 도입 이전에 보완요청 → 재제출되어 '신청완료'로 되돌아간 신청을 1회 소급 반영.
// 상태 변경 이력이 없어 보완요청의 흔적으로 식별한다:
//  - 관리자 안내 메모(admin_memo)에 '보완'이 포함되어 있고 현재 '신청완료'인 신청
//    (보완요청 상태에서 재제출해야만 '신청완료'로 되돌아오므로 재제출된 것으로 판단)
//  - 해당 신청에 연결된 '보완' 관리자 요청 알림을 신청자가 확인 완료했거나, 알림 이후 신청이 갱신된 경우
// 실행 결과는 app_config에 기록해 두 번 실행되지 않는다. 잘못 반영된 건은 관리자가 드롭다운으로 수정 가능.
const BACKFILL_KEY = "backfill_supplemented_v1";
async function backfillSupplemented(
  admin: ReturnType<typeof supabaseAdmin>,
  rows: Record<string, any>[],
): Promise<Set<string>> {
  const { data: flag } = await admin.from("app_config").select("value").eq("key", BACKFILL_KEY).maybeSingle();
  if (flag) return new Set();

  const { data: notiCfg } = await admin.from("app_config").select("value").eq("key", NOTIFICATIONS_KEY).maybeSingle();
  const supplementNotis = normalizeNotifications(notiCfg?.value)
    .filter((n) => n.applicationId && `${n.title} ${n.body}`.includes("보완"));

  const ids = rows
    .filter((r) => r.review_status === "received" && !r.canceled)
    .filter((r) =>
      String(r.admin_memo || "").includes("보완")
      || supplementNotis.some((n) => n.applicationId === r.id
        && (n.doneAt || String(r.updated_at || "").localeCompare(n.createdAt) > 0)))
    .map((r) => String(r.id));

  if (ids.length) {
    const { error } = await admin.from("applications").update({ review_status: "supplemented" }).in("id", ids);
    if (error) return new Set(); // 반영 실패 시 완료 플래그를 남기지 않고 다음 조회에서 재시도
  }
  await admin.from("app_config").upsert(
    { key: BACKFILL_KEY, value: { done: true, updatedIds: ids, at: new Date().toISOString() } },
    { onConflict: "key" },
  );
  return new Set(ids);
}

// 관리자 전용: 전체 신청 목록 (service_role로 RLS 우회, 서명 세션으로 관리자 검증)
// 프로그램 관리자는 담당 프로그램의 신청만 조회 가능.
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("applications")
    .select("*")
    .eq("is_draft", false)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let rows = data || [];
  // 소급 반영(1회) — 실패해도 목록 조회는 계속
  try {
    const changed = await backfillSupplemented(admin, rows);
    if (changed.size) rows = rows.map((r) => (changed.has(String(r.id)) ? { ...r, review_status: "supplemented" } : r));
  } catch { /* noop */ }
  if (session.role === "program") {
    const { data: progs } = await admin.from("programs").select("id,name");
    const nameToId = Object.fromEntries((progs || []).map((p) => [p.name, p.id]));
    rows = rows.filter((r) => session.programIds.includes(nameToId[appRowProgramName(r)]));
  }
  return NextResponse.json(rows.map(fromRow));
}
