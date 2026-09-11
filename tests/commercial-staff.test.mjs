// Synthetic source-level and mounted Vue controls. No HTTP service or database.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as Vue from "vue";
import { parse, compileScript } from "@vue/compiler-sfc";
import { createI18n } from "vue-i18n";
const temp = await mkdtemp(join(tmpdir(), "commercial-staff-tests-"));
const priorGlobals = new Map();
function globals(values) {
  for (const [key, value] of Object.entries(values)) {
    if (!priorGlobals.has(key))
      priorGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
}
after(async () => {
  for (const [key, descriptor] of priorGlobals)
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  await rm(temp, { recursive: true, force: true });
});
async function compile(relative, replacements = {}) {
  let source = await readFile(new URL(relative, import.meta.url), "utf8");
  if (relative.endsWith(".vue"))
    source = compileScript(parse(source).descriptor, {
      id: "staff-unit",
      inlineTemplate: true,
    }).content;
  for (const [from, to] of Object.entries(replacements)) {
    source = source.replaceAll(from, to);
    if (from.startsWith("'") && from.endsWith("'"))
      source = source.replaceAll('"' + from.slice(1, -1) + '"', to);
  }
  let code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  for (const dependency of ["vue", "vue-i18n", "jwt-decode"])
    code = code.replace(
      new RegExp(`from ['"]${dependency}['"]`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dependency))}`,
    );
  const path = join(temp, relative.replace(/[^a-z0-9]/gi, "_") + ".mjs");
  await writeFile(path, code);
  return {
    module: await import(pathToFileURL(path)),
    url: pathToFileURL(path).href,
  };
}
let states = new Map(),
  cookies = new Map(),
  scopedCookies = 0;
const useState = (key, init) => {
  if (!states.has(key)) states.set(key, Vue.ref(init()));
  return states.get(key);
};
globals({
  useState,
  computed: Vue.computed,
  useRouter: () => ({ push() {} }),
  useCookie: (key) => {
    if (!cookies.has(key)) cookies.set(key, Vue.ref(null));
    if (Vue.getCurrentScope()) {
      scopedCookies++;
      Vue.onScopeDispose(() => scopedCookies--);
    }
    return cookies.get(key);
  },
});
const user = (
  await compile("../composables/user.ts", {
    "import { useState } from '#app';": "",
  })
).module;
const ctx = await compile("../composables/commercialStaffContext.ts");
const adapter = await compile("../composables/commercialStaff.ts", {
  "'./commercialStaffContext'": JSON.stringify(ctx.url),
});
const holdAdapter = await compile("../composables/commercialHoldReview.ts", {
  "'./commercialStaffContext'": JSON.stringify(ctx.url),
});
const holdComponent = await compile("../components/CommercialHoldReview.vue", {
  "'../composables/commercialHoldReview'": JSON.stringify(holdAdapter.url),
});
const retentionAdapter = await compile(
  "../composables/commercialRetentionPage.ts",
  {
    "'./commercialStaffContext'": JSON.stringify(ctx.url),
    "'./commercialHoldReview'": JSON.stringify(holdAdapter.url),
  },
);
const retentionComponent = await compile(
  "../components/CommercialRetentionPage.vue",
  {
    "'../composables/commercialRetentionPage'": JSON.stringify(
      retentionAdapter.url,
    ),
  },
);
const determinationAdapter = await compile(
  "../composables/commercialDetermination.ts",
  {
    "'./commercialStaffContext'": JSON.stringify(ctx.url),
    "'./commercialHoldReview'": JSON.stringify(holdAdapter.url),
  },
);
const determinationComponent = await compile(
  "../components/CommercialDetermination.vue",
  {
    "'../composables/commercialDetermination'": JSON.stringify(
      determinationAdapter.url,
    ),
  },
);
const {
  createCommercialStaff,
  staffQueue,
  staffDetail,
  staffCapacity,
  staffMoney,
  staffDocument,
  staffTransport,
  staffPurchaseVariants,
} = adapter.module;
const page = (
  await compile("../pages/dashboard/commercial.vue", {
    "'../../composables/commercialStaffContext'": JSON.stringify(ctx.url),
    "'../../composables/commercialStaff'": JSON.stringify(adapter.url),
    "'../../components/CommercialHoldReview.vue'": JSON.stringify(
      holdComponent.url,
    ),
    "'../../components/CommercialDetermination.vue'": JSON.stringify(
      determinationComponent.url,
    ),
    "'../../components/CommercialRetentionPage.vue'": JSON.stringify(
      retentionComponent.url,
    ),
  })
).module.default;
const U = "11000000-0000-4000-8000-000000000001",
  V = "11000000-0000-4000-8000-000000000002",
  S = "22000000-0000-4000-8000-000000000001",
  T = "22000000-0000-4000-8000-000000000002",
  C = "33000000-0000-4000-8000-000000000001",
  D = "33000000-0000-4000-8000-000000000002",
  O = "44000000-0000-4000-8000-000000000001";
const when = "2026-09-10T12:00:00Z";
const token = (uid = U, sid = S, marker = "a") =>
  `e30.${Buffer.from(JSON.stringify({ uid, sid, exp: 2147483647 })).toString("base64url")}.${marker}`;
const login = (uid = U, sid = S) => ({
  user: { id: uid, admin: true, enabled: true },
  session: { id: sid, user_id: uid, mfa_verified: true },
  access_token: token(uid, sid),
  refresh_token: "synthetic-not-exported",
});
const selection = { id: C, subject: U };
const queueRow = () => ({
  ...selection,
  erased_at: null,
  closed_at: null,
  assigned_to: null,
  inventory: { backend: "pending" },
  review_reason: "Synthetic evidence",
  due_at: when,
});
const rawDetail = () =>
  `{"case":${JSON.stringify({ ...queueRow(), review_due_at: when })},"original_units":9007199254740993,"evidence":"<script>never HTML</script>"}`;
const capacity = () => ({
  protocol: 1,
  case_id: C,
  subject: U,
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
const response = (data, status = 200, mime = "application/json") => {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return { status, text, bytes: new TextEncoder().encode(text), mime };
};
const defer = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function fixture(options = {}) {
  states = new Map();
  cookies = new Map();
  scopedCookies = 0;
  user.setStates(login());
  const context = ctx.module.createCommercialStaffContext({
    user: user.useUser(),
    session: user.useSession(),
    token: user.useAccessToken(),
    getToken: user.getAccessToken,
    run: (callback) => callback(),
    ...options,
  });
  const calls = [],
    downloads = [];
  let reply = async (path) =>
    response(
      path.endsWith("/queue")
        ? [queueRow()]
        : path.endsWith("/detail")
          ? rawDetail()
          : capacity(),
    );
  const controller = createCommercialStaff(
    context,
    async (...args) => {
      calls.push(args);
      return reply(...args);
    },
    (...args) => downloads.push(args),
  );
  return {
    context,
    controller,
    calls,
    downloads,
    reply: (fn) => {
      reply = fn;
    },
  };
}
const flush = async () => {
  for (let n = 0; n < 6; n++) {
    await Promise.resolve();
    await Vue.nextTick();
  }
};

test("actual publishers: coherent current proof, no capture before deliberate activation, scoped getter after await leaves no listener", async () => {
  const f = fixture();
  assert.equal(f.context.capture(), null);
  assert(f.context.activate());
  const original = f.context.capture();
  assert.equal(original.uid, U);
  assert.equal(scopedCookies, 0);
  await Promise.resolve();
  for (let n = 0; n < 30; n++) assert(f.context.current(original));
  assert.equal(scopedCookies, 0);
  f.controller.dispose();
  assert.equal(f.context.capture(), null);
});
test("actual setStates same-turn A→B→A invalidates original without waiting a Vue tick", () => {
  const f = fixture();
  f.context.activate();
  const old = f.context.capture();
  user.setStates(login(V, T));
  user.setStates(login());
  assert(!f.context.current(old));
  assert.equal(f.context.capture(), null);
  assert(f.context.activate());
  assert(!f.context.current(old));
  f.controller.dispose();
});
for (const change of ["profile", "session", "mfa", "null", "bearer"])
  test(`actual shared publisher ${change} invalidates and cannot silently rebind`, () => {
    const f = fixture();
    f.context.activate();
    const old = f.context.capture();
    if (change === "profile") user.useUser().value = { id: V, admin: true };
    if (change === "session")
      user.useSession().value = { ...login().session, id: T };
    if (change === "mfa") user.useSession().value.mfa_verified = false;
    if (change === "null") user.setStates(null);
    if (change === "bearer") {
      cookies.get("accessToken").value = token(U, S, "changed");
      user.getAccessToken();
    }
    assert(!f.context.current(old));
    if (change !== "bearer") assert(!f.context.activate());
    f.controller.dispose();
  });
test("actual held getUser publication fails closed against replacement bearer identity", async () => {
  const f = fixture(),
    held = defer();
  globals({ GET: () => held.promise });
  const work = user.getUser();
  user.setStates(login(V, T));
  held.resolve(login().user);
  await work;
  assert.equal(user.useUser().value.id, U);
  assert.equal(user.useSession().value.user_id, V);
  assert(!f.context.activate());
  f.controller.dispose();
});
test("cookie-only changed getter and empty-memory refusal preserve existing selection semantics", () => {
  const f = fixture();
  f.context.activate();
  const old = f.context.capture();
  cookies.get("accessToken").value = token(V, T);
  assert(!f.context.current(old));
  assert(!f.context.activate());
  user.useAccessToken().value = "";
  cookies.get("accessToken").value = token();
  assert(!f.context.activate());
  assert.equal(user.useAccessToken().value, "");
  f.controller.dispose();
});
test("read-only cookie signals, hidden page and terminal disposal clean all owned listeners/channels", () => {
  const win = new EventTarget(),
    doc = new EventTarget(),
    channels = [];
  win.cookieStore = new EventTarget();
  win.BroadcastChannel = class extends EventTarget {
    constructor(name) {
      super();
      this.name = name;
      this.closed = false;
      channels.push(this);
    }
    close() {
      this.closed = true;
    }
  };
  const f = fixture({ browser: win, document: doc });
  f.context.activate();
  const old = f.context.capture();
  const event = new Event("change");
  event.changed = [{ name: "accessToken" }];
  event.deleted = [];
  win.cookieStore.dispatchEvent(event);
  assert(!f.context.current(old));
  f.context.activate();
  channels[0].dispatchEvent(new Event("message"));
  assert.equal(f.context.capture(), null);
  f.context.activate();
  doc.visibilityState = "hidden";
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(f.context.capture(), null);
  f.controller.dispose();
  assert(channels.every((channel) => channel.closed));
  assert.equal(scopedCookies, 0);
  assert(!f.context.activate());
});
for (const status of [401, 403])
  test(`same proof ${status} after selected-case change clears commercial state but not ordinary credentials`, async () => {
    const f = fixture();
    await f.controller.queue();
    f.controller.select(selection);
    const held = defer();
    f.reply(() => held.promise);
    const work = f.controller.detail();
    f.controller.select({ id: D, subject: V });
    held.resolve(response({}, status));
    await work;
    assert.equal(f.controller.state.selected, null);
    assert.equal(f.controller.state.queueError, "authority");
    assert.equal(user.getAccessToken(), token());
    f.controller.dispose();
  });
test("old proof 401 cannot clear a separately activated replacement actor", async () => {
  const f = fixture();
  await f.controller.queue();
  f.controller.select(selection);
  const held = defer();
  f.reply(() => held.promise);
  const work = f.controller.detail();
  user.setStates(login(V, T));
  f.context.activate();
  f.controller.select({ id: D, subject: V });
  held.resolve(response({}, 401));
  await work;
  assert.equal(f.controller.state.selected.id, D);
  f.controller.dispose();
});
test("queue exact offset body, empty vs unavailable and malformed bare response", async () => {
  const f = fixture();
  await f.controller.queue(100);
  assert.deepEqual(f.calls[0][2], { offset: 100 });
  f.reply(async () => response([]));
  await f.controller.queue();
  assert.deepEqual(f.controller.state.queue, []);
  assert.equal(f.controller.state.queueError, "");
  f.reply(async () => response({}, 503));
  await f.controller.queue();
  assert.equal(f.controller.state.queueError, "unavailable");
  f.reply(async () => response({ rows: [] }));
  await f.controller.queue();
  assert.equal(f.controller.state.queueError, "malformed");
  f.controller.dispose();
});
test("held detail away/back and disposal cannot republish; exact subject-only transport", async () => {
  const f = fixture();
  await f.controller.queue();
  f.controller.select(selection);
  const held = defer();
  f.reply(() => held.promise);
  const work = f.controller.detail();
  assert.deepEqual(f.calls.at(-1)[2], { subject: U });
  f.controller.select(null);
  f.controller.select(selection);
  held.resolve(response(rawDetail()));
  await work;
  assert.equal(f.controller.state.detail, null);
  const second = defer();
  f.reply(() => second.promise);
  const pending = f.controller.detail();
  f.controller.dispose();
  second.resolve(response(rawDetail()));
  await pending;
  assert.equal(f.controller.state.detail, null);
});
test("raw case export retains exact big integer and script text without stringify or numeric amount authority", () => {
  const result = staffDetail(rawDetail(), selection);
  assert.equal(result.raw, rawDetail());
  assert(result.raw.includes("9007199254740993"));
  assert.throws(() => staffDetail(rawDetail(), { id: D, subject: U }));
  assert.throws(() => staffDetail('{"case":null}', selection));
});
test("capacity exact large and signed decimal strings, nullable unknown and known zero basis", () => {
  const c = capacity();
  assert.equal(
    staffCapacity(c, selection).captured_purchase_units,
    "9007199254740993",
  );
  assert.equal(staffMoney(c.captured_purchase_units), "90071992547409.93 EUR");
  c.captured_purchase_units = "-2";
  assert.equal(staffCapacity(c, selection).captured_purchase_units, "-2");
  assert.equal(staffMoney("-2"), "-0.02 EUR");
  c.captured_purchase_units = "0";
  c.captured_basis.live_captured_record_count = "0";
  assert.equal(staffCapacity(c, selection).captured_purchase_units, "0");
  c.captured_purchase_units = null;
  c.captured_basis = {
    kind: "preserved_original_claimant_erasure_observation",
    live_captured_record_count: null,
    evidence_id: null,
    recorded_at: null,
  };
  assert.equal(staffCapacity(c, selection).captured_purchase_units, null);
});
for (const damage of [
  "missing",
  "number",
  "decimal",
  "foreign",
  "unknown-zero",
  "duplicates",
  "orphan",
  "basis",
])
  test(`capacity malformed ${damage} cannot become usable amounts`, () => {
    const c = capacity();
    if (damage === "missing") delete c.reservations;
    if (damage === "number") c.captured_purchase_units = 9007199254740992;
    if (damage === "decimal") c.known_reserved_purchase_capacity_units = "01";
    if (damage === "foreign") c.case_id = D;
    if (damage === "unknown-zero") c.remaining_purchase_capacity = "0";
    if (damage === "duplicates") c.obligations.push({ ...c.obligations[0] });
    if (damage === "orphan")
      c.reservations.push({
        id: C,
        obligation_id: D,
        parent_id: null,
        mode: "cash",
        state: "uncertain",
        units: "1",
        purchase_capacity_units: null,
      });
    if (damage === "basis") c.captured_basis.evidence_id = O;
    assert.throws(() => staffCapacity(c, selection));
  });
test("capacity rows preserve split/failed versus unknown cash and zero independent service limits", () => {
  const c = capacity();
  c.historic_prior_refund_status = "operator_reviewed";
  c.historic_prior_refund_units = "0";
  c.historic_prior_refund_review = {
    case_id: C,
    prior_refund_units: "0",
    assessment: null,
    reviewed_at: when,
  };
  c.remaining_purchase_capacity = "9007199254740993";
  c.obligations[0] = {
    ...c.obligations[0],
    units: "42",
    cash_units: "42",
    remaining_units: "42",
    remaining_cash_units: "42",
    status: "established",
  };
  c.reservations = [
    {
      id: C,
      obligation_id: O,
      parent_id: null,
      mode: "cash",
      state: "split",
      units: "2",
      purchase_capacity_units: null,
    },
    {
      id: D,
      obligation_id: O,
      parent_id: C,
      mode: "cash",
      state: "failed",
      units: "2",
      purchase_capacity_units: "0",
    },
  ];
  const r = staffCapacity(c, selection);
  assert.equal(r.reservations[0].state, "split");
  assert.equal(r.reservations[0].purchase_capacity_units, null);
  assert.equal(r.reservations[1].purchase_capacity_units, "0");
  assert.equal(r.obligations[0].remaining_cash_units, "42");
});
test("all seven purchase variants and exact bounded finance selectors are literal and nontruncating", () => {
  for (const variant of staffPurchaseVariants)
    assert.equal(
      staffDocument(C, { kind: "purchase", id: O, variant }).variant,
      variant,
    );
  for (const [kind, id, variant] of [
    ["invoice", "0", "original"],
    ["invoice", "10000000", "original"],
    ["invoice", "9223372036854775807", "original"],
    ["final-statement", "18446744073709551615", "original"],
    ["credit-note", "262142", "12"],
  ])
    assert(
      staffDocument(C, { kind, id, variant }).path.includes(
        `/${kind}/${id}/${variant}`,
      ),
    );
  for (const [kind, id, variant] of [
    ["invoice", "-1", "original"],
    ["invoice", "9223372036854775808", "original"],
    ["invoice", "01", "original"],
    ["invoice", "1", "other"],
    ["final-statement", "18446744073709551616", "original"],
    ["credit-note", "262143", "12"],
    ["credit-note", "2026", "13"],
  ])
    assert.throws(() => staffDocument(C, { kind, id, variant }));
});
for (const mode of ["away-back", "empty", "mime", "success"])
  test(`document ${mode}: exact tuple and bytes govern actual download callback`, async () => {
    const f = fixture();
    await f.controller.queue();
    f.controller.select(selection);
    const held = defer();
    f.reply(() => held.promise);
    const selector = { kind: "invoice", id: "10000000", variant: "original" };
    const work = f.controller.document(selector);
    selector.id = "77";
    assert(f.calls.at(-1)[0].endsWith("/invoice/10000000/original"));
    if (mode === "away-back") {
      f.controller.editDocument();
      f.controller.editDocument();
    }
    held.resolve(
      response(
        mode === "empty" ? "" : "%PDF-synthetic",
        200,
        mode === "mime" ? "text/html" : "application/pdf",
      ),
    );
    await work;
    assert.equal(f.downloads.length, mode === "success" ? 1 : 0);
    if (mode === "success")
      assert.equal(
        new TextDecoder().decode(f.downloads[0][0]),
        "%PDF-synthetic",
      );
    f.controller.dispose();
  });
test("native fetch seam keeps exact token, fixed method/body, no redirects/cookies/refresh and reads response bytes", async () => {
  let request;
  const transport = staffTransport(
    "http://127.0.0.1:56841",
    async (url, init) => {
      request = { url, init };
      return new Response("raw", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },
  );
  const result = await transport(
    "/shop/claims/admin/queue",
    { bearer: "captured" },
    { offset: 0 },
  );
  assert.equal(request.init.headers.Authorization, "Bearer captured");
  assert.equal(request.init.credentials, "omit");
  assert.equal(request.init.redirect, "error");
  assert.equal(request.init.body, '{"offset":0}');
  assert.equal(result.text, "raw");
});
test("JSON read rejects an incorrect successful MIME instead of treating it as current data", async () => {
  const f = fixture();
  f.reply(async () => response([queueRow()], 200, "text/html"));
  await f.controller.queue();
  assert.equal(f.controller.state.queueError, "malformed");
  assert.equal(f.controller.state.queue.length, 0);
  f.controller.dispose();
});

async function populated() {
  const f = fixture();
  await f.controller.queue();
  f.controller.select(selection);
  await f.controller.detail();
  await f.controller.capacity();
  assert(f.controller.state.detail && f.controller.state.capacity);
  return f;
}
function unreadable(status, mode = "held") {
  const body = defer();
  const seen = { body: 0, mime: 0 };
  return {
    body,
    seen,
    response: {
      status,
      headers: {
        get() {
          seen.mime++;
          return "text/plain";
        },
      },
      arrayBuffer() {
        seen.body++;
        return mode === "rejected"
          ? Promise.reject(Error("synthetic body failure after headers"))
          : body.promise;
      },
    },
  };
}
const invoice = { kind: "invoice", id: "10000000", variant: "original" };
for (const status of [401, 403]) {
  for (const mode of ["rejected", "held"])
    test(`AB3 actual transport ${status}: ${mode} body cannot retain current cached views`, async () => {
      const f = await populated(),
        denial = unreadable(status, mode);
      let signal;
      f.reply(
        staffTransport("http://127.0.0.1:56841", async (_url, init) => {
          signal = init.signal;
          return denial.response;
        }),
      );
      const work = f.controller.document(invoice);
      try {
        await flush();
        assert.equal(f.controller.state.selected, null);
        assert.equal(f.controller.state.detail, null);
        assert.equal(f.controller.state.capacity, null);
        assert.equal(f.controller.state.queue.length, 0);
        assert.equal(f.controller.state.queueError, "authority");
        assert.equal(f.context.capture(), null);
        assert.equal(user.getAccessToken(), token());
        assert.equal(denial.seen.body, 0);
        assert.equal(denial.seen.mime, 0);
        assert.equal(signal.aborted, true);
        assert.equal(f.downloads.length, 0);
      } finally {
        denial.body.resolve(new ArrayBuffer(0));
        await work;
        f.controller.dispose();
      }
    });
  test(`AB3 actual transport ${status}: denial after case switch still rejects the same proof`, async () => {
    const f = await populated(),
      headers = defer(),
      denial = unreadable(status);
    f.reply(staffTransport("http://127.0.0.1:56841", () => headers.promise));
    const work = f.controller.document(invoice);
    f.controller.select({ id: D, subject: V });
    headers.resolve(denial.response);
    try {
      await flush();
      assert.equal(f.controller.state.selected, null);
      assert.equal(f.controller.state.queueError, "authority");
      assert.equal(user.getAccessToken(), token());
    } finally {
      denial.body.resolve(new ArrayBuffer(0));
      await work;
      f.controller.dispose();
    }
  });
  test(`AB3 actual transport ${status}: replaced bearer is preserved`, async () => {
    const f = await populated(),
      headers = defer(),
      denial = unreadable(status);
    f.reply(staffTransport("http://127.0.0.1:56841", () => headers.promise));
    const work = f.controller.document(invoice);
    const replacement = token(U, S, "replacement");
    user.setStates({ ...login(), access_token: replacement });
    assert(f.context.activate());
    f.controller.select({ id: D, subject: V });
    const proof = f.context.capture();
    headers.resolve(denial.response);
    try {
      await flush();
      assert(f.context.current(proof));
      assert.equal(f.controller.state.selected.id, D);
      assert.equal(user.getAccessToken(), replacement);
    } finally {
      denial.body.resolve(new ArrayBuffer(0));
      await work;
      f.controller.dispose();
    }
  });
  test(`AB3 actual transport ${status}: disposed old page cannot clear a new context`, async () => {
    const f = await populated(),
      headers = defer(),
      denial = unreadable(status);
    f.reply(staffTransport("http://127.0.0.1:56841", () => headers.promise));
    const work = f.controller.document(invoice);
    f.controller.dispose();
    const next = await populated(),
      proof = next.context.capture();
    headers.resolve(denial.response);
    try {
      await flush();
      assert(next.context.current(proof));
      assert(next.controller.state.detail && next.controller.state.capacity);
      assert.equal(next.controller.state.selected.id, C);
      assert.equal(next.downloads.length, 0);
    } finally {
      denial.body.resolve(new ArrayBuffer(0));
      await work;
      next.controller.dispose();
    }
  });
  test(`AB3 actual transport ${status}: earlier held200 cannot republish after denial headers`, async () => {
    const f = await populated(),
      earlier = defer(),
      denial = unreadable(status);
    f.reply(
      staffTransport("http://127.0.0.1:56841", async (url) => {
        if (!url.endsWith("/detail")) return denial.response;
        return {
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          arrayBuffer: () => earlier.promise,
        };
      }),
    );
    const old = f.controller.detail(),
      rejected = f.controller.document(invoice);
    try {
      await flush();
      assert.equal(f.controller.state.selected, null);
      earlier.resolve(new TextEncoder().encode(rawDetail()).buffer);
      await old;
      assert.equal(f.controller.state.detail, null);
      assert.equal(f.controller.state.capacity, null);
      assert.equal(f.controller.state.queueError, "authority");
    } finally {
      earlier.resolve(new TextEncoder().encode(rawDetail()).buffer);
      denial.body.resolve(new ArrayBuffer(0));
      await Promise.all([old, rejected]);
      f.controller.dispose();
    }
  });
}
for (const failure of ["network", "200-body"])
  test(`AB3 actual transport ${failure}: unavailable is not an authority denial`, async () => {
    const f = await populated(),
      proof = f.context.capture();
    f.reply(
      staffTransport("http://127.0.0.1:56841", async () => {
        if (failure === "network")
          throw Error("synthetic fetch failure without status");
        return unreadable(200, "rejected").response;
      }),
    );
    try {
      await f.controller.document(invoice);
      assert(f.context.current(proof));
      assert.equal(f.controller.state.selected.id, C);
      assert(f.controller.state.detail && f.controller.state.capacity);
      assert.equal(f.controller.state.documentError, "unavailable");
      assert.equal(f.downloads.length, 0);
    } finally {
      f.controller.dispose();
    }
  });

function host() {
  const node = (type, text = "") => ({
    type,
    text,
    props: {},
    children: [],
    parent: null,
    options: [],
    multiple: false,
    tagName: type.toUpperCase(),
    addEventListener() {},
    getRootNode: () => globalThis.document,
  });
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
  };
  const renderer = Vue.createRenderer({
    createElement: node,
    createText: (t) => node("text", t),
    createComment: (t) => node("comment", t),
    setText: (n, t) => (n.text = t),
    setElementText: (n, t) => {
      n.text = t;
      n.children = [];
    },
    patchProp: (n, k, o, v) => (n.props[k] = v),
    insert: (n, p, a = null) => {
      detach(n);
      n.parent = p;
      p.children.splice(a ? p.children.indexOf(a) : p.children.length, 0, n);
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root"),
    all = (n = root) => [n, ...n.children.flatMap(all)],
    text = (n = root) =>
      [n.type === "comment" ? "" : n.text, ...n.children.map(text)].join(" ");
  return { renderer, root, all, text };
}
for (const language of ["de", "en-US"])
  test(`mounted ${language}: no automatic requests, actual page reads/raw text/amounts and auth clearing`, async () => {
    const f = fixture(),
      h = host(),
      win = new EventTarget(),
      doc = new EventTarget(),
      requests = [],
      denial = unreadable(language === "de" ? 401 : 403);
    let rejectNext = false,
      deniedWork;
    globals({
      window: win,
      document: doc,
      Document: class {},
      ShadowRoot: class {},
      definePageMeta() {},
      useNuxtApp: () => ({ runWithContext: (fn) => fn() }),
      useRuntimeConfig: () => ({
        public: { BASE_API_URL: "http://127.0.0.1:56841" },
      }),
      ...user,
      fetch: async (url, init) => {
        requests.push({ url, init });
        if (rejectNext) return denial.response;
        return new Response(
          url.endsWith("/queue")
            ? JSON.stringify([queueRow()])
            : url.endsWith("/detail")
              ? rawDetail()
              : JSON.stringify(capacity()),
          { headers: { "content-type": "application/json" } },
        );
      },
    });
    const messages = JSON.parse(
      await readFile(
        new URL(`../locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    );
    const app = h.renderer.createApp(page);
    app.component("NuxtLink", {
      render() {
        return Vue.h("a", null, this.$slots.default?.());
      },
    });
    app.use(
      createI18n({
        legacy: false,
        locale: language,
        messages: { [language]: messages },
      }),
    );
    app.mount(h.root);
    try {
      assert.equal(requests.length, 0);
      const find = (key) => h.all().find((n) => Object.hasOwn(n.props, key));
      await find("data-load-queue").props.onClick();
      await flush();
      await h
        .all()
        .find((n) => n.props["data-case"] === C)
        .props.onClick();
      await flush();
      await find("data-load-detail").props.onClick();
      await find("data-load-capacity").props.onClick();
      await flush();
      assert(h.text().includes("9007199254740993"));
      assert(
        h
          .text()
          .includes(
            language === "de"
              ? "90071992547409,93 EUR"
              : "90071992547409.93 EUR",
          ),
      );
      assert(h.text().includes("<script>never HTML</script>"));
      assert.equal(
        h.all().some((n) => n.type === "script"),
        false,
      );
      find("data-document-id").props["onUpdate:modelValue"]("10000000");
      await flush();
      rejectNext = true;
      deniedWork = h
        .all()
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
      await flush();
      assert(
        !find("data-selected"),
        "received denial removes mounted evidence before body completion",
      );
      assert.equal(user.getAccessToken(), token());
      assert.equal(denial.seen.body, 0);
      user.setStates(null);
      await flush();
      assert(!find("data-selected"));
    } finally {
      denial.body.resolve(new ArrayBuffer(0));
      await deniedWork;
      app.unmount();
      f.controller.dispose();
      assert.equal(scopedCookies, 0);
    }
  });

