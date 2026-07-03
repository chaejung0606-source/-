import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAnthropic } from "@/lib/ai-config";

export const dynamic = "force-dynamic";

// 관리자 대리 신청 시, 신청자별로 달라지는 서술형 항목(활동계획·기대성과 등)의 초안을 AI가 작성.
// ANTHROPIC_API_KEY(서버 전용)가 설정돼 있어야 동작.
export async function POST(req: NextRequest) {
  if (!(await getAdminSession(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { apiKey, model } = await getAnthropic();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "AI 키가 설정되어 있지 않습니다. 관리자 설정 → 'AI 초안 작성 키'에 Anthropic API 키를 입력하거나 환경변수 ANTHROPIC_API_KEY를 추가하세요." }, { status: 503 });
  }

  const b = await req.json().catch(() => ({}));
  const label = String(b.label || "항목").slice(0, 120);
  const ctx = (b.context || {}) as Record<string, unknown>;
  const programName = String(ctx.programName || "");
  const applicantName = String(ctx.applicantName || "");
  const department = String(ctx.department || "");
  const grade = String(ctx.grade || "");
  const instruction = String(ctx.instruction || "").slice(0, 800);
  const maxLen = Number(b.maxLen) > 0 ? Number(b.maxLen) : 600;

  const sys = [
    "당신은 대학 사업단의 지원금 신청서 작성을 돕는 한국어 어시스턴트입니다.",
    "신청자별 상황(소속·학년·행사 내용)에 맞춰 자연스럽고 구체적인 신청서 문단을 작성합니다.",
    "과장·허위 없이 사실 기반으로, 공손한 보고서 문체(…함/…음 또는 …합니다)로 작성합니다.",
    "불필요한 머리말/맺음말 없이 본문만, 한 항목 분량으로 간결하게 작성합니다.",
    `분량은 약 ${Math.min(maxLen, 1200)}자 이내.`,
  ].join(" ");

  const user = [
    `작성할 항목: "${label}"`,
    programName ? `프로그램: ${programName}` : "",
    applicantName ? `신청자: ${applicantName}` : "",
    department ? `소속/학과: ${department}` : "",
    grade ? `학년/구분: ${grade}` : "",
    instruction ? `행사 내용·추가 지시: ${instruction}` : "",
    "",
    `위 정보를 바탕으로 "${label}" 항목에 들어갈 신청 내용을 작성해주세요.`,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system: sys,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `AI 호출 실패 (${res.status}) ${t.slice(0, 200)}` }, { status: 502 });
    }
    const j = await res.json();
    const text = Array.isArray(j.content) ? j.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n").trim() : "";
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "AI 호출 중 오류가 발생했습니다." }, { status: 500 });
  }
}
