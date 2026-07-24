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
  let writes = 0;
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      writes += 1;
      map.set(k, String(v));
    },
    get writes() {
      return writes;
    },
    map,
  };
}

class FakeElement extends EventTarget {
  constructor(dataset = {}) {
    super();
    this.hidden = true;
    this.checked = false;
    this.disabled = false;
    this.dataset = dataset;
    this.attributes = {};
    this.focused = false;
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  focus() {
    this.focused = true;
  }
}

function fakeDom({ lang = 'en' } = {}) {
  const banner = new FakeElement();
  const accept = new FakeElement();
  const save = new FakeElement();
  const decline = new FakeElement();
  const open = new FakeElement();
  const statisticsBox = new FakeElement({ consentCat: 'statistics' });
  const marketingBox = new FakeElement({ consentCat: 'marketing' });
  marketingBox.disabled = true; // matches the markup's initial state
  const doc = new EventTarget();
  doc.documentElement = { lang };
  doc.cookie = '';
  doc.getElementById = (id) => (id === 'consent' ? banner : null);
  doc.querySelectorAll = (selector) => {
    if (selector === '[data-consent-accept]') return [accept];
    if (selector === '[data-consent-save]') return [save];
    if (selector === '[data-consent-decline]') return [decline];
    if (selector === '[data-consent-open]') return [open];
    if (selector === '[data-consent-cat]') return [statisticsBox, marketingBox];
    return [];
  };
  const win = new EventTarget();
  win.location = { hostname: 'webmcpify.at' };
  return { doc, win, banner, accept, save, decline, open, statisticsBox, marketingBox };
}

function checkStatistics(box, checked = true) {
  box.checked = checked;
  box.dispatchEvent(new Event('change'));
}

test('stored consent round-trips, normalizes topology, and rejects malformed records', () => {
  const storage = fakeStorage();
  const record = writeStoredConsent(
    storage,
    { statistics: true, marketing: false },
    '2026-07-24T18:00:00.000Z',
  );
  assert.deepEqual(record, {
    v: 2,
    statistics: true,
    marketing: false,
    ts: '2026-07-24T18:00:00.000Z',
  });
  assert.deepEqual(readStoredConsent(storage), record);

  // Marketing rides on the GA4 tag: it cannot be stored without Statistics.
  const normalized = writeStoredConsent(
    fakeStorage(),
    { statistics: false, marketing: true },
    'x',
  );
  assert.deepEqual(normalized, { v: 2, statistics: false, marketing: false, ts: 'x' });
  assert.equal(
    readStoredConsent(
      fakeStorage({
        [CONSENT_KEY]: JSON.stringify({ v: 2, statistics: false, marketing: true, ts: 'x' }),
      }),
    ),
    null,
  );

  assert.equal(readStoredConsent(fakeStorage({ [CONSENT_KEY]: 'not json' })), null);
  assert.equal(
    readStoredConsent(
      fakeStorage({
        [CONSENT_KEY]: JSON.stringify({ v: 2, statistics: 'yes', marketing: false, ts: 'x' }),
      }),
    ),
    null,
  );
});

test('a v1 record is rejected, its cookies are expired, and the visitor is re-asked', () => {
  // The v1 grant bundled analytics and Ads signals into one action — not
  // granular consent, so it must not carry over and its cookies must go.
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({ v: 1, analytics: true, ts: '2026-07-24T17:00:00.000Z' }),
  });
  assert.equal(readStoredConsent(storage), null);

  const { doc, win, banner } = fakeDom();
  const cookieWrites = [];
  Object.defineProperty(doc, 'cookie', {
    get: () => '_ga=GA1.1.1; _gcl_au=1.1',
    set: (v) => cookieWrites.push(v),
  });
  const installs = [];
  initConsent({ win, doc, storage, install: (opts) => installs.push(opts) });
  assert.equal(banner.hidden, false);
  assert.equal(installs.length, 0);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);
  assert.ok(cookieWrites.some((w) => w.startsWith('_ga=')));
  assert.ok(cookieWrites.some((w) => w.startsWith('_gcl_au=')));
});

