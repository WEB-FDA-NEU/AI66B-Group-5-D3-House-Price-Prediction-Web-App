import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const memory = new Map();
globalThis.location = { hostname: 'localhost', search: '' };
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.__HOMEVAL_FIXTURES__ = Object.fromEntries(readdirSync('frontend/mock').filter(f => f.endsWith('.json'))
  .map(f => [f.slice(0, -5), JSON.parse(readFileSync(`frontend/mock/${f}`, 'utf8'))]));
globalThis.fetch = () => { throw new Error('Offline mock must not fetch'); };
const api = await import('../frontend/js/api.js');
const { saveSession } = await import('../frontend/js/auth.js');
const input = () => structuredClone(globalThis.__HOMEVAL_FIXTURES__['prediction-result'].input);
beforeEach(() => {
  memory.clear();
  for (const operation of ['login', 'register', 'createPrediction', 'prediction-history', 'users']) api.setMockScenario(operation);
});

test('demo login verifies passwords and never returns credentials', async () => {
  const user = await api.login(' ANH@EXAMPLE.COM ', 'HomeVal123!');
  assert.equal(user.user.role, 'user');
  assert.equal((await api.login('admin@homeval.vn', 'Admin123!')).user.role, 'admin');
  for (const email of ['anh@example.com', 'fakeadmin@example.com']) {
    await assert.rejects(api.login(email, 'incorrect123'), { status: 401 });
  }
  saveSession(user);
  assert.ok(!JSON.stringify(user).includes('HomeVal123!'));
  assert.equal(user.user.password, undefined);
  assert.equal(user.user.digest, undefined);
  assert.equal(JSON.parse(memory.get('app_user')).password, undefined);
  assert.ok((await api.listUsers()).items.every(u => !('password' in u) && !('password_hash' in u)));
});

test('registration validates, detects duplicate email and can log in again', async () => {
  const payload = { display_name: 'Demo User', email: 'NEW@example.com', password: 'Test12345' };
  await api.register(payload);
  assert.equal((await api.login('new@example.com', payload.password)).user.email, 'new@example.com');
  assert.ok(!memory.get('homeval_mock_accounts_v1').includes(payload.password));
  await assert.rejects(api.register({ ...payload, email: 'new@example.com' }), { status: 409 });
  await assert.rejects(api.register({ ...payload, password: 'abcdefgh' }), { status: 422 });
});

test('prediction validates BR-7 and returns an isolated snapshot and complete price contract', async () => {
  const submitted = input();
  const result = await api.createPrediction(submitted);
  submitted.area_m2 = 999;
  assert.equal(result.input.area_m2, 72);
  assert.ok(result.disclaimer && result.model_version && result.confidence_interval && result.is_mock);
  for (const bad of [null, { ...input(), area_m2: -1 }, { ...input(), area_m2: 99999 },
    { ...input(), bathrooms: 99 }, { ...input(), year_built: 9999 }]) {
    await assert.rejects(api.createPrediction(bad), { status: 422 });
  }
});

test('saved details retain the matching inputs, interval, model and disclaimer', async () => {
  const history = await api.getPredictionHistory();
  for (const item of history.items) {
    const detail = await api.getPrediction(item.id);
    assert.equal(detail.input.area_m2, item.area_m2);
    assert.ok(detail.disclaimer && detail.model_version);
    assert.ok(detail.confidence_interval.lower < detail.estimated_price);
    assert.ok(detail.confidence_interval.upper > detail.estimated_price);
  }
  await assert.rejects(api.getPrediction('missing'), { status: 404 });
});

test('search, pagination, empty and delayed mock responses', async () => {
  assert.equal((await api.getPredictionHistory({ q: 'Thủ Đức' })).total, 1);
  assert.equal((await api.listUsers({ q: 'ADMIN' })).total, 1);
  assert.equal((await api.getPredictionHistory({ page: 2, pageSize: 1 })).items[0].id, 'pred-20260922-002');
  assert.equal((await api.listUsers({ page: Infinity, pageSize: -2 })).page, 1);
  api.setMockScenario('prediction-history', 'empty');
  assert.deepEqual((await api.getPredictionHistory()).items, []);
  api.setMockScenario('login', 'loading');
  const start = Date.now();
  await api.login('anh@example.com', 'HomeVal123!');
  assert.ok(Date.now() - start >= 1100);
});

test('deterministic error scenarios exercise actual rejected promises', async () => {
  for (const [scenario, status] of Object.entries({ validation: 422, unauthorized: 401, notFound: 404, quota: 429, server: 500, network: 0 })) {
    api.setMockScenario('createPrediction', scenario);
    await assert.rejects(api.createPrediction(input()), { status });
  }
});
