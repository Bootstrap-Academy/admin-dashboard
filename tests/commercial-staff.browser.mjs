// Owned dashboard + Chromium. Intercepted APIs plus two explicit loopback denial streams; no DB.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import http from "node:http";
import crypto from "node:crypto";
const stage = process.env.STAFF_UI_STAGE;
assert(stage?.startsWith("/tmp/bootstrap-retention-rpu1-"));
assert.equal(await fs.realpath(stage), stage);
const owner = JSON.parse(await fs.readFile(join(stage, "OWNER.json")));
assert.equal(owner.unit, "L3-retention-family-paging-staff-ui-2");
assert.equal(owner.owner, "/root/learning_source_review");
assert.equal(owner.canonical_root, stage);
const run = await fs.mkdtemp(join(stage, "browser-"));
const profile = join(run, "profile"),
  downloadPath = join(run, "downloads");
await fs.mkdir(profile);
await fs.mkdir(downloadPath);
const app = "http://127.0.0.1:56840",
  api = "http://127.0.0.1:56841";
const records = [],
  errors = [],
  escaped = [],
  groups = [],
  panels = [],
  direct = [],
  expectedDirect = [];
let directNext = 0,
  holdLose = false,
  holdDeny = false,
  holdRecreated = false;
const holdPosts = [],
  determinationPosts = [],
  responses = [];
let determinationLose = false,
  determinationHistory = false,
  determinationDeny = false,
  determinationOriginal = null;
let server,
  chrome,
  fixture,
  ws,
  cdp = "",
  appExit,
  chromeExit,
  held = null,
  holdNext = "",
  ready;