const {
  holdNativeText,
  holdRequestTime,
  holdNativeTime,
  holdQueue,
  holdRequest,
  holdReceipt,
  holdAssessment,
  createCommercialHoldReview,
  holdSaved,
} = holdAdapter.module;
const I = "55000000-0000-4000-8000-000000000001",
  J = "66000000-0000-4000-8000-000000000001";
const native = "2026-09-11 12:00:00+00",
  future = "2030-10-10T10:30:00.123456+01:30";
function hrow(kind = "financial_document", id = " R10000000\n") {
  return {
    case_id: C,
    subject: O,
    hold: { kind, record_id: kind === "financial_document" ? id : D },
    incarnation_id: I,
    review_version: "0",
    review_due_at: "infinity",
    basis: "Exact original <script> basis",
    last_review: null,
  };
}
function hqueue(rows = [hrow()], next_cursor = null) {
  return {
    version: 1,
    queue: "four_existing_hold_families",
    mode: "live",
    observed_at: native,
    rows,
    next_cursor,
    exhausted: next_cursor === null,
  };
}
function hbody(overrides = {}) {
  return {
    version: 1,
    command_id: J,
    case_id: C,
    subject: O,
    hold: hrow().hold,
    expected: { incarnation_id: I, review_version: "0" },
    decision: "keep",
    review_scope: "entire_existing_hold",
    assessment: "  This is a deliberate full hold assessment.  ",
    next_review_at: future,
    ...overrides,
  };
}
function hreceipt(body = hbody()) {
  return {
    version: 1,
    command_id: body.command_id,
    case_id: body.case_id,
    subject: body.subject,
    hold: body.hold,
    incarnation_id: body.expected.incarnation_id,
    previous_review_version: body.expected.review_version,
    review_version: String(BigInt(body.expected.review_version) + 1n),
    previous_review_due_at: "infinity",
    next_review_at: holdNativeText(holdRequestTime(body.next_review_at)),
    recorded_at: native,
    status: "review_recorded",
    hold_kept: true,
    record_deleted: false,
    claims_satisfied: false,
  };
}
function memory() {
  const map = new Map();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (n) => [...map.keys()][n] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}
