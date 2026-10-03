import assert from 'node:assert/strict';
import { browserContext, connectToBrowser } from './browser-context.mjs';
const { app, api, target, report, setPublicationEnabled } = browserContext();
const browser = await connectToBrowser(target), { cmd } = browser;
const admin = '11111111-1111-4111-8111-111111111111', userId = '22222222-2222-4222-8222-222222222222';
const route = `/auth/admin/users/${userId}/publication`, reads = [], writes = [], errors = [], cases = [];
let current, readFailure, writeFailure, pass = false;
const shared = () => ({ profile_visibility: 'shared', visibility_revision: 3, shared_at: 123, withdrawn_at: null });
async function ev(expression) {
  const result = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 15000;
  while (!(await ev(`!!(${expression})`))) {
    assert(Date.now() < deadline, expression);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
async function click(selector) {
  await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await new Promise(resolve => setTimeout(resolve, 200));
  const box = await ev(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);
  assert(box.width >= 44 && box.height >= 44, 'touch target');
  const hit = await ev(`document.elementFromPoint(${box.x + box.width / 2},${box.y + box.height / 2})?.outerHTML.slice(0,800)`);
  assert(await ev(`document.querySelector(${JSON.stringify(selector)}).contains(document.elementFromPoint(${box.x + box.width / 2},${box.y + box.height / 2}))`), 'pointer reaches support button: ' + JSON.stringify({ box, hit }));
  for (const type of ['mousePressed', 'mouseReleased'])
    await cmd('Input.dispatchMouseEvent', { type, x: box.x + box.width / 2, y: box.y + box.height / 2, button: 'left', clickCount: 1 });
}
async function mock({ request, requestId }) {
  const url = new URL(request.url);
  if (url.origin === app || ['data:', 'blob:'].includes(url.protocol)) return cmd('Fetch.continueRequest', { requestId });
  if (url.origin !== api) { errors.push('external request'); return cmd('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }); }
  let status = 200, data = {};
  if (request.method === 'OPTIONS') data = {};
  else if (url.pathname === route) {
    assert.equal(request.method, 'GET'); reads.push(route);
    status = readFailure || 200; data = status === 200 ? current : { detail: 'publication_unavailable' };
  } else if (url.pathname === route + '/withdraw') {
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.postData);
    assert.deepEqual(Object.keys(body).sort(), ['expected_revision', 'request_id']);
    writes.push(body);
    if (writeFailure === 'conflict') { current = { ...shared(), visibility_revision: 6 }; status = 409; }
    else {
      current = { ...current, profile_visibility: 'private', visibility_revision: current.visibility_revision + 1 };
      if (writeFailure === 'lost') return cmd('Fetch.failRequest', { requestId, errorReason: 'Failed' });
      data = { current, receipt: {}, replayed: false };
    }
  } else if (url.pathname.startsWith('/auth/users/')) {
    data = { id: url.pathname.split('/').pop(), name: 'Synthetic user', display_name: 'Support fixture', email_verified: true, enabled: true, admin: url.pathname.endsWith(admin), created_at: 123, last_login: 123, tags: [] };
  } else if (url.pathname === `/skills/xp/${userId}`) data = { xp: 42, skills: [] };
  else if (url.pathname === `/shop/coins/${userId}`) data = { coins: 0 };
  await cmd('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
    { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
    { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
  ], body: Buffer.from(JSON.stringify(data)).toString('base64') });
}
browser.onEvent(message => {
  if (message.method === 'Fetch.requestPaused') mock(message.params).catch(error => errors.push(String(error)));
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
});
async function navigate() {
  await cmd('Page.navigate', { url: app + `/dashboard/users/${userId}` });
  await until(`document.querySelector('main')?.innerText.includes('Support fixture')`);
  await new Promise(resolve => setTimeout(resolve, 350));
  if (await ev(`innerWidth <= 1024 && !!document.querySelector('section.fixed.left-0.top-0.z-50')`)) {
    // Close the existing mobile navigation through its actual backdrop.
    for (const type of ['mousePressed', 'mouseReleased'])
      await cmd('Input.dispatchMouseEvent', { type, x: 370, y: 450, button: 'left', clickCount: 1 });
    await until(`!document.querySelector('section.fixed.left-0.top-0.z-50')`);
    await new Promise(resolve => setTimeout(resolve, 550));
  }
}
try {
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cmd(method);
  await cmd('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  for (const locale of ['de', 'en-US']) for (const width of [390, 1280]) {
    await cmd('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    for (const [name, value] of Object.entries({
      locale, user: JSON.stringify({ id: admin, admin: true }), session: JSON.stringify({ id: 'mfa-session', user_id: admin, mfa_verified: true }),
      authGeneration: 'fixture-login', accessToken: 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 10000 })).toString('base64url') + '.x', refreshToken: 'synthetic-refresh',
    })) await cmd('Network.setCookie', { name, value: encodeURIComponent(value), url: app, path: '/' });
    current = shared(); readFailure = null; writeFailure = null;
    setPublicationEnabled(false);
    const before = reads.length;
    await navigate();
    assert.equal(await ev(`!!document.querySelector('[data-publication-support]')`), false);
    assert.equal(reads.length, before);
    setPublicationEnabled(true);
    await navigate();
    await until(`document.querySelector('[data-publication-withdraw]')`);
    assert.equal(await ev(`document.querySelector('[data-publication-status]').innerText`), locale === 'de' ? 'Freigegeben' : 'Shared');
    const overflow = await ev(`document.querySelector('[data-publication-support]').getBoundingClientRect().right > innerWidth`);
    assert.equal(overflow, false, 'support card fits viewport');
    await click('[data-publication-withdraw]');
    await until(`document.querySelector('[data-publication-status]')?.innerText === ${JSON.stringify(locale === 'de' ? 'Privat' : 'Private')}`);
    assert.equal(await ev(`!!document.querySelector('[data-publication-withdraw]')`), false);
    assert.equal(writes.at(-1).expected_revision, 3);
    // A CAS conflict keeps the current state visible and needs another explicit action.
    current = shared(); writeFailure = 'conflict';
    await navigate(); await until(`document.querySelector('[data-publication-withdraw]')`);
    await click('[data-publication-withdraw]');
    await until(`document.querySelector('[data-publication-support] [role=alert]')`);
    await until(`document.querySelector('[data-publication-withdraw]:not(:disabled)')`);
    writeFailure = null;
    await click('[data-publication-withdraw]');
    await until(`!document.querySelector('[data-publication-withdraw]')`);
    assert.equal(writes.at(-1).expected_revision, 6);
    // A lost response rereads the committed private state without an invented success.
    current = shared(); writeFailure = 'lost';
    await navigate(); await until(`document.querySelector('[data-publication-withdraw]')`);
    await click('[data-publication-withdraw]');
    await until(`document.querySelector('[data-publication-support] [role=alert]')`);
    await until(`document.querySelector('[data-publication-status]')?.innerText === ${JSON.stringify(locale === 'de' ? 'Privat' : 'Private')}`);
    assert.equal(await ev(`!!document.querySelector('[data-publication-support] [role=status]')`), false);
    readFailure = 503;
    await navigate(); await until(`document.querySelector('[data-publication-reload]')`);
    assert.equal(await ev(`!!document.querySelector('[data-publication-withdraw]')`), false);
    readFailure = null; writeFailure = null;
    await click('[data-publication-reload]');
    await until(`document.querySelector('[data-publication-status]')`);
    cases.push(`${locale}/${width}: disabled, withdraw, CAS, lost reply, outage/retry`);
  }
  assert.deepEqual(errors, []);
  pass = true;
} finally {
  browser.close();
  report({ pass, cases, readCount: reads.length, writeCount: writes.length });
}