test('first visit shows the banner with nothing pre-ticked and Marketing locked', () => {
  const { doc, win, banner, open, statisticsBox, marketingBox } = fakeDom();
  const installs = [];
  const api = initConsent({
    win,
    doc,
    storage: fakeStorage(),
    install: (opts) => installs.push(opts),
    now: () => '2026-07-24T18:00:00.000Z',
  });
  assert.ok(api);
  assert.equal(banner.hidden, false);
  assert.equal(banner.attributes['aria-label'], 'Cookie consent');
  assert.equal(statisticsBox.checked, false);
  assert.equal(marketingBox.checked, false);
  assert.equal(marketingBox.disabled, true);
  assert.equal(statisticsBox.focused, false); // automatic display must not steal focus
  assert.equal(installs.length, 0);
  assert.equal(open.hidden, false); // settings button revealed for later withdrawal
});

test('selecting Statistics unlocks Marketing; deselecting clears and locks it again', () => {
  const { doc, win, statisticsBox, marketingBox } = fakeDom();
  initConsent({ win, doc, storage: fakeStorage(), install: () => {} });

  checkStatistics(statisticsBox, true);
  assert.equal(marketingBox.disabled, false);
  marketingBox.checked = true;

  checkStatistics(statisticsBox, false);
  assert.equal(marketingBox.disabled, true);
  assert.equal(marketingBox.checked, false);
});

test('accept-all stores both grants with a timestamp, hides the banner, and installs once', () => {
  const { doc, win, banner, accept } = fakeDom();
  const storage = fakeStorage();
  const installs = [];
  initConsent({
    win,
    doc,
    storage,
    install: (opts) => installs.push(opts),
    now: () => '2026-07-24T18:00:00.000Z',
  });

  accept.dispatchEvent(new Event('click'));
  assert.deepEqual(readStoredConsent(storage), {
    v: 2,
    statistics: true,
    marketing: true,
    ts: '2026-07-24T18:00:00.000Z',
  });
  assert.equal(banner.hidden, true);
  assert.deepEqual(installs, [{ consent: { statistics: true, marketing: true } }]);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], false);
});

test('save-choices with Statistics only installs with the ad signals denied', () => {
  const { doc, win, save, statisticsBox } = fakeDom();
  const storage = fakeStorage();
  const installs = [];
  initConsent({
    win,
    doc,
    storage,
    install: (opts) => installs.push(opts),
    now: () => '2026-07-24T18:01:00.000Z',
  });

  checkStatistics(statisticsBox, true);
  save.dispatchEvent(new Event('click'));
  assert.deepEqual(readStoredConsent(storage), {
    v: 2,
    statistics: true,
    marketing: false,
    ts: '2026-07-24T18:01:00.000Z',
  });
  assert.deepEqual(installs, [{ consent: { statistics: true, marketing: false } }]);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], false);
});

test('a marketing tick without Statistics saves as a full refusal', () => {
  const { doc, win, save, marketingBox } = fakeDom();
  const storage = fakeStorage();
  const installs = [];
  initConsent({
    win,
    doc,
    storage,
    install: (opts) => installs.push(opts),
    now: () => '2026-07-24T18:02:00.000Z',
  });

  marketingBox.checked = true; // not reachable through the UI, but stay safe
  save.dispatchEvent(new Event('click'));
  assert.deepEqual(readStoredConsent(storage), {
    v: 2,
    statistics: false,
    marketing: false,
    ts: '2026-07-24T18:02:00.000Z',
  });
  assert.equal(installs.length, 0);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);
});

test('reject-all stores the refusal, never installs, and leaves foreign gtag objects alone', () => {
  const { doc, win, banner, decline } = fakeDom();
  const storage = fakeStorage();
  const installs = [];
  const gtagCalls = [];
  // An unrelated tag on the page must not be treated as ours.
  win.gtag = (...args) => gtagCalls.push(args);
  initConsent({
    win,
    doc,
    storage,
    install: (opts) => installs.push(opts),
    now: () => '2026-07-24T18:05:00.000Z',
  });

  decline.dispatchEvent(new Event('click'));
  assert.deepEqual(readStoredConsent(storage), {
    v: 2,
    statistics: false,
    marketing: false,
    ts: '2026-07-24T18:05:00.000Z',
  });
  assert.equal(banner.hidden, true);
  assert.equal(installs.length, 0);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);
  assert.deepEqual(gtagCalls, []); // no sentinel — not our tag, no commands
});