function hf(options = {}) {
  const f = fixture(),
    storage = options.storage || memory(),
    calls = [];
  let n = 0,
    reply = async (path, p, body) =>
      response(
        path.endsWith("hold_queue") ? hqueue() : hreceipt(JSON.parse(body)),
      );
  const transport =
    options.transport ||
    (async (...args) => {
      calls.push(args);
      return reply(...args);
    });
  const controller = createCommercialHoldReview(
    f.context,
    transport,
    () => storage,
    () => `${J.slice(0, -3)}${String(++n).padStart(3, "0")}`,
  );
  return {
    ...f,
    ordinary: f.controller,
    controller,
    storage,
    calls,
    reply: (fn) => (reply = fn),
    dispose() {
      controller.dispose();
      f.controller.dispose();
    },
  };
}
async function prepared(f) {
  await f.controller.queue();
  f.controller.select(f.controller.state.queue.rows[0]);
  f.controller.edit(hbody().assessment, future, true);
  f.controller.prepare();
  assert(f.controller.state.saved);
  return f.controller.state.saved.body_json;
}
for (const [input, output] of [
  ["2026-10-10T10:30:00.123456+01:30", "2026-10-10 09:00:00.123456+00"],
  ["2026-12-31T24:00Z", "2027-01-01 00:00:00+00"],
  ["2026-12-31T23:59:60Z", "2027-01-01 00:00:00+00"],
  ["2026-01-01T00:00:60.123456-0130", "2026-01-01 01:31:00.123456+00"],
  ["0001-01-01T00:00+01", "0001-12-31 23:00:00+00 BC"],
  ["280000-02-29T00:00:00.000001+00", "280000-02-29 00:00:00.000001+00"],
])
  test(`hold timestamp lossless normalization ${input}`, () => {
    assert.equal(holdNativeText(holdRequestTime(input)), output);
    assert.equal(holdNativeTime(output), output);
    assert.notEqual(holdNativeText(holdRequestTime(input) + 1n), output);
  });
test("hold timestamp native finite boundaries, BC, infinity and noncanonical rejection", () => {
  for (const v of [-211813488000000000n, 9223371331199999999n, -1n, 0n])
    assert.equal(holdNativeTime(holdNativeText(v)), holdNativeText(v));
  for (const v of [-211813488000000001n, 9223371331200000000n])
    assert.throws(() => holdNativeText(v));
  for (const v of ["infinity", "-infinity"]) {
    assert.equal(holdNativeTime(v), v);
    assert.throws(() => holdNativeTime(v, true));
  }
  for (const v of [
    "2026-01-01T00:00:00Z",
    "2026-01-01 00:00:00.100000+00",
    "2026-01-01 24:00:00+00",
    "0000-01-01 00:00:00+00",
    "2025-02-29 00:00:00+00",
  ])
    assert.throws(() => holdNativeTime(v));
});
test("hold new date rejects impossible calendars, offsets and overflow, preserves permitted spelling", () => {
  for (const v of [
    "2025-02-29T00:00Z",
    "2026-13-01T00:00Z",
    "2026-01-01T24:00:00.000001Z",
    "2026-01-01T00:60Z",
    "2026-01-01T00:00:61Z",
    "2026-01-01T00:00+16",
    "2026-01-01T00:00+01:60",
    "0000-01-01T00:00Z",
    "999999-01-01T00:00Z",
    "2026-01-01",
    "2026-01-01T00:00",
    "2026-01-01T00:00:00.1234567Z",
  ])
    assert.throws(() => holdRequestTime(v), v);
  assert.equal(holdRequest(hbody()).next_review_at, future);
});
test("hold assessment mirrors Unicode scalar and Rust White_Space rather than UTF16 or JS trim", () => {
  assert.throws(() => holdAssessment("😀".repeat(19)));
  assert.equal(holdAssessment("😀".repeat(20)), "😀".repeat(20));
  assert.throws(() => holdAssessment("\u0085" + "x".repeat(19) + "\u0085"));
  assert.equal(
    holdAssessment("\uFEFF" + "x".repeat(19)),
    "\uFEFF" + "x".repeat(19),
  );
  assert.throws(() => holdAssessment("x".repeat(20) + "\ud800"));
});
test("hold queue all four families, exact literal identifiers, strict actual envelope and large revisions", () => {
  const rows = holdAdapter.module.holdKinds.map((k) => hrow(k));
  assert.deepEqual(holdQueue(hqueue(rows)).rows, rows);
  for (const change of [
    (r) => (r.version = 2),
    (r) => (r.extra = true),
    (r) => delete r.mode,
    (r) => (r.rows[0].hold.kind = "invoice"),
    (r) => (r.rows[1].hold.record_id = "not-uuid"),
    (r) => (r.rows[0].review_version = "01"),
    (r) => (r.rows[0].review_version = "9223372036854775808"),
    (r) => (r.rows[0].last_review = {}),
  ]) {
    const q = hqueue(structuredClone(rows));
    change(q);
    assert.throws(() => holdQueue(q));
  }
  const r = hrow();
  r.review_version = "9007199254740993";
  r.review_due_at = "2030-10-10 09:00:00.123456+00";
  r.last_review = {
    command_id: J,
    actor: U,
    recorded_at: native,
    assessment: hbody().assessment,
    review_scope: "entire_existing_hold",
    previous_review_version: "9007199254740992",
    previous_review_due_at: "-infinity",
    review_version: r.review_version,
    next_review_at: r.review_due_at,
  };
  assert.equal(holdQueue(hqueue([r])).rows[0].review_version, r.review_version);
  r.last_review.previous_review_version = "9007199254740991";
  assert.throws(() => holdQueue(hqueue([r])));
});
test("hold queue full tied page keeps opaque native cursor; malformed exhaustion and duplicate rows fail", () => {
  const rows = Array.from({ length: 100 }, (_, n) =>
    hrow("financial_document", `literal-${n}`),
  );
  for (const r of rows) r.review_due_at = "0001-01-01 00:00:00.123456+00 BC";
  const r = rows.at(-1),
    c = {
      review_due_at: r.review_due_at,
      kind: r.hold.kind,
      case_id: r.case_id,
      record_id: r.hold.record_id,
      incarnation_id: r.incarnation_id,
    };
  assert.deepEqual(holdQueue(hqueue(rows, c)).next_cursor, c);
  for (const q of [
    hqueue(rows.slice(1), c),
    hqueue(rows, { ...c, record_id: "changed" }),
    { ...hqueue(rows, c), exhausted: true },
    { ...hqueue(rows), exhausted: false },
    hqueue([rows[0], rows[0]]),
  ])
    assert.throws(() => holdQueue(q));
});
test("hold exact receipt binds omitted actor/assessment through original request and one microsecond matters", () => {
  const b = hbody(),
    r = hreceipt(b);
  assert.equal(
    holdReceipt(r, b).next_review_at,
    "2030-10-10 09:00:00.123456+00",
  );
  for (const change of [
    (r) => (r.actor = U),
    (r) => (r.assessment = b.assessment),
    (r) => (r.command_id = D),
    (r) => (r.subject = U),
    (r) => (r.incarnation_id = D),
    (r) => (r.hold.record_id = "R10000000"),
    (r) => (r.review_version = "2"),
    (r) => (r.claims_satisfied = true),
    (r) => (r.next_review_at = "2030-10-10 09:00:00.123457+00"),
  ]) {
    const v = structuredClone(r);
    change(v);
    assert.throws(() => holdReceipt(v, b));
  }
});
test("hold native transport string overload sends exact whitespace/key order once and preserves object callers", async () => {
  const f = fixture(),
    calls = [];
  f.context.activate();
  const p = f.context.capture();
  const transport = staffTransport(
    "http://127.0.0.1:56841/api",
    async (url, init) => {
      calls.push({ url, init });
      return new Response("{}", {
        headers: { "content-type": "application/json" },
      });
    },
  );
  const body =
    ' { "command_id" : "' + J + '", "assessment":"literal\\nspace" } ';
  await transport("/shop/claims/admin/hold_review", p, body);
  await transport("/shop/claims/admin/queue", p, { offset: 0 });
  assert.equal(calls[0].init.body, body);
  assert.equal(calls[1].init.body, '{"offset":0}');
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:56841/api/shop/claims/admin/hold_review",
  );
  assert.deepEqual(calls[0].init.headers, {
    Authorization: `Bearer ${p.bearer}`,
    "Content-Type": "application/json",
  });
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.redirect, "error");
  f.controller.dispose();
});
test("hold explicit preparation presaves exact original actor/body; dispatch and receipt preserve it", async () => {
  const f = hf();
  assert.equal(f.calls.length, 0);
  const body = await prepared(f);
  assert.equal(f.calls.length, 1);
  const before = f.controller.exportFile();
  assert.equal(JSON.parse(before).uncertain, false);
  const expected = JSON.parse(body);
  assert.equal(expected.assessment, hbody().assessment);
  assert.equal(expected.next_review_at, future);
  assert.equal(expected.hold.record_id, " R10000000\n");
  await f.controller.send();
  assert.equal(f.calls[1][0], "/shop/claims/admin/hold_review");
  assert.equal(f.calls[1][2], body);
  assert(f.controller.state.saved.confirmed);
  assert.equal(f.controller.state.saved.body_json, body);
  assert(f.controller.state.receipt);
  assert.equal(f.controller.state.queue.rows[0].review_version, "0");
  f.dispose();
});
test("hold saved retry after lost reply needs no queue, no future date, no current incarnation; import always unknown", async () => {
  const f = hf();
  const body = await prepared(f),
    file = f.controller.exportFile();
  f.reply(async () => {
    throw Error("lost after possible commit");
  });
  await f.controller.send();
  assert(f.controller.state.saved.uncertain);
  assert(!f.controller.state.saved.confirmed);
  f.dispose();
  const fresh = hf();
  fresh.controller.importFile(file);
  assert(fresh.controller.state.saved.uncertain);
  assert(!fresh.controller.state.saved.confirmed);
  assert.equal(fresh.controller.state.queue, null);
  await fresh.controller.send();
  assert.equal(fresh.calls[0][2], body);
  assert(fresh.controller.state.receipt);
  fresh.dispose();
  const past = hf();
  const record = {
    schema_version: 1,
    actor: U,
    body_json: JSON.stringify(hbody({ next_review_at: "2001-01-01T00:00Z" })),
    uncertain: false,
    confirmed: false,
    receipts: [],
  };
  past.controller.importFile(JSON.stringify(record));
  await past.controller.send();
  assert.equal(past.calls.length, 1);
  assert(past.controller.state.receipt);
  past.dispose();
});
for (const status of [400, 401, 403, 409, 503])
  test(`hold imported unknown remains pending on ${status}; no new local decision`, async () => {
    const f = hf();
    const file = {
      schema_version: 1,
      actor: U,
      body_json: JSON.stringify(hbody()),
      uncertain: false,
      confirmed: false,
      receipts: [],
    };
    f.controller.importFile(JSON.stringify(file));
    f.reply(async () => response({}, status));
    await f.controller.send();
    assert(f.controller.state.saved.uncertain);
    assert(!f.controller.state.saved.confirmed);
    assert.equal(f.controller.state.saved.body_json, file.body_json);
    f.reply(async () => response(hqueue()));
    await f.controller.queue();
    f.controller.select(f.controller.state.queue.rows[0]);
    f.controller.edit(hbody().assessment, future, true);
    f.controller.prepare();
    assert.equal(f.controller.state.error, "pending");
    assert.equal(f.storage.length, 1);
    f.dispose();
  });
test("hold distinct same-hold imported records remain separate; collision and malformed storage cannot overwrite", async () => {
  const f = hf(),
    a = {
      schema_version: 1,
      actor: U,
      body_json: JSON.stringify(hbody()),
      uncertain: false,
      confirmed: false,
      receipts: [],
    },
    b = { ...a, body_json: JSON.stringify(hbody({ command_id: D })) };
  f.controller.importFile(JSON.stringify(a));
  f.controller.importFile(JSON.stringify(b));
  assert.equal(f.storage.length, 2);
  f.controller.loadSaved();
  assert.equal(f.controller.state.records.length, 2);
  const before = [...f.storage.map];
  f.controller.importFile(JSON.stringify({ ...a, actor: V }));
  assert.deepEqual([...f.storage.map], before);
  f.storage.map.set("bootstrap.staff-hold-review.v1." + J, "{}");
  f.controller.selectSaved(J);
  await f.controller.send();
  assert.equal(f.calls.length, 0);
  f.dispose();
});
for (const mode of ["denied", "readback"])
  test(`hold ${mode} presave prevents dispatch`, async () => {
    const f = hf();
    await prepared(f);
    const before = [...f.storage.map];
    if (mode === "denied")
      f.storage.setItem = () => {
        throw Error("quota");
      };
    else f.storage.setItem = () => {};
    await f.controller.send();
    assert.equal(f.calls.length, 1);
    assert.deepEqual([...f.storage.map], before);
    assert.equal(f.controller.state.receipt, null);
    f.dispose();
  });
test("hold receipt write failure keeps exact pending original and qualified unsaved history", async () => {
  const f = hf(),
    body = await prepared(f);
  f.reply(async (path, p, raw) => {
    f.storage.setItem = () => {
      throw Error("quota after response");
    };
    return response(hreceipt(JSON.parse(raw)));
  });
  await f.controller.send();
  assert(f.controller.state.receipt);
  assert(f.controller.state.receiptUnsaved);
  assert(f.controller.state.saved.uncertain);
  assert(!f.controller.state.saved.confirmed);
  assert.equal(f.controller.state.saved.body_json, body);
  f.dispose();
});
test("hold wrong original actor cannot send; fresh session for original actor can recover exact command", async () => {
  const f = hf(),
    body = await prepared(f);
  user.setStates(login(V, T));
  await f.controller.send();
  assert.equal(f.controller.state.error, "actor");
  assert.equal(f.calls.length, 1);
  user.setStates(login());
  await f.controller.send();
  assert.equal(f.calls[1][2], body);
  assert(f.controller.state.receipt);
  f.dispose();
});
test("hold terminal disposal suppresses a held review response without rewriting its original", async () => {
  const f = hf(),
    held = defer();
  const body = await prepared(f);
  f.reply(() => held.promise);
  const work = f.controller.send();
  await flush();
  f.controller.dispose();
  held.resolve(response(hreceipt(JSON.parse(body))));
  await work;
  assert.equal(f.controller.state.receipt, null);
  assert.equal(f.controller.state.saved.body_json, body);
  assert(f.controller.state.saved.uncertain);
  f.ordinary.dispose();
});
for (const status of [401, 403])
  test(`hold shared exact-current ${status} clears both panels before body and child disposal preserves page context`, async () => {
    const f = fixture();
    await f.controller.queue();
    f.controller.select(selection);
    await f.controller.detail();
    const denial = unreadable(status);
    let deny = false;
    const h = createCommercialHoldReview(
      f.context,
      staffTransport("http://127.0.0.1:56841", async () => {
        if (deny) return denial.response;
        return new Response(JSON.stringify(hqueue()), {
          headers: { "content-type": "application/json" },
        });
      }),
      () => memory(),
    );
    await h.queue();
    assert(h.state.queue);
    deny = true;
    await h.queue();
    assert.equal(h.state.queue, null);
    assert.equal(f.controller.state.detail, null);
    assert.equal(denial.seen.body, 0);
    assert.equal(user.getAccessToken(), token());
    h.dispose();
    assert(f.context.activate());
    await f.controller.queue();
    assert.equal(f.controller.state.queue.length, 1);
    f.controller.dispose();
  });
