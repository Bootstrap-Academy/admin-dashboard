// The runner owns all servers, Chromium processes and temporary files.
let currentContext;

export function browserContext() {
  if (!currentContext)
    throw new Error("Run browser suites with node tests/browser-runner.mjs");
  return currentContext;
}

export async function runBrowserSuite(context, file) {
  context.ensureRunning();
  currentContext = context;
  try {
    await import(file);
  } finally {
    currentContext = undefined;
  }
}

export async function connectToBrowser(target) {
  const url = new URL(target);
  if (url.protocol !== "ws:" || url.hostname !== "127.0.0.1")
    throw new Error("Browser CDP must use the runner's loopback server");
  browserContext().ensureRunning();
  const ws = new WebSocket(target);
  let sequence = 0;
  const pending = new Map(), listeners = new Set();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Chromium CDP connection timed out"));
    }, 15000);
    ws.onopen = () => { clearTimeout(timer); resolve(); };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Chromium CDP connection failed"));
    };
  });
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const command = pending.get(message.id);
      if (!command) return;
      pending.delete(message.id);
      clearTimeout(command.timer);
      if (message.error) command.reject(new Error(JSON.stringify(message.error)));
      else command.resolve(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  };
  ws.onclose = () => {
    for (const command of pending.values()) {
      clearTimeout(command.timer);
      command.reject(new Error("Chromium CDP closed"));
    }
    pending.clear();
  };
  return {
    cmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        if (ws.readyState !== WebSocket.OPEN)
          return reject(new Error("Chromium CDP is not open"));
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("Chromium command timed out: " + method));
        }, 30000);
        pending.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    onEvent(listener) { listeners.add(listener); },
    close() { ws.close(); },
  };
}
