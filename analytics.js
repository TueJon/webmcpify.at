/**
 * Google Analytics 4 measurement for the webmcpify.at landing page.
 *
 * This file deliberately contains no consent-management claims. Production
 * deployment is gated on the consent/privacy work documented in ANALYTICS.md.
 */

export const GA_MEASUREMENT_ID = 'G-45GCGY7SQN';

export const ANALYTICS_EVENTS = Object.freeze({
  installCopy: 'install_command_copy',
  githubOutbound: 'github_outbound',
});

const TRACKING_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  'gad_source',
  'gad_campaignid',
]);

const ALLOWED_EVENTS = new Set(Object.values(ANALYTICS_EVENTS));
const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

export function isGaMeasurementId(value) {
  return /^G-[A-Z0-9]+$/.test(value);
}

export function cleanedBrowserPath(href) {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function analyticsConfig(pageLocation) {
  return Object.freeze({
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: NINETY_DAYS_SECONDS,
    cookie_update: false,
    page_location: pageLocation,
  });
}

export function queueAnalyticsEvent(dataLayer, eventName) {
  if (!ALLOWED_EVENTS.has(eventName)) return false;
  dataLayer.push(['event', eventName]);
  return true;
}

export function installAnalytics(options = {}) {
  const win = options.win ?? globalThis.window;
  const doc = options.doc ?? globalThis.document;
  const loc = options.loc ?? globalThis.location;
  const browserHistory = options.browserHistory ?? globalThis.history;
  const measurementId = options.measurementId ?? GA_MEASUREMENT_ID;

  if (win?.__webmcpifyAnalytics) return win.__webmcpifyAnalytics;
  if (!win || !doc || !loc || !browserHistory) return null;
  if (!isGaMeasurementId(measurementId)) {
    throw new Error('Invalid GA4 measurement ID');
  }

  const pageLocation = loc.href;
  const dataLayer = win.dataLayer ?? [];
  win.dataLayer = dataLayer;
  const gtag = (...args) => dataLayer.push(args);
  win.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, analyticsConfig(pageLocation));

  const tag = doc.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  doc.head.append(tag);

  const cleanedPath = cleanedBrowserPath(pageLocation);
  const currentPath = `${loc.pathname}${loc.search}${loc.hash}`;
  if (cleanedPath !== currentPath && browserHistory.replaceState) {
    browserHistory.replaceState(browserHistory.state ?? null, '', cleanedPath);
  }

  const track = (eventName) => queueAnalyticsEvent(dataLayer, eventName);
  win.addEventListener('webmcpify:install-copy', () => {
    track(ANALYTICS_EVENTS.installCopy);
  });
  doc.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-measure="github-outbound"]')) {
      track(ANALYTICS_EVENTS.githubOutbound);
    }
  }, { capture: true });

  win.__webmcpifyAnalytics = Object.freeze({ measurementId, track });
  return win.__webmcpifyAnalytics;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installAnalytics();
}