test('transitions on one page: reject → statistics → all → statistics → reject', () => {
  const { doc, win, statisticsBox } = fakeDom();
  const storage = fakeStorage();
  const gtagCalls = [];
  const installs = [];
  const install = (opts) => {
    installs.push(opts);
    win.__webmcpifyAnalytics = { measurementId: 'G-45GCGY7SQN' };
    win.gtag = (...args) => gtagCalls.push(args);
  };
  const api = initConsent({ win, doc, storage, install, now: () => 'ts' });

  api.declineAll();
  assert.equal(installs.length, 0);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);

  checkStatistics(statisticsBox, true);
  api.applySelection();
  assert.deepEqual(installs, [{ consent: { statistics: true, marketing: false } }]);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], false);
  assert.deepEqual(gtagCalls, []); // fresh install carries the consent itself

  api.grantAll();
  assert.equal(installs.length, 1); // never reinstalls
  assert.deepEqual(gtagCalls, [
    ['set', 'ads_data_redaction', false],
    ['consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    }],
  ]);

  gtagCalls.length = 0;
  api.applySelection(); // boxes still: statistics ticked, marketing not
  assert.deepEqual(gtagCalls, [
    ['set', 'ads_data_redaction', true],
    ['consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    }],
  ]);

  gtagCalls.length = 0;
  api.declineAll();
  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);
  assert.deepEqual(gtagCalls, [
    ['set', 'ads_data_redaction', true],
    ['consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    }],
  ]);
  assert.equal(installs.length, 1);
});

test('revoking Marketing keeps analytics running and expires only _gcl cookies', () => {
  const { doc, win, save, statisticsBox } = fakeDom();
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({
      v: 2, statistics: true, marketing: true, ts: '2026-07-24T17:00:00.000Z',
    }),
  });
  const cookieWrites = [];
  Object.defineProperty(doc, 'cookie', {
    get: () => '_ga=GA1.1.1; _ga_45GCGY7SQN=GS1.1; _gcl_au=1.1',
    set: (v) => cookieWrites.push(v),
  });
  const gtagCalls = [];
  const installs = [];
  initConsent({
    win,
    doc,
    storage,
    install: (opts) => {
      installs.push(opts);
      win.__webmcpifyAnalytics = { measurementId: 'G-45GCGY7SQN' };
      win.gtag = (...args) => gtagCalls.push(args);
    },
  });
  assert.equal(installs.length, 1); // stored grant started analytics

  checkStatistics(statisticsBox, true); // marketing box left unchecked
  save.dispatchEvent(new Event('click'));

  assert.equal(readStoredConsent(storage).marketing, false);
  assert.equal(win['ga-disable-G-45GCGY7SQN'], false);
  assert.deepEqual(gtagCalls, [
    ['set', 'ads_data_redaction', true],
    ['consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    }],
  ]);
  assert.ok(cookieWrites.length > 0);
  assert.ok(cookieWrites.every((w) => w.startsWith('_gcl')));
});

test('another tab’s withdrawal is enforced here without writing storage back', () => {
  const { doc, win, banner, statisticsBox, marketingBox } = fakeDom();
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({
      v: 2, statistics: true, marketing: true, ts: '2026-07-24T17:00:00.000Z',
    }),
  });
  const cookieWrites = [];
  Object.defineProperty(doc, 'cookie', {
    get: () => '_ga=GA1.1.1; _gcl_au=1.1',
    set: (v) => cookieWrites.push(v),
  });
  const gtagCalls = [];
  initConsent({
    win,
    doc,
    storage,
    install: () => {
      win.__webmcpifyAnalytics = { measurementId: 'G-45GCGY7SQN' };
      win.gtag = (...args) => gtagCalls.push(args);
    },
  });
  const writesBefore = storage.writes;
  banner.hidden = false; // banner happens to be open in this tab

  // The other tab declined; simulate its storage event reaching this tab.
  storage.map.set(
    CONSENT_KEY,
    JSON.stringify({ v: 2, statistics: false, marketing: false, ts: '2026-07-24T18:00:00.000Z' }),
  );
  const evt = new Event('storage');
  evt.key = CONSENT_KEY;
  win.dispatchEvent(evt);

  assert.equal(win['ga-disable-G-45GCGY7SQN'], true);
  assert.deepEqual(gtagCalls.at(-1), ['consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  }]);
  assert.ok(cookieWrites.some((w) => w.startsWith('_ga=')));
  assert.equal(storage.writes, writesBefore); // reads only — no ping-pong
  assert.equal(statisticsBox.checked, false);
  assert.equal(marketingBox.checked, false);
});