test("hold replaced proof ignores late denied response and earlier queue200 cannot republish after current denial", async () => {
  const f = hf(),
    held = defer();
  f.reply(() => held.promise);
  const work = f.controller.queue();
  user.setStates(login(V, T));
  f.reply(async () => response(hqueue()));
  await f.controller.queue();
  held.resolve(response({}, 401));
  await work;
  assert(f.controller.state.queue);
  assert(f.context.capture());
  const h = defer();
  f.reply(() => h.promise);
  const old = f.controller.queue();
  f.reply(async () => response({}, 403));
  await f.controller.queue();
  h.resolve(response(hqueue()));
  await old;
  assert.equal(f.controller.state.queue, null);
  f.dispose();
});

test("hold next page forwards full released-row cursor; head reload invalidates held page without clearing pending", async () => {
  const f = hf(),
    rows = Array.from({ length: 100 }, (_, n) =>
      hrow("financial_document", `tie-${n}`),
    ),
    last = rows.at(-1),
    c = {
      review_due_at: last.review_due_at,
      kind: last.hold.kind,
      case_id: last.case_id,
      record_id: last.hold.record_id,
      incarnation_id: last.incarnation_id,
    };
  f.reply(async () => response(hqueue(rows, c)));
  await f.controller.queue();
  const held = defer();
  f.reply(() => held.promise);
  const next = f.controller.queue(true);
  assert.equal(JSON.parse(f.calls.at(-1)[2]).cursor.record_id, "tie-99");
  f.reply(async () => response(hqueue([])));
  await f.controller.queue();
  held.resolve(response(hqueue([hrow()])));
  await next;
  assert.deepEqual(f.controller.state.queue.rows, []);
  f.dispose();
});
test("hold maximum revision cannot prepare; missing confirmation and short scalar assessment do not create records", async () => {
  const f = hf();
  await f.controller.queue();
  f.controller.select(f.controller.state.queue.rows[0]);
  f.controller.edit("😀".repeat(19), future, true);
  f.controller.prepare();
  assert.equal(f.storage.length, 0);
  f.controller.edit(hbody().assessment, future, false);
  f.controller.prepare();
  assert.equal(f.storage.length, 0);
  const r = hrow();
  r.review_version = "9223372036854775807";
  r.review_due_at = native;
  r.last_review = {
    command_id: J,
    actor: U,
    recorded_at: native,
    assessment: hbody().assessment,
    review_scope: "entire_existing_hold",
    previous_review_version: "9223372036854775806",
    previous_review_due_at: "infinity",
    review_version: r.review_version,
    next_review_at: native,
  };
  f.reply(async () => response(hqueue([r])));
  await f.controller.queue();
  f.controller.select(f.controller.state.queue.rows[0]);
  f.controller.edit(hbody().assessment, future, true);
  f.controller.prepare();
  assert.equal(f.storage.length, 0);
  f.dispose();
});
test("hold network and successful unreadable body do not infer authority loss or erase pending history", async () => {
  for (const mode of ["network", "body"]) {
    const f = fixture(),
      s = memory();
    let deny = false;
    const h = createCommercialHoldReview(
      f.context,
      staffTransport("http://127.0.0.1:56841", async () => {
        if (deny) {
          if (mode === "network") throw Error("offline");
          return unreadable(200, "rejected").response;
        }
        return new Response(JSON.stringify(hqueue()), {
          headers: { "content-type": "application/json" },
        });
      }),
      () => s,
      () => J,
    );
    await h.queue();
    h.select(h.state.queue.rows[0]);
    h.edit(hbody().assessment, future, true);
    h.prepare();
    const original = h.state.saved.body_json;
    deny = true;
    await h.send();
    assert(f.context.capture());
    assert(h.state.saved.uncertain);
    assert.equal(h.state.saved.body_json, original);
    h.dispose();
    f.controller.dispose();
  }
});
for (const language of ["de", "en-US"])
  test(`mounted hold ${language}: explicit selection/save/lost response/import/row-independent exact recovery and shared denial`, async () => {
    const f = fixture(),
      h = host(),
      win = new EventTarget(),
      doc = new EventTarget(),
      storage = memory(),
      calls = [];
    win.localStorage = storage;
    let lost = true,
      deny = false;
    const denial = unreadable(language === "de" ? 401 : 403);
    globals({
      window: win,
      document: doc,
      Document: class {},
      ShadowRoot: class {},
      definePageMeta() {},
      useNuxtApp: () => ({ runWithContext: (fn) => fn() }),
      useRuntimeConfig: () => ({
        public: { BASE_API_URL: "http://127.0.0.1:56841" },
      }),
      ...user,
      fetch: async (url, init) => {
        calls.push({ url, init });
        if (deny) return denial.response;
        let data;
        if (url.endsWith("/hold_queue")) data = hqueue();
        else if (url.endsWith("/hold_review")) {
          if (lost) {
            lost = false;
            throw Error("response lost after possible commit");
          }
          data = hreceipt(JSON.parse(init.body));
        } else
          data = url.endsWith("/queue")
            ? [queueRow()]
            : url.endsWith("/detail")
              ? JSON.parse(rawDetail())
              : capacity();
        return new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json" },
        });
      },
    });
    const messages = JSON.parse(
        await readFile(
          new URL(`../locales/${language}.json`, import.meta.url),
          "utf8",
        ),
      ),
      app = h.renderer.createApp(page);
    app.component("NuxtLink", {
      render() {
        return Vue.h("a", null, this.$slots.default?.());
      },
    });
    app.use(
      createI18n({
        legacy: false,
        locale: language,
        messages: { [language]: messages },
      }),
    );
    app.mount(h.root);
    const find = (key) => h.all().find((n) => Object.hasOwn(n.props, key));
    try {
      assert.equal(calls.length, 0);
      assert(find("data-hold-next").props.disabled);
      await find("data-hold-head").props.onClick();
      await flush();
      await find("data-hold-row").props.onClick();
      await flush();
      assert(h.text().includes("Exact original <script> basis"));
      assert(!h.all().some((n) => n.type === "script"));
      find("data-hold-assessment").props.onInput({
        target: { value: hbody().assessment },
      });
      find("data-hold-date").props.onInput({ target: { value: future } });
      find("data-hold-scope").props.onChange({ target: { checked: true } });
      await flush();
      await find("data-hold-prepare").props.onClick();
      await flush();
      assert(find("data-hold-command"));
      assert.equal(calls.length, 1);
      const original = JSON.parse([...storage.map.values()][0]),
        body = original.body_json;
      await find("data-hold-send").props.onClick();
      await flush();
      assert(!find("data-hold-receipt"));
      assert.equal(JSON.parse([...storage.map.values()][0]).uncertain, true);
      storage.map.clear();
      await find("data-hold-import").props.onChange({
        target: {
          files: [{ text: async () => JSON.stringify(original) }],
          value: "synthetic",
        },
      });
      await flush();
      assert(JSON.parse([...storage.map.values()][0]).uncertain);
      // The ordinary page's denial clears the live hold queue, not the saved original.
      await find("data-load-queue").props.onClick();
      await flush();
      await h
        .all()
        .find((n) => n.props["data-case"] === C)
        .props.onClick();
      await find("data-load-detail").props.onClick();
      await flush();
      deny = true;
      await find("data-load-capacity").props.onClick();
      await flush();
      assert(!find("data-hold-queue"));
      assert(!find("data-selected"));
      assert(find("data-hold-command"));
      assert.equal(denial.seen.body, 0);
      deny = false;
      await find("data-hold-send").props.onClick();
      await flush();
      assert(find("data-hold-receipt"));
      assert(!find("data-hold-queue"));
      const posts = calls.filter((r) => r.url.endsWith("/hold_review"));
      assert.equal(posts.length, 2);
      assert(posts.every((r) => r.init.body === body));
      assert.equal(JSON.parse([...storage.map.values()][0]).body_json, body);
      assert(
        h
          .text()
          .includes(
            language === "de" ? "früheren Vorgang" : "historical evidence",
          ),
      );
      assert.equal(user.getAccessToken(), token());
    } finally {
      app.unmount();
      f.controller.dispose();
      assert.equal(scopedCookies, 0);
    }
  });

test("hold actual interleaved preparation preserves both originals without claiming an atomic tab lock", async () => {
  const f = hf(),
    other = createCommercialHoldReview(
      f.context,
      async () => response(hqueue()),
      () => f.storage,
      () => D,
    );
  await f.controller.queue();
  f.controller.select(f.controller.state.queue.rows[0]);
  f.controller.edit(hbody().assessment, future, true);
  await other.queue();
  other.select(other.state.queue.rows[0]);
  other.edit(hbody().assessment, future, true);
  const write = f.storage.setItem;
  let interleaved = false;
  f.storage.setItem = (key, value) => {
    if (!interleaved) {
      interleaved = true;
      other.prepare();
    }
    write(key, value);
  };
  f.controller.prepare();
  assert(interleaved);
  assert.equal(f.storage.length, 2);
  f.controller.loadSaved();
  assert.equal(f.controller.state.records.length, 2);
  assert.notEqual(
    JSON.parse(f.controller.state.saved.body_json).command_id,
    JSON.parse(other.state.saved.body_json).command_id,
  );
  assert(
    f.controller.state.records.every(
      (r) =>
        r.body_json === f.controller.state.saved.body_json ||
        r.body_json === other.state.saved.body_json,
    ),
  );
  other.dispose();
  f.dispose();
});
test("hold busy duplicate and same-actor proof ABA cannot republish an old receipt; explicit exact retry remains possible", async () => {
  const f = hf(),
    body = await prepared(f),
    held = defer();
  f.reply(() => held.promise);
  const work = f.controller.send();
  await flush();
  await f.controller.send();
  assert.equal(f.calls.length, 2);
  user.setStates(login(V, T));
  user.setStates(login());
  held.resolve(response(hreceipt(JSON.parse(body))));
  await work;
  assert.equal(f.controller.state.receipt, null);
  assert(f.controller.state.saved.uncertain);
  assert(!f.controller.state.saved.confirmed);
  assert.equal(f.controller.state.saved.body_json, body);
  f.reply(async () => response(hreceipt(JSON.parse(body))));
  await f.controller.send();
  assert(f.controller.state.receipt);
  assert.equal(f.calls[2][2], body);
  f.dispose();
});

test("hold a generated command collision cannot downgrade attempted history or overwrite a saved receipt", async () => {
  const f = hf();
  await prepared(f);
  await f.controller.send();
  const before = [...f.storage.map];
  const other = createCommercialHoldReview(
    f.context,
    async () => response(hqueue()),
    () => f.storage,
    () => J,
  );
  await other.queue();
  other.select(other.state.queue.rows[0]);
  other.edit(hbody().assessment, future, true);
  other.prepare();
  assert.equal(other.state.saved, null);
  assert.deepEqual([...f.storage.map], before);
  other.dispose();
  f.dispose();
});

function importRecord(id = J) {
  return JSON.stringify({
    schema_version: 1,
    actor: U,
    body_json: JSON.stringify(hbody({ command_id: id })),
    uncertain: false,
    confirmed: false,
    receipts: [],
  });
}
async function mountedImports(language = "en-US") {
  const f = fixture(),
    h = host(),
    storage = memory(),
    win = new EventTarget(),
    doc = new EventTarget(),
    calls = [];
  win.localStorage = storage;
  globals({
    window: win,
    document: doc,
    Document: class {},
    ShadowRoot: class {},
  });
  const transport = staffTransport(
    "http://127.0.0.1:56841",
    async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(hreceipt(JSON.parse(init.body))), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  const app = h.renderer.createApp(holdComponent.module.default, {
    context: f.context,
    transport,
  });
  const messages = JSON.parse(
    await readFile(
      new URL(`../locales/${language}.json`, import.meta.url),
      "utf8",
    ),
  );
  app.use(
    createI18n({
      legacy: false,
      locale: language,
      messages: { [language]: messages },
    }),
  );
  app.mount(h.root);
  const find = (key) => h.all().find((n) => Object.hasOwn(n.props, key));
  const input = { files: [], value: "" };
  function start(promise, name = "file") {
    input.files = [{ text: () => promise }];
    input.value = name;
    return find("data-hold-import").props.onChange({ target: input });
  }
  const selected = () => find("data-hold-body")?.text || null;
  const choose = async (id) => {
    h.all()
      .find((n) => n.props["data-hold-saved"] === id)
      .props.onClick();
    await flush();
  };
  return {
    f,
    h,
    storage,
    calls,
    input,
    start,
    find,
    selected,
    choose,
    async put(raw) {
      await start(Promise.resolve(raw));
      await flush();
    },
    dispose() {
      app.unmount();
      f.controller.dispose();
      assert.equal(scopedCookies, 0);
    },
  };
}
test("HF1 mounted late A success after completed B must not persist or replace B", async () => {
  const m = await mountedImports(),
    a = defer();
  try {
    const work = m.start(a.promise, "A");
    await m.put(importRecord(D));
    const before = [...m.storage.map];
    a.resolve(importRecord(J));
    await work;
    await flush();
    assert.equal(m.selected(), JSON.parse(importRecord(D)).body_json);
    assert.deepEqual([...m.storage.map], before);
    assert.equal(m.calls.length, 0);
  } finally {
    m.dispose();
  }
});
test("HF1 mounted obsolete success/finally cannot clear a newer still-pending file input", async () => {
  const m = await mountedImports(),
    a = defer(),
    b = defer();
  try {
    const wa = m.start(a.promise, "A"),
      wb = m.start(b.promise, "B");
    a.resolve(importRecord(J));
    await wa;
    await flush();
    assert.equal(m.input.value, "B");
    assert.equal(m.storage.length, 0);
    assert.equal(m.selected(), null);
    b.resolve(importRecord(D));
    await wb;
    await flush();
    assert.equal(m.input.value, "");
    assert.equal(m.selected(), JSON.parse(importRecord(D)).body_json);
    assert.equal(m.storage.length, 1);
  } finally {
    a.resolve(importRecord(J));
    b.resolve(importRecord(D));
    m.dispose();
  }
});
test("HF1 mounted obsolete File.text rejection preserves newer error and input", async () => {
  const m = await mountedImports(),
    a = defer(),
    b = defer();
  try {
    const wa = m.start(a.promise, "A");
    await m.put(importRecord(D));
    m.f.context.invalidate();
    await flush();
    const error = m.find("data-hold-error").text;
    const wb = m.start(b.promise, "B");
    a.reject(Error("old read failure"));
    await wa;
    await flush();
    assert.equal(m.input.value, "B");
    assert.equal(m.find("data-hold-error")?.text || "", error);
    b.resolve(importRecord(J));
    await wb;
    await flush();
    assert.equal(m.selected(), JSON.parse(importRecord(J)).body_json);
  } finally {
    b.resolve(importRecord(J));
    m.dispose();
  }
});
test("HF1 mounted saved selection away-and-back cancels held A without changing originals", async () => {
  const m = await mountedImports(),
    a = defer();
  try {
    await m.put(importRecord(D));
    await m.put(importRecord(C));
    await m.choose(D);
    const before = [...m.storage.map],
      work = m.start(a.promise, "A");
    await m.choose(C);
    await m.choose(D);
    a.resolve(importRecord(J));
    await work;
    await flush();
    assert.equal(m.selected(), JSON.parse(importRecord(D)).body_json);
    assert.deepEqual([...m.storage.map], before);
    assert.equal(m.input.value, "A");
  } finally {
    m.dispose();
  }
});
test("HF1 mounted proof away-and-back invalidates import even after the same actor returns", async () => {
  const m = await mountedImports(),
    a = defer();
  try {
    await m.put(importRecord(D));
    const before = [...m.storage.map],
      work = m.start(a.promise, "A");
    user.setStates(login(V, T));
    user.setStates(login());
    await flush();
    const error = m.find("data-hold-error").text;
    a.resolve(importRecord(J));
    await work;
    await flush();
    assert.equal(m.selected(), JSON.parse(importRecord(D)).body_json);
    assert.deepEqual([...m.storage.map], before);
    assert.equal(m.find("data-hold-error").text, error);
    assert.equal(m.input.value, "A");
  } finally {
    m.dispose();
  }
});
test("HF1 mounted completed send interval invalidates held import; busy false is insufficient", async () => {
  const m = await mountedImports(),
    a = defer();
  try {
    await m.put(importRecord(D));
    const work = m.start(a.promise, "A");
    await m.find("data-hold-send").props.onClick();
    await flush();
    assert(m.find("data-hold-receipt"));
    assert.equal(m.find("data-hold-send").props.disabled, false);
    const before = [...m.storage.map];
    a.resolve(importRecord(J));
    await work;
    await flush();
    assert(m.find("data-hold-receipt"));
    assert.equal(m.selected(), JSON.parse(importRecord(D)).body_json);
    assert.deepEqual([...m.storage.map], before);
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].init.body, JSON.parse(importRecord(D)).body_json);
  } finally {
    m.dispose();
  }
});
test("HF1 mounted disposal suppresses late rejection and input cleanup without persistence", async () => {
  const m = await mountedImports(),
    a = defer();
  const work = m.start(a.promise, "A");
  m.dispose();
  a.reject(Error("late disposed file"));
  await work;
  assert.equal(m.input.value, "A");
  assert.equal(m.storage.length, 0);
  assert.equal(m.calls.length, 0);
});
for (const language of ["de", "en-US"])
  test(`HF1 mounted ${language} current proofless import remains uncertain exact history, no automatic send`, async () => {
    const m = await mountedImports(language);
    try {
      user.setStates(null);
      await flush();
      await m.put(importRecord(J));
      const r = JSON.parse([...m.storage.map.values()][0]);
      assert(r.uncertain);
      assert(!r.confirmed);
      assert.equal(r.actor, U);
      assert.equal(r.body_json, JSON.parse(importRecord(J)).body_json);
      assert.equal(m.selected(), r.body_json);
      assert.equal(m.calls.length, 0);
      assert(!m.find("data-hold-queue"));
      assert.equal(m.input.value, "");
    } finally {
      m.dispose();
    }
  });

