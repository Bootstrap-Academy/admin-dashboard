import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex, Semaphore, withTimeout } from "async-mutex";
import { jwtDecode } from "jwt-decode";
import { createFetch } from "ofetch";

const source = (
  await readFile(new URL("../composables/fetch.js", import.meta.url), "utf8")
)
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");

function token(name, seconds) {
  const payload = { name, exp: Math.floor(Date.now() / 1000) + seconds };
  return `e30.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.synthetic`;
}

function fixture({ expired = true, refused = false } = {}) {
  let accessToken = token("original", expired ? -3600 : 3600);
  let refreshes = 0;
  const sent = [];
  const redirects = [];
  const transport = createFetch({
    fetch: async (request, options) => {
      assert.equal(new URL(request).origin, "https://synthetic.invalid");
      assert.ok(options.headers instanceof Headers);
      const authorization = options.headers.get("authorization");
      sent.push(authorization);
      const accepted = !refused && authorization === `Bearer ${accessToken}`;
      return new Response(
        JSON.stringify(accepted ? { ok: true } : { detail: "Invalid token" }),
        {
          status: accepted ? 200 : 401,
          headers: { "content-type": "application/json" },
        },
      );
    },
  });
  const api = new Function(
    "jwtDecode",
    "Mutex",
    "Semaphore",
    "withTimeout",
    "useRuntimeConfig",
    "getAccessToken",
    "refresh",
    "$fetch",
    "router",
    "console",
    `${source}\nreturn { GET, mutex };`,
  )(
    jwtDecode,
    Mutex,
    Semaphore,
    withTimeout,
    () => ({
      public: {
        BASE_API_URL: "https://synthetic.invalid",
        NODE_ENV: "production",
      },
    }),
    () => accessToken,
    async () => {
      accessToken = token(`refreshed-${++refreshes}`, 3600);
      return [{ access_token: accessToken }, null];
    },
    transport,
    { push: (path) => redirects.push(path) },
    { log() {} },
  );
  return {
    api,
    sent,
    redirects,
    get accessToken() {
      return accessToken;
    },
    get refreshes() {
      return refreshes;
    },
    completeConcurrentRefresh() {
      accessToken = token("concurrent-refresh", 3600);
    },
  };
}

test("proactive refresh replaces the actual ofetch authorization header", async () => {
  const f = fixture();
  assert.deepEqual(await f.api.GET("/auth/users/me"), { ok: true });
  assert.equal(f.refreshes, 1);
  assert.deepEqual(f.sent, [`Bearer ${f.accessToken}`]);
  assert.deepEqual(f.redirects, []);
});

test("a waiter dispatches the token supplied by the other refresh", async () => {
  const f = fixture();
  const release = await f.api.mutex.acquire();
  const pending = f.api.GET("/auth/users/me");
  f.completeConcurrentRefresh();
  release();
  assert.deepEqual(await pending, { ok: true });
  assert.equal(f.refreshes, 0);
  assert.deepEqual(f.sent, [`Bearer ${f.accessToken}`]);
  assert.deepEqual(f.redirects, []);
});

test("an unexpired token is sent without refreshing", async () => {
  const f = fixture({ expired: false });
  assert.deepEqual(await f.api.GET("/auth/users/me"), { ok: true });
  assert.equal(f.refreshes, 0);
  assert.deepEqual(f.sent, [`Bearer ${f.accessToken}`]);
});

test("a genuine denial after proactive refresh still rejects without an added retry", async () => {
  const f = fixture({ refused: true });
  await assert.rejects(
    f.api.GET("/auth/users/me"),
    (error) => error.response.status === 401,
  );
  assert.equal(f.refreshes, 1);
  assert.deepEqual(f.sent, [`Bearer ${f.accessToken}`]);
  assert.deepEqual(f.redirects, ["/"]);
});
