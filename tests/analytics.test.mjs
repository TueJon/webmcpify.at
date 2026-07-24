import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_EVENTS,
  GA_MEASUREMENT_ID,
  analyticsConfig,
  cleanedBrowserPath,
  installAnalytics,
  isGaMeasurementId,
  queueAnalyticsEvent,
} from '../analytics.js';

test('uses the production webmcpify.at GA4 stream', () => {
  assert.equal(GA_MEASUREMENT_ID, 'G-45GCGY7SQN');
});

test('recognizes GA4 measurement IDs', () => {
  assert.equal(isGaMeasurementId('G-ABC1234567'), true);
  assert.equal(isGaMeasurementId('UA-1234-1'), false);
  assert.equal(isGaMeasurementId('G-'), false);
});

test('removes tracking inputs while preserving functional query data and fragments', () => {
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

test('uses minimized GA4 configuration', () => {
  assert.deepEqual(
    analyticsConfig('https://webmcpify.at/?utm_source=google'),
    {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 7_776_000,
      cookie_update: false,
      page_location: 'https://webmcpify.at/?utm_source=google',
    },
  );
});

test('queues only the two documented product-intent events', () => {
  const dataLayer = [];
  assert.equal(queueAnalyticsEvent(dataLayer, ANALYTICS_EVENTS.installCopy), true);
  assert.equal(queueAnalyticsEvent(dataLayer, ANALYTICS_EVENTS.githubOutbound), true);
  assert.equal(queueAnalyticsEvent(dataLayer, 'form_submit'), false);
  assert.deepEqual(dataLayer, [
    ['event', 'install_command_copy'],
    ['event', 'github_outbound'],
  ]);
});

test('installs one Google tag and retains the original URL for attribution', () => {
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
  assert.equal(win.dataLayer.length, 2);
  assert.equal(win.dataLayer[0][0], 'js');
  assert.ok(win.dataLayer[0][1] instanceof Date);
  assert.deepEqual(win.dataLayer[1], [
    'config',
    'G-ABC1234567',
    analyticsConfig(loc.href),
  ]);
  assert.deepEqual(replacements, [
    [{ existing: true }, '', '/?language=de#install'],
  ]);

  win.dispatchEvent(new Event('webmcpify:install-copy'));
  assert.deepEqual(win.dataLayer[2], ['event', 'install_command_copy']);
});

test('returns the existing installation instead of injecting twice', () => {
  const existing = Object.freeze({ measurementId: 'G-EXISTING1' });
  const win = { __webmcpifyAnalytics: existing };
  assert.equal(installAnalytics({ win }), existing);
});
