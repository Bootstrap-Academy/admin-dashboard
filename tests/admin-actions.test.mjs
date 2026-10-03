// Execute real composables and Vue setup functions with isolated transports.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as Vue from "vue";
import { parse, compileScript } from "@vue/compiler-sfc";

async function source(relative, scope, returned) {
  let text = await readFile(new URL(relative, import.meta.url), "utf8");
  if (relative.endsWith(".vue")) {
    const { descriptor } = parse(text);
    text = descriptor.scriptSetup
      ? compileScript(descriptor, { id: "admin-actions" }).content
      : descriptor.script.content;
  }
  const code = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
    .replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\n/gm, "")
    .replace(/^export default /m, "const component = ")
    .replace(/^export /gm, "");
  return vm.runInNewContext(code + `\n(${returned});`, {
    ...Vue, _defineComponent: Vue.defineComponent, crypto: webcrypto, ...scope,
  });
}

async function usersFixture() {
  const states = new Map(), reads = [], writes = [], navigation = [];
  const userTypes = await source("../types/userTypes.ts", {}, "({ User, UserFilter, UserSearchRequestBody, UserSearchResponse })");
  const methods = await source("../composables/appUsers.ts", {
    ...userTypes,
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, Vue.ref(init()));
      return states.get(key);
    },
    GET: async (path, query) => { reads.push({ path, query }); return { users: [{ id: "user", admin: true, enabled: false }], total: 1 }; },
    PATCH: (...args) => writes.push(["PATCH", ...args]),
    POST: (...args) => writes.push(["POST", ...args]),
    DELETE: (...args) => writes.push(["DELETE", ...args]),
    navigateTo: async (path) => navigation.push(path),
  }, "({ setBanStatusOfAppUser, banAppUser, unbanAppUser, deleteAppUser, getUserTest, useAppUsers })");
  return { ...methods, reads, writes, navigation };
}

test("account block/unblock and challenge restrictions route to reasoned cases without direct writes", async () => {
  const f = await usersFixture();
  await f.setBanStatusOfAppUser(false, "user/id");
  await f.setBanStatusOfAppUser(true, "user/id");
  await f.banAppUser({ action: "REPORT", user_id: "user/id" });
  await f.unbanAppUser("case/id");
  await f.deleteAppUser("user/id");
  assert.deepEqual(f.navigation, [
    "/dashboard/moderation?owner=backend&target=user%2Fid",
    "/dashboard/moderation?owner=backend&target=user%2Fid",
    "/dashboard/moderation?owner=challenges&kind=report&target=user%2Fid",
    "/dashboard/moderation/case%2Fid?owner=challenges",
    "/dashboard/moderation?owner=backend&target=user%2Fid",
  ]);
  assert.equal(f.writes.length, 0);
});

test("user role and account status filters preserve the server values", async () => {
  const f = await usersFixture(), query = { admin: true, enabled: false, offset: 0, limit: 10 };
  await f.getUserTest(query);
  assert.equal(f.reads[0].path, "/auth/users");
  assert.equal(f.reads[0].query, query);
  assert.equal(f.useAppUsers().value[0].admin, true);
  assert.equal(f.useAppUsers().value[0].enabled, false);
  assert.equal(f.writes.length, 0);
});

test("account role displays reactively and exposes no role-changing action", async () => {
  const scope = Vue.effectScope(), props = Vue.reactive({ data: { id: "user", admin: false } });
  const component = await source("../components/appUsers/Account.vue", {
    useI18n: () => ({ t: (key) => key }),
    CheckCircleIcon() {}, XCircleIcon() {}, PencilSquareIcon() {},
    getBalanceOfThisUser: async () => [{ coins: 0 }, null],
    convertTimestampToDate: () => ({ date: 1, month: { string: "Jan" }, year: 2026 }),
  }, "component");
  try {
    const account = scope.run(() => component.setup(props));
    assert.equal(account.role.value.value, false);
    assert.equal(account.role.value.onclick, undefined);
    props.data.admin = true;
    assert.equal(account.role.value.value, true);
  } finally { scope.stop(); }
});