const handles = [];
const result = {
  run,
  records,
  direct,
  errors,
  escaped,
  groups,
  panels,
  responses,
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function free(port) {
  await new Promise((resolve, reject) => {
    const s = http.createServer();
    s.once("error", reject);
    s.listen(port, "127.0.0.1", () => s.close(resolve));
  });
}
async function tree(path, prefix = "") {
  const map = {};
  for (const entry of (await fs.readdir(path, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const name = prefix + entry.name,
      file = join(path, entry.name);
    if (entry.isDirectory()) Object.assign(map, await tree(file, name + "/"));
    else if (entry.isFile()) {
      const b = await fs.readFile(file);
      map[name] = {
        sha256: crypto.createHash("sha256").update(b).digest("hex"),
        bytes: b.length,
      };
      const objects = join(stage, "evidence/runtime-inputs");
      await fs.mkdir(objects, { recursive: true });
      await fs.writeFile(join(objects, map[name].sha256), b);
    }
  }
  return map;
}
function child(command, args, env, log) {
  const p = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let text = "";
  p.stdout.on("data", (b) => (text += b));
  p.stderr.on("data", (b) => (text += b));
  handles.push({ p, log, text: () => text });
  return p;
}
const U = "11000000-0000-4000-8000-000000000001",
  V = "11000000-0000-4000-8000-000000000002",
  S = "22000000-0000-4000-8000-000000000001",
  C = "33000000-0000-4000-8000-000000000001",
  D = "33000000-0000-4000-8000-000000000002",
  O = "44000000-0000-4000-8000-000000000001";
const when = "2026-09-10T12:00:00Z";
const retentionFamilies = [
  "statements",
  "archives",
  "retained_owner_associations",
  "invoice_identity_reviews",
  "unqualified_invoice_owner_observations",
];
const retentionAt = "2026-09-11 00:00:00.123456+00";
function retentionRow(family, n = 0) {
  const number = `literal/${n}`;
  if (family === "statements")
    return {
      number,
      review_due_at: retentionAt,
      authorized: false,
      assessment_json: null,
      historical_staff_assertion: null,
      issued_at: retentionAt,
    };
  if (family === "archives")
    return {
      number,
      kind: "invoice",
      source: "record_disposal",
      recorded_at: retentionAt,
      review_due_at: retentionAt,
      disposal_authorized: false,
      assessment_json: "null",
      disposal_started_at: retentionAt,
      file_removed_at: null,
    };
  if (family === "retained_owner_associations")
    return {
      number,
      kind: "",
      subject: U,
      observed_at: retentionAt,
      review_due_at: retentionAt,
      source: "  literal source  ",
    };
  if (family === "invoice_identity_reviews")
    return {
      number,
      reason: "",
      source_key: '|/"ä',
      observed_at: retentionAt,
      disposition: "pending_review",
      evidence_json:
        '{"n":900719925474099312345678901234567890,"text":"<img src=x onerror=alert(1)>"}',
    };
  if (family === "unqualified_invoice_owner_observations")
    return {
      number,
      subject: U,
      basis: "",
      evidence_hash: "not a hash /|",
      evidence_json: "null",
      qualified: false,
      observed_at: retentionAt,
    };
  throw Error("bad test family");
}
const retentionKeys = {
  statements: ["number"],
  archives: ["number", "kind"],
  retained_owner_associations: ["number", "kind", "subject"],
  invoice_identity_reviews: ["number", "reason", "source_key"],
  unqualified_invoice_owner_observations: [
    "number",
    "subject",
    "basis",
    "evidence_hash",
  ],
};
function retentionAfter(family, row) {
  return {
    at: row.review_due_at ?? row.observed_at,
    ...Object.fromEntries(retentionKeys[family].map((key) => [key, row[key]])),
  };
}
function retentionResult(
  family = "statements",
  size = 1,
  exhausted = true,
  offset = 0,
) {
  const rows = Array.from({ length: size }, (_, n) =>
    retentionRow(family, n + offset),
  );
  return {
    protocol: 1,
    family,
    limit: 100,
    observed_at: retentionAt,
    semantics: "live_queue",
    rows,
    next_cursor: exhausted
      ? null
      : { protocol: 1, family, after: retentionAfter(family, rows.at(-1)) },
    exhausted,
  };
}

let retentionMode = "",
  retentionHeld = null,
  capacityDeny = 0;

const token = (marker) =>
  `e30.${Buffer.from(JSON.stringify({ uid: U, sid: S, exp: 2147483647 })).toString("base64url")}.${marker}`;
const user = {
  id: U,
  name: "Synthetic Admin",
  display_name: "Synthetic Admin",
  email: "staff@example.invalid",
  admin: true,
  enabled: true,
  email_verified: true,
};
const session = { id: S, user_id: U, mfa_verified: true };
const row = (id = C, subject = U) => ({
  id,
  subject,
  erased_at: null,
  closed_at: null,
  assigned_to: null,
  inventory: { backend: "pending" },
  review_reason: "SYNTHETIC ORIGINAL EVIDENCE",
  due_at: when,
  review_due_at: when,
});
const capacity = (id, subject) => ({
  protocol: 1,
  case_id: id,
  subject,
  observed_at: when,
  currency: "EUR",
  units_per_eur: 100,
  coin_policy: "fungible_reward_first",
  captured_purchase_units: "9007199254740993",
  captured_basis: {
    kind: "live_original_claimant_capture_records",
    live_captured_record_count: "1",
    evidence_id: null,
    recorded_at: null,
  },
  historic_prior_refund_status: "unknown",
  historic_prior_refund_units: null,
  historic_prior_refund_review: null,
  known_reserved_purchase_capacity_units: "0",
  known_uncertain_purchase_capacity_units: "0",
  known_recorded_completed_purchase_capacity_units: "0",
  unknown_reservation_capacity_count: "0",
  remaining_purchase_capacity: null,
  obligations: [
    {
      id: O,
      source: "events",
      source_key: "original",
      component: "service",
      status: "pending_evidence",
      units: null,
      cash_units: null,
      remaining_units: null,
      remaining_cash_units: null,
      counted_reservation_units: "0",
      counted_cash_reservation_units: "0",
    },
  ],
  reservations: [],
});
let sequence = 0;
const pending = new Map();
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function ev(expression) {
  const r = await cmd("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression, timeout = 20000) {
  const end = Date.now() + timeout;
  while (!(await ev(`Boolean(${expression})`))) {
    assert(Date.now() < end, expression);
    await delay(50);
  }
}
async function click(selector) {
  await until(`document.querySelector(${JSON.stringify(selector)})`);
  await ev(
    `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`,
  );
  let previous, box;
  const end = Date.now() + 20000;
  while (true) {
    box = await ev(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {...r.toJSON(),hit:r.width>0&&r.height>0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})()`,
    );
    if (
      box.hit &&
      previous &&
      ["x", "y", "width", "height"].every(
        (k) => Math.abs(box[k] - previous[k]) < 0.1,
      )
    )
      break;
    assert(Date.now() < end, "stable pointer target " + selector);
    previous = box;
    await delay(100);
  }
  for (const type of ["mousePressed", "mouseReleased"])
    await cmd("Input.dispatchMouseEvent", {
      type,
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      button: "left",
      clickCount: 1,
    });
  await delay(70);
}
async function input(selector, value) {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await delay(60);
}
async function fulfill(
  requestId,
  data,
  status = 200,
  mime = "application/json",
) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  const raw = Buffer.from(body),
    sha256 = crypto.createHash("sha256").update(raw).digest("hex");
  await fs.mkdir(join(stage, "evidence/response-inputs"), { recursive: true });
  await fs.writeFile(join(stage, "evidence/response-inputs", sha256), raw);
  responses.push({ requestId, status, mime, sha256, bytes: raw.length });
  await cmd("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: mime },
      { name: "Access-Control-Allow-Origin", value: "*" },
      {
        name: "Access-Control-Allow-Headers",
        value: "Authorization, Content-Type",
      },
      { name: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
    ],
    body: Buffer.from(body).toString("base64"),
  });
}
async function intercept({ request, requestId }) {
  const url = new URL(request.url);
  if (url.origin === app) return cmd("Fetch.continueRequest", { requestId });
  if (url.protocol === "data:" || url.protocol === "blob:")
    return cmd("Fetch.continueRequest", { requestId });
  if (url.origin !== api) {
    errors.push({ externalAttempt: url.href });
    return cmd("Fetch.failRequest", {
      requestId,
      errorReason: "BlockedByClient",
    });
  }
  if (
    directNext &&
    request.method === "GET" &&
    url.pathname ===
      `/shop/claims/admin/cases/${C}/documents/invoice/10000000/original`
  ) {
    const authorization =
      request.headers.Authorization || request.headers.authorization;
    assert(
      [`Bearer ${token("a")}`, `Bearer ${token("b")}`].includes(authorization),
    );
    expectedDirect.push({
      method: "GET",
      path: url.pathname,
      status: directNext,
      authorization,
    });
    directNext = 0;
    return cmd("Fetch.continueRequest", { requestId });
  }
  const body = request.postData ? JSON.parse(request.postData) : null;
  records.push({
    requestId,
    raw: url.pathname === "/auth/sessions" ? null : (request.postData ?? null),
    method: request.method,
    path: url.pathname,
    body:
      url.pathname === "/auth/sessions"
        ? { syntheticLogin: true, mfa: !!body?.mfa_code }
        : body,
  });
  if (request.method === "OPTIONS") return fulfill(requestId, "", 204);
  if (url.pathname === "/auth/oauth/providers" && request.method === "GET")
    return fulfill(requestId, []);
  if (url.pathname === `/auth/users/${U}` && request.method === "GET")
    return fulfill(requestId, user);
  if (url.pathname === "/auth/sessions" && request.method === "POST") {
    assert.equal(body.name_or_email, "staff@example.invalid");
    assert.equal(body.password, "synthetic-password");
    if (!body.mfa_code)
      return fulfill(requestId, { detail: "invalid code" }, 401);
    assert.equal(body.mfa_code, "123456");
    return fulfill(requestId, {
      user,
      session,
      access_token: token("a"),
      refresh_token: "synthetic-refresh",
    });
  }
  assert(
    [token("a"), token("b")].includes(
      (
        request.headers.Authorization ||
        request.headers.authorization ||
        ""
      ).replace("Bearer ", ""),
    ),
    "captured fixture proof",
  );
  if (
    url.pathname === "/shop/claims/admin/retention_page" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body).sort(), ["cursor", "family", "limit"]);
    assert(retentionFamilies.includes(body.family));
    assert.equal(body.limit, 100);
    if (body.cursor)
      assert.deepEqual(
        body.cursor,
        retentionResult(body.family, 100, false).next_cursor,
      );
    const mode = retentionMode;
    retentionMode = "";
    if (mode === "hold") {
      retentionHeld = { requestId, body };
      return;
    }
    if (mode === "denial") return fulfill(requestId, {}, 401);
    if (mode === "malformed") return fulfill(requestId, { rows: [] });
    if (mode === "empty")
      return fulfill(requestId, retentionResult(body.family, 0));
    return fulfill(
      requestId,
      retentionResult(
        body.family,
        body.cursor ? 1 : 100,
        !!body.cursor,
        body.cursor ? 100 : 0,
      ),
    );
  }
  if (
    url.pathname === "/shop/claims/admin/determination_status" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body).sort(), [
      "case_id",
      "command_id",
      "obligation_id",
      "subject",
    ]);
    assert.equal(body.case_id, C);
    assert.equal(body.subject, U);
    assert.equal(body.obligation_id, O);
    if (determinationDeny) {
      determinationDeny = false;
      return fulfill(requestId, {}, 401);
    }
    const current = {
      protocol: 1,
      case_id: C,
      subject: U,
      observed_at: "2026-09-11 12:00:00.123456+00",
      obligation: {
        id: O,
        source: "backend",
        source_key: "SYNTHETIC-ORIGINAL",
        component: "",
        status: "pending_evidence",
        units: null,
        cash_units: null,
        original_json: "9007199254740993",
        determination_json: null,
      },
      journal: null,
    };
    if (body.command_id !== null) {
      assert(determinationOriginal);
      assert.equal(
        body.command_id,
        JSON.parse(determinationOriginal).command_id,
      );
      if (determinationHistory) {
        current.obligation.status = "rejected";
        current.obligation.units = "2";
        current.obligation.determination_json = '{"later":"synthetic"}';
        current.journal = {
          id: "-9223372036854775808",
          case_id: C,
          obligation_id: O,
          actor: U,
          command_id: body.command_id,
          kind: "determine",
          request_json: JSON.stringify(
            Object.fromEntries(
              Object.entries(JSON.parse(determinationOriginal)).reverse(),
            ),
          ),
          result_json: JSON.stringify({
            obligation_id: O,
            status: "established",
            paid: false,
          }),
          recorded_at: "infinity",
        };
      }
    }
    return fulfill(requestId, current);
  }
  if (
    url.pathname === "/shop/claims/admin/determine" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body).sort(), [
      "assessment",
      "case_id",
      "cash_units",
      "command_id",
      "evidence",
      "expected_obligation",
      "obligation_id",
      "subject",
      "units",
    ]);
    assert.equal(body.case_id, C);
    assert.equal(body.subject, U);
    assert.equal(body.obligation_id, O);
    assert.equal(body.units, "9007199254740993");
    assert.equal(body.cash_units, null);
    assert.deepEqual(body.expected_obligation, {
      status: "pending_evidence",
      units: null,
      cash_units: null,
      determination_json: null,
    });
    determinationPosts.push({
      raw: request.postData,
      body,
      authorization:
        request.headers.Authorization || request.headers.authorization,
    });
    if (determinationOriginal !== null)
      assert.equal(request.postData, determinationOriginal);
    else determinationOriginal = request.postData;
    const stored = await ev(
      `JSON.parse(localStorage.getItem('bootstrap.staff-determination.v1.'+${JSON.stringify(body.command_id)}))`,
    );
    assert(stored.uncertain);
    assert.equal(stored.body_json, request.postData);
    assert.equal(stored.actor, U);
    if (determinationLose) {
      determinationLose = false;
      return cmd("Fetch.failRequest", {
        requestId,
        errorReason: "ConnectionClosed",
      });
    }
    return fulfill(requestId, {
      obligation_id: O,
      status: "established",
      paid: false,
    });
  }
  if (
    url.pathname === "/shop/claims/admin/hold_queue" &&
    request.method === "POST"
  ) {
    assert.deepEqual(body, { version: 1, limit: 100, cursor: null });
    if (holdDeny) {
      holdDeny = false;
      return fulfill(requestId, {}, 401);
    }
    const h = {
      case_id: C,
      subject: O,
      hold: { kind: "financial_document", record_id: " R10000000\n" },
      incarnation_id: holdRecreated
        ? D
        : "55000000-0000-4000-8000-000000000001",
      review_version: "0",
      review_due_at: holdRecreated ? "2031-01-01 00:00:00+00" : "infinity",
      basis: "Synthetic entire original hold basis <script>plain text</script>",
      last_review: null,
    };
    return fulfill(requestId, {
      version: 1,
      queue: "four_existing_hold_families",
      mode: "live",
      observed_at: "2026-09-11 12:00:00+00",
      rows: [h],
      next_cursor: null,
      exhausted: true,
    });
  }
  if (
    url.pathname === "/shop/claims/admin/hold_review" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body).sort(), [
      "assessment",
      "case_id",
      "command_id",
      "decision",
      "expected",
      "hold",
      "next_review_at",
      "review_scope",
      "subject",
      "version",
    ]);
    assert.equal(body.case_id, C);
    assert.equal(body.subject, O);
    assert.equal(body.decision, "keep");
    assert.equal(body.review_scope, "entire_existing_hold");
    assert.equal(body.hold.record_id, " R10000000\n");
    assert.equal(body.expected.review_version, "0");
    assert.equal(body.next_review_at, "2030-10-10T10:30:00.123456+01:30");
    holdPosts.push({
      raw: request.postData,
      body,
      authorization:
        request.headers.Authorization || request.headers.authorization,
    });
    if (holdLose) {
      holdLose = false;
      return cmd("Fetch.failRequest", {
        requestId,
        errorReason: "ConnectionClosed",
      });
    }
    return fulfill(requestId, {
      version: 1,
      command_id: body.command_id,
      case_id: C,
      subject: O,
      hold: body.hold,
      incarnation_id: body.expected.incarnation_id,
      previous_review_version: "0",
      review_version: "1",
      previous_review_due_at: "infinity",
      next_review_at: "2030-10-10 09:00:00.123456+00",
      recorded_at: "2026-09-11 12:00:00+00",
      status: "review_recorded",
      hold_kept: true,
      record_deleted: false,
      claims_satisfied: false,
    });
  }
  if (
    url.pathname === "/shop/claims/admin/queue" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body), ["offset"]);
    return fulfill(requestId, body.offset === 0 ? [row(), row(D, V)] : []);
  }
  if (
    url.pathname === "/shop/claims/admin/detail" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body), ["subject"]);
    assert([U, V].includes(body.subject));
    if (holdNext === "detail") {
      holdNext = "";
      held = { requestId, kind: "detail" };
      return;
    }
    return fulfill(
      requestId,
      `{"case":${JSON.stringify(body.subject === U ? row() : row(D, V))},"original_units":9007199254740993,"evidence":"<script>escaped synthetic text</script>"}`,
    );
  }
  if (
    url.pathname === "/shop/claims/admin/cash_capacity" &&
    request.method === "POST"
  ) {
    assert.deepEqual(Object.keys(body).sort(), ["case_id", "subject"]);
    assert(
      (body.case_id === C && body.subject === U) ||
        (body.case_id === D && body.subject === V),
    );
    if (capacityDeny) {
      const status = capacityDeny;
      capacityDeny = 0;
      return fulfill(requestId, {}, status);
    }
    return fulfill(requestId, capacity(body.case_id, body.subject));
  }
  if (
    url.pathname ===
      `/shop/claims/admin/cases/${C}/documents/invoice/10000000/original` &&
    request.method === "GET"
  ) {
    if (holdNext === "document") {
      holdNext = "";
      held = { requestId, kind: "document" };
      return;
    }
    return fulfill(
      requestId,
      "%PDF-1.4\nSYNTHETIC ORIGINAL BYTES\n",
      200,
      "application/pdf",
    );
  }
  if (
    url.pathname ===
      `/shop/claims/admin/cases/${C}/documents/purchase/${O}/confirmation` &&
    request.method === "GET"
  )
    return fulfill(
      requestId,
      "SYNTHETIC ORIGINAL CONFIRMATION\n",
      200,
      "text/plain; charset=utf-8",
    );
  errors.push({ unexpected: url.pathname, method: request.method });
  return fulfill(requestId, {}, 599);
}
async function panel(name, selector) {
  await ev(
    `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`,
  );
  await delay(80);
  const sample = await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.focus();const measured=e.querySelector('.label')||e,s=getComputedStyle(measured);let p=measured,bg='rgba(0, 0, 0, 0)';while(p&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(p).backgroundColor;p=p.parentElement;}return {foreground:s.color,background:bg,outline:s.outlineWidth,focused:document.activeElement===e,disabled:e.disabled||false,text:e.innerText||e.value};})()`,
  );
  const luminance = (color) => {
    const rgb = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((x) => {
        x /= 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(sample.foreground),
    b = luminance(sample.background);
  sample.contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert(sample.contrast >= 4.5, JSON.stringify(sample));
  if (!sample.disabled) assert(sample.focused);
  panels.push({ name, selector, ...sample });
  const shot = await cmd("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    join(run, name + ".png"),
    Buffer.from(shot.data, "base64"),
  );
}
async function holdJourney(language) {
  holdRecreated = false;
  await click('a[href="/dashboard/commercial"]');
  await until(`document.querySelector('[data-hold-review]')`);
  await ev(
    `Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-hold-review.v1.')).forEach(k=>localStorage.removeItem(k))`,
  );
  const from = holdPosts.length;
  assert(await ev(`document.querySelector('[data-hold-next]').disabled`));
  await panel(language + "-hold-head", "[data-hold-head]");
  await click("[data-hold-head]");
  await until(`document.querySelector('[data-hold-row]')`);
  await click("[data-hold-row]");
  await until(`document.querySelector('[data-hold-selected]')`);
  assert(
    await ev(
      `document.querySelector('[data-hold-selected]').textContent.includes('<script>plain text</script>')`,
    ),
  );
  await input(
    "[data-hold-assessment]",
    "  Synthetic human assessment covering the entire existing hold.  ",
  );
  await input("[data-hold-date]", "2030-10-10T10:30:00.123456+01:30");
  await click("[data-hold-scope]");
  for (const type of ["keyDown", "keyUp"])
    await cmd("Input.dispatchKeyEvent", {
      type,
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
  const keyboard = await ev(
    `(()=>{const e=document.querySelector('[data-hold-prepare]'),s=getComputedStyle(e);return {active:document.activeElement===e,visible:e.matches(':focus-visible'),outline:s.outlineWidth,style:s.outlineStyle};})()`,
  );
  assert(keyboard.active && keyboard.visible);
  assert.equal(keyboard.outline, "3px");
  assert.equal(keyboard.style, "solid");
  result[language + "HoldKeyboard"] = keyboard;
  await panel(language + "-hold-date", "[data-hold-date]");
  await panel(language + "-hold-save", "[data-hold-prepare]");
  await click("[data-hold-prepare]");
  await until(`document.querySelector('[data-hold-command]')`);
  const original = await ev(
    `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('bootstrap.staff-hold-review.v1.'))))`,
  );
  assert.equal(original.uncertain, false);
  assert.equal(original.actor, U);
  assert.equal(holdPosts.length, from);
  await click("[data-hold-export]");
  const filename =
    "hold-review-" + JSON.parse(original.body_json).command_id + ".json";
  for (let n = 0; ; n++) {
    try {
      await fs.access(join(downloadPath, filename));
      break;
    } catch {
      assert(n < 200);
      await delay(30);
    }
  }
  const recovery = join(run, "hold-original-" + language + ".json");
  await fs.copyFile(join(downloadPath, filename), recovery);
  await fs.unlink(join(downloadPath, filename));
  assert.equal(
    JSON.parse(await fs.readFile(recovery, "utf8")).body_json,
    original.body_json,
  );
  holdLose = true;
  await click("[data-hold-send]");
  await until(
    `document.querySelector('[data-hold-error]')&&!document.querySelector('[data-hold-send]').disabled`,
  );
  assert(!(await ev(`!!document.querySelector('[data-hold-receipt]')`)));
  const lost = await ev(
    `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('bootstrap.staff-hold-review.v1.'))))`,
  );
  assert(lost.uncertain);
  assert.equal(lost.body_json, original.body_json);
  await click('a[href="/dashboard"]');
  await until(`!document.querySelector('[data-commercial]')`);
  await ev(
    `Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-hold-review.v1.')).forEach(k=>localStorage.removeItem(k))`,
  );
  await click('a[href="/dashboard/commercial"]');
  await until(`document.querySelector('[data-hold-import]')`);
  const doc = await cmd("DOM.getDocument"),
    file = await cmd("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "[data-hold-import]",
    });
  const older = structuredClone(original),
    olderBody = JSON.parse(older.body_json);
  olderBody.command_id = "77000000-0000-4000-8000-000000000001";
  older.body_json = JSON.stringify(olderBody);
  const olderFile = join(run, "hf1-held-" + language + ".json");
  await fs.writeFile(olderFile, JSON.stringify(older));
  await ev(
    `(()=>{const original=File.prototype.text;window.__hf1OriginalText=original;File.prototype.text=function(...args){if(!this.name.startsWith('hf1-held-'))return original.apply(this,args);return original.apply(this,args).then(raw=>new Promise(resolve=>{window.__hf1File={ready:true,finish:()=>resolve(raw)};}));};})()`,
  );
  await cmd("DOM.setFileInputFiles", {
    nodeId: file.nodeId,
    files: [olderFile],
  });
  await until(`window.__hf1File?.ready`);
  assert(!(await ev(`!!document.querySelector('[data-hold-command]')`)));
  await cmd("DOM.setFileInputFiles", {
    nodeId: file.nodeId,
    files: [recovery],
  });
  await until(`document.querySelector('[data-hold-command]')`);
  const beforeLate = await ev(
    `({body:document.querySelector('[data-hold-body]').textContent,records:Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-hold-review.v1.')).map(k=>[k,localStorage.getItem(k)])})`,
  );
  await ev(`__hf1File.finish();File.prototype.text=__hf1OriginalText`);
  await delay(80);
  const afterLate = await ev(
    `({body:document.querySelector('[data-hold-body]').textContent,records:Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-hold-review.v1.')).map(k=>[k,localStorage.getItem(k)])})`,
  );
  assert.deepEqual(afterLate, beforeLate);
  assert.equal(afterLate.records.length, 1);
  assert.equal(afterLate.body, original.body_json);
  result[language + "HF1Import"] = {
    olderCommand: olderBody.command_id,
    selectedCommand: JSON.parse(original.body_json).command_id,
    beforeLate,
    afterLate,
    note: "Actual component File.text await uses a deliberately deferred browser File.text result; no older import persisted or selected, then explicit original retry proceeds.",
  };
  assert(!(await ev(`!!document.querySelector('[data-hold-queue]')`)));
  const imported = await ev(
    `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('bootstrap.staff-hold-review.v1.'))))`,
  );
  assert(imported.uncertain);
  assert.equal(imported.body_json, original.body_json);
  await panel(language + "-hold-retry", "[data-hold-send]");
  await click("[data-hold-send]");
  await until(`document.querySelector('[data-hold-receipt]')`);
  assert(!(await ev(`!!document.querySelector('[data-hold-queue]')`)));
  assert.equal(holdPosts.length, from + 2);
  assert(holdPosts.slice(from).every((p) => p.raw === original.body_json));
  holdRecreated = true;
  await click("[data-hold-head]");
  await until(`document.querySelector('[data-hold-row]')`);
  await click("[data-hold-row]");
  assert(
    await ev(
      `document.querySelector('[data-hold-selected]').textContent.includes(${JSON.stringify(D)})`,
    ),
  );
  assert(
    await ev(
      `document.querySelector('[data-hold-receipt]').textContent.includes('2030-10-10 09:00:00.123456+00')`,
    ),
  );
  await click("[data-load-queue]");
  await until(`document.querySelector('[data-case="${C}"]')`);
  await click(`[data-case="${C}"]`);
  await click("[data-load-detail]");
  await until(`document.querySelector('[data-detail]')`);
  holdDeny = true;
  await click("[data-hold-head]");
  await until(
    `!document.querySelector('[data-hold-queue]')&&!document.querySelector('[data-selected]')`,
  );
  assert(await ev(`document.cookie.includes('accessToken=')`));
  assert(
    await ev(
      `document.querySelector('[data-hold-command]').textContent.includes(${JSON.stringify(JSON.parse(original.body_json).command_id)})`,
    ),
  );
  result[language + "HoldRecovery"] = {
    original,
    lost,
    imported,
    posts: holdPosts.slice(from),
    saved: await ev(
      `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('bootstrap.staff-hold-review.v1.'))))`,
    ),
  };
  await panel(language + "-hold-preserved", "[data-hold-export]");
  await click('a[href="/dashboard"]');
  await until(`!document.querySelector('[data-commercial]')`);
  groups.push(
    language +
      ": explicit hold save/export, lost reply, fresh-storage older-file import, exact retry without live row, recreated hold/history separation, shared denial",
  );
}
async function determinationJourney(language) {
  determinationLose = false;
  determinationHistory = false;
  determinationOriginal = null;
  const from = determinationPosts.length;
  await click('a[href="/dashboard/commercial"]');
  await until(`document.querySelector('[data-determination]')`);
  await ev(
    `Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-determination.v1.')).forEach(k=>localStorage.removeItem(k))`,
  );
  await click("[data-load-queue]");
  await until(`document.querySelector('[data-case="${C}"]')`);
  await click(`[data-case="${C}"]`);
  await input("[data-determination-obligation]", O);
  await click("[data-determination-status]");
  await until(`document.querySelector('[data-determination-live]')`);
  assert.equal(
    await ev(
      `document.querySelector('[data-determination-original]').textContent`,
    ),
    "9007199254740993",
  );
  await input("[data-determination-units]", "9007199254740993");
  await input(
    "[data-determination-assessment]",
    "  Synthetic operator assessment with exact original evidence.  ",
  );
  await input(
    "[data-determination-summary]",
    "Synthetic original evidence, not a payment.",
  );
  await input("[data-determination-reference-kind]", "original");
  await input("[data-determination-reference]", "SYNTHETIC-ORIGINAL");
  await click("[data-determination-confirm]");
  for (const type of ["keyDown", "keyUp"])
    await cmd("Input.dispatchKeyEvent", {
      type,
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
  const keyboard = await ev(
    `(()=>{const e=document.querySelector('[data-determination-prepare]'),s=getComputedStyle(e);return {active:document.activeElement===e,visible:e.matches(':focus-visible'),outline:s.outlineWidth,style:s.outlineStyle};})()`,
  );
  assert(keyboard.active && keyboard.visible);
  assert.equal(keyboard.outline, "3px");
  result[language + "DeterminationKeyboard"] = keyboard;
  await panel(language + "-determination-units", "[data-determination-units]");
  await panel(
    language + "-determination-prepare",
    "[data-determination-prepare]",
  );
  await click("[data-determination-prepare]");
  await until(`document.querySelector('[data-determination-command]')`);
  const original = await ev(
    `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('bootstrap.staff-determination.v1.'))))`,
  );
  assert.equal(original.uncertain, false);
  assert.equal(original.actor, U);
  assert.equal(determinationPosts.length, from);
  await click("[data-determination-download]");
  const filename = "determination-" + original.command_id + ".json";
  for (let n = 0; ; n++) {
    try {
      await fs.access(join(downloadPath, filename));
      break;
    } catch {
      assert(n < 200);
      await delay(30);
    }
  }
  const recovery = join(run, "determination-original-" + language + ".json");
  await fs.copyFile(join(downloadPath, filename), recovery);
  await fs.unlink(join(downloadPath, filename));
  assert.equal(
    JSON.parse(await fs.readFile(recovery, "utf8")).body_json,
    original.body_json,
  );
  determinationLose = true;
  await click("[data-determination-send]");
  await until(
    `document.querySelector('[data-determination-error]')&&!document.querySelector('[data-determination-send]').disabled`,
  );
  const lost = await ev(
    `JSON.parse(localStorage.getItem('bootstrap.staff-determination.v1.'+${JSON.stringify(original.command_id)}))`,
  );
  assert(lost.uncertain);
  assert.equal(lost.body_json, original.body_json);
  assert(
    !(await ev(`!!document.querySelector('[data-determination-receipt]')`)),
  );
  await click('a[href="/dashboard"]');
  await until(`!document.querySelector('[data-commercial]')`);
  await ev(
    `Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-determination.v1.')).forEach(k=>localStorage.removeItem(k))`,
  );
  await click('a[href="/dashboard/commercial"]');
  await until(`document.querySelector('[data-determination-import]')`);
  const doc = await cmd("DOM.getDocument"),
    file = await cmd("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "[data-determination-import]",
    }),
    older = structuredClone(original),
    oldBody = JSON.parse(older.body_json);
  older.command_id = oldBody.command_id =
    "77000000-0000-4000-8000-000000000003";
  older.body_json = JSON.stringify(oldBody);
  const olderFile = join(run, "determination-held-" + language + ".json");
  await fs.writeFile(olderFile, JSON.stringify(older));
  await ev(
    `(()=>{const original=File.prototype.text;window.__determinationOriginalText=original;File.prototype.text=function(...args){if(!this.name.startsWith('determination-held-'))return original.apply(this,args);return original.apply(this,args).then(raw=>new Promise(resolve=>{window.__determinationFile={ready:true,finish:()=>resolve(raw)};}));};})()`,
  );
  await cmd("DOM.setFileInputFiles", {
    nodeId: file.nodeId,
    files: [olderFile],
  });
  await until(`window.__determinationFile?.ready`);
  await cmd("DOM.setFileInputFiles", {
    nodeId: file.nodeId,
    files: [recovery],
  });
  await until(`document.querySelector('[data-determination-command]')`);
  const beforeLate = await ev(
    `({body:document.querySelector('[data-determination-body]').textContent,records:Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-determination.v1.')).map(k=>[k,localStorage.getItem(k)])})`,
  );
  await ev(
    `__determinationFile.finish();File.prototype.text=__determinationOriginalText`,
  );
  await delay(80);
  const afterLate = await ev(
    `({body:document.querySelector('[data-determination-body]').textContent,records:Object.keys(localStorage).filter(k=>k.startsWith('bootstrap.staff-determination.v1.')).map(k=>[k,localStorage.getItem(k)])})`,
  );
  assert.deepEqual(afterLate, beforeLate);
  assert.equal(afterLate.records.length, 1);
  assert.equal(afterLate.body, original.body_json);
  const imported = JSON.parse(afterLate.records[0][1]);
  assert(imported.uncertain);
  assert.equal(imported.receipts.length, 0);
  assert(!(await ev(`!!document.querySelector('[data-determination-live]')`)));
  await click("[data-determination-reconcile]");
  await until(`document.querySelector('[data-determination-no-journal]')`);
  assert(
    !(await ev(`!!document.querySelector('[data-determination-receipt]')`)),
  );
  await panel(
    language + "-determination-recovery",
    "[data-determination-send]",
  );
  await click("[data-determination-send]");
  await until(`document.querySelector('[data-determination-receipt]')`);
  assert.equal(determinationPosts.length, from + 2);
  assert(
    determinationPosts.slice(from).every((p) => p.raw === original.body_json),
  );
  determinationHistory = true;
  await click("[data-determination-reconcile]");
  await until(
    `document.querySelector('[data-determination-history]')?.textContent.includes('rejected')`,
  );
  assert(await ev(`!!document.querySelector('[data-determination-receipt]')`));
  await click("[data-load-queue]");
  await until(`document.querySelector('[data-case="${C}"]')`);
  await click(`[data-case="${C}"]`);
  await click("[data-load-detail]");
  await until(`document.querySelector('[data-detail]')`);
  await click("[data-hold-head]");
  await until(`document.querySelector('[data-hold-queue]')`);
  determinationDeny = true;
  await click("[data-determination-reconcile]");
  await until(
    `!document.querySelector('[data-detail]')&&!document.querySelector('[data-hold-queue]')`,
  );
  assert(
    !(await ev(`!!document.querySelector('[data-determination-receipt]')`)),
  );
  assert(await ev(`document.cookie.includes('accessToken=')`));
  assert.equal(
    await ev(`document.querySelector('[data-determination-body]').textContent`),
    original.body_json,
  );
  result[language + "Determination"] = {
    original,
    lost,
    imported,
    beforeLate,
    afterLate,
    posts: determinationPosts.slice(from),
    saved: await ev(
      `JSON.parse(localStorage.getItem('bootstrap.staff-determination.v1.'+${JSON.stringify(original.command_id)}))`,
    ),
    note: "Synthetic intercepted status/mutation receipts; no real SQL or payment. Actual built File.text and native Fetch caller; direct denial streams remain separately counted.",
  };
  await panel(
    language + "-determination-preserved",
    "[data-determination-download]",
  );
  await click('a[href="/dashboard"]');
  await until(`!document.querySelector('[data-commercial]')`);
  groups.push(
    language +
      ": determination save/download/lost reply/fresh-storage deferred import/null-history/exact retry/current-history separation/shared denial",
  );
}
async function retentionJourney(language) {
  const from = records.length;
  const savedBefore = await ev(
    `Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))`,
  );
  await click('a[href="/dashboard/commercial"]');
  await until(`document.querySelector('[data-retention-page]')`);
  await delay(100);
  assert.equal(
    records.slice(from).filter((r) => r.path.endsWith("/retention_page"))
      .length,
    0,
  );
  assert(await ev(`document.querySelector('[data-retention-next]').disabled`));
  await panel(language + "-retention-family", "[data-retention-family]");
  for (const family of retentionFamilies) {
    const before = records.length;
    await input("[data-retention-family]", family);
    await delay(30);
    assert.equal(records.length, before);
    await click("[data-retention-first]");
    await until(
      `document.querySelectorAll('[data-retention-row]').length===100`,
    );
    assert.equal(
      await ev(
        `document.querySelector('[data-retention-observed]').textContent`,
      ),
      retentionAt,
    );
    assert(
      !(await ev(`document.querySelector('[data-retention-next]').disabled`)),
    );
    if (family === "invoice_identity_reviews") {
      assert.equal(
        await ev(`document.querySelector('[data-retention-raw]').textContent`),
        retentionRow(family).evidence_json,
      );
      assert(
        !(await ev(`!!document.querySelector('[data-retention-page] img')`)),
      );
    }
    if (
      family === "archives" ||
      family === "unqualified_invoice_owner_observations"
    )
      assert.equal(
        await ev(`document.querySelector('[data-retention-raw]').textContent`),
        "null",
      );
    await panel(language + "-retention-" + family, "[data-retention-next]");
    await click("[data-retention-next]");
    await until(`document.querySelectorAll('[data-retention-row]').length===1`);
    assert(
      await ev(`document.querySelector('[data-retention-next]').disabled`),
    );
    assert.deepEqual(
      records.at(-1).body.cursor,
      retentionResult(family, 100, false).next_cursor,
    );
    await click("[data-retention-restart]");
    await until(
      `document.querySelectorAll('[data-retention-row]').length===100`,
    );
    assert.equal(records.at(-1).body.cursor, null);
  }
  // Malformed success is unavailable, not a fabricated empty/exhausted page.
  retentionMode = "malformed";
  await click("[data-retention-next]");
  await until(`document.querySelector('[data-retention-error]')`);
  assert(
    !(await ev(`!!document.querySelector('[data-retention-observation]')`)),
  );
  retentionMode = "empty";
  await click("[data-retention-restart]");
  await until(`document.querySelector('[data-retention-empty]')`);
  retentionMode = "hold";
  await click("[data-retention-restart]");
  for (let n = 0; !retentionHeld; n++) {
    assert(n < 200);
    await delay(10);
  }
  await input("[data-retention-family]", "statements");
  await input(
    "[data-retention-family]",
    "unqualified_invoice_owner_observations",
  );
  await fulfill(
    retentionHeld.requestId,
    retentionResult(retentionHeld.body.family),
  );
  retentionHeld = null;
  await delay(100);
  assert(
    !(await ev(`!!document.querySelector('[data-retention-observation]')`)),
  );
  // Independent siblings are visibly cached before paging causes a shared denial.
  await click("[data-load-queue]");
  await until(`document.querySelector('[data-case="${C}"]')`);
  await click(`[data-case="${C}"]`);
  await click("[data-load-detail]");
  await click("[data-load-capacity]");
  await click("[data-hold-head]");
  await until(
    `document.querySelector('[data-detail]')&&document.querySelector('[data-capacity]')&&document.querySelector('[data-hold-queue]')`,
  );
  const beforePagingDenial = await ev(
    `({detail:!!document.querySelector('[data-detail]'),capacity:!!document.querySelector('[data-capacity]'),hold:!!document.querySelector('[data-hold-queue]')})`,
  );
  retentionMode = "denial";
  await click("[data-retention-first]");
  await until(
    `!document.querySelector('[data-detail]')&&!document.querySelector('[data-hold-queue]')&&!document.querySelector('[data-selected]')`,
  );
  assert.deepEqual(
    await ev(
      `Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))`,
    ),
    savedBefore,
  );
  await click("[data-load-queue]");
  await until(`document.querySelector('[data-case="${C}"]')`);
  await click(`[data-case="${C}"]`);
  await click("[data-retention-first]");
  await until(`document.querySelectorAll('[data-retention-row]').length===100`);
  const beforeSiblingDenial = await ev(
    `document.querySelectorAll('[data-retention-row]').length`,
  );
  capacityDeny = language === "de" ? 401 : 403;
  await click("[data-load-capacity]");
  await until(`!document.querySelector('[data-retention-observation]')`);
  assert(await ev(`document.cookie.includes('accessToken=')`));
  assert.deepEqual(
    await ev(
      `Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))`,
    ),
    savedBefore,
  );
  await panel(language + "-retention-denial", "[data-retention-first]");
  result[language + "Retention"] = {
    beforePagingDenial,
    beforeSiblingDenial,
    records: records.slice(from),
    savedBefore,
    savedAfter: await ev(
      `Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))`,
    ),
    note: "Synthetic intercepted page/denial responses; all five current schemas and 100/next/restart controls in actual built browser. No SQL ordering/eligibility or cross-page snapshot proof.",
  };
  await click('a[href="/dashboard"]');
  await until(`!document.querySelector('[data-commercial]')`);
  groups.push(
    language +
      ": five retention families, exact 100-boundary continuation/restart, malformed/empty distinction, family ABA and both-direction shared denial with saved histories unchanged",
  );
}
try {
  await free(56840);
  await free(56841);
  result.buildBefore = await tree(join(stage, "app/.output"));
  fixture = http.createServer((req, res) => {
    const expected = expectedDirect[0];
    if (
      expected &&
      req.method === expected.method &&
      req.url === expected.path &&
      req.headers.authorization === expected.authorization
    ) {
      expectedDirect.shift();
      const observation = {
        method: req.method,
        path: req.url,
        status: expected.status,
        headersFlushed: false,
        bodyBytes: 0,
        responseClosed: false,
      };
      direct.push(observation);
      res.on("close", () => {
        observation.responseClosed = true;
      });
      res.writeHead(expected.status, {
        "Content-Type": "text/plain",
        "Content-Length": "1000000",
        "Access-Control-Allow-Origin": "*",
      });
      res.flushHeaders();
      observation.headersFlushed = true;
      // Deliberately leave the body unfinished; the real fetch must not await it.
      return;
    }
    escaped.push({ method: req.method, url: req.url });
    res.writeHead(599);
    res.end("Unexpected non-intercepted fixture request");
  });
  await new Promise((resolve) => fixture.listen(56841, "127.0.0.1", resolve));
  const env = {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "56840",
    NUXT_PUBLIC_BASE_API_URL: api,
    NUXT_PUBLIC_BASE_WEB_URL: app,
  };
  server = child(
    process.execPath,
    [join(stage, "app/.output/server/index.mjs")],
    env,
    "app.log",
  );
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(app)).ok) break;
    } catch {}
    assert(server.exitCode === null);
    await delay(50);
  }
  chrome = child(
    "/run/current-system/sw/bin/chromium",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-features=MediaRouter",
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
      `--user-data-dir=${profile}`,
      "--remote-debugging-port=0",
      "about:blank",
    ],
    process.env,
    "chromium.log",
  );
  let port;
  for (let i = 0; i < 200; i++) {
    try {
      port = (
        await fs.readFile(join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {}
    await delay(50);
  }
  assert(port);
  cdp = `http://127.0.0.1:${port}`;
  const targets = await (await fetch(cdp + "/json/list")).json();
  ws = new WebSocket(
    targets.find((x) => x.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve) => (ws.onopen = resolve));
  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p?.reject(m.error) : p?.resolve(m.result);
    } else if (m.method === "Fetch.requestPaused")
      intercept(m.params).catch((e) => errors.push(String(e.stack || e)));
    else if (m.method === "Runtime.exceptionThrown")
      errors.push(m.params.exceptionDetails);
  };
  for (const method of ["Page.enable", "Runtime.enable", "Network.enable"])
    await cmd(method);
  await cmd("Fetch.enable", {
    patterns: [{ urlPattern: "*", requestStage: "Request" }],
  });
  await cmd("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath,
    eventsEnabled: true,
  });
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cmd("Page.addScriptToEvaluateOnNewDocument", {
    source: `(()=>{const listeners=new Set(),originalAdd=EventTarget.prototype.addEventListener,originalRemove=EventTarget.prototype.removeEventListener;window.__staffProbe={listeners,ids:new Map(),nextId:0,adds:0,removes:0,cookieSignals:0,channels:0};EventTarget.prototype.addEventListener=function(type,fn,...rest){if(this===window.cookieStore&&type==='change'){listeners.add(fn);if(!__staffProbe.ids.has(fn))__staffProbe.ids.set(fn,++__staffProbe.nextId);__staffProbe.adds++;}return originalAdd.call(this,type,fn,...rest)};EventTarget.prototype.removeEventListener=function(type,fn,...rest){if(this===window.cookieStore&&type==='change'){listeners.delete(fn);__staffProbe.removes++;}return originalRemove.call(this,type,fn,...rest)};if(window.cookieStore)originalAdd.call(cookieStore,'change',()=>__staffProbe.cookieSignals++);if(window.BroadcastChannel){const Original=window.BroadcastChannel;window.BroadcastChannel=class extends Original{constructor(name){super(name);if(name.startsWith('nuxt:cookies:')){this.tracked=true;__staffProbe.channels++;}}close(){if(this.tracked){this.tracked=false;__staffProbe.channels--;}super.close();}}}})()`,
  });
  for (const language of ["de", "en-US"]) {
    await cmd("Network.clearBrowserCookies");
    await cmd("Network.setCookie", {
      name: "locale",
      value: language,
      url: app,
      path: "/",
    });
    await cmd("Page.navigate", { url: app + "/" });
    await until(`document.querySelector('input[autocomplete="username"]')`);
    await input('input[autocomplete="username"]', "staff@example.invalid");
    await input('input[autocomplete="current-password"]', "synthetic-password");
    await ev(
      `document.querySelector('input[autocomplete="username"]').closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`,
    );
    await until(`document.querySelectorAll('input[type="number"]').length===6`);
    for (let n = 0; n < 6; n++)
      await input(`input[type="number"]:nth-of-type(1)`, "");
    await ev(
      `(()=>{[...document.querySelectorAll('input[type="number"]')].forEach((e,i)=>{e.value=String(i+1);e.dispatchEvent(new Event('input',{bubbles:true}));});})()`,
    );
    await ev(
      `document.querySelector('input[autocomplete="username"]').closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`,
    );
    await until(`location.pathname==='/dashboard'`);
    await until(
      `document.querySelector('[data-commercial-nav]')&&getComputedStyle(document.querySelector('[data-commercial-nav]').closest('aside')).opacity==='1'`,
    );
    await panel(language + "-nav-inactive", "[data-commercial-nav]");
    const preMount = await ev(
      `({ids:[...__staffProbe.listeners].map(fn=>__staffProbe.ids.get(fn)),channels:__staffProbe.channels})`,
    );
    await click('a[href="/dashboard/commercial"]');
    await until(`document.querySelector('[data-commercial]')`);
    await delay(150);
    const before = await ev(
      `({listeners:__staffProbe.listeners.size,channels:__staffProbe.channels,adds:__staffProbe.adds,removes:__staffProbe.removes,cookieStore:!!window.cookieStore,ids:[...__staffProbe.listeners].map(fn=>__staffProbe.ids.get(fn))})`,
    );
    assert.equal(
      records.filter(
        (x) => x.path === "/shop/claims/admin/queue" && x.method === "POST",
      ).length,
      language === "de" ? 0 : ready,
    );
    await panel(language + "-nav-active", "[data-commercial-nav]");
    await panel(language + "-queue", "[data-load-queue]");
    await click("[data-load-queue]");
    await until(`document.querySelector('[data-case="${C}"]')`);
    await click(`[data-case="${C}"]`);
    await click("[data-load-detail]");
    await click("[data-load-capacity]");
    await until(`document.querySelector('[data-capacity]')`);
    assert(
      await ev(
        `document.querySelector('[data-raw-detail]').textContent.includes('9007199254740993')`,
      ),
    );
    assert(
      await ev(
        `document.querySelector('[data-capacity]').innerText.includes(${JSON.stringify(language === "de" ? "90071992547409,93 EUR" : "90071992547409.93 EUR")})`,
      ),
    );
    const after = await ev(
      `({listeners:__staffProbe.listeners.size,channels:__staffProbe.channels,adds:__staffProbe.adds,removes:__staffProbe.removes})`,
    );
    assert.equal(after.listeners, before.listeners);
    assert.equal(after.channels, before.channels);
    assert(after.adds > before.adds);
    assert.equal(after.adds - before.adds, after.removes - before.removes);
    result[language + "GetterScope"] = { before, after };
    await panel(language + "-capacity", "[data-load-capacity]");
    groups.push(
      language +
        ": actual password/MFA, navbar, raw bigint and exact nullable capacity",
    );
    await input("[data-document-id]", "10000000");
    await panel(language + "-selector", "[data-document-id]");
    holdNext = "document";
    await click("[data-download]");
    for (let n = 0; !held; n++) {
      assert(n < 1000, "expected intercepted held request");
      await delay(20);
    }
    await panel(language + "-held-download", "[data-download]");
    await input("[data-document-id]", "7");
    await input("[data-document-id]", "10000000");
    const count = (await fs.readdir(downloadPath)).length;
    await fulfill(
      held.requestId,
      "%PDF-1.4\nSYNTHETIC ORIGINAL BYTES\n",
      200,
      "application/pdf",
    );
    held = null;
    await delay(180);
    assert.equal((await fs.readdir(downloadPath)).length, count);
    await click("[data-download]");
    await until(`document.querySelector('[data-selected] [role="status"]')`);
    for (
      let i = 0;
      i < 100 &&
      (await fs.readdir(downloadPath)).filter((x) => !x.endsWith(".crdownload"))
        .length <= count;
      i++
    )
      await delay(30);
    assert.equal((await fs.readdir(downloadPath)).length, count + 1);
    await panel(language + "-download", "[data-download]");
    await input("[data-document-kind]", "purchase");
    await input("[data-document-id]", O);
    await input("[data-document-variant]", "confirmation");
    await click("[data-download]");
    await until(`document.querySelector('[data-selected] [role="status"]')`);
    groups.push(
      language +
        ": held selector away/back suppressed; exact PDF and text byte downloads",
    );
    holdNext = "detail";
    await click("[data-load-detail]");
    for (let n = 0; !held; n++) {
      assert(n < 1000, "expected intercepted held request");
      await delay(20);
    }
    await click(`[data-case="${D}"]`);
    await fulfill(held.requestId, {}, 401);
    held = null;
    await until(`!document.querySelector('[data-selected]')`);
    assert(await ev(`document.cookie.includes('accessToken=')`));
    groups.push(
      language +
        ": current held401 after case change clears only commercial view",
    );
    await click("[data-load-queue]");
    await until(`document.querySelector('[data-case="${C}"]')`);
    await click(`[data-case="${C}"]`);
    const signals = await ev(`__staffProbe.cookieSignals`);
    assert(
      before.cookieStore,
      "actual CookieStore branch required for this browser control",
    );
    await ev(
      `document.cookie='accessToken='+encodeURIComponent(${JSON.stringify(token("b"))})+'; path=/'`,
    );
    await until(`!document.querySelector('[data-selected]')`);
    assert(await ev(`__staffProbe.cookieSignals>${signals}`));
    await click("[data-load-queue]");
    await until(`document.querySelector('[data-case="${C}"]')`);
    await click(`[data-case="${C}"]`);
    await click("[data-load-detail]");
    await until(`document.querySelector('[data-detail]')`);
    await click("[data-load-capacity]");
    await until(
      `document.querySelector('[data-detail]')&&document.querySelector('[data-capacity]')`,
    );
    await input("[data-document-kind]", "invoice");
    await input("[data-document-id]", "10000000");
    const nativeIndex = direct.length,
      queueBeforeDenial = records.filter(
        (x) => x.path === "/shop/claims/admin/queue" && x.method === "POST",
      ).length;
    directNext = language === "de" ? 401 : 403;
    await click("[data-download]");
    await until(`!document.querySelector('[data-selected]')`, 2000);
    assert.equal(direct.length, nativeIndex + 1);
    assert(direct[nativeIndex].headersFlushed);
    assert.equal(direct[nativeIndex].bodyBytes, 0);
    assert(await ev(`document.cookie.includes('accessToken=')`));
    assert.equal(
      records.filter(
        (x) => x.path === "/shop/claims/admin/queue" && x.method === "POST",
      ).length,
      queueBeforeDenial,
    );
    for (let n = 0; !direct[nativeIndex].responseClosed; n++) {
      assert(n < 100, "owned denial body cancelled");
      await delay(10);
    }
    await fs.writeFile(
      join(run, language + "-denial-headers.png"),
      Buffer.from(
        (await cmd("Page.captureScreenshot", { format: "png" })).data,
        "base64",
      ),
    );
    groups.push(
      language +
        ": received " +
        direct[nativeIndex].status +
        " clears mounted evidence before unfinished native Fetch body; ordinary cookie retained",
    );
    await click("[data-load-queue]");
    await until(`document.querySelector('[data-case="${C}"]')`);
    await click(`[data-case="${C}"]`);
    const ownedIds = before.ids.filter((id) => !preMount.ids.includes(id));
    assert.equal(ownedIds.length, 1);
    const mounted = await ev(
      `({listeners:__staffProbe.listeners.size,channels:__staffProbe.channels})`,
    );
    await click('a[href="/dashboard"]');
    await until(`!document.querySelector('[data-commercial]')`);
    await delay(150);
    const disposed = await ev(
      `({listeners:__staffProbe.listeners.size,channels:__staffProbe.channels,ids:[...__staffProbe.listeners].map(fn=>__staffProbe.ids.get(fn))})`,
    );
    assert.equal(disposed.channels, mounted.channels - 3);
    assert(ownedIds.every((id) => !disposed.ids.includes(id)));
    result[language + "Disposal"] = {
      preMount,
      ownedIds,
      mounted,
      disposed,
      note: "Returning dashboard auth middleware adds its own useCookie listener; owned identity removal is checked separately from whole-app count.",
    };
    groups.push(
      language + ": actual CookieStore replacement and page observer cleanup",
    );
    ready = records.filter(
      (x) => x.path === "/shop/claims/admin/queue" && x.method === "POST",
    ).length;
    const saved = join(run, "saved-" + language);
    await fs.mkdir(saved);
    result[language + "Downloads"] = await tree(downloadPath);
    assert.equal(Object.keys(result[language + "Downloads"]).length, 2);
    for (const name of Object.keys(result[language + "Downloads"])) {
      assert(!name.endsWith(".crdownload"));
      await fs.copyFile(join(downloadPath, name), join(saved, name));
      await fs.unlink(join(downloadPath, name));
    }
    await holdJourney(language);
    await determinationJourney(language);
    await retentionJourney(language);
    ready = records.filter(
      (x) => x.path === "/shop/claims/admin/queue" && x.method === "POST",
    ).length;
  }
  assert.equal(expectedDirect.length, 0);
  assert.equal(direct.length, 2);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(escaped.length, 0, JSON.stringify(escaped));
  result.downloads = {};
  for (const language of ["de", "en-US"]) {
    const saved = join(run, "saved-" + language);
    Object.assign(
      result.downloads,
      Object.fromEntries(
        Object.entries(await tree(saved)).map(([k, v]) => [
          language + "/" + k,
          v,
        ]),
      ),
    );
    for (const name of await fs.readdir(saved)) {
      const text = await fs.readFile(join(saved, name), "utf8");
      assert(
        [
          "%PDF-1.4\nSYNTHETIC ORIGINAL BYTES\n",
          "SYNTHETIC ORIGINAL CONFIRMATION\n",
        ].includes(text),
      );
    }
  }
  result.pass = true;
} catch (error) {
  result.pass = false;
  result.failure = String(error.stack || error);
  try {
    const shot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await fs.writeFile(
      join(run, "failure.png"),
      Buffer.from(shot.data, "base64"),
    );
  } catch {}
  throw error;
} finally {
  try {
    if (ws?.readyState === WebSocket.OPEN) ws.close();
  } catch {}
  for (const { p } of handles.slice().reverse()) {
    if (p.exitCode === null) p.kill("SIGTERM");
    if (p.exitCode === null)
      await new Promise((resolve) => {
        p.once("exit", resolve);
        setTimeout(() => {
          if (p.exitCode === null) p.kill("SIGKILL");
          resolve();
        }, 3000);
      });
  }
  if (fixture) {
    fixture.closeAllConnections();
    await new Promise((resolve) => fixture.close(resolve));
  }
  for (const handle of handles)
    await fs.writeFile(join(run, handle.log), handle.text());
  result.processes = handles.map(({ p, log }) => ({
    pid: p.pid,
    exitCode: p.exitCode,
    signalCode: p.signalCode,
    log,
  }));
  await fs.rm(profile, { recursive: true, force: true });
  await free(56840);
  await free(56841);
  result.cleanup = { profileRemoved: true, portsFree: [56840, 56841] };
  result.buildAfter = await tree(join(stage, "app/.output"));
  assert.deepEqual(result.buildAfter, result.buildBefore);
  await fs.writeFile(
    join(run, "results.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      run,
      pass: result.pass,
      groups: groups.length,
      interceptedRecords: records.length,
      directRequests: direct.length,
      panels: panels.length,
      errors: errors.length,
      escaped: escaped.length,
      cleanup: result.cleanup,
    }),
  );
}