// Determination: the existing95 controls above remain distinct regression cases.
const {
  createCommercialDetermination,
  determinationJson,
  determinationRequest,
  determinationSaved,
  determinationStatus,
  determinationSameBody,
  determinationInteger,
  determinationAssessment,
} = determinationAdapter.module;
const DJ = "55000000-0000-4000-8000-000000000001",
  DK = "55000000-0000-4000-8000-000000000002";
const dtarget = (command_id = null) => ({
  case_id: C,
  subject: U,
  obligation_id: O,
  command_id,
});
const dbody = () => ({
  command_id: DJ,
  case_id: C,
  obligation_id: O,
  units: "9007199254740993",
  cash_units: null,
  assessment: "Exact synthetic assessment with sufficient characters",
  evidence: {
    summary: "Synthetic bounded evidence",
    references: [{ kind: "record", reference: "9007199254740993" }],
  },
  subject: U,
  expected_obligation: {
    status: "pending_evidence",
    units: null,
    cash_units: null,
    determination_json: null,
  },
});
const dreceipt = () => ({
  obligation_id: O,
  status: "established",
  paid: false,
});
const dstatus = () => ({
  protocol: 1,
  case_id: C,
  subject: U,
  observed_at: native,
  obligation: {
    id: O,
    source: "",
    source_key: "",
    component: "",
    status: "pending_evidence",
    units: null,
    cash_units: null,
    original_json: "9007199254740993",
    determination_json: null,
  },
  journal: null,
});
const dsaved = (id = DJ) => ({
  schema_version: 1,
  actor: U,
  case_id: C,
  subject: U,
  obligation_id: O,
  command_id: id,
  body_json: JSON.stringify({ ...dbody(), command_id: id }, null, 2),
  preparation: { observed_at: native },
  uncertain: false,
  receipts: [],
  claimed_receipts: [],
});
const dkey = (id = DJ) => "bootstrap.staff-determination.v1." + id;
function df(store = memory(), fetcher) {
  const f = fixture();
  let reply = async () => response(dstatus()),
    ids = 0;
  const calls = [];
  const replyTransport = async (...args) => {
    calls.push(args);
    return reply(...args);
  };
  const transport = fetcher
    ? staffTransport("http://127.0.0.1:56841", fetcher)
    : replyTransport;
  const controller = createCommercialDetermination(
    f.context,
    transport,
    () => store,
    () => {
      ids++;
      return DJ;
    },
  );
  return {
    ...f,
    controller,
    base: f.controller,
    calls,
    store,
    get ids() {
      return ids;
    },
    reply(fn) {
      reply = fn;
    },
    async prepared() {
      controller.setTarget(selection);
      controller.editObligation(O);
      await controller.loadStatus();
      controller.edit("units", dbody().units);
      controller.edit("assessment", dbody().assessment);
      controller.edit("summary", "Synthetic bounded evidence");
      controller.edit("confirm", true);
      controller.prepare();
      assert(controller.state.saved);
      return controller.state.saved.body_json;
    },
    dispose() {
      controller.dispose();
      f.controller.dispose();
    },
  };
}
const reverseObject = (v) => {
  if (Array.isArray(v)) return v.map(reverseObject);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .reverse()
        .map(([k, x]) => [k, reverseObject(x)]),
    );
  return v;
};
function journal(body = JSON.stringify(dbody())) {
  return {
    id: "-9223372036854775808",
    case_id: C,
    obligation_id: O,
    actor: U,
    command_id: DJ,
    kind: "determine",
    request_json: body,
    result_json: JSON.stringify(dreceipt()),
    recorded_at: "infinity",
  };
}
test("determination token admission refuses numbers and decoded duplicate keys before ordinary parsing", () => {
  const good = JSON.stringify(dbody());
  assert.equal(determinationRequest(good).units, "9007199254740993");
  for (const raw of [
    '{"a":1}',
    '{"a":-0}',
    '{"a":1e9999}',
    '{"a":false,"\\u0061":true}',
    '{"a":{"b":"x","b":"y"}}',
    '{"a":["1",2]}',
    '{"a":"\\ud800"}',
    '{"a":"\\u0000"}',
    '{"a":"x",}',
    '["x",]',
    '{"a":"\\x"}',
  ])
    assert.throws(() => determinationJson(raw), raw);
  assert.deepEqual(
    determinationJson(
      '{"digits":"9007199254740993","escaped":"a\\\"b","nested":"{\\"x\\":1}"}',
    ),
    { digits: "9007199254740993", escaped: 'a"b', nested: '{"x":1}' },
  );
  assert.throws(() =>
    determinationRequest(
      good.replace('"units":"9007199254740993"', '"units":9007199254740993'),
    ),
  );
  assert.throws(() =>
    determinationJson('{"schema_version":1,"schema_version":1}', false),
  );
});
test("determination exact grammar preserves SQL-space scalar assessment and i64/null amounts", () => {
  assert.equal(
    determinationInteger("-9223372036854775808", true),
    "-9223372036854775808",
  );
  for (const v of [
    "-0",
    "01",
    "+1",
    "9223372036854775808",
    "-9223372036854775809",
    12,
  ])
    assert.throws(() => determinationInteger(v, true));
  assert.equal(determinationAssessment("\t".repeat(20)), "\t".repeat(20));
  assert.throws(() => determinationAssessment(" " + "😀".repeat(19) + " "));
  assert.equal(determinationAssessment("😀".repeat(20)), "😀".repeat(20));
  for (const change of [
    (b) => delete b.cash_units,
    (b) => (b.extra = "x"),
    (b) => (b.evidence.extra = "x"),
    (b) => (b.units = "01"),
    (b) => (b.expected_obligation.units = "8"),
    (b) => (b.evidence.references[0].extra = "x"),
    (b) => (b.cash_units = "9223372036854775807"),
    (b) => (b.assessment = "\udfff".repeat(20)),
  ]) {
    const b = dbody();
    change(b);
    assert.throws(() => determinationRequest(JSON.stringify(b)));
  }
  const b = dbody();
  b.cash_units = "0";
  b.evidence.cash_basis = " ".repeat(20);
  assert.equal(determinationRequest(JSON.stringify(b)).cash_units, "0");
  b.expected_obligation.determination_json = '{"old":9007199254740993}';
  assert.equal(
    determinationRequest(JSON.stringify(b)).expected_obligation
      .determination_json,
    b.expected_obligation.determination_json,
  );
});
test("determination actual status fields preserve scalar JSON, SQL-null/JSONB-null, signed IDs and native dates", () => {
  const s = dstatus();
  s.obligation.cash_units = "7";
  s.obligation.determination_json = "null";
  s.journal = journal();
  const p = determinationStatus(s, dtarget(DJ));
  assert.equal(p.obligation.units, null);
  assert.equal(p.obligation.cash_units, "7");
  assert.equal(p.obligation.original_json, "9007199254740993");
  assert.equal(p.obligation.determination_json, "null");
  assert.equal(p.journal.id, "-9223372036854775808");
  for (const date of [
    "infinity",
    "-infinity",
    "0001-01-01 00:00:00+00 BC",
    "294276-12-31 23:59:59.999999+00",
  ]) {
    s.journal.recorded_at = date;
    assert.equal(determinationStatus(s, dtarget(DJ)).journal.recorded_at, date);
  }
  for (const change of [
    (s) => delete s.obligation.id,
    (s) => (s.obligation.obligation_id = O),
    (s) => (s.journal.subject = U),
    (s) => (s.journal.id = "9223372036854775808"),
    (s) => (s.observed_at = "infinity"),
    (s) => (s.journal.command_id = DK),
    (s) => (s.subject = V),
    (s) => (s.obligation.units = 1),
    (s) => delete s.obligation.cash_units,
    (s) => (s.obligation.determination_json = {}),
    (s) => (s.journal.request_json = {}),
  ]) {
    const s = dstatus();
    s.journal = journal();
    change(s);
    assert.throws(() => determinationStatus(s, dtarget(DJ)));
  }
  assert.throws(() =>
    determinationStatus({ ...dstatus(), journal: journal() }, dtarget()),
  );
});
test("determination supported structural comparison ignores object order but never rewrites dispatch", async () => {
  const record = dsaved(),
    reordered = JSON.stringify(reverseObject(JSON.parse(record.body_json)));
  assert(determinationSameBody(record.body_json, reordered));
  const b = dbody();
  b.evidence.references.reverse();
  b.assessment += " ";
  assert.equal(
    determinationSameBody(record.body_json, JSON.stringify(b)),
    false,
  );
  const nativeCalls = [],
    f = df(memory(), async (url, init) => {
      nativeCalls.push({ url, init });
      return new Response(JSON.stringify(dreceipt()), {
        headers: { "content-type": "application/json" },
      });
    });
  f.controller.importFile(JSON.stringify(record));
  await f.controller.send();
  assert.equal(nativeCalls.length, 1);
  const { url, init } = nativeCalls[0];
  assert.equal(url, "http://127.0.0.1:56841/shop/claims/admin/determine");
  assert.equal(init.body, record.body_json);
  assert.equal(init.credentials, "omit");
  assert.equal(init.redirect, "error");
  assert.equal(init.headers.Authorization, `Bearer ${token()}`);
  assert.equal(f.controller.state.receipt.paid, false);
  f.dispose();
});
test("determination validates before generating IDs and saves current exact tuple without dispatch", async () => {
  const f = df();
  f.controller.prepare();
  assert.equal(f.ids, 0);
  assert.equal(f.calls.length, 0);
  await f.prepared();
  assert.equal(f.ids, 1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], "/shop/claims/admin/determination_status");
  assert.deepEqual(JSON.parse(f.calls[0][2]), dtarget());
  const r = determinationSaved(JSON.parse(f.store.getItem(dkey())));
  assert.equal(r.uncertain, false);
  assert.equal(r.actor, U);
  assert.equal(r.preparation.observed_at, native);
  assert.deepEqual(
    determinationRequest(r.body_json).expected_obligation,
    dbody().expected_obligation,
  );
  f.controller.prepare();
  assert.equal(f.ids, 1);
  assert.equal(f.controller.state.error, "pending");
  f.dispose();
});
test("determination presend write/readback failure blocks dispatch and preserves original exact body", async () => {
  for (const mode of ["write", "readback"]) {
    const store = memory(),
      f = df(store);
    const original = await f.prepared();
    const oldSet = store.setItem.bind(store),
      oldGet = store.getItem.bind(store);
    let changed = false;
    store.setItem = (k, v) => {
      if (mode === "write") throw Error("quota");
      oldSet(k, v);
      changed = true;
    };
    store.getItem = (k) => (changed ? oldGet(k) + " " : oldGet(k));
    await f.controller.send();
    assert.equal(f.calls.length, 1);
    assert.equal(f.controller.state.saved.body_json, original);
    f.dispose();
  }
});
test("determination fresh imports always remain uncertain and claimed receipts are not qualified", () => {
  const f = df(),
    r = dsaved();
  r.uncertain = true;
  r.receipts = [dreceipt()];
  f.controller.importFile(JSON.stringify(r));
  assert.equal(f.controller.state.saved.uncertain, true);
  assert.equal(f.controller.state.saved.receipts.length, 0);
  assert.equal(f.controller.state.saved.claimed_receipts.length, 1);
  assert.equal(f.controller.state.receipt, null);
  assert.equal(f.calls.length, 0);
  const before = f.store.getItem(dkey());
  r.actor = V;
  f.controller.importFile(JSON.stringify(r));
  assert.equal(f.store.getItem(dkey()), before);
  assert.equal(f.controller.state.error, "import");
  f.dispose();
});
test("determination import cannot downgrade qualified local history and separate command originals survive", async () => {
  const f = df();
  const original = dsaved();
  f.controller.importFile(JSON.stringify(original));
  f.reply(async () => response(dreceipt()));
  await f.controller.send();
  assert.equal(f.controller.state.saved.receipts.length, 1);
  f.controller.importFile(JSON.stringify(original));
  assert.equal(f.controller.state.saved.receipts.length, 1);
  assert(f.controller.state.saved.uncertain);
  const bytes = f.store.getItem(dkey());
  f.controller.importFile(JSON.stringify(dsaved(DK)));
  assert.equal(f.store.getItem(dkey()), bytes);
  assert.equal(f.store.length, 2);
  f.dispose();
});
test("determination unsupported legacy stored/uploaded originals remain raw without repair or durable admission", () => {
  const f = df(),
    r = dsaved();
  r.body_json = r.body_json.replace(
    '"units": "9007199254740993"',
    '"units": 9007199254740993',
  );
  f.store.setItem(dkey(), JSON.stringify(r));
  f.controller.loadSaved();
  assert.equal(f.controller.state.unsupported.length, 1);
  assert.equal(f.controller.state.records.length, 0);
  const bytes = f.store.getItem(dkey());
  f.controller.importFile(JSON.stringify(r));
  assert.equal(f.store.getItem(dkey()), bytes);
  assert.equal(f.controller.state.saved, null);
  assert.equal(f.controller.state.importRaw, JSON.stringify(r));
  assert.equal(f.calls.length, 0);
  f.dispose();
});
test("determination unknown, absent, malformed and refused status never retire uncertainty or generate replacements", async () => {
  for (const reply of [
    () => response(dstatus()),
    () => response({}, 404),
    () => response({}, 409),
    () => response({}, 503),
    () => response({ ...dstatus(), journal: {} }),
    () => {
      throw Error("network");
    },
  ]) {
    const f = df();
    f.controller.importFile(JSON.stringify(dsaved()));
    f.reply(reply);
    await f.controller.loadStatus(true);
    assert(f.controller.state.saved.uncertain);
    assert.equal(f.controller.state.saved.receipts.length, 0);
    assert.equal(f.ids, 0);
    assert.equal(f.calls.length, 1);
    assert.equal(f.controller.state.saved.body_json, dsaved().body_json);
    f.dispose();
  }
});
test("determination original same actor retries without a live row using a fresh session; another actor cannot retag", async () => {
  const f = df();
  f.controller.importFile(JSON.stringify(dsaved()));
  user.setStates(login(V, T));
  await f.controller.send();
  assert.equal(f.calls.length, 0);
  assert.equal(f.controller.state.error, "actor");
  user.setStates(login(U, T));
  f.reply(async () => response(dreceipt()));
  await f.controller.send();
  assert.equal(f.calls.length, 1);
  assert.equal(f.controller.state.target, null);
  assert.equal(f.calls[0][1].sid, T);
  assert.equal(f.calls[0][2], dsaved().body_json);
  assert.equal(f.controller.state.receipt.paid, false);
  f.dispose();
});
test("determination journal recovery binds original actor/body while keeping later current state separate", async () => {
  const f = df();
  f.controller.importFile(JSON.stringify(dsaved()));
  const s = dstatus();
  s.obligation.status = "rejected";
  s.obligation.units = "4";
  s.obligation.determination_json = '{"later":true}';
  s.journal = journal(JSON.stringify(reverseObject(dbody())));
  f.reply(async () => response(s));
  await f.controller.loadStatus(true);
  assert.equal(f.controller.state.receipt.paid, false);
  assert.equal(f.controller.state.recovery.obligation.status, "rejected");
  assert.equal(f.calls.length, 1);
  assert.deepEqual(JSON.parse(f.calls[0][2]), dtarget(DJ));
  f.dispose();
});
test("determination wrong actor or immutable business field cannot qualify a matching-looking historical receipt", async () => {
  for (const edit of [
    (s) => (s.journal.actor = V),
    (s) =>
      (s.journal.request_json = JSON.stringify({ ...dbody(), units: "7" })),
    (s) =>
      (s.journal.result_json =
        '{"obligation_id":"' + O + '","status":"established","paid":true}'),
    (s) =>
      (s.journal.request_json = s.journal.request_json.replace(
        '"units":"9007199254740993"',
        '"units":9007199254740993',
      )),
  ]) {
    const f = df();
    f.controller.importFile(JSON.stringify(dsaved()));
    const s = dstatus();
    s.journal = journal();
    edit(s);
    f.reply(async () => response(s));
    await f.controller.loadStatus(true);
    assert.equal(f.controller.state.receipt, null);
    assert.equal(f.controller.state.saved.receipts.length, 0);
    assert.equal(f.controller.state.error, "history");
    assert(f.controller.state.recovery.journal);
    f.dispose();
  }
});
test("determination qualified response with receipt storage failure retains attempted original and explicit unsaved history", async () => {
  const store = memory(),
    f = df(store);
  f.controller.importFile(JSON.stringify(dsaved()));
  const set = store.setItem.bind(store);
  let calls = 0;
  store.setItem = (k, v) => {
    if (++calls === 2) throw Error("quota");
    set(k, v);
  };
  f.reply(async () => response(dreceipt()));
  await f.controller.send();
  assert.equal(f.calls.length, 1);
  assert(f.controller.state.receipt);
  assert(f.controller.state.receiptUnsaved);
  assert.equal(JSON.parse(store.getItem(dkey())).receipts.length, 0);
  assert(JSON.parse(store.getItem(dkey())).uncertain);
  f.dispose();
});
test("determination live target/form generations discard held away-and-back data and preserve independent saved recovery", async () => {
  const f = df();
  f.controller.importFile(JSON.stringify(dsaved()));
  const saved = f.controller.state.saved.body_json;
  f.controller.setTarget(selection);
  f.controller.editObligation(O);
  const held = defer();
  f.reply(() => held.promise);
  const work = f.controller.loadStatus();
  f.controller.setTarget({ id: D, subject: V });
  f.controller.setTarget(selection);
  f.controller.editObligation(O);
  held.resolve(response(dstatus()));
  await work;
  assert.equal(f.controller.state.live, null);
  assert.equal(f.controller.state.saved.body_json, saved);
  f.reply(async () => response({ ...dstatus(), journal: journal() }));
  await f.controller.loadStatus(true);
  assert(f.controller.state.receipt);
  f.dispose();
});
test("determination saved selection generation suppresses a held original receipt without rewriting either command", async () => {
  const f = df();
  f.controller.importFile(JSON.stringify(dsaved()));
  f.controller.importFile(JSON.stringify(dsaved(DK)));
  f.controller.selectSaved(DJ);
  const held = defer();
  f.reply(() => held.promise);
  const work = f.controller.loadStatus(true);
  f.controller.selectSaved(DK);
  f.controller.selectSaved(DJ);
  held.resolve(response({ ...dstatus(), journal: journal() }));
  await work;
  assert.equal(f.controller.state.receipt, null);
  assert.equal(JSON.parse(f.store.getItem(dkey())).receipts.length, 0);
  assert(f.store.getItem(dkey(DK)));
  f.dispose();
});
for (const code of [401, 403])
  test(`determination actual transport ${code} rejects matching proof before body and clears independent cached detail`, async () => {
    let denied = false;
    const refusal = unreadable(code, "rejected"),
      f = df(memory(), async () => {
        if (denied) return refusal.response;
        return new Response(JSON.stringify(dstatus()), {
          headers: { "content-type": "application/json" },
        });
      });
    await f.base.queue();
    f.base.select(selection);
    await f.base.detail();
    assert(f.base.state.detail);
    f.controller.setTarget(selection);
    f.controller.editObligation(O);
    await f.controller.loadStatus();
    denied = true;
    await f.controller.loadStatus();
    assert.equal(f.base.state.detail, null);
    assert.equal(f.controller.state.live, null);
    assert.equal(refusal.seen.body, 0);
    f.controller.dispose();
    assert(f.context.activate());
    assert.equal(user.getAccessToken(), token());
    f.base.dispose();
  });
