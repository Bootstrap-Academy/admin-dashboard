import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { ref } from "vue";

async function reportsFixture() {
  const states = new Map();
  const api = { GET: async () => [], getAppUser: async (id) => [{ name: id }, null] };
  const scope = {
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key);
    },
    useCookie: () => ref(null),
    GET: (...args) => api.GET(...args),
    getAppUser: (...args) => api.getAppUser(...args),
    console: { log() {} },
  };
  const types = await readFile(new URL("../types/reportedTaskTypes.ts", import.meta.url), "utf8");
  const source = await readFile(new URL("../composables/reportedSubtasks.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(types + source.replace(/^import .*;\n/m, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/^export /gm, "");
  const reports = vm.runInNewContext(code + "\n({ assignReportUser, useReportedSubtasks, useReportedTasksLoading });", scope);
  return { api, ...reports };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test("report enrichment keeps reporter, creator and task type on their own report", async () => {
  const f = await reportsFixture();
  f.api.GET = async () => [{ id: "subtask", creator: "creator" }];
  f.useReportedSubtasks().value = [{ subtask_id: "subtask", user_id: "reporter", subtask_type: "MATCHING" }];
  await f.assignReportUser();
  assert.equal(f.useReportedSubtasks().value[0].userName, "reporter");
  assert.equal(f.useReportedSubtasks().value[0].creatorName, "creator");
  assert.equal(f.useReportedSubtasks().value[0].subtask_type, "MATCHING");
  assert.equal(f.useReportedTasksLoading().value, false);
});

test("late report user lookups never label a replacement list by its old indexes", async () => {
  const f = await reportsFixture(), lookup = deferred(), started = deferred();
  f.api.GET = async () => [{ id: "old-subtask", creator: "old-creator" }];
  f.api.getAppUser = async (id) => { started.resolve(); await lookup.promise; return [{ name: id }, null]; };
  f.useReportedSubtasks().value = [{ subtask_id: "old-subtask", user_id: "old-reporter" }];
  const pending = f.assignReportUser();
  await started.promise;
  f.useReportedSubtasks().value = [{ subtask_id: "new-subtask", user_id: "new-reporter" }];
  lookup.resolve();
  await pending;
  assert.equal(f.useReportedSubtasks().value[0].userName, undefined);
  assert.equal(f.useReportedSubtasks().value[0].creatorName, undefined);
  assert.equal(f.useReportedTasksLoading().value, false);
});

test("subtask lookup failure finishes the report loading indicator", async () => {
  const f = await reportsFixture();
  f.api.GET = async () => { throw Error("offline"); };
  f.useReportedTasksLoading().value = true;
  await f.assignReportUser();
  assert.equal(f.useReportedTasksLoading().value, false);
});
