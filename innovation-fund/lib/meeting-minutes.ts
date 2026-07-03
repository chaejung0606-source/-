// 회의록 — 업로드한 서류(회의비 공문·계획서·결과보고서·영수증·서명부)를 AI가 읽어
// 회의 건별로 회의록을 작성하고, 일자·시간 불일치 등은 보완요청으로 안내한다.
import JSZip from "jszip";

export interface Meeting {
  groupName: string;      // 업로드 묶음(zip 등) 이름
  agenda: string;         // 회의안건
  agendaShort: string;    // 파일명용 10자 이내 요약
  date: string;           // 회의일 YYYY-MM-DD
  weekday: string;        // 요일 한 글자(월·화·수…)
  datetime: string;       // 회의일시 '2026. 4. 8. (수) 17:00 ~ 18:00'
  place: string;          // 회의장소
  expenseVendor: string;  // 회의비 사용처(영수증 가맹점명)
  attendees: string[];    // 참석자(서명부에 서명한 인원만)
  content: string;        // 회의내용 및 협의사항(2~3문단)
  issues: string[];       // 보완요청 내용(없으면 빈 배열 = 문제없음)
}

export function emptyMeeting(groupName = ""): Meeting {
  return { groupName, agenda: "", agendaShort: "", date: "", weekday: "", datetime: "", place: "", expenseVendor: "", attendees: [], content: "", issues: [] };
}

export function normalizeMeeting(v: unknown, groupName: string): Meeting {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const arr = (x: unknown): string[] => Array.isArray(x) ? x.map((s) => String(s || "").trim()).filter(Boolean) : [];
  return {
    groupName,
    agenda: String(o.agenda || "").trim(),
    agendaShort: String(o.agendaShort || "").trim(),
    date: String(o.date || "").trim(),
    weekday: String(o.weekday || "").trim(),
    datetime: String(o.datetime || "").trim(),
    place: String(o.place || "").trim(),
    expenseVendor: String(o.expenseVendor || "").trim(),
    attendees: arr(o.attendees),
    content: String(o.content || "").trim(),
    issues: arr(o.issues),
  };
}

// 파일명: [yyyy-mm-dd(aaa) '회의안건'] — 안건 10자 이상이면 요약본 사용
export function minutesFileBase(m: Meeting): string {
  const short = (m.agendaShort && m.agendaShort.length <= 12 ? m.agendaShort : "") || (m.agenda.length > 10 ? m.agenda.slice(0, 10) : m.agenda) || "회의";
  const datePart = m.date || "날짜미상";
  const wd = m.weekday ? `(${m.weekday})` : "";
  // 파일명 사용 불가 문자 제거
  const safe = `[${datePart}${wd} ${short}]`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return safe;
}

const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// WordprocessingML 문단(굵게/가운데 옵션)
function para(text: string, opts: { bold?: boolean; size?: number; align?: string } = {}): string {
  const rpr = `${opts.bold ? "<w:b/>" : ""}${opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : ""}`;
  const ppr = opts.align ? `<w:pPr><w:jc w:val="${opts.align}"/></w:pPr>` : "";
  const runs = String(text || "").split("\n").map((line, i) =>
    `${i > 0 ? '<w:r><w:br/></w:r>' : ""}<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${esc(line)}</w:t></w:r>`).join("");
  return `<w:p>${ppr}${runs || '<w:r><w:t/></w:r>'}</w:p>`;
}

// 라벨/값 2열 표의 한 행
function tableRow(label: string, value: string): string {
  const cell = (w: number, content: string, shade?: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shade ? `<w:shd w:val="clear" w:fill="${shade}"/>` : ""}<w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`;
  return `<w:tr>${cell(1900, para(label, { bold: true }), "F2F2F2")}${cell(7100, para(value))}</w:tr>`;
}

// 회의록 DOCX 생성 (한글/워드 모두 열림).
export async function buildMinutesDocx(m: Meeting): Promise<Uint8Array> {
  const attendees = m.attendees.length ? m.attendees.join(", ") : "";
  const body = [
    para("회 의 록", { bold: true, size: 36, align: "center" }),
    para(""),
    `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>` +
    ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="999999"/>`).join("") +
    `</w:tblBorders></w:tblPr>` +
    tableRow("회의안건", m.agenda) +
    tableRow("회의일시", m.datetime) +
    tableRow("회의장소", m.place) +
    tableRow("회의비 사용처", m.expenseVendor) +
    tableRow("참석자", attendees) +
    `</w:tbl>`,
    para(""),
    para("회의내용 및 협의사항", { bold: true, size: 26 }),
    ...String(m.content || "").split(/\n{2,}/).map((p) => para(p.trim())),
  ].join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rels);
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
