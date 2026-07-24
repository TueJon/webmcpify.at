import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_EVENTS,
  GA_MEASUREMENT_ID,
  analyticsConfig,
  cleanedBrowserPath,
  consentStateFor,
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
      { marketing: true },
    ),
    'https://webmcpify.at/?utm_source=google',
  );
  assert.equal(sentPageLocation('https://webmcpify.at/'), 'https://webmcpify.at/');
});

test('Ads click identifiers reach GA only when Marketing is granted', () => {
  const landing = 'https://webmcpify.at/de/?gclid=abc&utm_campaign=launch&gbraid=x';
  assert.equal(
    sentPageLocation(landing, { statistics: true, marketing: true }),
    'https://webmcpify.at/de/?gclid=abc&utm_campaign=launch&gbraid=x',
  );
  assert.equal(
    sentPageLocation(landing, { statistics: true, marketing: false }),
    'https://webmcpify.at/de/?utm_campaign=launch',
  );
  assert.equal(sentPageLocation(landing), 'https://webmcpify.at/de/?utm_campaign=launch');
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

test('consent state maps each category independently and never grants personalization', () => {
  assert.deepEqual(consentStateFor({ statistics: true, marketing: true }), {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  assert.deepEqual(consentStateFor({ statistics: true, marketing: false }), {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  assert.deepEqual(consentStateFor({ statistics: false, marketing: true }), {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  assert.deepEqual(consentStateFor({}), {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
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

test('installs one Google tag: denied defaults, the chosen update, then a PII-safe config', () => {
  const { win, doc, loc, browserHistory, appended, replacements } = fakeEnvironment();

  const analytics = installAnalytics({
    win,
    doc,
    loc,
    browserHistory,
    measurementId: 'G-ABC1234567',
    consent: { statistics: true, marketing: true },
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
  assert.equal(commands.length, 4);
  assert.deepEqual(commands[0], ['consent', 'default', consentStateFor({})]);
  assert.deepEqual(commands[1], [
    'consent',
    'update',
    consentStateFor({ statistics: true, marketing: true }),
  ]);
  assert.equal(commands[2][0], 'js');
  assert.ok(commands[2][1] instanceof Date);
  assert.deepEqual(commands[3], [
    'config',
    'G-ABC1234567',
    analyticsConfig('https://webmcpify.at/?utm_source=google&utm_medium=cpc'),
  ]);
  assert.deepEqual(replacements, [
    [{ existing: true }, '', '/?language=de#install'],
  ]);

  win.dispatchEvent(new Event('webmcpify:install-copy'));
  assert.deepEqual([...win.dataLayer[4]], ['event', 'install_command_copy']);
});

test('a Statistics-only grant redacts ads data and strips click IDs from a gclid landing', () => {
  const { win, doc, browserHistory, appended } = fakeEnvironment();
  const loc = {
    href: 'https://webmcpify.at/?gclid=secret&utm_source=google',
    pathname: '/',
    search: '?gclid=secret&utm_source=google',
    hash: '',
  };

  const analytics = installAnalytics({
    win,
    doc,
    loc,
    browserHistory,
    measurementId: 'G-ABC1234567',
    consent: { statistics: true, marketing: false },
  });

  assert.ok(analytics);
  assert.equal(appended.length, 1);
  const commands = win.dataLayer.map((entry) => [...entry]);
  assert.equal(commands.length, 5);
  assert.deepEqual(commands[0], ['consent', 'default', consentStateFor({})]);
  assert.deepEqual(commands[1], ['set', 'ads_data_redaction', true]);
  assert.deepEqual(commands[2], [
    'consent',
    'update',
    consentStateFor({ statistics: true, marketing: false }),
  ]);
  assert.equal(commands[3][0], 'js');
  assert.deepEqual(commands[4], [
    'config',
    'G-ABC1234567',
    analyticsConfig('https://webmcpify.at/?utm_source=google'),
  ]);
});

test('never installs without the Statistics grant, even with Marketing granted', () => {
  const { win, doc, loc, browserHistory, appended } = fakeEnvironment();

  assert.equal(
    installAnalytics({
      win,
      doc,
      loc,
      browserHistory,
      measurementId: 'G-ABC1234567',
      consent: { statistics: false, marketing: true },
    }),
    null,
  );
  assert.equal(
    installAnalytics({ win, doc, loc, browserHistory, measurementId: 'G-ABC1234567' }),
    null,
  );
  assert.equal(appended.length, 0);
  assert.equal(win.dataLayer, undefined);
  assert.equal(win.gtag, undefined);
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
