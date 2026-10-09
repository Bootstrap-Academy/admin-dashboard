import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { ref } from "vue";

async function reportsFixture() {
  const states = new Map();
  const api = { GET: async (path) => path.includes("/auth/users/") ? { name: path.split("/").at(-1) } : [] };
  const scope = {
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key);
    },
    useCookie: () => ref(null),
    GET: (...args) => api.GET(...args),
    openSnackbar() {},
    console: { log() {} },
  };
  const types = await readFile(new URL("../types/reportedTaskTypes.ts", import.meta.url), "utf8");
  const userTypes = await readFile(new URL("../types/userTypes.ts", import.meta.url), "utf8");
  const users = await readFile(new URL("../composables/appUsers.ts", import.meta.url), "utf8");
  const source = await readFile(new URL("../composables/reportedSubtasks.ts", import.meta.url), "utf8");
  const removeImports = (text) => text.replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\n/gm, "");
  const code = ts.transpileModule(types + userTypes + removeImports(users) + removeImports(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/^export /gm, "");
  const reports = vm.runInNewContext(code + "\n({ getreportedSubtasksList, assignReportUser, useReportedSubtasks, useReportedTasksLoading, useAppUser });", scope);
  return { api, ...reports };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test("report enrichment keeps reporter, creator and task type on their own report", async () => {
  const f = await reportsFixture();
  f.api.GET = async (path) => path.includes("/auth/users/")
    ? { name: path.split("/").at(-1) }
    : [{ id: "subtask", creator: "creator" }];
  f.useReportedSubtasks().value = [{ subtask_id: "subtask", user_id: "reporter", subtask_type: "MATCHING" }];
  await f.assignReportUser();
  assert.equal(f.useReportedSubtasks().value[0].userName, "reporter");
  assert.equal(f.useReportedSubtasks().value[0].creatorName, "creator");
  assert.equal(f.useReportedSubtasks().value[0].subtask_type, "MATCHING");
  assert.equal(f.useReportedTasksLoading().value, false);
});

test("late report user lookups never label a replacement list by its old indexes", async () => {
  const f = await reportsFixture(), lookup = deferred(), started = deferred();
  f.api.GET = async (path) => {
    if (!path.includes("/auth/users/")) return [{ id: "old-subtask", creator: "old-creator" }];
    started.resolve();
    await lookup.promise;
    return { name: path.split("/").at(-1) };
  };
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

test("report lookups do not replace the user profile open in another view", async () => {
  const f = await reportsFixture();
  f.api.GET = async (path) => path.includes("/auth/users/")
    ? { id: path.split("/").at(-1), name: "Report user" }
    : [{ id: "subtask", creator: "creator" }];
  f.useAppUser().value = { id: "open-profile", name: "Profile being reviewed" };
  f.useReportedSubtasks().value = [{ subtask_id: "subtask", user_id: "reporter" }];
  await f.assignReportUser();
  assert.equal(f.useAppUser().value.id, "open-profile");
});

test("subtask lookup failure finishes the report loading indicator", async () => {
  const f = await reportsFixture();
  f.api.GET = async () => { throw Error("offline"); };
  f.useReportedTasksLoading().value = true;
  await f.assignReportUser();
  assert.equal(f.useReportedTasksLoading().value, false);
});

test("an empty first report page clears old rows and finishes loading", async () => {
  const f = await reportsFixture();
  f.api.GET = async () => [];
  f.useReportedSubtasks().value = [{ id: "old-report" }];
  await f.getreportedSubtasksList(true);
  assert.equal(f.useReportedSubtasks().value.length, 0);
  assert.equal(f.useReportedTasksLoading().value, false);
});

test("report page failure finishes loading and keeps the existing error result", async () => {
  const f = await reportsFixture();
  f.api.GET = async () => { throw { data: { detail: "denied" } }; };
  const result = await f.getreportedSubtasksList(true);
  assert.equal(result[0], null);
  assert.equal(result[1].detail, "denied");
  assert.equal(f.useReportedTasksLoading().value, false);
});
