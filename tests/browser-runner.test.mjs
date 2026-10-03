import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("SIGTERM during browser preparation prevents any detached child after cleanup starts", {
  skip: process.platform === "win32",
  timeout: 10000,
}, async (t) => {
  const fixture = await fs.mkdtemp(join(tmpdir(), "abr-signal-"));
  const temporary = join(fixture, "tmp"), eventsFile = join(fixture, "events.jsonl");
  const preload = join(fixture, "preload.mjs"), executable = join(fixture, "chromium.mjs");
  const staticRoot = join(fixture, "static");
  let runner;
  async function events() {
    try {
      return (await fs.readFile(eventsFile, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  t.after(async () => {
    try {
      if (runner && runner.exitCode === null && runner.signalCode === null) {
        runner.kill("SIGKILL");
        await new Promise((resolve) => runner.once("close", resolve));
      }
      // A failing regression must still remove only its own detached children.
      for (const event of await events()) {
        if (event.type !== "spawn" || !event.pid) continue;
        try { process.kill(-event.pid, "SIGKILL"); } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
    } finally {
      await fs.rm(fixture, { recursive: true, force: true });
    }
  });
  await fs.mkdir(temporary);
  await fs.mkdir(staticRoot);
  await fs.writeFile(join(staticRoot, "index.html"), "<!doctype html><title>Runner startup fixture</title>");
  await fs.writeFile(executable, `#!${process.execPath}\nsetInterval(() => {}, 1000);\n`, { mode: 0o700 });
  await fs.writeFile(preload, `
import fs from "node:fs/promises";
import syncFs from "node:fs";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { join } from "node:path";
const record = (type, data = {}) => syncFs.appendFileSync(process.env.RUNNER_TEST_EVENTS, JSON.stringify({ type, ...data }) + "\\n");
const original = { realpath: fs.realpath, mkdtemp: fs.mkdtemp, mkdir: fs.mkdir, rm: fs.rm, spawn: childProcess.spawn };
let root, preparedResolve, signalResolve;
const prepared = new Promise(resolve => { preparedResolve = resolve; });
const signalled = new Promise(resolve => { signalResolve = resolve; });
process.once("SIGTERM", () => { record("signal-delivered"); signalResolve(); });
fs.realpath = (path, ...args) => path === process.env.RUNNER_TEST_DIST
  ? Promise.resolve(process.env.RUNNER_TEST_STATIC)
  : original.realpath(path, ...args);
fs.mkdtemp = async (...args) => {
  root = await original.mkdtemp(...args);
  return root;
};
fs.mkdir = async (path, ...args) => {
  const result = await original.mkdir(path, ...args);
  if (path === join(root, "t")) {
    record("signal-sent-before-spawn");
    process.kill(process.pid, "SIGTERM");
    await signalled;
    await new Promise(resolve => setImmediate(resolve));
    record("mkdir-resumed");
    preparedResolve();
  }
  return result;
};
fs.rm = async (path, ...args) => {
  if (path === root) {
    record("cleanup-root-started");
    await prepared;
    // Resume startup before allowing cleanup to finish, without timing sleeps.
    await new Promise(resolve => setImmediate(resolve));
  }
  return original.rm(path, ...args);
};
childProcess.spawn = (...args) => {
  const child = original.spawn(...args);
  record("spawn", { pid: child.pid });
  return child;
};
syncBuiltinESMExports();
`);
  runner = spawn(process.execPath, ["--import", preload, join(repo, "tests/browser-runner.mjs"), "declarations"], {
    env: { ...process.env, TMPDIR: temporary, CHROMIUM_PATH: executable,
      RUNNER_TEST_EVENTS: eventsFile, RUNNER_TEST_DIST: join(repo, "dist"), RUNNER_TEST_STATIC: staticRoot },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "", error = "";
  runner.stdout.on("data", (chunk) => { output += chunk; });
  runner.stderr.on("data", (chunk) => { error += chunk; });
  const exit = await new Promise((resolve, reject) => {
    runner.once("error", reject);
    runner.once("close", (code, signal) => resolve({ code, signal }));
  });
  assert.deepEqual(exit, { code: 143, signal: null }, output + error);
  const summary = JSON.parse(output.split("\n").find((line) => line.startsWith('{"suites"')));
  assert.equal(summary.exitCode, 143);
  assert.equal(summary.pass, false, "cancellation never reports passing suites");
  assert.deepEqual(summary.cleanup, { browsersStopped: true, serversStopped: true, temporaryFilesRemoved: true });
  const recorded = await events(), names = recorded.map((event) => event.type);
  assert(names.includes("signal-sent-before-spawn"), "actual before-spawn boundary exercised");
  assert(names.includes("signal-delivered") && names.includes("mkdir-resumed"), "startup resumed after signal delivery");
  assert(names.includes("cleanup-root-started"), "cleanup reached root removal");
  assert.equal(recorded.filter((event) => event.type === "spawn").length, 0, "no detached child created after cancellation");
  assert.deepEqual(await fs.readdir(temporary), [], "all runner temporary files removed");
});