test("determination replaced proof and terminal disposal suppress held responses, while shared current denial blocks older200", async () => {
  for (const mode of ["replacement", "dispose", "denial"]) {
    const f = df();
    f.controller.importFile(JSON.stringify(dsaved()));
    const held = defer();
    f.reply(() => held.promise);
    const work = f.controller.send();
    if (mode === "replacement") user.setStates(login(U, T));
    else if (mode === "dispose") f.controller.dispose();
    else f.context.reject(f.context.capture(), 401);
    held.resolve(response(dreceipt()));
    await work;
    assert.equal(JSON.parse(f.store.getItem(dkey())).receipts.length, 0);
    assert.equal(
      JSON.parse(f.store.getItem(dkey())).body_json,
      dsaved().body_json,
    );
    f.dispose();
  }
});
test("determination network and unreadable200 do not infer authentication rejection", async () => {
  for (const mode of ["network", "body"]) {
    const f = df(memory(), async () => {
      if (mode === "network") throw Error("network");
      return unreadable(200, "rejected").response;
    });
    f.controller.importFile(JSON.stringify(dsaved()));
    await f.controller.send();
    assert(f.context.capture());
    assert(f.controller.state.saved.uncertain);
    assert.equal(f.controller.state.receipt, null);
    f.dispose();
  }
});
async function mountedDetermination(language = "en-US") {
  const f = fixture(),
    h = host(),
    storage = memory(),
    win = new EventTarget(),
    doc = new EventTarget(),
    calls = [],
    target = Vue.ref(null);
  win.localStorage = storage;
  globals({
    window: win,
    document: doc,
    Document: class {},
    ShadowRoot: class {},
  });
  const transport = staffTransport(
    "http://127.0.0.1:56841",
    async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(dreceipt()), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  const app = h.renderer.createApp({
    setup: () => () =>
      Vue.h(determinationComponent.module.default, {
        context: f.context,
        transport,
        selected: target.value,
      }),
  });
  const messages = JSON.parse(
    await readFile(
      new URL(`../locales/${language}.json`, import.meta.url),
      "utf8",
    ),
  );
  app.use(
    createI18n({
      legacy: false,
      locale: language,
      messages: { [language]: messages },
    }),
  );
  app.mount(h.root);
  const find = (k) => h.all().find((n) => Object.hasOwn(n.props, k)),
    input = { files: [], value: "" };
  const start = (promise, name = "file") => {
    input.files = [{ text: () => promise }];
    input.value = name;
    return find("data-determination-import").props.onChange({ target: input });
  };
  const choose = async (id) => {
    h.all()
      .find((n) => n.props["data-determination-saved"] === id)
      .props.onClick();
    await flush();
  };
  return {
    f,
    h,
    storage,
    calls,
    target,
    input,
    find,
    start,
    choose,
    selected: () => find("data-determination-body")?.text || null,
    async put(r) {
      await start(Promise.resolve(JSON.stringify(r)));
      await flush();
    },
    dispose() {
      app.unmount();
      f.controller.dispose();
      assert.equal(scopedCookies, 0);
    },
  };
}
test("determination mounted File.text late A cannot persist or select itself after completed B", async () => {
  const m = await mountedDetermination(),
    a = defer();
  try {
    const w = m.start(a.promise, "A");
    await m.put(dsaved(DK));
    const old = [...m.storage.map];
    a.resolve(JSON.stringify(dsaved()));
    await w;
    await flush();
    assert.equal(m.selected(), dsaved(DK).body_json);
    assert.deepEqual([...m.storage.map], old);
    assert.equal(m.calls.length, 0);
  } finally {
    m.dispose();
  }
});
test("determination mounted old File.text success/finally preserves the newer still-pending input", async () => {
  const m = await mountedDetermination(),
    a = defer(),
    b = defer();
  try {
    const wa = m.start(a.promise, "A"),
      wb = m.start(b.promise, "B");
    a.resolve(JSON.stringify(dsaved()));
    await wa;
    await flush();
    assert.equal(m.input.value, "B");
    assert.equal(m.storage.length, 0);
    b.resolve(JSON.stringify(dsaved(DK)));
    await wb;
    await flush();
    assert.equal(m.input.value, "");
    assert.equal(m.selected(), dsaved(DK).body_json);
  } finally {
    m.dispose();
  }
});
test("determination mounted late file rejection cannot replace newer authority error or clear newer input", async () => {
  const m = await mountedDetermination(),
    a = defer(),
    b = defer();
  try {
    const wa = m.start(a.promise, "A");
    m.f.context.invalidate();
    await flush();
    const err = m.find("data-determination-error").text;
    const wb = m.start(b.promise, "B");
    a.reject(Error("old"));
    await wa;
    await flush();
    assert.equal(m.find("data-determination-error").text, err);
    assert.equal(m.input.value, "B");
    b.resolve(JSON.stringify(dsaved(DK)));
    await wb;
    await flush();
    assert.equal(m.selected(), dsaved(DK).body_json);
  } finally {
    m.dispose();
  }
});
test("determination mounted saved selection and proof away-back each cancel an obsolete import", async () => {
  for (const mode of ["selection", "proof"]) {
    const m = await mountedDetermination(),
      a = defer();
    try {
      await m.put(dsaved());
      await m.put(dsaved(DK));
      const w = m.start(a.promise, "A"),
        before = [...m.storage.map];
      if (mode === "selection") {
        await m.choose(DJ);
        await m.choose(DK);
      } else {
        user.setStates(login(V, T));
        user.setStates(login());
        await flush();
      }
      a.resolve(JSON.stringify(dsaved(C)));
      await w;
      await flush();
      assert.equal(m.selected(), dsaved(DK).body_json);
      assert.deepEqual([...m.storage.map], before);
      assert.equal(m.input.value, "A");
    } finally {
      m.dispose();
    }
  }
});
test("determination mounted completed send interval invalidates a held import even after busy ends", async () => {
  const m = await mountedDetermination(),
    a = defer();
  try {
    await m.put(dsaved());
    const w = m.start(a.promise, "A");
    await m.find("data-determination-send").props.onClick();
    await flush();
    assert(m.find("data-determination-receipt"));
    assert.equal(m.find("data-determination-send").props.disabled, false);
    const before = [...m.storage.map];
    a.resolve(JSON.stringify(dsaved(DK)));
    await w;
    await flush();
    assert.deepEqual([...m.storage.map], before);
    assert(m.find("data-determination-receipt"));
    assert.equal(m.calls[0].init.body, dsaved().body_json);
  } finally {
    m.dispose();
  }
});
test("determination mounted disposal blocks both late import success and error with no input cleanup", async () => {
  for (const rejects of [false, true]) {
    const m = await mountedDetermination(),
      a = defer();
    const w = m.start(a.promise, "A");
    m.dispose();
    if (rejects) a.reject(Error("closed"));
    else a.resolve(JSON.stringify(dsaved()));
    await w;
    assert.equal(m.input.value, "A");
    assert.equal(m.storage.length, 0);
    assert.equal(m.calls.length, 0);
  }
});
for (const language of ["de", "en-US"])
  test(`determination mounted ${language} proofless exact-history import remains uncertain without dispatch`, async () => {
    const m = await mountedDetermination(language);
    try {
      user.setStates(null);
      await flush();
      await m.put(dsaved());
      assert.equal(m.selected(), dsaved().body_json);
      const r = JSON.parse(m.storage.getItem(dkey()));
      assert(r.uncertain);
      assert.deepEqual(r.receipts, []);
      assert.equal(m.calls.length, 0);
      assert.equal(m.input.value, "");
      assert(!m.h.text().includes("Determination."));
    } finally {
      m.dispose();
    }
  });
for (const language of ["de", "en-US"])
  test(`determination mounted page ${language}: actual form/save/lost response/fresh import/history and independent shared denial`, async () => {
    const f = fixture(),
      h = host(),
      storage = memory(),
      win = new EventTarget(),
      doc = new EventTarget(),
      calls = [];
    win.localStorage = storage;
    let lost = true,
      deny = false,
      historical = false,
      body = null;
    const denial = unreadable(language === "de" ? 401 : 403, "held");
    globals({
      window: win,
      document: doc,
      Document: class {},
      ShadowRoot: class {},
      definePageMeta() {},
      useNuxtApp: () => ({ runWithContext: (fn) => fn() }),
      useRuntimeConfig: () => ({
        public: { BASE_API_URL: "http://127.0.0.1:56841" },
      }),
      ...user,
      fetch: async (url, init) => {
        calls.push({ url, init });
        if (deny) return denial.response;
        let data;
        if (url.endsWith("/determination_status")) {
          data = dstatus();
          if (historical) {
            data.obligation.status = "rejected";
            data.obligation.units = "2";
            data.journal = {
              ...journal(JSON.stringify(reverseObject(JSON.parse(body)))),
              command_id: JSON.parse(body).command_id,
            };
          }
        } else if (url.endsWith("/determine")) {
          body = init.body;
          assert.equal(
            JSON.parse(storage.getItem(dkey(JSON.parse(body).command_id)))
              .body_json,
            body,
          );
          assert(
            JSON.parse(storage.getItem(dkey(JSON.parse(body).command_id)))
              .uncertain,
          );
          if (lost) {
            lost = false;
            throw Error("lost response");
          }
          data = dreceipt();
        } else if (url.endsWith("/queue")) data = [queueRow()];
        else if (url.endsWith("/detail")) data = JSON.parse(rawDetail());
        else if (url.endsWith("/hold_queue")) data = hqueue();
        else throw Error("unexpected fixture operation " + url);
        return new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json" },
        });
      },
    });
    const app = h.renderer.createApp(page);
    app.component("NuxtLink", {
      render() {
        return Vue.h("a", null, this.$slots.default?.());
      },
    });
    const messages = JSON.parse(
      await readFile(
        new URL(`../locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    );
    app.use(
      createI18n({
        legacy: false,
        locale: language,
        messages: { [language]: messages },
      }),
    );
    app.mount(h.root);
    const find = (k) => h.all().find((n) => Object.hasOwn(n.props, k));
    try {
      assert.equal(calls.length, 0);
      await find("data-load-queue").props.onClick();
      await flush();
      h.all()
        .find((n) => n.props["data-case"] === C)
        .props.onClick();
      await flush();
      find("data-determination-obligation").props.onInput({
        target: { value: O },
      });
      await find("data-determination-status").props.onClick();
      await flush();
      assert.equal(
        find("data-determination-original").text,
        "9007199254740993",
      );
      for (const [key, value] of [
        ["units", "17"],
        ["assessment", dbody().assessment],
        ["summary", "Actual mounted synthetic evidence"],
      ])
        find("data-determination-" + key).props.onInput({ target: { value } });
      find("data-determination-confirm").props.onChange({
        target: { checked: true },
      });
      await flush();
      find("data-determination-prepare").props.onClick();
      await flush();
      const original = JSON.parse([...storage.map.values()][0]);
      assert.equal(original.uncertain, false);
      assert.equal(calls.filter((x) => x.url.endsWith("/determine")).length, 0);
      await find("data-determination-send").props.onClick();
      await flush();
      assert(find("data-determination-uncertain"));
      assert(!find("data-determination-receipt"));
      storage.map.clear();
      await find("data-determination-import").props.onChange({
        target: {
          files: [{ text: async () => JSON.stringify(original) }],
          value: "original",
        },
      });
      await flush();
      assert(JSON.parse([...storage.map.values()][0]).uncertain);
      await find("data-determination-reconcile").props.onClick();
      await flush();
      assert(find("data-determination-no-journal"));
      assert(!find("data-determination-receipt"));
      historical = true;
      await find("data-determination-reconcile").props.onClick();
      await flush();
      assert(find("data-determination-receipt"));
      assert(find("data-determination-history"));
      assert.equal(find("data-determination-body").text, original.body_json);
      await find("data-load-detail").props.onClick();
      await find("data-hold-head").props.onClick();
      await flush();
      assert(find("data-detail"));
      assert(find("data-hold-queue"));
      deny = true;
      await find("data-determination-reconcile").props.onClick();
      await flush();
      assert(!find("data-detail"));
      assert(!find("data-hold-queue"));
      assert(!find("data-determination-live"));
      assert(find("data-determination-command"));
      assert(!find("data-determination-receipt"));
      assert.equal(denial.seen.body, 0);
      assert.equal(
        JSON.parse([...storage.map.values()][0]).body_json,
        original.body_json,
      );
      assert(!h.text().includes("Determination."));
    } finally {
      app.unmount();
      f.controller.dispose();
      assert.equal(scopedCookies, 0);
    }
  });
test("determination interleaved preparations preserve both per-command originals without claiming an atomic tab lock", async () => {
  const f = df(),
    other = createCommercialDetermination(
      f.context,
      async () => response(dstatus()),
      () => f.store,
      () => DK,
    );
  for (const controller of [f.controller, other]) {
    controller.setTarget(selection);
    controller.editObligation(O);
    await controller.loadStatus();
    controller.edit("units", dbody().units);
    controller.edit("assessment", dbody().assessment);
    controller.edit("summary", "Synthetic separate tab");
    controller.edit("confirm", true);
  }
  const set = f.store.setItem.bind(f.store);
  let interleaved = false;
  f.store.setItem = (k, v) => {
    if (k === dkey() && !interleaved) {
      interleaved = true;
      other.prepare();
    }
    set(k, v);
  };
  f.controller.prepare();
  assert(interleaved);
  const a = JSON.parse(f.store.getItem(dkey())),
    b = JSON.parse(f.store.getItem(dkey(DK)));
  assert.equal(a.command_id, DJ);
  assert.equal(b.command_id, DK);
  assert.notEqual(a.body_json, b.body_json);
  assert.equal(a.actor, b.actor);
  assert(!a.uncertain && !b.uncertain);
  assert.equal(f.calls.length, 1);
  other.dispose();
  f.dispose();
});

const {
  retentionFamilies,
  retentionPage,
  retentionRowKey,
  createCommercialRetentionPage,
} = retentionAdapter.module;
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
for (const family of retentionFamilies)
  test(`retention exact ${family}: literal full-key rows, opaque JSON and immutable continuation`, () => {
    const input = retentionResult(family, 100, false);
    input.rows[99].number = '  unsupported/ä|"  ';
    input.next_cursor.after = retentionAfter(family, input.rows[99]);
    const parsed = retentionPage(input, family);
    assert.deepEqual(parsed, input);
    assert(
      Object.isFrozen(parsed) &&
        Object.isFrozen(parsed.rows) &&
        Object.isFrozen(parsed.rows[0]) &&
        Object.isFrozen(parsed.next_cursor.after),
    );
    assert.throws(() => {
      parsed.next_cursor.after.number = "changed";
    });
    assert.deepEqual(
      retentionPage(retentionResult(family, 100, true), family).rows.length,
      100,
    );
    assert.equal(
      retentionPage(retentionResult(family, 0), family).exhausted,
      true,
    );
    const corrupt = structuredClone(input);
    corrupt.rows[0].extra = null;
    assert.throws(() => retentionPage(corrupt, family));
    const duplicate = structuredClone(input);
    duplicate.rows[1] = { ...duplicate.rows[0] };
    if (duplicate.rows[1].review_due_at)
      duplicate.rows[1].review_due_at = "infinity";
    else duplicate.rows[1].observed_at = "infinity";
    assert.throws(() => retentionPage(duplicate, family));
  });
test("retention full primary keys remain unambiguous with empty and delimiter-containing fields", () => {
  const family = "invoice_identity_reviews",
    input = retentionResult(family, 2);
  input.rows[0] = {
    ...input.rows[0],
    number: "a|b",
    reason: "c",
    source_key: "",
  };
  input.rows[1] = {
    ...input.rows[1],
    number: "a",
    reason: "b|c",
    source_key: "",
  };
  const parsed = retentionPage(input, family);
  assert.notEqual(
    retentionRowKey(family, parsed.rows[0]),
    retentionRowKey(family, parsed.rows[1]),
  );
  const bad = retentionResult("archives");
  bad.rows[0].kind = "arbitrary";
  assert.throws(() => retentionPage(bad, "archives"));
  for (const [f, field, value] of [
    ["archives", "file_removed_at", retentionAt],
    ["archives", "source", "other"],
    ["invoice_identity_reviews", "disposition", "resolved"],
    ["unqualified_invoice_owner_observations", "qualified", true],
    ["retained_owner_associations", "subject", U.toUpperCase()],
    ["statements", "authorized", "false"],
    ["statements", "assessment_json", {}],
  ]) {
    const raw = retentionResult(f);
    raw.rows[0][field] = value;
    if (field === "subject")
      raw.rows[0][field] = "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA";
    assert.throws(() => retentionPage(raw, f), `${f}.${field}`);
  }
});
test("retention native historical timestamps preserve full range while observation must be finite canonical UTC", () => {
  const dates = [
    "-infinity",
    "4714-11-24 00:00:00+00 BC",
    "0001-01-01 00:00:00+00 BC",
    "0001-01-01 00:00:00+00",
    retentionAt,
    "12000-01-01 00:00:00+00",
    "294276-12-31 23:59:59.999999+00",
    "infinity",
  ];
  for (const family of retentionFamilies)
    for (const date of dates) {
      const input = retentionResult(family, 100, false);
      const last = input.rows.at(-1);
      if (Object.hasOwn(last, "review_due_at")) last.review_due_at = date;
      else last.observed_at = date;
      input.next_cursor.after = retentionAfter(family, last);
      assert.equal(retentionPage(input, family).next_cursor.after.at, date);
    }
  for (const date of [
    "infinity",
    "-infinity",
    "2026-09-11T00:00:00Z",
    "2026-09-11 00:00:00.000000+00",
    "0000-01-01 00:00:00+00",
    "294277-01-01 00:00:00+00",
  ]) {
    const input = retentionResult();
    input.observed_at = date;
    assert.throws(() => retentionPage(input, "statements"));
  }
});
test("retention exact public eight fields and last returned full cursor reject malformed empty/exhaustion claims", () => {
  for (const change of [
    (x) => {
      delete x.observed_at;
    },
    (x) => {
      x.extra = null;
    },
    (x) => {
      x.family = "archives";
    },
    (x) => {
      x.limit = 99;
    },
    (x) => {
      x.protocol = "1";
    },
    (x) => {
      x.semantics = "snapshot";
    },
    (x) => {
      x.rows = null;
    },
    (x) => {
      x.next_cursor.family = null;
    },
    (x) => {
      x.next_cursor.after.extra = "";
    },
    (x) => {
      delete x.next_cursor.after.number;
    },
    (x) => {
      x.next_cursor.after.number = "lookahead";
    },
    (x) => {
      x.next_cursor.protocol = 2;
    },
    (x) => {
      x.rows.pop();
    },
    (x) => {
      x.rows.push(retentionRow("statements", 100));
    },
    (x) => {
      x.exhausted = true;
    },
    (x) => {
      x.next_cursor = null;
    },
  ]) {
    const raw = retentionResult("statements", 100, false);
    change(raw);
    assert.throws(() => retentionPage(raw, "statements"));
  }
  const empty = retentionResult("statements", 0);
  empty.exhausted = false;
  assert.throws(() => retentionPage(empty, "statements"));
});
test("retention explicit reads use configured prefix/single proof and copy complete next cursor before clearing", async () => {
  const f = fixture(),
    calls = [],
    first = retentionResult("invoice_identity_reviews", 100, false);
  let p,
    waiting = null;
  const transport = staffTransport(
    "http://127.0.0.1:56841/prefix",
    async (url, init) => {
      calls.push({ url, init });
      assert.equal(p.state.page, null);
      if (waiting) return waiting.promise;
      return new Response(JSON.stringify(first), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    },
  );
  p = createCommercialRetentionPage(f.context, transport);
  assert.equal(calls.length, 0);
  p.selectFamily("archives");
  p.selectFamily("invoice_identity_reviews");
  assert.equal(calls.length, 0);
  await p.first();
  assert.equal(p.state.page.rows.length, 100);
  const original = structuredClone(first.next_cursor);
  waiting = defer();
  const work = p.next();
  assert.equal(p.state.page, null);
  assert.equal(p.state.busy, true);
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    family: "invoice_identity_reviews",
    limit: 100,
    cursor: original,
  });
  assert.equal(
    calls[1].url,
    "http://127.0.0.1:56841/prefix/shop/claims/admin/retention_page",
  );
  assert.deepEqual(calls[1].init.headers, {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  });
  assert.equal(calls[1].init.credentials, "omit");
  assert.equal(calls[1].init.redirect, "error");
  waiting.resolve(
    new Response(
      JSON.stringify(retentionResult("invoice_identity_reviews", 1, true, 100)),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  await work;
  assert.equal(p.state.page.rows[0].number, "literal/100");
  assert.equal(p.state.page.rows.length, 1);
  waiting = null;
  await p.restart();
  assert.equal(JSON.parse(calls[2].init.body).cursor, null);
  f.controller.select({ id: D, subject: V });
  assert.equal(p.state.page.rows.length, 100);
  p.selectFamily("archives");
  assert.equal(p.state.page, null);
  assert.equal(calls.length, 3);
  p.dispose();
  assert(f.context.capture());
  f.controller.dispose();
});
for (const outcome of ["success", "error"])
  test(`retention held ${outcome} and finally cannot replace a newer explicit request or cross family ABA`, async () => {
    const f = fixture(),
      waits = [],
      p = createCommercialRetentionPage(f.context, () => {
        const d = defer();
        waits.push(d);
        return d.promise;
      });
    const older = p.first(),
      newer = p.restart();
    if (outcome === "success") waits[0].resolve(response(retentionResult()));
    else waits[0].reject(Error("late error"));
    await older;
    assert.equal(p.state.page, null);
    assert.equal(p.state.busy, true);
    assert.equal(p.state.error, "");
    waits[1].resolve(response(retentionResult("statements", 1, true, 2)));
    await newer;
    assert.equal(p.state.page.rows[0].number, "literal/2");
    const stale = p.first();
    p.selectFamily("archives");
    p.selectFamily("statements");
    waits[2].resolve(response(retentionResult()));
    await stale;
    assert.equal(p.state.page, null);
    assert.equal(p.state.busy, false);
    assert.equal(p.state.error, "");
    p.dispose();
    f.controller.dispose();
  });
test("retention failures clear old observations without invented empty results or global rejection", async () => {
  for (const reply of [
    () => response({}, 200),
    () => response(retentionResult(), 200, "text/html"),
    () => response("bad JSON"),
    ...[400, 404, 409, 503].map((status) => () => response({}, status)),
    () => {
      throw Error("network");
    },
  ]) {
    const f = fixture();
    let bad = false;
    const p = createCommercialRetentionPage(f.context, async () =>
      bad ? reply() : response(retentionResult("statements", 100, false)),
    );
    await p.first();
    bad = true;
    await p.next();
    assert.equal(p.state.page, null);
    assert.equal(p.state.busy, false);
    assert(["malformed", "unavailable"].includes(p.state.error));
    assert(f.context.capture());
    p.dispose();
    f.controller.dispose();
  }
});
for (const status of [401, 403])
  test(`retention ${status} rejects current shared proof despite family change before held headers`, async () => {
    const f = await populated(),
      headers = defer(),
      denial = unreadable(status);
    const p = createCommercialRetentionPage(
      f.context,
      staffTransport("http://127.0.0.1:56841", () => headers.promise),
    );
    const work = p.first();
    p.selectFamily("archives");
    headers.resolve(denial.response);
    await work;
    assert.equal(f.controller.state.detail, null);
    assert.equal(f.controller.state.capacity, null);
    assert.equal(f.controller.state.selected, null);
    assert.equal(p.state.page, null);
    assert.equal(p.state.error, "authority");
    assert.equal(denial.seen.body, 0);
    assert.equal(denial.seen.mime, 0);
    p.dispose();
    f.controller.dispose();
  });
for (const change of [
  "replacement",
  "proof ABA",
  "child disposal",
  "parent disposal",
])
  test(`retention held success/denial respect ${change} lifetime`, async () => {
    for (const status of [200, 401, 403]) {
      const f = fixture(),
        wait = defer(),
        p = createCommercialRetentionPage(f.context, () => wait.promise),
        work = p.first();
      if (change === "replacement" || change === "proof ABA") {
        user.setStates(login(V, T));
        if (change === "proof ABA") user.setStates(login());
        assert(f.context.activate());
      } else if (change === "child disposal") p.dispose();
      else f.context.dispose();
      wait.resolve(response(retentionResult(), status));
      await work;
      assert.equal(p.state.page, null);
      assert.equal(p.state.busy, false);
      if (change === "child disposal" && status !== 200)
        assert.equal(f.context.capture(), null);
      else if (change !== "parent disposal") assert(f.context.capture());
      p.dispose();
      f.controller.dispose();
    }
  });

async function mountedRetention(language, whole = false) {
  const f = fixture(),
    h = host(),
    storage = memory(),
    win = new EventTarget(),
    doc = new EventTarget(),
    calls = [];
  win.localStorage = storage;
  let reply = async (url, init) => {
    const body = JSON.parse(init.body);
    let data;
    if (url.endsWith("/retention_page"))
      data = retentionResult(
        body.family,
        body.cursor ? 1 : 100,
        !!body.cursor,
        body.cursor ? 100 : 0,
      );
    else if (url.endsWith("/hold_queue")) data = hqueue();
    else if (url.endsWith("/determination_status")) data = dstatus();
    else if (url.endsWith("/queue")) data = [queueRow()];
    else if (url.endsWith("/detail")) data = JSON.parse(rawDetail());
    else if (url.endsWith("/cash_capacity")) data = capacity();
    assert(data, "explicit mounted fixture route: " + url);
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
    });
  };
  const fetcher = (...args) => {
    calls.push(args);
    return reply(...args);
  };
  globals({
    window: win,
    document: doc,
    Document: class {},
    ShadowRoot: class {},
    definePageMeta() {},
    useNuxtApp: () => ({ runWithContext: (fn) => fn() }),
    useRuntimeConfig: () => ({
      public: { BASE_API_URL: "http://127.0.0.1:56841" },
    }),
    ...user,
    fetch: fetcher,
  });
  let props = {};
  if (!whole)
    props = {
      context: f.context,
      transport: staffTransport("http://127.0.0.1:56841", fetcher),
    };
  const app = h.renderer.createApp(
    whole ? page : retentionComponent.module.default,
    props,
  );
  app.component("NuxtLink", {
    render() {
      return Vue.h("a", null, this.$slots.default?.());
    },
  });
  const messages = {};
  for (const lang of ["de", "en-US"])
    messages[lang] = JSON.parse(
      await readFile(
        new URL(`../locales/${lang}.json`, import.meta.url),
        "utf8",
      ),
    );
  const i18n = createI18n({ legacy: false, locale: language, messages });
  app.use(i18n);
  app.mount(h.root);
  const find = (k) => h.all().find((n) => Object.hasOwn(n.props, k));
  return {
    f,
    h,
    storage,
    calls,
    find,
    i18n,
    reply: (fn) => {
      reply = fn;
    },
    async click(k) {
      await find(k).props.onClick();
      await flush();
    },
    async family(value) {
      find("data-retention-family").props.onChange({ target: { value } });
      await flush();
    },
    unmount() {
      app.unmount();
    },
    dispose() {
      app.unmount();
      f.controller.dispose();
      assert.equal(scopedCookies, 0);
    },
  };
}
for (const language of ["de", "en-US"]) {
  test(`retention mounted ${language}: explicit all-family pages, current cursor and escaped null/raw observations`, async () => {
    const m = await mountedRetention(language);
    try {
      assert.equal(m.calls.length, 0);
      assert(m.find("data-retention-next").props.disabled);
      for (const family of retentionFamilies) {
        const before = m.calls.length;
        await m.family(family);
        assert.equal(m.calls.length, before);
        await m.click("data-retention-first");
        assert.equal(
          m.h.all().filter((n) => Object.hasOwn(n.props, "data-retention-row"))
            .length,
          100,
        );
        assert.equal(m.find("data-retention-observed").text, retentionAt);
        assert(!m.find("data-retention-next").props.disabled);
        const native = m.h.text();
        if (family === "statements")
          assert(
            native.includes(
              language === "de" ? "Kein gespeicherter Wert" : "No stored value",
            ),
          );
        if (
          family === "archives" ||
          family === "unqualified_invoice_owner_observations"
        )
          assert.equal(m.find("data-retention-raw").text, "null");
        if (family === "invoice_identity_reviews") {
          assert.equal(
            m.find("data-retention-raw").text,
            retentionRow(family).evidence_json,
          );
          assert(!m.h.all().some((n) => n.type === "img"));
        }
        await m.click("data-retention-next");
        assert.deepEqual(JSON.parse(m.calls.at(-1)[1].body), {
          family,
          limit: 100,
          cursor: retentionResult(family, 100, false).next_cursor,
        });
        assert.equal(
          m.h.all().filter((n) => Object.hasOwn(n.props, "data-retention-row"))
            .length,
          1,
        );
        assert(m.find("data-retention-next").props.disabled);
        await m.click("data-retention-restart");
        assert.equal(JSON.parse(m.calls.at(-1)[1].body).cursor, null);
      }
      const before = m.calls.length;
      m.i18n.global.locale.value = language === "de" ? "en-US" : "de";
      await flush();
      assert.equal(m.calls.length, before);
      assert(!m.h.text().includes("RetentionPage."));
      assert.equal(m.storage.length, 0);
    } finally {
      m.dispose();
    }
  });
  test(`retention mounted whole page ${language}: both-direction shared denial preserves exact saved siblings and suppresses held success`, async () => {
    const m = await mountedRetention(language, true),
      status = language === "de" ? 401 : 403;
    try {
      assert.equal(m.calls.length, 0);
      for (const [key, body] of [
        ["data-hold-import", importRecord()],
        ["data-determination-import", JSON.stringify(dsaved())],
      ]) {
        await m.find(key).props.onChange({
          target: { files: [{ text: async () => body }], value: "original" },
        });
        await flush();
      }
      const originals = [...m.storage.map.entries()];
      const loadSiblings = async () => {
        await m.click("data-load-queue");
        m.h
          .all()
          .find((n) => n.props["data-case"] === C)
          .props.onClick();
        await flush();
        await m.click("data-load-detail");
        await m.click("data-load-capacity");
        await m.click("data-hold-head");
        m.find("data-determination-obligation").props.onInput({
          target: { value: O },
        });
        await m.click("data-determination-status");
        assert(
          m.find("data-detail") &&
            m.find("data-capacity") &&
            m.find("data-hold-queue") &&
            m.find("data-determination-live"),
        );
      };
      await loadSiblings();
      const originalReply = async (url, init) => {
        const body = JSON.parse(init.body);
        const data = url.endsWith("/retention_page")
          ? retentionResult(body.family)
          : url.endsWith("/queue")
            ? [queueRow()]
            : url.endsWith("/detail")
              ? JSON.parse(rawDetail())
              : url.endsWith("/cash_capacity")
                ? capacity()
                : url.endsWith("/hold_queue")
                  ? hqueue()
                  : dstatus();
        return new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json" },
        });
      };
      const denial = unreadable(status, "held");
      m.reply(async () => denial.response);
      await m.click("data-retention-first");
      for (const key of [
        "data-detail",
        "data-capacity",
        "data-hold-queue",
        "data-determination-live",
      ])
        assert(!m.find(key), key);
      assert(
        m.find("data-hold-command") && m.find("data-determination-command"),
      );
      assert.deepEqual([...m.storage.map.entries()], originals);
      assert.deepEqual(denial.seen, { body: 0, mime: 0 });
      m.reply(originalReply);
      await loadSiblings();
      await m.click("data-retention-first");
      assert(m.find("data-retention-observation"));
      const old = defer(),
        body = new TextEncoder().encode(
          JSON.stringify(retentionResult()),
        ).buffer;
      // Hold a different sibling's 200. Paging remains visibly present until the denial.
      m.reply(async (url) => {
        if (url.endsWith("/detail"))
          return {
            status: 200,
            headers: { get: () => "application/json" },
            arrayBuffer: () => old.promise,
          };
        return denial.response;
      });
      const held = m.find("data-load-detail").props.onClick();
      await flush();
      assert(m.find("data-retention-observation"));
      await m.click("data-load-capacity");
      assert(!m.find("data-retention-observation"));
      assert(m.find("data-retention-error"));
      old.resolve(body);
      await held;
      await flush();
      assert(!m.find("data-detail") && !m.find("data-retention-observation"));
      assert.deepEqual([...m.storage.map.entries()], originals);
      assert.equal(user.getAccessToken(), token());
    } finally {
      m.dispose();
    }
  });
}
test("retention mounted child disposal releases only its subscription and drops held work", async () => {
  const m = await mountedRetention("en-US"),
    wait = defer();
  m.reply(() => wait.promise);
  const held = m.find("data-retention-first").props.onClick();
  await flush();
  // Preserve an independent subscriber and the page-owned context after child unmount.
  let invalidated = 0;
  const unsubscribe = m.f.context.onInvalidate(() => invalidated++);
  m.unmount();
  assert(m.f.context.capture());
  assert.equal(invalidated, 0);
  const sibling = createCommercialRetentionPage(m.f.context, async () =>
    response(retentionResult()),
  );
  await sibling.first();
  assert(sibling.state.page);
  wait.resolve(
    new Response(JSON.stringify(retentionResult()), {
      headers: { "content-type": "application/json" },
    }),
  );
  await held;
  assert.equal(
    m.h.all().filter((n) => Object.hasOwn(n.props, "data-retention-row"))
      .length,
    0,
  );
  assert(m.f.context.capture());
  m.f.context.invalidate();
  assert.equal(invalidated, 1);
  assert.equal(sibling.state.page, null);
  sibling.dispose();
  unsubscribe();
  m.f.controller.dispose();
  assert.equal(scopedCookies, 0);
});

for (const status of [401, 403])
  test(`RPU1 mounted child-only unmount: current ${status} clears surviving siblings before held body and preserves saved history`, async () => {
    const language = status === 401 ? "de" : "en-US";
    const m = await mountedRetention(language),
      siblingHost = host(),
      wait = defer(),
      denial = unreadable(status, "held");
    const siblingTransport = staffTransport(
      "http://127.0.0.1:56841",
      async (url) => {
        let data;
        if (url.endsWith("/hold_queue")) data = hqueue();
        else if (url.endsWith("/determination_status")) data = dstatus();
        else throw Error("Unexpected sibling fixture path: " + url);
        return new Response(JSON.stringify(data), {
          headers: { "content-type": "application/json" },
        });
      },
    );
    // Actual hold/determination components remain mounted in a separate host using
    // the same page-owned context. Ordinary fields render their real controller.
    const app = siblingHost.renderer.createApp({
      setup() {
        return () => {
          const ordinary = [];
          if (m.f.controller.state.detail)
            ordinary.push(
              Vue.h(
                "pre",
                { "data-rpu1-detail": "" },
                m.f.controller.state.detail.raw,
              ),
            );
          if (m.f.controller.state.capacity)
            ordinary.push(
              Vue.h("div", { "data-rpu1-capacity": "" }, "observed capacity"),
            );
          return Vue.h("div", [
            ...ordinary,
            Vue.h(holdComponent.module.default, {
              context: m.f.context,
              transport: siblingTransport,
            }),
            Vue.h(determinationComponent.module.default, {
              context: m.f.context,
              transport: siblingTransport,
              selected: selection,
            }),
          ]);
        };
      },
    });
    const messages = JSON.parse(
      await readFile(
        new URL(`../locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    );
    app.use(
      createI18n({
        legacy: false,
        locale: language,
        messages: { [language]: messages },
      }),
    );
    app.mount(siblingHost.root);
    const find = (k) =>
      siblingHost.all().find((n) => Object.hasOwn(n.props, k));
    let held;
    try {
      await m.f.controller.queue();
      m.f.controller.select(selection);
      await m.f.controller.detail();
      await m.f.controller.capacity();
      await find("data-hold-head").props.onClick();
      await flush();
      find("data-determination-obligation").props.onInput({
        target: { value: O },
      });
      await find("data-determination-status").props.onClick();
      await flush();
      for (const [key, raw] of [
        ["data-hold-import", importRecord()],
        ["data-determination-import", JSON.stringify(dsaved())],
      ]) {
        await find(key).props.onChange({
          target: {
            files: [{ text: async () => raw }],
            value: "saved original",
          },
        });
        await flush();
      }
      const originals = [...m.storage.map.entries()];
      assert.equal(originals.length, 2);
      assert(
        find("data-rpu1-detail") &&
          find("data-rpu1-capacity") &&
          find("data-hold-queue") &&
          find("data-determination-live"),
      );
      assert(find("data-hold-command") && find("data-determination-command"));
      m.reply(() => wait.promise);
      held = m.find("data-retention-first").props.onClick();
      await flush();
      const proof = m.f.context.capture();
      assert(proof);
      m.unmount();
      assert(m.f.context.current(proof));
      assert(
        find("data-rpu1-detail") &&
          find("data-rpu1-capacity") &&
          find("data-hold-queue") &&
          find("data-determination-live"),
      );
      assert.deepEqual([...m.storage.map.entries()], originals);
      // Only headers/status arrive. Known denial must not depend on any body or MIME read.
      wait.resolve(denial.response);
      await held;
      await flush();
      assert.deepEqual(
        {
          sharedProof: !!m.f.context.capture(),
          detail: !!find("data-rpu1-detail"),
          capacity: !!find("data-rpu1-capacity"),
          hold: !!find("data-hold-queue"),
          determination: !!find("data-determination-live"),
          bodyReads: denial.seen.body,
          mimeReads: denial.seen.mime,
        },
        {
          sharedProof: false,
          detail: false,
          capacity: false,
          hold: false,
          determination: false,
          bodyReads: 0,
          mimeReads: 0,
        },
      );
      assert(find("data-hold-command") && find("data-determination-command"));
      assert.deepEqual([...m.storage.map.entries()], originals);
      assert.equal(
        m.h.all().filter((n) => Object.hasOwn(n.props, "data-retention-row"))
          .length,
        0,
      );
      assert.equal(user.getAccessToken(), token());
    } finally {
      wait.resolve(denial.response);
      denial.body.resolve(new ArrayBuffer(0));
      if (held) await held;
      app.unmount();
      m.f.controller.dispose();
      assert.equal(scopedCookies, 0);
    }
  });
