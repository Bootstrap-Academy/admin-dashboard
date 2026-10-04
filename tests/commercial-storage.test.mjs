import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../utils/commercialStorage.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source.replace(/^export /gm, ""), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.None,
  },
}).outputText;
const api = new Function(
  code +
    "\nreturn {commercialStore, prepareStaffLogout, registerStaffWork, hasStaffWork};",
)();
function store(data = []) {
  const map = new Map(data);
  return {
    map,
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}
const key = "bootstrap.staff-hold-review.v1.original";
const A = "bootstrap.staff-determination.v1.aaaaaaaa-0000-4000-8000-000000000001";
const B = "bootstrap.staff-hold-review.v1.bbbbbbbb-0000-4000-8000-000000000002";

test("every tab copies legacy journals byte-identically; the durable original stays for other tabs", () => {
  const local = store([
      [A, '{"pending":"unconfirmed determination"}'],
      [B, '{"pending":"unconfirmed hold review"}'],
      ["unrelated", "value"],
    ]),
    tab1 = store(),
    tab2 = store();
  api.commercialStore(local, tab1);
  api.commercialStore(local, tab2);
  assert.equal(local.map.size, 3, "originals and unrelated storage stay");
  assert.deepEqual([...tab1.map], [...local.map].slice(0, 2));
  assert.deepEqual([...tab2.map], [...local.map].slice(0, 2));
  assert(api.hasStaffWork(local, tab2), "a second tab can warn and export");
  // Closing tab 1 discards only its sessionStorage; a new tab finds the originals again.
  const tab3 = store();
  api.commercialStore(local, tab3);
  assert.equal(tab3.map.size, 2);
});

test("an existing or unwritable tab copy is never overwritten and never blocks the tab", () => {
  const local = store([
      [A, "v-old-bundle-with-receipt"],
      [B, "unrelated-pending"],
    ]),
    tab = store([[A, "v-tab-copy-with-later-progress"]]);
  for (let i = 0; i < 3; i++) {
    const s = api.commercialStore(local, tab);
    assert.equal(s.getItem(A), "v-tab-copy-with-later-progress");
    assert.equal(s.getItem(B), "unrelated-pending", "later journals are copied too");
  }
  assert.equal(local.getItem(A), "v-old-bundle-with-receipt", "original preserved");
  const blocked = {
    ...store(),
    setItem() {
      throw Error("quota");
    },
  };
  assert.doesNotThrow(() => api.commercialStore(local, blocked));
  assert.equal(local.getItem(B), "unrelated-pending");
  const unreadable = {
    get length() {
      throw Error("blocked");
    },
  };
  const own = api.commercialStore(unreadable, tab);
  assert.equal(own.getItem(A), "v-tab-copy-with-later-progress", "the tab stays usable");
});

test("removing a confirmed journal through the tab store also removes its durable original", () => {
  const local = store([
      [key, "original"],
      ["unrelated", "value"],
    ]),
    tab = store();
  const s = api.commercialStore(local, tab);
  s.setItem("unrelated", "tab value");
  s.removeItem(key);
  assert.equal(tab.getItem(key), null);
  assert.equal(local.getItem(key), null);
  // A later access cannot bring the confirmed journal back.
  assert.equal(api.commercialStore(local, tab).getItem(key), null);
  s.removeItem("unrelated");
  assert.equal(local.getItem("unrelated"), "value", "only own journal keys reach durable storage");
  assert.equal(tab.getItem("unrelated"), null);
});

test("logout can be cancelled; confirmed backup removes journals and mounted private forms", async () => {
  const local = store([[key, "original"]]),
    tab = store([[key + "-other", "uncertain"]]);
  let cleared = 0;
  const blocked = [];
  const off = api.registerStaffWork({
    busy: () => false,
    snapshot: () => ({ text: "unfinished" }),
    clear: () => cleared++,
  });
  try {
    assert.equal(
      await api.prepareStaffLogout({
        local,
        tab,
        save: () => false,
        blocked: (r) => blocked.push(r),
      }),
      false,
    );
    assert.deepEqual(blocked, [], "cancelling needs no explanation");
    assert.equal(cleared, 0);
    assert.equal(local.getItem(key), "original");
    let saved;
    assert.equal(
      await api.prepareStaffLogout({
        local,
        tab,
        save: (raw) => {
          saved = JSON.parse(raw);
          return true;
        },
      }),
      true,
    );
    assert.equal(saved.journals.length, 2);
    assert.equal(saved.forms[0].text, "unfinished");
    assert.equal(local.length, 0);
    assert.equal(tab.length, 0);
    assert.equal(cleared, 1);
  } finally {
    off();
  }
});

test("logout export carries diverging copies both and an unchanged copy once, then removes all", async () => {
  for (const [tabValue, expected] of [
    ["v-tab", [[A, "v-local"], [A, "v-tab"]]],
    ["v-local", [[A, "v-local"]]],
  ]) {
    const local = store([[A, "v-local"]]),
      tab = store([[A, tabValue]]);
    let file = null;
    const ok = await api.prepareStaffLogout({
      local,
      tab,
      save: (raw) => ((file = JSON.parse(raw)), true),
    });
    assert.equal(ok, true);
    assert.deepEqual(file.journals, expected);
    assert.equal(local.map.size + tab.map.size, 0);
  }
});

test("logout explains a running request and an edit after the backup; work stays", async () => {
  const local = store(),
    tab = store([[key, "before"]]);
  let busy = true;
  const blocked = [];
  const off = api.registerStaffWork({
    busy: () => busy,
    snapshot: () => null,
    clear() {},
  });
  try {
    assert.equal(
      await api.prepareStaffLogout({
        local,
        tab,
        save: () => {
          throw Error("must not download");
        },
        blocked: (r) => blocked.push(r),
      }),
      false,
    );
    assert.deepEqual(blocked, ["busy"]);
    busy = false;
    assert.equal(
      await api.prepareStaffLogout({
        local,
        tab,
        save: () => {
          tab.setItem(key, "after");
          return true;
        },
        blocked: (r) => blocked.push(r),
      }),
      false,
    );
    assert.deepEqual(blocked, ["busy", "changed"]);
    assert.equal(tab.getItem(key), "after");
    assert.equal(
      await api.prepareStaffLogout({
        local,
        tab,
        save: () => {
          busy = true; // a request started while the download was confirmed
          return true;
        },
        blocked: (r) => blocked.push(r),
      }),
      false,
    );
    assert.deepEqual(blocked, ["busy", "changed", "busy"]);
    assert.equal(tab.getItem(key), "after");
  } finally {
    off();
  }
});
