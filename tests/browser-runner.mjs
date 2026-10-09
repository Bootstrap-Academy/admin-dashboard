// Run after bash build.sh. No test account or live API is needed.
// CHROMIUM_PATH overrides chromium/chromium-browser/google-chrome on PATH.
// Optional arguments select suites (default: all).
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import http from "node:http";
import { delimiter, dirname, extname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { runBrowserSuite } from "./browser-context.mjs";

const suites = ["commercial-staff", "declarations", "publication-support", "user-navigation"];
const selected = process.argv.slice(2);
if (!selected.length) selected.push(...suites);
assert(selected.every((name) => suites.includes(name)), "Unknown browser suite");
assert.equal(new Set(selected).size, selected.length, "Duplicate browser suite");
assert.equal(typeof WebSocket, "function", "Browser suites require Node 22+");
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let dist;
try {
  dist = await fs.realpath(join(repo, "dist"));
  await fs.access(join(dist, "index.html"));
} catch {
  throw new Error("Static admin build missing; run bash build.sh first");
}
async function chromiumPath() {
  const candidates = process.env.CHROMIUM_PATH
    ? [process.env.CHROMIUM_PATH]
    : (process.env.PATH || "").split(delimiter).flatMap((directory) =>
      ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"]
        .map((name) => join(directory, name)));
  for (const candidate of candidates) {
    try { await fs.access(candidate, constants.X_OK); return candidate; } catch {}
  }
  throw new Error("Chromium missing; set CHROMIUM_PATH to its executable");
}
const binary = await chromiumPath();
const servers = [], browsers = new Set(), results = [];
const preparations = new Set(), runningSuites = new Set();
const cancellation = new AbortController();
const escaped = [];
let work, apiHandler, api, app, cleanupPromise, stopping = false, summaryPrinted = false;
let publicationEnabled = false;
function ensureRunning() {
  if (stopping) throw new Error("Browser runner stopping");
}
function prepare(operation) {
  ensureRunning();
  const pending = operation();
  preparations.add(pending);
  return pending.finally(() => preparations.delete(pending));
}
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
};
async function listen(handler) {
  ensureRunning();
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("close", () => reject(new Error("Browser runner server closed")));
    ensureRunning();
    server.listen({ port: 0, host: "127.0.0.1", signal: cancellation.signal }, resolve);
  });
  ensureRunning();
  return "http://127.0.0.1:" + server.address().port;
}
async function serve(req, res) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, app).pathname);
    let file = resolve(dist, "." + pathname);
    assert(file === dist || file.startsWith(dist + sep), "Outside static build");
    try {
      if ((await fs.stat(file)).isDirectory()) file = join(file, "index.html");
      await fs.access(file);
    } catch {
      if (extname(pathname)) { res.writeHead(404); res.end(); return; }
      file = join(dist, "index.html");
    }
    const real = await fs.realpath(file);
    assert(real.startsWith(dist + sep), "Outside static build");
    let body = await fs.readFile(real);
    if (extname(file) === ".html") {
      // Change only the served runtime config; built assets stay untouched.
      let html = body.toString("utf8");
      for (const [key, value] of Object.entries({ BASE_API_URL: api, BASE_WEB_URL: app })) {
        let replaced = 0;
        html = html.replace(new RegExp(`(${key}["']?\\s*:\\s*)(["'])(.*?)\\2`, "g"),
          (_match, property) => { replaced++; return property + JSON.stringify(value); });
        assert(replaced > 0, "Missing Nuxt runtime config: " + key);
      }
      let publicationFlags = 0;
      html = html.replace(/(PROFILE_PUBLICATION_ENABLED["']?\s*:\s*)(?:true|false|["'](?:true|false)["'])/g,
        (_match, property) => { publicationFlags++; return property + String(publicationEnabled); });
      assert(publicationFlags > 0, "Missing publication runtime flag");
      body = Buffer.from(html);
    }
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch (error) {
    escaped.push(String(error));
    res.writeHead(500); res.end("Static fixture failed");
  }
}
async function stopBrowser(browser) {
  if (!browser.process.pid) {
    browsers.delete(browser); return;
  }
  const kill = (signal) => {
    try {
      if (process.platform === "win32") browser.process.kill(signal);
      else process.kill(-browser.process.pid, signal);
    } catch (error) { if (error.code !== "ESRCH") throw error; }
  };
  kill("SIGTERM");
  let timer;
  await Promise.race([
    browser.exit,
    new Promise((resolve) => { timer = setTimeout(() => { kill("SIGKILL"); resolve(); }, 3000); }),
  ]);
  clearTimeout(timer);
  await browser.exit;
  browsers.delete(browser);
}
function cleanup() {
  // Set this before the first await; a suspended launch must never start again.
  stopping = true;
  cancellation.abort();
  return cleanupPromise ||= (async () => {
    await Promise.allSettled([...preparations]);
    await Promise.all([...browsers].map(stopBrowser));
    await Promise.allSettled([...runningSuites]);
    await Promise.all(servers.map((server) => new Promise((resolve) => {
      server.closeAllConnections(); server.close(resolve);
    })));
    if (work) await fs.rm(work, { recursive: true, force: true });
  })();
}
async function finish() {
  await cleanup();
  assert.equal(browsers.size, 0, "Owned Chromium processes stopped");
  assert(servers.every((server) => !server.listening), "Owned loopback servers stopped");
  if (work) await assert.rejects(fs.access(work), { code: "ENOENT" });
  if (summaryPrinted) return;
  summaryPrinted = true;
  console.log(JSON.stringify({ suites: results, cases: results.reduce((count, suite) => count + (suite.cases?.length || 0), 0),
    exitCode: process.exitCode ?? 0, pass: (process.exitCode ?? 0) === 0,
    cleanup: { browsersStopped: true, serversStopped: true, temporaryFilesRemoved: true } }));
}
const signals = new Map();
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  const handler = () => {
    process.exitCode = code;
    finish().then(() => process.exit(code), (error) => { console.error(error); process.exit(code); });
  };
  signals.set(signal, handler);
  process.once(signal, handler);
}
async function launch(run) {
  // Chromium uses Unix sockets here, so avoid nesting this under the suite.
  const profile = join(run, "profile"), temporary = join(work, "t");
  await prepare(() => fs.mkdir(profile));
  await prepare(() => fs.mkdir(temporary, { recursive: true }));
  ensureRunning();
  const child = spawn(binary, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--disable-background-networking", "--disable-component-update", "--disable-sync",
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--disable-features=MediaRouter", "--no-proxy-server",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    `--user-data-dir=${profile}`, "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0", "about:blank",
  ], {
    env: { ...process.env, TMPDIR: temporary, TMP: temporary, TEMP: temporary },
    detached: process.platform !== "win32", stdio: ["ignore", "ignore", "pipe"],
  });
  const browser = { process: child, log: "", spawnError: undefined };
  browser.exit = new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", (error) => { browser.spawnError = error; resolve(); });
  });
  child.stderr.on("data", (bytes) => { browser.log = (browser.log + bytes).slice(-16000); });
  browsers.add(browser);
  try {
    const end = Date.now() + 15000;
    let port;
    while (!port) {
      ensureRunning();
      if (browser.spawnError) throw browser.spawnError;
      assert(child.exitCode === null && child.signalCode === null, "Chromium exited: " + browser.log);
      try { port = (await fs.readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; } catch {}
      assert(Date.now() < end, "Chromium startup timed out: " + browser.log);
      if (!port) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    ensureRunning();
    assert(/^\d+$/.test(port), "Invalid Chromium port");
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: cancellation.signal });
    const target = (await response.json()).find((page) => page.type === "page");
    ensureRunning();
    assert(target?.webSocketDebuggerUrl, "Chromium page missing");
    return { browser, target: target.webSocketDebuggerUrl };
  } catch (error) {
    await stopBrowser(browser);
    throw error;
  }
}
try {
  work = await prepare(() => fs.mkdtemp(join(tmpdir(), "admin-browser-")).then((directory) => {
    work = directory;
    return directory;
  }));
  ensureRunning();
  api = await listen((req, res) => {
    if (apiHandler) return apiHandler(req, res);
    escaped.push({ method: req.method, path: req.url });
    res.writeHead(599); res.end("Unexpected non-intercepted API request");
  });
  app = await listen((req, res) => { void serve(req, res); });
  for (const suite of selected) {
    const run = join(work, suite), downloadPath = join(run, "downloads");
    await prepare(() => fs.mkdir(downloadPath, { recursive: true }));
    ensureRunning();
    let browser, summary;
    console.log("RUN " + suite);
    try {
      const launched = await launch(run);
      browser = launched.browser;
      ensureRunning();
      const running = runBrowserSuite({ app, api, run, downloadPath, target: launched.target, ensureRunning,
        setApiHandler(handler) { apiHandler = handler; },
        setPublicationEnabled(enabled) { publicationEnabled = enabled === true; },
        report(result) { summary = { suite, ...result }; },
      }, new URL(`./${suite}.browser.mjs`, import.meta.url));
      runningSuites.add(running);
      try { await running; } finally { runningSuites.delete(running); }
      assert(summary?.pass, "Browser suite did not report success: " + suite);
    } catch (error) {
      if (!stopping) process.exitCode = 1;
      summary = { suite, ...summary, pass: false };
      if (!stopping) console.error("FAIL " + suite + ": " + (error.stack || error));
    } finally {
      if (browser) await stopBrowser(browser);
      apiHandler = undefined;
      publicationEnabled = false;
      results.push(summary);
      await fs.rm(run, { recursive: true, force: true });
    }
  }
  assert.equal(escaped.length, 0, JSON.stringify(escaped));
} catch (error) {
  if (!stopping) {
    process.exitCode = 1;
    console.error(error.stack || error);
  }
} finally {
  await finish();
  for (const [signal, handler] of signals) process.removeListener(signal, handler);
}
