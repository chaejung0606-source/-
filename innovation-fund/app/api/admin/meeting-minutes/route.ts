import { NextRequest, NextResponse } from "next/server";
import { requireMenu } from "@/lib/admin-auth";
import { normalizeMeeting, type Meeting } from "@/lib/meeting-minutes";
import { getAnthropic } from "@/lib/ai-config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface InFile { name: string; mediaType: string; dataBase64: string; }
interface InGroup { name: string; files: InFile[]; }

const SYSTEM = [
  "당신은 대학 사업단의 회의비 정산을 위한 '회의록' 작성 전문 어시스턴트입니다.",
  "업로드된 서류(회의비 공문, 계획서/계획안, 결과보고서, 영수증, 참석 서명부 등)를 읽고 회의 1건에 대한 회의록을 작성합니다.",
  "회의록은 회의가 끝난 뒤 작성하는 문서이므로 완료·과거 관점으로, 문장은 명사체(…함/…임/…음)로 작성합니다.",
  "회의내용 및 협의사항(content)은 회의안건·공문 등 서류 내용을 바탕으로 2~3문단으로 작성합니다.",
  "지나치게 확정적이지 않게 '…을 논의함', '…을 협의함' 식으로 서술하되, 서류에 정확히 명시된 사실은 확정적으로 서술해도 됩니다.",
  "회의일시(datetime) 형식은 'YYYY. M. D. (요일) HH:MM ~ HH:MM' 입니다. 서류에 시작 시간만 있고 종료 시간이 없으면 종료 시간을 시작+1시간으로 설정합니다.",
  "회의장소(place)는 회의/행사가 실제 진행된 장소입니다.",
  "회의비 사용처(expenseVendor)는 영수증의 가맹점명입니다.",
  "참석자(attendees)는 참석 서명부에 실제로 서명한 사람만 넣습니다. 서명부가 없으면 빈 배열로 둡니다. 절대 추측하지 않습니다.",
  "보완요청(issues) 규칙 — 다음에 해당하면 각각 한 문장으로 issues에 담습니다:",
  " (1) 서류들 사이에 회의 일자 또는 시간이 서로 다르면 어떤 서류가 어떻게 다른지 명시.",
  " (2) 영수증에 찍힌 결제 시각이 회의 시작 시간보다 빠르거나, 회의 종료 시간으로부터 1시간 이내이면 그 사실을 명시.",
  "정보를 찾지 못한 필드는 빈 문자열/빈 배열로 둡니다(추측 금지).",
  "date는 YYYY-MM-DD, weekday는 요일 한 글자(월·화·수·목·금·토·일), agendaShort는 파일명에 쓸 10자 이내 안건 요약입니다.",
  "반드시 아래 JSON 스키마의 객체 하나만 출력합니다. 그 외 설명 텍스트는 출력하지 않습니다.",
  '{"agenda":"","agendaShort":"","date":"YYYY-MM-DD","weekday":"","datetime":"","place":"","expenseVendor":"","attendees":[],"content":"","issues":[]}',
].join("\n");

function contentBlocks(files: InFile[]): unknown[] {
  const blocks: unknown[] = [];
  for (const f of files) {
    blocks.push({ type: "text", text: `[첨부 파일: ${f.name}]` });
    if (f.mediaType === "application/pdf") {
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.dataBase64 } });
    } else if (/^image\//.test(f.mediaType)) {
      blocks.push({ type: "image", source: { type: "base64", media_type: f.mediaType, data: f.dataBase64 } });
    }
  }
  blocks.push({ type: "text", text: "위 서류들을 근거로 회의록 항목을 채워 JSON 하나만 출력해주세요. 서명부에 서명한 인원만 참석자로 넣고, 일자·시간 불일치나 영수증 시각 문제는 issues에 담아주세요." });
  return blocks;
}

async function analyzeGroup(apiKey: string, model: string, g: InGroup): Promise<Meeting> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: contentBlocks(g.files) }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI 호출 실패 (${res.status}) ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  const text = Array.isArray(j.content) ? j.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n") : "";
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  let parsed: unknown = {};
  if (s >= 0 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch { parsed = {}; } }
  const m = normalizeMeeting(parsed, g.name);
  if (!m.agenda && !m.datetime && !m.content) m.issues = [...m.issues, "서류에서 회의 정보를 충분히 인식하지 못했습니다. 사진·PDF가 선명한지 확인 후 다시 시도해주세요."];
  return m;
}

export async function POST(req: NextRequest) {
  if (!(await requireMenu(req, "/admin/meeting-minutes"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { apiKey, model } = await getAnthropic();
  if (!apiKey) return NextResponse.json({ ok: false, error: "AI 키가 설정되어 있지 않습니다. 관리자 설정 → 'AI 회의록 키'에 Anthropic API 키를 입력·저장하거나, 환경변수 ANTHROPIC_API_KEY를 추가하세요." }, { status: 503 });

  const b = await req.json().catch(() => ({}));
  const groups: InGroup[] = Array.isArray(b.groups) ? b.groups.filter((g: unknown) => g && typeof g === "object") : [];
  if (groups.length === 0) return NextResponse.json({ ok: false, error: "업로드된 파일이 없습니다." }, { status: 400 });
  if (groups.length > 20) return NextResponse.json({ ok: false, error: "한 번에 최대 20건까지 처리할 수 있습니다." }, { status: 400 });

  try {
    const meetings = await Promise.all(groups.map((g) => analyzeGroup(apiKey, model, {
      name: String(g.name || "회의"),
      files: (Array.isArray(g.files) ? g.files : []).filter((f: InFile) => f && f.dataBase64).slice(0, 12),
    })));
    return NextResponse.json({ ok: true, meetings });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "회의록 작성 중 오류가 발생했습니다." }, { status: 502 });
  }
}
