// Supabase 호환 목 서버 — 런타임 클릭 테스트용 (auth/GoTrue + PostgREST + Storage 최소 구현)
import http from "node:http";
import crypto from "node:crypto";

const PORT = 54321;
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

// ---------- in-memory DB ----------
const db = {
  student_profiles: [],
  applications: [],
  programs: [],
  virtual_students: [],
  site_content: [],
  app_config: [],
};
const users = new Map(); // id -> user
const tokens = new Map(); // access_token -> user id

// ---------- seed ----------
const FUND_SCHEMA = {
  steps: [
    { id: "st1", title: "기본 정보", fields: [{ id: "f-info", type: "applicantInfo", label: "기본 정보", required: true }] },
    { id: "st2", title: "활동 내용", fields: [{ id: "f-desc", type: "longText", label: "활동 내용", required: true, minLen: 5, placeholder: "활동 내용을 입력하세요" }] },
    { id: "st3", title: "동의·계좌·서명", fields: [
      { id: "f-priv", type: "privacyConsent", label: "개인정보 동의", required: true },
      { id: "f-acct", type: "account", label: "계좌 정보", required: true },
      { id: "f-sign", type: "signature", label: "신청인 서명", required: true },
    ] },
  ],
};
const PRE_SCHEMA = {
  steps: [
    { id: "p1", title: "기본 정보", fields: [{ id: "p-info", type: "applicantInfo", label: "기본 정보", required: true }] },
    { id: "p2", title: "지원 동기", fields: [
      { id: "p-desc", type: "longText", label: "지원 동기", required: true, minLen: 5 },
      { id: "p-priv", type: "privacyConsent", label: "개인정보 동의", required: true },
    ] },
  ],
};
db.programs.push({
  id: "prog-test", category: "innovation", name: "디지털 혁신 캠프", program_type: "program",
  roles: ["참여 학생"], report_fields: [], pre_report_fields: [],
  apply_start: "2000-01-01", apply_end: "2099-12-31", pre_apply: true,
  pre_apply_start: "2000-01-01", pre_apply_end: "2099-12-31",
  enabled: true, enabled_pre: true, enabled_fund: true,
  audience: "anyone", audience_pre: "anyone", audience_fund: "anyone",
  note: "", created_at: now(),
});
db.app_config.push(
  { key: "admin_accounts", value: {
    expense: { loginId: "20182135", password: "Admin!Test2026" },
    accounts: [{ loginId: "pm-test", password: "Pm!Test2026", name: "김프로", programIds: ["prog-test"], menus: [] }],
  }, updated_at: now() },
  { key: "program_forms", value: { "prog-test": { pre: PRE_SCHEMA, fund: FUND_SCHEMA } }, updated_at: now() },
  { key: "space_rental_spaces", value: [{ id: "sp1", name: "테스트 세미나실 101호", capacity: 8, photos: [] }], updated_at: now() },
  { key: "space_rental_config", value: {}, updated_at: now() },
);

