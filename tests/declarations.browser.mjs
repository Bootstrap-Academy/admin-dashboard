// Real local Nuxt dashboard with synthetic intercepted APIs; blocks external traffic.
// Start admin on 3186 (API 3199), Chromium CDP on 9229; Node 22+.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const app = 'http://127.0.0.1:3186';
const targets = await (await fetch('http://127.0.0.1:9229/json/list')).json();
const ws = new WebSocket(
  targets.find((t) => t.type === 'page').webSocketDebuggerUrl,
);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map(),
  writes = [],
  errors = [];
const id = '11111111-1111-4111-8111-111111111111',
  agreement = '22222222-2222-4222-8222-222222222222',
  user = '33333333-3333-4333-8333-333333333333';
const declaration = {
  id,
  kind: 'CANCELLATION',
  received_at: '2026-09-07T20:00:00Z',
  name: 'Synthetic Consumer',
  email: 'consumer@example.invalid',
  user_id: user,
  contract: 'PREMIUM',
  contract_designation: 'Original agreement designation',
  cancellation_type: 'ORDINARY',
  details: 'FULL ORIGINAL REASONING\nsecond line',
  requested_end: '2026-10-24T22:00:00Z',
  effective_end: null,
  processed_at: null,
  processing_note: null,
  delivery: [
    {
      kind: 'receipt',
      attempts: 3,
      next_attempt_at: '2026-09-07T20:30:00Z',
      accepted_at: null,
      last_error: 'SMTP rejection',
    },
  ],
  operational_evidence: JSON.stringify({
    account_observation: { agreement_id: agreement, user_id: user },
    paid_period_observations: [
      { until: '2026-10-24T22:30:00Z', source: 'receipt' },
    ],
    messages: [{ body: 'IMMUTABLE RECEIPT BYTES' }],
  }),
};
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function ev(expression) {
  const r = await cmd('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(e) {
  const end = Date.now() + 30000;
  while (!(await ev(`!!(${e})`))) {
    assert(Date.now() < end, e);
    await pause(100);
  }
}
async function click(e) {
  await ev(`(${e}).scrollIntoView({block:'center',behavior:'instant'})`);
  await pause(80);
  const r = await ev(`(${e}).getBoundingClientRect().toJSON()`);
  assert(await ev(`(${e}).contains(document.elementFromPoint(${r.x+r.width/2},${r.y+r.height/2}))`), 'pointer target: '+e);
  for (const type of ['mousePressed', 'mouseReleased'])
    await cmd('Input.dispatchMouseEvent', {
      type,
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      button: 'left',
      clickCount: 1,
    });
  await pause(120);
}
async function set(selector, value) {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await pause(100);
}
async function mock({ request, requestId }) {
  const url = new URL(request.url);
  if (url.origin === app || url.protocol === 'data:')
    return cmd('Fetch.continueRequest', { requestId });
  if (url.origin !== 'http://127.0.0.1:3199')
    return cmd('Fetch.failRequest', {
      requestId,
      errorReason: 'BlockedByClient',
    });
  let data = {};
  if (request.method === 'GET' && url.pathname === '/contracts/declarations')
    data = { total: 1, declarations: [declaration] };
  else if (request.method === 'PATCH') {
    const body = JSON.parse(request.postData);
    writes.push(body);
    data = {
      ...declaration,
      ...body,
      processed_at: '2026-09-07T21:00:00Z',
      processing_note: body.note,
    };
  } else if (url.pathname.includes('/auth/users/'))
    data = {
      id: user,
      name: 'Synthetic Admin',
      display_name: 'Synthetic Admin',
      email: 'admin@example.invalid',
      admin: true,
      email_verified: true,
    };
  await cmd('Fetch.fulfillRequest', {
    requestId,
    responseCode: 200,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, PATCH, OPTIONS' },
    ],
    body: Buffer.from(JSON.stringify(data)).toString('base64'),
  });
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p?.reject(m.error) : p?.resolve(m.result);
  } else if (m.method === 'Fetch.requestPaused')
    mock(m.params).catch((e) => errors.push(String(e)));
  else if (m.method === 'Runtime.exceptionThrown')
    errors.push(m.params.exceptionDetails);
};
try {
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable'])
    await cmd(method);
  await cmd('Fetch.enable', {
    patterns: [{ urlPattern: '*', requestStage: 'Request' }],
  });
  await cmd('Network.clearBrowserCookies');
  for (const [name, value] of Object.entries({
    locale: 'de',
    user: JSON.stringify({ id: user, name: 'Admin', admin: true }),
    accessToken:
			'eyJhbGciOiJub25lIn0.' +
			Buffer.from(
			  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 10000 }),
			).toString('base64url') +
			'.x',
  }))
    await cmd('Network.setCookie', {
      name,
      value: encodeURIComponent(value),
      url: app,
      path: '/',
    });
  await cmd('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cmd('Page.navigate', { url: app + '/dashboard/declarations' });
  await until(
    `document.querySelector('main')?.innerText.includes('FULL ORIGINAL REASONING')`,
  );
  const text = await ev(`document.querySelector('main').innerText`);
  assert(
    text.includes('25.10.2026') &&
			text.includes('receipt') &&
			text.includes('(3)'),
    text,
  );
  await click(
    `Array.from(document.querySelectorAll('main button')).find(b=>b.innerText.toLowerCase().includes('als bearbeitet'))`,
  );
  await until(`document.querySelector('#declaration-action')`);
  assert(
    (await ev(`document.querySelector('form').innerText`)).includes(
      'second line',
    ),
  );
  await click(`document.querySelector('form summary')`);
  assert(
    (await ev(`document.querySelector('form pre').innerText`)).includes(
      'IMMUTABLE RECEIPT BYTES',
    ),
  );
  await click(`document.querySelector('form button[type=submit]')`);
  assert.equal(writes.length, 0, 'unverified action does not submit');
  await pause(5500); // Let the validation snackbar release the bottom button hit area.
  await set('#declaration-action', 'SCHEDULE_PREMIUM_CANCELLATION');
  assert.equal(
    await ev(`document.querySelector('#declaration-user-id').value`),
    user,
  );
  assert.equal(
    await ev(`document.querySelector('#declaration-agreement-id').value`),
    agreement,
  );
  assert.equal(
    await ev(`!!document.querySelector('#declaration-effective-end')`),
    false,
  );
  await click(`document.querySelector('form input[type=checkbox]')`);
  await set(
    '#declaration-note',
    'Verified original identity and receipt-based rights; exact original agreement.',
  );
  await click(`document.querySelector('form button[type=submit]')`);
  await until(`!document.querySelector('#declaration-action')`);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].renewal_agreement_id, agreement);
  assert.equal(writes[0].identity_verified, true);
  assert(!writes[0].effective_end);
  assert.deepEqual(errors, []);
  if (process.env.T12_ADMIN_SCREENSHOT)
    await fs.writeFile(
      process.env.T12_ADMIN_SCREENSHOT,
      Buffer.from(
        (await cmd('Page.captureScreenshot', { format: 'png' })).data,
        'base64',
      ),
    );
  console.log(
    'PASS actual admin full declaration/date/delivery/evidence visibility, explicit verification guard, original-agreement action and exact payload; zero browser exceptions',
  );
} finally {
  console.log(JSON.stringify({writes,errors}));
  ws.close();
}