test('a stored grant starts analytics immediately without showing the banner', () => {
  const { doc, win, banner } = fakeDom();
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({
      v: 2, statistics: true, marketing: false, ts: '2026-07-24T17:00:00.000Z',
    }),
  });
  const installs = [];
  initConsent({ win, doc, storage, install: (opts) => installs.push(opts) });
  assert.equal(banner.hidden, true);
  assert.deepEqual(installs, [{ consent: { statistics: true, marketing: false } }]);
});

test('a stored refusal keeps the banner hidden and analytics off', () => {
  const { doc, win, banner } = fakeDom();
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({
      v: 2, statistics: false, marketing: false, ts: '2026-07-24T17:00:00.000Z',
    }),
  });
  const installs = [];
  initConsent({ win, doc, storage, install: (opts) => installs.push(opts) });
  assert.equal(banner.hidden, true);
  assert.equal(installs.length, 0);
});

test('the settings button reopens with a localized label, stored selection, and moved focus', () => {
  const { doc, win, banner, accept, open, statisticsBox, marketingBox } = fakeDom({ lang: 'de' });
  const storage = fakeStorage({
    [CONSENT_KEY]: JSON.stringify({
      v: 2, statistics: true, marketing: false, ts: '2026-07-24T17:00:00.000Z',
    }),
  });
  initConsent({ win, doc, storage, install: () => {}, now: () => 'ts' });
  assert.equal(banner.hidden, true);

  open.dispatchEvent(new Event('click'));
  assert.equal(banner.hidden, false);
  assert.equal(banner.attributes['aria-label'], 'Cookie-Einwilligung');
  assert.equal(statisticsBox.checked, true);
  assert.equal(statisticsBox.focused, true); // explicit reopen moves focus in
  assert.equal(marketingBox.checked, false);
  assert.equal(marketingBox.disabled, false); // statistics is ticked

  open.focused = false;
  accept.dispatchEvent(new Event('click'));
  assert.equal(banner.hidden, true);
  assert.equal(open.focused, true); // focus returns to the opener
});

test('expireAnalyticsCookies matches only real Google cookie families', () => {
  const cookieString = '_ga=1; _ga_45GCGY7SQN=1; _gcl_au=1; _garden=keep; _gallery=keep; wmcp_other=keep';
  const makeDoc = () => {
    const writes = [];
    const doc = {};
    Object.defineProperty(doc, 'cookie', {
      get: () => cookieString,
      set: (v) => writes.push(v),
    });
    return { doc, writes };
  };

  const all = makeDoc();
  assert.deepEqual(expireAnalyticsCookies(all.doc, 'webmcpify.at'), [
    '_ga', '_ga_45GCGY7SQN', '_gcl_au',
  ]);
  assert.equal(all.writes.length, 9); // 3 cookies x 3 domain scopes (host == GA domain)
  assert.ok(all.writes.every((w) => w.includes('expires=Thu, 01 Jan 1970')));
  assert.ok(!all.writes.some((w) => w.startsWith('_garden') || w.startsWith('_gallery')));

  const gaOnly = makeDoc();
  assert.deepEqual(expireAnalyticsCookies(gaOnly.doc, 'webmcpify.at', /^_ga(?:_|$)/), [
    '_ga', '_ga_45GCGY7SQN',
  ]);

  // A www host still clears the apex-scoped GA cookie domain.
  const www = makeDoc();
  expireAnalyticsCookies(www.doc, 'www.webmcpify.at', /^_gcl(?:_|$)/);
  assert.equal(www.writes.length, 5); // '', www, .www, apex, .apex
  assert.ok(www.writes.some((w) => w.includes('domain=webmcpify.at')));
});
