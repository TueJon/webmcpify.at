import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_KEY,
  expireAnalyticsCookies,
  initConsent,
  readStoredConsent,
  writeStoredConsent,
} from '../consent.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map,
  };
}

class FakeElement extends EventTarget {
  constructor() {
    super();
    this.hidden = true;
    this.attributes = {};
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

function fakeDom({ lang = 'en' } = {}) {
  const banner = new FakeElement();
  const accept = new FakeElement();
  const decline = new FakeElement();
  const open = new FakeElement();
  const doc = new EventTarget();
  doc.documentElement = { lang };
  doc.cookie = '';
  doc.getElementById = (id) => (id === 'consent' ? banner : null);
  doc.querySelectorAll = (selector) => {
    if (selector === '[data-consent-accept]') return [accept];
    if (selector === '[data-consent-decline]') return [decline];
    if (selector === '[data-consent-open]') return [open];
    return [];
  };
  const win = new EventTarget();
  win.location = { hostname: 'webmcpify.at' };
  return { doc, win, banner, accept, decline, open };
}

test('stored consent round-trips and rejects malformed records', () => {
  const storage = fakeStorage();
  const record = writeStoredConsent(storage, true, '2026-07-24T18:00:00.000Z');
  assert.deepEqual(record, { v: 1, analytics: true, ts: '2026-07-24T18:00:00.000Z' });
  assert.deepEqual(readStoredConsent(storage), record);

  assert.equal(readStoredConsent(fakeStorage({ [CONSENT_KEY]: 'not json' })), null);
  assert.equal(
    readStoredConsent(fakeStorage({ [CONSENT_KEY]: JSON.stringify({ v: 2, analytics: true, ts: 'x' }) })),
    null,
  );
  assert.equal(
    readStoredConsent(fakeStorage({ [CONSENT_KEY]: JSON.stringify({ v: 1, analytics: 'yes', ts: 'x' }) })),
    null,
  );
});

test('first visit shows the banner and does not start analytics', () => {
  const { doc, win, banner, open } = fakeDom();
  const installs = [];
  const api = initConsent({
    win,
    doc,
    storage: fakeStorage(),
    install: () => installs.push('install'),
    now: () => '2026-07-24T18:00:00.000Z',
  });
  assert.ok(api);
  assert.equal(banner.hidden, false);
  assert.equal(banner.attributes['aria-label'], 'Cookie consent');
  assert.equal(installs.length, 0);
  assert.equal(open.hidden, false); // settings button revealed for later withdrawal
});

test('accepting stores a timestamped grant, hides the banner, and starts analytics once', () => {
  const { doc, win, banner, accept } = fakeDom();
  const storage = fakeStorage();
  const installs = [];
  initConsent({
    win,
    doc,
    storage,
    install: () => installs.push('install'),
    now: () => '2026-07-24T18:00:00.000Z',
  });

  accept.dispatchEvent(new Event('click'));
  assert.deepEqual(readStoredConsent(storage), {
    v: 1,
    analytics: true,
    ts: '2026-07-24T18:00:00.000Z',
  });
  assert.equal(banner.hidden, true);
  assert.deepEqual(installs, ['install']);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], false);
});

test('declining stores the refusal, never installs, and sets the disable flag', () => {
  const { doc, win, banner, decline } = fakeDom();
  const storage = fakeStorage();
  const installs = [];
  const gtagCalls = [];
  win.gtag = (...args) => gtagCalls.push(args);
  initConsent({
    win,
    doc,
    storage,
    install: () => installs.push('install'),
    now: () => '2026-07-24T18:05:00.000Z',
  });

  decline.dispatchEvent(new Event('click'));
  assert.deepEqual(readStoredConsent(storage), {
    v: 1,
    analytics: false,
    ts: '2026-07-24T18:05:00.000Z',
  });
  assert.equal(banner.hidden, true);
  assert.equal(installs.length, 0);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);
  assert.deepEqual(gtagCalls, [
    ['consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    }],
  ]);
});

test('a stored grant starts analytics immediately without showing the banner', () => {
  const { doc, win, banner } = fakeDom();
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({ v: 1, analytics: true, ts: '2026-07-24T17:00:00.000Z' }),
  });
  const installs = [];
  initConsent({ win, doc, storage, install: () => installs.push('install') });
  assert.equal(banner.hidden, true);
  assert.deepEqual(installs, ['install']);
});

test('a stored refusal keeps the banner hidden and analytics off', () => {
  const { doc, win, banner } = fakeDom();
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({ v: 1, analytics: false, ts: '2026-07-24T17:00:00.000Z' }),
  });
  const installs = [];
  initConsent({ win, doc, storage, install: () => installs.push('install') });
  assert.equal(banner.hidden, true);
  assert.equal(installs.length, 0);
});

test('the settings button reopens the banner with a localized label', () => {
  const { doc, win, banner, open } = fakeDom({ lang: 'de' });
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({ v: 1, analytics: false, ts: '2026-07-24T17:00:00.000Z' }),
  });
  initConsent({ win, doc, storage, install: () => {} });
  assert.equal(banner.hidden, true);
  open.dispatchEvent(new Event('click'));
  assert.equal(banner.hidden, false);
  assert.equal(banner.attributes['aria-label'], 'Cookie-Einwilligung');
});

test('expireAnalyticsCookies targets only Google cookies across domain scopes', () => {
  const writes = [];
  const doc = {
    cookie: '_ga=GA1.1.1; _ga_45GCGY7SQN=GS1.1; _gcl_au=1.1; wmcp_other=keep',
  };
  Object.defineProperty(doc, 'cookie', {
    get: () => '_ga=GA1.1.1; _ga_45GCGY7SQN=GS1.1; _gcl_au=1.1; wmcp_other=keep',
    set: (v) => writes.push(v),
  });
  const names = expireAnalyticsCookies(doc, 'webmcpify.at');
  assert.deepEqual(names, ['_ga', '_ga_45GCGY7SQN', '_gcl_au']);
  assert.equal(writes.length, 9); // 3 cookies x 3 domain scopes
  assert.ok(writes.every((w) => w.includes('expires=Thu, 01 Jan 1970')));
  assert.ok(!writes.some((w) => w.startsWith('wmcp_other')));
});
