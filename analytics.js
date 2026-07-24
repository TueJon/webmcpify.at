/**
 * Google Analytics 4 measurement for the webmcpify.at landing page.
 *
 * This module has NO import side effects: nothing touches the DOM, dataLayer,
 * or network until installAnalytics() is called. Consent gating lives in
 * consent.js, which calls installAnalytics() only after opt-in — so every
 * command below (including the Consent Mode defaults) runs post-consent.
 */

export const GA_MEASUREMENT_ID = 'G-45GCGY7SQN';

export const ANALYTICS_EVENTS = Object.freeze({
  installCopy: 'install_command_copy',
  githubOutbound: 'github_outbound',
});

// Attribution parameters: kept in the URL sent to GA (they are the point of
// measurement), stripped from the visible browser URL afterwards.
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

/**
 * The URL reported to GA: attribution parameters only, no fragment. Unknown
 * query parameters never reach Google — arbitrary URLs can carry identifiers
 * (Google's own policy forbids sending PII), and the fragment is not needed
 * for attribution.
 */
export function sentPageLocation(href) {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) {
    if (!TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  return `${url.origin}${url.pathname}${url.search}`;
}

export function analyticsConfig(pageLocation) {
  return Object.freeze({
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'webmcpify.at',
    cookie_expires: NINETY_DAYS_SECONDS,
    cookie_flags: 'Secure;SameSite=Lax',
    cookie_update: false,
    page_location: pageLocation,
  });
}

// Consent Mode v2 defaults, pushed as the FIRST command. This module only
// ever runs after opt-in (basic consent mode: no tag, no pings before that),
// so measurement categories are granted here; personalization stays denied.
export const CONSENT_STATE = Object.freeze({
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'denied',
  analytics_storage: 'granted',
});

export function queueAnalyticsEvent(gtag, eventName) {
  if (!ALLOWED_EVENTS.has(eventName)) return false;
  gtag('event', eventName);
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

  const dataLayer = win.dataLayer ?? [];
  win.dataLayer = dataLayer;
  // gtag.js only processes `arguments` objects pushed to dataLayer — plain
  // arrays are silently ignored. Keep the canonical function form.
  function gtag() {
    dataLayer.push(arguments);
  }
  win.gtag = gtag;

  gtag('consent', 'default', CONSENT_STATE);
  gtag('js', new Date());
  gtag('config', measurementId, analyticsConfig(sentPageLocation(loc.href)));

  const tag = doc.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  doc.head.append(tag);

  const cleanedPath = cleanedBrowserPath(loc.href);
  const currentPath = `${loc.pathname}${loc.search}${loc.hash}`;
  if (cleanedPath !== currentPath && browserHistory.replaceState) {
    browserHistory.replaceState(browserHistory.state ?? null, '', cleanedPath);
  }

  const track = (eventName) => queueAnalyticsEvent(gtag, eventName);
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
