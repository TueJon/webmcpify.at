import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_EVENTS,
  CONSENT_STATE,
  GA_MEASUREMENT_ID,
  analyticsConfig,
  cleanedBrowserPath,
  installAnalytics,
  isGaMeasurementId,
  queueAnalyticsEvent,
  sentPageLocation,
} from '../analytics.js';

test('uses the production webmcpify.at GA4 stream', () => {
  assert.equal(GA_MEASUREMENT_ID, 'G-45GCGY7SQN');
});

test('recognizes GA4 measurement IDs', () => {
  assert.equal(isGaMeasurementId('G-ABC1234567'), true);
  assert.equal(isGaMeasurementId('UA-1234-1'), false);
  assert.equal(isGaMeasurementId('G-'), false);
});

test('removes tracking inputs from the visible URL while preserving functional query data and fragments', () => {
  assert.equal(
    cleanedBrowserPath(
      'https://webmcpify.at/?utm_source=google&utm_medium=cpc&gclid=secret&language=de#install',
    ),
    '/?language=de#install',
  );
  assert.equal(
    cleanedBrowserPath('https://webmcpify.at/de/?GBRAID=secret'),
    '/de/',
  );
});

test('sends only attribution parameters to GA, never arbitrary query data or fragments', () => {
  assert.equal(
    sentPageLocation(
      'https://webmcpify.at/?utm_source=google&email=a%40b.c&token=xyz#install',
    ),
    'https://webmcpify.at/?utm_source=google',
  );
  assert.equal(
    sentPageLocation('https://webmcpify.at/de/?gclid=abc'),
    'https://webmcpify.at/de/?gclid=abc',
  );
  assert.equal(sentPageLocation('https://webmcpify.at/'), 'https://webmcpify.at/');
});

test('uses minimized GA4 configuration with explicit cookie scoping', () => {
  assert.deepEqual(analyticsConfig('https://webmcpify.at/?utm_source=google'), {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'webmcpify.at',
    cookie_expires: 7_776_000,
    cookie_flags: 'Secure;SameSite=Lax',
    cookie_update: false,
    page_location: 'https://webmcpify.at/?utm_source=google',
  });
});

test('consent mode state grants measurement and denies personalization', () => {
  assert.deepEqual(CONSENT_STATE, {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
});

test('queues only the two documented product-intent events', () => {
  const calls = [];
  const gtag = (...args) => calls.push(args);
  assert.equal(queueAnalyticsEvent(gtag, ANALYTICS_EVENTS.installCopy), true);
  assert.equal(queueAnalyticsEvent(gtag, ANALYTICS_EVENTS.githubOutbound), true);
  assert.equal(queueAnalyticsEvent(gtag, 'form_submit'), false);
  assert.deepEqual(calls, [
    ['event', 'install_command_copy'],
    ['event', 'github_outbound'],
  ]);
});

function fakeEnvironment() {
  const win = new EventTarget();
  const doc = new EventTarget();
  const appended = [];
  const replacements = [];
  doc.createElement = () => ({ async: false, src: '' });
  doc.head = { append: (node) => appended.push(node) };
  const loc = {
    href: 'https://webmcpify.at/?utm_source=google&utm_medium=cpc&language=de#install',
    pathname: '/',
    search: '?utm_source=google&utm_medium=cpc&language=de',
    hash: '#install',
  };
  const browserHistory = {
    state: { existing: true },
    replaceState: (...args) => replacements.push(args),
  };
  return { win, doc, loc, browserHistory, appended, replacements };
}

test('installs one Google tag with consent defaults first and a PII-safe page location', () => {
  const { win, doc, loc, browserHistory, appended, replacements } = fakeEnvironment();

  const analytics = installAnalytics({
    win,
    doc,
    loc,
    browserHistory,
    measurementId: 'G-ABC1234567',
  });

  assert.equal(analytics.measurementId, 'G-ABC1234567');
  assert.equal(appended.length, 1);
  assert.deepEqual(appended[0], {
    async: true,
    src: 'https://www.googletagmanager.com/gtag/js?id=G-ABC1234567',
  });

  // gtag.js requires `arguments` objects on the dataLayer, not plain arrays.
  const commands = win.dataLayer.map((entry) => {
    assert.equal(Array.isArray(entry), false);
    return [...entry];
  });
  assert.equal(commands.length, 3);
  assert.deepEqual(commands[0], ['consent', 'default', CONSENT_STATE]);
  assert.equal(commands[1][0], 'js');
  assert.ok(commands[1][1] instanceof Date);
  assert.deepEqual(commands[2], [
    'config',
    'G-ABC1234567',
    analyticsConfig('https://webmcpify.at/?utm_source=google&utm_medium=cpc'),
  ]);
  assert.deepEqual(replacements, [
    [{ existing: true }, '', '/?language=de#install'],
  ]);

  win.dispatchEvent(new Event('webmcpify:install-copy'));
  assert.deepEqual([...win.dataLayer[3]], ['event', 'install_command_copy']);
});

test('returns the existing installation instead of injecting twice', () => {
  const existing = Object.freeze({ measurementId: 'G-EXISTING1' });
  const win = { __webmcpifyAnalytics: existing };
  assert.equal(installAnalytics({ win }), existing);
});

test('importing the module has no side effects without an explicit install call', () => {
  // Import happened at the top of this file in a window-less Node process;
  // reaching this assertion without a throw, plus the absence of any global
  // dataLayer, is the contract consent gating depends on.
  assert.equal(globalThis.dataLayer, undefined);
  assert.equal(globalThis.gtag, undefined);
});
