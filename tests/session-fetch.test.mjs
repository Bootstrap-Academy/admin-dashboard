import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex } from "async-mutex";
import { createFetch } from "ofetch";
import ts from "typescript";

const source = (await readFile(new URL("../composables/fetch.js", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");
const utility = ts.transpileModule(
  (await readFile(new URL("../utils/sessionRefresh.ts", import.meta.url), "utf8"))
    .replace(/^import .*;\n/gm, "")
    .replace(/^export /gm, ""),
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } },
).outputText;
const helpers = new Function("Mutex", `${utility}\nreturn { accessTokenExpired, sameSession, sameSessionContext, sameSessionPair, renewSession };`)(Mutex);
const token = (name, seconds = 3600) =>
  `e30.${Buffer.from(JSON.stringify({ name, exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url")}.synthetic`;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
function fixture({ expired = true, refused = false, held = null, failure = null } = {}) {
  let current = { identity: "A:S", generation: "one", userId: "A", sessionId: "S",
    accessToken: token("original", expired ? -3600 : 3600), refreshToken: "R0" };
  let refreshes = 0;
  const sent = [], clearings = [];
  const snapshot = () => ({ ...current });
  const lock = new Mutex();
  const transport = createFetch({
    fetch: async (request, options) => {
      assert.equal(new URL(request).origin, "https://synthetic.invalid");
      assert(options.headers instanceof Headers);
      sent.push(options.headers.get("authorization"));
      if (held) await held.promise;
      return new Response(JSON.stringify(failure?.body ?? (refused ? { detail: "Invalid token" } : { ok: true })), {
        status: failure?.status ?? (refused ? 401 : 200), headers: { "content-type": "application/json" },
      });
    },
  });
  const bindings = {
    ...helpers,
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic.invalid" } }),
    getAccessToken: () => current.accessToken,
    getSessionSnapshot: snapshot,
    setStates: (value) => {
      assert.equal(value, null);
      clearings.push(current.identity);
      current = { ...current, identity: null, generation: "logout", accessToken: "", refreshToken: "" };
    },
    refresh: async (expected) => {
      try {
        const result = await helpers.renewSession({ expected, snapshot, lock: (run) => lock.runExclusive(() => run(true)),
          raw: async () => {
            refreshes++;
            return { user: { id: "A" }, session: { id: "S" }, access_token: token("rotated"), refresh_token: "R1" };
          },
          apply: (response) => { current = { ...current, accessToken: response.access_token, refreshToken: response.refresh_token }; },
          refused: () => assert.fail("Synthetic refresh must succeed"),
        });
        return [result, null];
      } catch (error) { return [null, error]; }
    },
    $fetch: transport,
  };
  const api = new Function(...Object.keys(bindings), `${source}\nreturn { GET, POST };`)(...Object.values(bindings));
  return { api, sent, clearings, lock, snapshot,
    get refreshes() { return refreshes; },
    replace(next) { current = next; },
  };
}

test("proactive refresh replaces the real ofetch Headers before dispatch", async () => {
  const f = fixture();
  assert.deepEqual(await f.api.GET("/auth/users/me"), { ok: true });
  assert.equal(f.refreshes, 1);
  assert.deepEqual(f.sent, [`Bearer ${f.snapshot().accessToken}`]);
});

test("parallel same-tab requests both send the winner token and rotate once", async () => {
  const f = fixture();
  await Promise.all([f.api.GET("/auth/users/me"), f.api.GET("/auth/users/me")]);
  assert.equal(f.refreshes, 1);
  assert.deepEqual(f.sent, Array(2).fill(`Bearer ${f.snapshot().accessToken}`));
});

test("an unexpired token is sent without refreshing", async () => {
  const f = fixture({ expired: false });
  assert.deepEqual(await f.api.GET("/auth/users/me"), { ok: true });
  assert.equal(f.refreshes, 0);
});

test("an invalid access response retries once and a confirmed refusal clears only the same pair", async () => {
  const f = fixture({ refused: true });
  await assert.rejects(f.api.GET("/auth/users/me"), (error) => error.response.status === 401);
  assert.equal(f.refreshes, 1);
  assert.equal(f.sent.length, 2);
  assert.deepEqual(f.clearings, ["A:S"]);
});

for (const refused of [false, true]) {
  test(`a held ${refused ? "401" : "successful"} API response cannot apply or clear a new login`, async () => {
    const held = deferred();
    const f = fixture({ expired: false, refused, held });
    const pending = f.api.GET("/auth/users/me");
    const rejected = assert.rejects(pending);
    await new Promise(setImmediate);
    f.replace({ ...f.snapshot(), identity: "B:T", generation: "new-login", userId: "B", sessionId: "T", accessToken: token("new"), refreshToken: "B0" });
    held.resolve();
    await rejected;
    assert.equal(f.snapshot().identity, "B:T");
    assert.deepEqual(f.clearings, []);
    assert.equal(f.refreshes, 0);
    assert.equal(f.sent.length, 1);
  });
}

for (const [status, detail, translation] of [
  [403, "Admin MFA required", "Error.AdminMFARequired"],
  [400, "Invalid code", "Error.InvalidCode"],
]) {
  test(`MFA refusal ${status} keeps its translation and never refreshes or clears`, async () => {
    const f = fixture({ expired: false, failure: { status, body: { detail } } });
    await assert.rejects(f.api.POST("/auth/sessions", {}), (error) =>
      error.response.status === status && error.data.detail === translation);
    assert.equal(f.sent.length, 1);
    assert.equal(f.refreshes, 0);
    assert.deepEqual(f.clearings, []);
  });
}
