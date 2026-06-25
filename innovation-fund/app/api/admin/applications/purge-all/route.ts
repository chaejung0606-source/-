import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireExpense } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// ⚠️ 위험: 모든 신청 기록(applications) + 업로드 파일(documents 버킷)을 영구 삭제한다.
// 되돌릴 수 없으므로 지출관리자 인증 + 확인 문구("전체삭제")가 모두 있어야 실행된다.
export async function POST(req: NextRequest) {
  if (!(await requireExpense(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "전체삭제") {
    return NextResponse.json({ ok: false, error: "확인 문구가 일치하지 않습니다." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // 1) 모든 신청의 업로드 파일 경로 수집 → 스토리지에서 삭제 (best-effort)
  let deletedFiles = 0;
  try {
    const { data: rows } = await admin.from("applications").select("files");
    const paths: string[] = [];
    (rows || []).forEach((r) => {
      const files = (r as { files?: { path?: string }[] }).files;
      (Array.isArray(files) ? files : []).forEach((f) => { if (f?.path) paths.push(f.path); });
    });
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error } = await admin.storage.from("documents").remove(chunk);
      if (!error) deletedFiles += chunk.length;
    }
  } catch { /* 스토리지 삭제 실패는 무시하고 레코드 삭제는 진행 */ }

  // 2) applications 테이블 전체 삭제
  const { data: before } = await admin.from("applications").select("id");
  const total = (before || []).length;
  const { error } = await admin.from("applications").delete().not("id", "is", null);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deletedApplications: total, deletedFiles });
}
