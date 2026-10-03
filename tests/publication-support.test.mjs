import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as Vue from 'vue';
import { Mutex } from 'async-mutex';

async function source(file, scope, returned) {
  const code = ts.transpileModule(await readFile(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\n/gm, '').replace(/^export /gm, '');
  return vm.runInNewContext(code + `\n(${returned});`, { ...Vue, crypto: webcrypto, ...scope });
}
const sameSession = await source('../utils/sessionRefresh.ts', { Mutex }, 'sameSession');
const shared = { profile_visibility: 'shared', visibility_revision: 3, shared_at: 123, withdrawn_at: null };
const privateState = { ...shared, profile_visibility: 'private', visibility_revision: 4, withdrawn_at: 456 };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function fixture() {
  const scope = Vue.effectScope(), id = Vue.ref('target'), user = Vue.ref({ id: 'admin' }), session = Vue.ref({ id: 'mfa-session' });
  const reads = [], writes = [], transport = { state: shared, get: null, post: null, generation: 'login-1', access: 'first-access' };
  const methods = await source('../composables/publicationSupport.ts', {
    sameSession, onMounted() {}, onBeforeUnmount() {}, useUser: () => user, useSession: () => session,
    getSessionSnapshot: () => ({ identity: `${user.value.id}:${session.value.id}`, generation: transport.generation, accessToken: transport.access }),
    GET: async (path) => { reads.push(path); return transport.get ? transport.get(path) : { ...transport.state }; },
    POST: async (path, body) => { writes.push({ path, body: JSON.parse(JSON.stringify(body)) }); return transport.post ? transport.post(path, body) : { current: privateState }; },
  }, '({ usePublicationSupport })');
  const view = scope.run(() => methods.usePublicationSupport(id));
  await Promise.resolve(); await Promise.resolve(); await Vue.nextTick();
  return { view, id, user, session, reads, writes, transport, dispose: () => scope.stop() };
}

test('support withdraws only a loaded shared profile, with an exact revision and no consent fields', async () => {
  const f = await fixture();
  try {
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].path, '/auth/admin/users/target/publication/withdraw');
    assert.deepEqual(Object.keys(f.writes[0].body).sort(), ['expected_revision', 'request_id']);
    assert.equal(f.writes[0].body.expected_revision, 3);
    assert.match(f.writes[0].body.request_id, /^[0-9a-f-]{36}$/);
    assert.equal(f.view.publication.value.profile_visibility, 'private');
    assert.equal(f.view.confirmed.value, true);
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
  } finally { f.dispose(); }
});

test('duplicate clicks issue one command and an old withdrawal replay cannot show a fresh share as private', async () => {
  const f = await fixture(), reply = deferred();
  try {
    f.transport.post = () => reply.promise;
    const pending = f.view.withdraw();
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
    reply.resolve({ current: shared, replayed: true });
    await pending;
    assert.equal(f.view.confirmed.value, false);
    assert.equal(f.view.publication.value.profile_visibility, 'shared');
  } finally { f.dispose(); }
});

test('lost replies and CAS conflicts reread authority without claiming a successful write', async () => {
  for (const status of [0, 409, 503, 403]) {
    const f = await fixture();
    try {
      f.transport.post = async () => { throw { status }; };
      f.transport.state = privateState;
      await f.view.withdraw();
      assert.equal(f.writes.length, 1);
      assert.equal(f.reads.length, 2);
      assert.equal(f.view.publication.value.profile_visibility, 'private');
      assert.equal(f.view.confirmed.value, false);
      assert(f.view.error.value);
      await f.view.withdraw();
      assert.equal(f.writes.length, 1);
    } finally { f.dispose(); }
  }
});

test('unavailable or malformed current state disables all further writes', async () => {
  const f = await fixture();
  try {
    f.transport.post = async () => { throw Error('lost'); };
    f.transport.get = async () => { throw { status: 503 }; };
    await f.view.withdraw();
    assert.equal(f.view.publication.value, null);
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
    f.transport.get = async () => ({ profile_visibility: 'unknown', visibility_revision: 5 });
    await f.view.load();
    assert.equal(f.view.publication.value, null);
    assert.equal(f.view.loading.value, false);
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
  } finally { f.dispose(); }
});

test('late reads and writes cannot populate another target or administrator session', async () => {
  for (const kind of ['target', 'actor', 'session']) {
    const f = await fixture(), reply = deferred();
    try {
      f.transport.post = () => reply.promise;
      const pending = f.view.withdraw();
      if (kind === 'target') f.id.value = 'another-target';
      if (kind === 'actor') f.user.value = { id: 'another-admin' };
      if (kind === 'session') f.session.value = { id: 'another-session' };
      await Promise.resolve(); await Promise.resolve();
      reply.resolve({ current: privateState });
      await pending;
      assert.equal(f.view.confirmed.value, false);
      assert.equal(f.view.publication.value.profile_visibility, 'shared');
      assert.equal(f.view.busy.value, false);
    } finally { f.dispose(); }
  }
  const f = await fixture(), reply = deferred();
  try {
    f.transport.get = () => reply.promise;
    const pending = f.view.load();
    f.transport.get = async () => privateState;
    f.id.value = 'new-target';
    await Promise.resolve(); await Promise.resolve();
    reply.resolve(shared);
    await pending;
    assert.equal(f.view.publication.value.profile_visibility, 'private');
  } finally { f.dispose(); }
});

test('refresh preserves loaded authority; a changed login generation requires a fresh read', async () => {
  const f = await fixture();
  try {
    f.transport.access = 'rotated-access';
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
    f.transport.state = shared;
    await f.view.load();
    f.transport.generation = 'another-login';
    await f.view.withdraw();
    assert.equal(f.writes.length, 1);
    assert.equal(f.reads.length, 3);
  } finally { f.dispose(); }
});