// ---------- helpers ----------
function json(res, code, body, headers = {}) {
  const s = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    "access-control-expose-headers": "*",
    ...headers,
  });
  res.end(s);
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
function b64url(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
function makeToken(u) {
  const t = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: u.id, email: u.email, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}.mocksig`;
  tokens.set(t, u.id);
  return t;
}
function userJson(u) {
  return {
    id: u.id, aud: "authenticated", role: "authenticated", email: u.email,
    email_confirmed_at: u.created_at, phone: "", confirmed_at: u.created_at,
    last_sign_in_at: now(), app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.user_metadata || {}, identities: [], created_at: u.created_at, updated_at: now(),
  };
}
function bearerUser(req) {
  const h = req.headers.authorization || "";
  const t = h.replace(/^Bearer\s+/i, "");
  const id = tokens.get(t);
  return id ? users.get(id) : null;
}
// 접수번호: YYYY-NNN (연도 내 최대+1)
function nextReceipt() {
  const y = new Date().getFullYear().toString();
  let max = 0;
  for (const r of db.applications) {
    const rn = String(r.receipt_number || "");
    if (rn.startsWith(y + "-")) max = Math.max(max, parseInt(rn.split("-")[1], 10) || 0);
  }
  return `${y}-${String(max + 1).padStart(3, "0")}`;
}

// ---------- PostgREST ----------
function parseFilters(sp) {
  const filters = [];
  let order = null, limit = null;
  for (const [k, v] of sp.entries()) {
    if (k === "select" || k === "on_conflict" || k === "columns") continue;
    if (k === "order") { order = v; continue; }
    if (k === "limit") { limit = parseInt(v, 10); continue; }
    if (k === "offset") continue;
    const m = /^(eq|neq|in|is|gte|lte|gt|lt|like|ilike)\.(.*)$/s.exec(v);
    if (m) filters.push({ col: k, op: m[1], val: m[2] });
  }
  return { filters, order, limit };
}
function matchRow(row, f) {
  const cell = row[f.col];
  switch (f.op) {
    case "eq": return String(cell) === f.val || cell === (f.val === "true" ? true : f.val === "false" ? false : f.val);
    case "neq": return !(String(cell) === f.val);
    case "is": return f.val === "null" ? cell == null : String(cell) === f.val;
    case "in": {
      const list = f.val.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      return list.includes(String(cell));
    }
    case "gte": return String(cell) >= f.val;
    case "lte": return String(cell) <= f.val;
    case "gt": return String(cell) > f.val;
    case "lt": return String(cell) < f.val;
    default: return true;
  }
}
async function handleRest(req, res, table, sp) {
  if (!(table in db)) return json(res, 404, { code: "PGRST205", message: `Could not find the table '${table}'` });
  const rows = db[table];
  const { filters, order, limit } = parseFilters(sp);
  const wantObject = String(req.headers.accept || "").includes("vnd.pgrst.object");
  const prefer = String(req.headers.prefer || "");
  const returnRep = prefer.includes("return=representation") || sp.has("select");

  const pick = () => {
    let out = rows.filter((r) => filters.every((f) => matchRow(r, f)));
    if (order) {
      const [col, ...mods] = order.split(".");
      const desc = mods.includes("desc");
      out = [...out].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (desc ? -1 : 1));
    }
    if (limit) out = out.slice(0, limit);
    return out;
  };
  const respond = (out, code = 200) => {
    if (wantObject) {
      if (out.length === 1) return json(res, code, out[0]);
      return json(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `Results contain ${out.length} rows`, hint: null });
    }
    return json(res, code, out);
  };

  if (req.method === "GET" || req.method === "HEAD") return respond(pick());

  if (req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "null");
    const list = Array.isArray(body) ? body : [body];
    const upsert = prefer.includes("resolution=merge-duplicates");
    const conflictKey = sp.get("on_conflict") || (table === "app_config" ? "key" : "id");
    const inserted = [];
    for (const item of list) {
      let row = null;
      if (upsert) row = rows.find((r) => String(r[conflictKey]) === String(item[conflictKey]));
      if (row) Object.assign(row, item, { updated_at: now() });
      else {
        row = { ...item };
        if (!("id" in row) && table !== "app_config" && table !== "virtual_students" && table !== "site_content") row.id = uuid();
        if (!row.created_at) row.created_at = now();
        row.updated_at = now();
        if (table === "applications" && !row.receipt_number) row.receipt_number = nextReceipt();
        rows.push(row);
      }
      inserted.push(row);
    }
    if (!returnRep) return json(res, 201, undefined);
    return respond(inserted, 201);
  }

  if (req.method === "PATCH") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const out = pick();
    for (const r of out) Object.assign(r, body, { updated_at: now() });
    if (!returnRep) return json(res, 204, undefined);
    return respond(out);
  }

  if (req.method === "DELETE") {
    const out = pick();
    for (const r of out) { const i = rows.indexOf(r); if (i >= 0) rows.splice(i, 1); }
    if (!returnRep) return json(res, 204, undefined);
    return respond(out);
  }
  return json(res, 405, { message: "method not allowed" });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = u.pathname;
  if (req.method === "OPTIONS") return json(res, 204, undefined);

  try {
    // ---- auth ----
    if (p === "/auth/v1/token" && req.method === "POST") {
      const b = JSON.parse((await readBody(req)).toString() || "{}");
      const found = [...users.values()].find((x) => x.email === String(b.email || "").toLowerCase());
      if (!found || found.password !== b.password) {
        return json(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials", error_description: "Invalid login credentials" });
      }
      const t = makeToken(found);
      return json(res, 200, { access_token: t, token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "mock-refresh-" + found.id, user: userJson(found) });
    }
    if (p === "/auth/v1/user" && req.method === "GET") {
      const usr = bearerUser(req);
      if (!usr) return json(res, 401, { code: 401, msg: "invalid JWT" });
      return json(res, 200, userJson(usr));
    }
    if (p === "/auth/v1/logout" && req.method === "POST") return json(res, 204, undefined);

    if (p === "/auth/v1/admin/users" && req.method === "POST") {
      const b = JSON.parse((await readBody(req)).toString() || "{}");
      const email = String(b.email || "").toLowerCase();
      if ([...users.values()].some((x) => x.email === email)) {
        return json(res, 422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
      }
      const usr = { id: uuid(), email, password: b.password, user_metadata: b.user_metadata || {}, created_at: now() };
      users.set(usr.id, usr);
      return json(res, 200, userJson(usr));
    }
    const mAdminUser = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(p);
    if (mAdminUser) {
      const usr = users.get(mAdminUser[1]);
      if (!usr) return json(res, 404, { code: 404, msg: "User not found" });
      if (req.method === "GET") return json(res, 200, userJson(usr));
      if (req.method === "PUT" || req.method === "PATCH") {
        const b = JSON.parse((await readBody(req)).toString() || "{}");
        if (b.password) usr.password = b.password;
        if (b.email) usr.email = String(b.email).toLowerCase();
        if (b.user_metadata) usr.user_metadata = { ...usr.user_metadata, ...b.user_metadata };
        return json(res, 200, userJson(usr));
      }
      if (req.method === "DELETE") { users.delete(usr.id); return json(res, 200, userJson(usr)); }
    }

    // ---- storage ----
    if (p.startsWith("/storage/v1/object/sign/") && req.method === "POST") {
      const path = p.replace("/storage/v1/object/sign/", "");
      await readBody(req);
      return json(res, 200, { signedURL: `/object/sign/${path}?token=mock-signed` });
    }
    if (p.startsWith("/storage/v1/object/") && req.method === "POST") {
      const path = p.replace("/storage/v1/object/", "");
      await readBody(req);
      return json(res, 200, { Key: path, Id: uuid(), path: path.split("/").slice(1).join("/") });
    }
    if (p.startsWith("/storage/v1/object/") && req.method === "DELETE") {
      await readBody(req);
      return json(res, 200, []);
    }
    if (p.startsWith("/storage/v1/")) return json(res, 200, {});

    // ---- rest ----
    const mRest = /^\/rest\/v1\/([^/]+)$/.exec(p);
    if (mRest) return await handleRest(req, res, mRest[1], u.searchParams);

    // 상태 확인용
    if (p === "/__dump") return json(res, 200, { users: [...users.values()].map((x) => x.email), counts: Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length])), applications: db.applications.map((a) => ({ id: a.id, receipt: a.receipt_number, review: a.review_status, pay: a.payment_status, draft: a.is_draft, canceled: a.canceled, stage: a.review_stage })) });

    return json(res, 404, { message: "not found: " + p });
  } catch (e) {
    return json(res, 500, { message: String(e && e.message || e) });
  }
});
server.listen(PORT, "127.0.0.1", () => console.log("mock supabase on :" + PORT));
