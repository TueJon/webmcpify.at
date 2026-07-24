/**
 * Google Analytics 4 measurement for the webmcpify.at landing page.
 *
 * This module has NO import side effects: nothing touches the DOM, dataLayer,
 * or network until installAnalytics() is called. Consent gating lives in
 * consent.js, which calls installAnalytics() only after the visitor grants
 * the Statistics category — so every command below runs post-consent, and
 * the Consent Mode defaults reflect the separate Marketing choice.
 */

export const GA_MEASUREMENT_ID = 'G-45GCGY7SQN';

export const ANALYTICS_EVENTS = Object.freeze({
  installCopy: 'install_command_copy',
  githubOutbound: 'github_outbound',
});

// Attribution parameters, split by consent category: campaign parameters are
// analytics reporting (Statistics); Ads click identifiers are advertising
// attribution and may only reach Google when Marketing is granted. All of
// them are stripped from the visible browser URL afterwards.
const CAMPAIGN_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
]);
const AD_CLICK_KEYS = new Set([
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'gclsrc',
  'gad_source',
  'gad_campaignid',
]);
const TRACKING_KEYS = new Set([...CAMPAIGN_KEYS, ...AD_CLICK_KEYS]);

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
 * for attribution. Ads click identifiers (gclid & co.) are included only
 * when the Marketing category is granted; a Statistics-only grant reports
 * campaign parameters alone.
 */
export function sentPageLocation(href, consent = {}) {
  const allowed = consent.marketing === true ? TRACKING_KEYS : CAMPAIGN_KEYS;
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) {
    if (!allowed.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  return `${url.origin}${url.pathname}${url.search}`;
}

export const GA_COOKIE_DOMAIN = 'webmcpify.at';

export function analyticsConfig(pageLocation) {
  return Object.freeze({
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: GA_COOKIE_DOMAIN,
    cookie_expires: NINETY_DAYS_SECONDS,
    cookie_flags: 'Secure;SameSite=Lax',
    cookie_update: false,
    page_location: pageLocation,
  });
}

// Consent Mode v2 signal map for a category choice: statistics = GA4
// measurement (analytics_storage), marketing = Google Ads conversion and
// audience signals (ad_storage + ad_user_data). The two are separate
// consent purposes (Art. 4(11) DSGVO / EDPB 05/2020 §3.2) and must never
// be granted as a bundle. ad_personalization is never granted — personalized
// advertising stays off in every configuration, matching
// allow_ad_personalization_signals in the tag config.
export function consentStateFor(choice = {}) {
  return Object.freeze({
    ad_storage: choice.marketing === true ? 'granted' : 'denied',
    ad_user_data: choice.marketing === true ? 'granted' : 'denied',
    ad_personalization: 'denied',
    analytics_storage: choice.statistics === true ? 'granted' : 'denied',
  });
}

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
  const consent = options.consent ?? { statistics: false, marketing: false };

  if (win?.__webmcpifyAnalytics) return win.__webmcpifyAnalytics;
  if (!win || !doc || !loc || !browserHistory) return null;
  // Basic Consent Mode: the tag only ever loads once Statistics is granted —
  // config-ing GA4 with analytics_storage denied would send the contested
  // cookieless "advanced mode" pings. A Marketing-only choice stays inert:
  // every Ads signal on this site flows through the GA4 tag (there is no
  // standalone Ads tag), so without Statistics nothing loads and the visitor
  // gets less processing than consented to, never more.
  if (consent.statistics !== true) return null;
  if (!isGaMeasurementId(measurementId)) {
    throw new Error('Invalid GA4 measurement ID');
  }

  const dataLayer = win.dataLayer ?? [];
  win.dataLayer = dataLayer;
  const initialPush = dataLayer.push;
  // gtag.js only processes `arguments` objects pushed to dataLayer — plain
  // arrays are silently ignored. Keep the canonical function form.
  function gtag() {
    dataLayer.push(arguments);
  }
  win.gtag = gtag;
  // Same shape, but returned instead of pushed, so a queued command can be
  // swapped out again while it is still ours (see reviseQueued below).
  function command() {
    return arguments;
  }

  // Google's documented basic-mode sequence: fully denied defaults first,
  // then the visitor's actual choice as an update — all queued before the
  // script is injected, so nothing fires pre-consent. The redaction command
  // is always queued (not only when denied) so a later consent change can
  // rewrite it in place.
  let redactionEntry = command('set', 'ads_data_redaction', consent.marketing !== true);
  let consentEntry = command('consent', 'update', consentStateFor(consent));
  let configEntry = command(
    'config',
    measurementId,
    analyticsConfig(sentPageLocation(loc.href, consent)),
  );
  gtag('consent', 'default', consentStateFor({}));
  dataLayer.push(redactionEntry);
  dataLayer.push(consentEntry);
  gtag('js', new Date());
  dataLayer.push(configEntry);

  let tagLoaded = false;
  // gtag.js takes the queue over on execution (it replaces dataLayer.push).
  // Until then every queued command is still ours to rewrite.
  const queuePending = () => !tagLoaded && dataLayer.push === initialPush;
  /**
   * Applies a consent change that arrives while gtag.js is still downloading
   * by rewriting the pending commands. Appending a denial instead would let
   * gtag process the wider grant (and its click-ID page location) first.
   * Returns false once the queue belongs to gtag.js — the caller then sends
   * a normal consent update.
   */
  const reviseQueued = (next) => {
    if (!queuePending()) return false;
    const swap = (entry, replacement) => {
      const index = dataLayer.indexOf(entry);
      if (index !== -1) dataLayer[index] = replacement;
      return replacement;
    };
    redactionEntry = swap(
      redactionEntry,
      command('set', 'ads_data_redaction', next.marketing !== true),
    );
    consentEntry = swap(consentEntry, command('consent', 'update', consentStateFor(next)));
    configEntry = swap(
      configEntry,
      command('config', measurementId, analyticsConfig(sentPageLocation(loc.href, next))),
    );
    return true;
  };

  const cleanedPath = cleanedBrowserPath(loc.href);
  const currentPath = `${loc.pathname}${loc.search}${loc.hash}`;
  if (cleanedPath !== currentPath && browserHistory.replaceState) {
    browserHistory.replaceState(browserHistory.state ?? null, '', cleanedPath);
  }

  // Only start the cross-origin request once the address bar is clean: the
  // Referer this request carries is the document URL, which would otherwise
  // still hold the click ID under a Statistics-only grant. The element's own
  // referrer policy trims it to the bare origin either way.
  const tag = doc.createElement('script');
  tag.async = true;
  tag.referrerPolicy = 'origin';
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  tag.addEventListener?.('load', () => {
    tagLoaded = true;
  });
  doc.head.append(tag);

  const track = (eventName) => queueAnalyticsEvent(gtag, eventName);
  win.addEventListener('webmcpify:install-copy', () => {
    track(ANALYTICS_EVENTS.installCopy);
  });
  doc.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-measure="github-outbound"]')) {
      track(ANALYTICS_EVENTS.githubOutbound);
    }
  }, { capture: true });

  win.__webmcpifyAnalytics = Object.freeze({ measurementId, track, reviseQueued });
  return win.__webmcpifyAnalytics;
}
