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
    "\nreturn {migrateCommercialStorage, prepareStaffLogout, registerStaffWork};",
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
test("migration verifies a tab copy before removing the legacy journal and leaves unrelated storage alone", () => {
  const local = store([
      [key, "original"],
      ["unrelated", "value"],
    ]),
    tab = store();
  api.migrateCommercialStorage(local, tab);
  assert.equal(local.getItem(key), null);
  assert.equal(tab.getItem(key), "original");
  assert.equal(local.getItem("unrelated"), "value");
});
test("blocked or conflicting tab copies preserve the original journal", () => {
  for (const tab of [store([[key, "other"]]), { ...store(), setItem() {} }]) {
    const local = store([[key, "original"]]);
    assert.throws(() => api.migrateCommercialStorage(local, tab));
    assert.equal(local.getItem(key), "original");
  }
});
test("logout can be cancelled; confirmed backup removes journals and mounted private forms", async () => {
  const local = store([[key, "original"]]),
    tab = store([[key + "-other", "uncertain"]]);
  let cleared = 0;
  const off = api.registerStaffWork({
    busy: () => false,
    snapshot: () => ({ text: "unfinished" }),
    clear: () => cleared++,
  });
  try {
    assert.equal(
      await api.prepareStaffLogout({ local, tab, save: () => false }),
      false,
    );
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
test("logout blocks an in-flight command and rejects a backup that missed an intervening edit", async () => {
  const local = store(),
    tab = store([[key, "before"]]);
  let busy = true;
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
      }),
      false,
    );
    busy = false;
    assert.equal(
      await api.prepareStaffLogout({
        local,
        tab,
        save: () => {
          tab.setItem(key, "after");
          return true;
        },
      }),
      false,
    );
    assert.equal(tab.getItem(key), "after");
  } finally {
    off();
  }
});