test("moderation dispatch preserves owner, command body and retry boundary", async () => {
  const calls = [], body = { case_id: "case", expected_revision: 4, request_key: "request", outcome: "restrict", rationale: "reviewed facts" };
  const { moderationAdmin } = await source("../composables/moderation.ts", {
    $fetch: async (path, options) => { calls.push({ path, options }); return { confirmed: true }; },
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://127.0.0.1" } }),
    getAccessToken: () => "synthetic-token",
  }, "({ moderationAdmin })");
  await moderationAdmin("backend", "decide", body);
  await moderationAdmin("challenges", "decide", body);
  await moderationAdmin("challenges", "queue", { limit: 100, offset: 0 });
  assert.deepEqual(calls.map((c) => [c.path, c.options.method]), [
    ["/auth/moderation/admin/decide", "POST"],
    ["/challenges/moderation/decisions", "POST"],
    ["/challenges/moderation/cases", "GET"],
  ]);
  for (const call of calls.slice(0, 2)) {
    assert.equal(call.options.body, body);
    assert.equal(call.options.retry, 0);
    assert.equal(call.options.headers.Authorization, "Bearer synthetic-token");
  }
  assert.equal(calls[2].options.body, undefined);
  assert.equal(calls[2].options.query.limit, 100);
  await assert.rejects(moderationAdmin("challenges", "unknown", body), /Unsupported/);
  assert.equal(calls.length, 3);
});

test("moderation permission failures propagate without automatic retry", async () => {
  for (const status of [401, 403]) {
    let calls = 0;
    const { moderationAdmin } = await source("../composables/moderation.ts", {
      $fetch: async () => { calls++; throw Object.assign(Error("denied"), { status }); },
      useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://127.0.0.1" } }),
      getAccessToken: () => "synthetic-token",
    }, "({ moderationAdmin })");
    await assert.rejects(moderationAdmin("backend", "decide", {}), (error) => error.status === status);
    assert.equal(calls, 1);
  }
});

async function decisionFixture() {
  const route = Vue.reactive({ params: { id: "case" }, query: { owner: "backend" } });
  const calls = [], scope = Vue.effectScope();
  const transport = { token: "synthetic-token", fail: false };
  const component = await source("../pages/dashboard/moderation/[id].vue", {
    definePageMeta() {}, useRoute: () => route,
    getAccessToken: () => transport.token,
    // Load explicitly in each test; keep all later reactive watchers real.
    watch: (source, fn, options) => Vue.watch(source, fn, { ...options, immediate: false }),
    onBeforeUnmount() {},
    moderationAdmin: async (owner, operation, body) => {
      calls.push({ owner, operation, body });
      if (operation === "decide" && transport.fail) throw Error("lost reply");
      return { id: "case", revision: 4, target_kind: "account", source: "own_review" };
    },
  }, "component");
  const view = scope.run(() => component.setup({}, { expose() {} }));
  await view.load();
  return { view, transport, route, calls, dispose: () => scope.stop() };
}

test("block and restore decisions require preview and the exact loaded case revision", async () => {
  const f = await decisionFixture();
  try {
    await f.view.decide();
    assert.equal(f.calls.filter((c) => c.operation === "decide").length, 0);
    for (const outcome of ["restrict", "restore"]) {
      f.view.form.outcome = outcome;
      f.view.form.rationale = "The exact reason for this case";
      await Vue.nextTick();
      f.view.preview.value = true;
      await f.view.decide();
    }
    const decisions = f.calls.filter((c) => c.operation === "decide");
    assert.deepEqual(decisions.map((c) => c.body.outcome), ["restrict", "restore"]);
    for (const { owner, body } of decisions) {
      assert.equal(owner, "backend");
      assert.equal(body.case_id, "case");
      assert.equal(body.expected_revision, 4);
      assert.equal(body.rationale, "The exact reason for this case");
      assert.ok(body.request_key);
    }
  } finally { f.dispose(); }
});

test("lost decision reply retains the same command identifier for explicit retry", async () => {
  const f = await decisionFixture();
  try {
    f.transport.fail = true;
    f.view.preview.value = true;
    await f.view.decide();
    assert.ok(f.view.error.value);
    assert.equal(f.view.busy.value, false);
    await f.view.decide();
    const decisions = f.calls.filter((c) => c.operation === "decide");
    assert.equal(decisions.length, 2);
    assert.equal(decisions[0].body.request_key, decisions[1].body.request_key);
    assert.equal(JSON.stringify(decisions[0].body), JSON.stringify(decisions[1].body));
    assert.equal(f.calls.filter((c) => c.operation === "case").length, 1);
  } finally { f.dispose(); }
});

test("an edited decision needs a fresh preview and changed identity cannot use a loaded case", async () => {
  const f = await decisionFixture();
  try {
    f.view.preview.value = true;
    const oldKey = f.view.key.value;
    f.view.form.rationale = "new facts";
    await Vue.nextTick();
    assert.equal(f.view.preview.value, false);
    assert.notEqual(f.view.key.value, oldKey);
    await f.view.decide();
    assert.equal(f.calls.filter((c) => c.operation === "decide").length, 0);
    f.transport.token = "other-session";
    assert.throws(() => f.view.command(), /Loaded case changed/);
  } finally { f.dispose(); }
});
