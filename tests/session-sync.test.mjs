import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ref, watch, nextTick } from "vue";
import ts from "typescript";

const source = (await readFile(new URL("../plugins/session-sync.client.ts", import.meta.url), "utf8"))
  .replace("export default", "const plugin =");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;

test("a request observing remote logout before cookie signals still leaves the admin view", async () => {
  const access = ref("synthetic-access");
  const signals = new Map();
  const window = new EventTarget(), document = new EventTarget();
  document.visibilityState = "visible";
  const redirects = [];
  let cleanup;
  const bindings = { watch, window, document,
    defineNuxtPlugin: (run) => run,
    useRouter: () => ({ push: (path) => redirects.push(path) }),
    useAccessToken: () => access,
    useCookie: (name) => { const signal = ref("initial"); signals.set(name, signal); return signal; },
    syncSessionCookies: () => { access.value = ""; },
  };
  const plugin = new Function(...Object.keys(bindings), `${code}\nreturn plugin;`)(...Object.values(bindings));
  plugin({ runWithContext: (run) => run(), vueApp: { onUnmount: (stop) => { cleanup = stop; } } });
  // A guarded request rereads cleared shared cookies before the notification.
  bindings.syncSessionCookies();
  assert.deepEqual(redirects, ["/"]);
  signals.get("authGeneration").value = "remote-logout";
  await nextTick();
  window.dispatchEvent(new Event("focus"));
  assert.deepEqual(redirects, ["/"]);
  cleanup();
  access.value = "new-synthetic-login";
  access.value = "";
  assert.deepEqual(redirects, ["/"]);
});
