/**
 * Consent management for webmcpify.at measurement (§165(3) TKG 2021,
 * Art. 4(11)/6(1)(a)/7 DSGVO; EDPB Guidelines 05/2020 §3.2 — granularity).
 * Two categories, chosen on the same first layer:
 *
 *   statistics — GA4 measurement (analytics_storage; cookies _ga/_ga_*)
 *   marketing  — Google Ads conversion/audience signals
 *                (ad_storage + ad_user_data; cookie _gcl_au)
 *
 * Marketing is explicitly additive: every Ads signal on this site flows
 * through the GA4 tag (there is no standalone Ads tag), so the banner
 * enables the Marketing checkbox only once Statistics is selected, and a
 * stored {statistics: false, marketing: true} record is rejected as invalid
 * topology. ad_personalization is never granted in any configuration.
 *
 * Basic Consent Mode: the Google tag is not loaded, no dataLayer command is
 * queued, and no cookie is written until Statistics is opted in. All banner
 * actions carry identical styling (DSB D124.0507/24: equal visual weight,
 * rejection in one click), and the banner is non-modal so imprint and
 * privacy policy stay reachable.
 *
 * The stored decision {v: 2, statistics, marketing, ts} keeps the consent
 * timestamp (Art. 7(1) demonstrability) and contains no identifier. v1
 * single-category records are rejected on purpose — they bundled both
 * purposes into one grant — and their cookies are expired; those visitors
 * are asked again. Withdrawal: the "Cookie settings" button (present on
 * every page) reopens the banner; revoking a category pushes a denied
 * consent update and expires that category's cookies, and a `storage`
 * listener mirrors grant/withdrawal into other open tabs.
 */

import {
  GA_COOKIE_DOMAIN,
  GA_MEASUREMENT_ID,
  consentStateFor,
  installAnalytics,
} from './analytics.js';

export const CONSENT_KEY = 'wmcp-consent';

const GA_COOKIES = /^_ga(?:_|$)/;
const GCL_COOKIES = /^_gcl(?:_|$)/;

export function readStoredConsent(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(CONSENT_KEY));
    if (
      parsed &&
      parsed.v === 2 &&
      typeof parsed.statistics === 'boolean' &&
      typeof parsed.marketing === 'boolean' &&
      typeof parsed.ts === 'string' &&
      // Marketing without Statistics is not a reachable topology (the Ads
      // signals ride on the GA4 tag) — treat such a record as invalid.
      !(parsed.marketing && !parsed.statistics)
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

export function writeStoredConsent(storage, choice, ts) {
  const statistics = choice.statistics === true;
  const record = {
    v: 2,
    statistics,
    marketing: statistics && choice.marketing === true,
    ts,
  };
  try {
    storage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {}
  return record;
}

/** Best-effort removal of Google cookies (matcher narrows to one category). */
export function expireAnalyticsCookies(doc, host, matcher = /^_g(?:a|cl)(?:_|$)/) {
  const names = (doc.cookie || '')
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter((name) => matcher.test(name));
  const domains = [...new Set(['', host, `.${host}`, GA_COOKIE_DOMAIN, `.${GA_COOKIE_DOMAIN}`])];
  for (const name of names) {
    for (const domain of domains) {
      const scope = domain ? `; domain=${domain}` : '';
      doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`;
    }
  }
  return names;
}

export function initConsent(options = {}) {
  const win = options.win ?? globalThis.window;
  const doc = options.doc ?? globalThis.document;
  const storage = options.storage ?? globalThis.localStorage;
  const install = options.install ?? installAnalytics;
  const now = options.now ?? (() => new Date().toISOString());
  if (!win || !doc || !storage) return null;

  const banner = doc.getElementById('consent');
  if (!banner) return null;
  const disableFlag = `ga-disable-${GA_MEASUREMENT_ID}`;
  const boxes = [...doc.querySelectorAll('[data-consent-cat]')];
  const statisticsBox = boxes.find((b) => b.dataset.consentCat === 'statistics');
  const marketingBox = boxes.find((b) => b.dataset.consentCat === 'marketing');
  const host = () => win.location?.hostname ?? GA_COOKIE_DOMAIN;
  let opener = null;

  // Marketing rides on the GA4 tag, so it is selectable only with Statistics.
  const reflectCoupling = () => {
    if (!statisticsBox || !marketingBox) return;
    const enabled = statisticsBox.checked === true;
    marketingBox.disabled = !enabled;
    if (!enabled) marketingBox.checked = false;
  };
  statisticsBox?.addEventListener('change', reflectCoupling);

  const readSelection = () => ({
    statistics: statisticsBox?.checked === true,
    marketing: statisticsBox?.checked === true && marketingBox?.checked === true,
  });
  const syncSelection = (choice) => {
    if (statisticsBox) statisticsBox.checked = choice.statistics === true;
    if (marketingBox) marketingBox.checked = choice.marketing === true;
    reflectCoupling();
  };

  const showBanner = (openedBy = null) => {
    // Reopening reflects the stored choice; a first visit shows nothing
    // pre-ticked (no pre-selected consent — EDPB 05/2020).
    syncSelection(readStoredConsent(storage) ?? { statistics: false, marketing: false });
    banner.setAttribute(
      'aria-label',
      doc.documentElement?.lang === 'de' ? 'Cookie-Einwilligung' : 'Cookie consent',
    );
    banner.hidden = false;
    opener = openedBy;
    // Move focus into the banner only on an explicit reopen — stealing focus
    // on the automatic first-load display would hijack normal reading.
    if (openedBy) statisticsBox?.focus?.();
  };
  const hideBanner = () => {
    banner.hidden = true;
    opener?.focus?.();
    opener = null;
  };

  // Applies a choice to the running page: ga-disable flag, Consent Mode
  // update (only to the tag this site installed — win.gtag alone could be an
  // unrelated tag), redaction, install, and category cookie cleanup.
  const enforce = (choice) => {
    win[disableFlag] = choice.statistics !== true;
    if (win.__webmcpifyAnalytics) {
      win.gtag('set', 'ads_data_redaction', choice.marketing !== true);
      win.gtag('consent', 'update', consentStateFor(choice));
    } else if (choice.statistics === true) {
      install({ consent: { statistics: true, marketing: choice.marketing === true } });
    }
    if (choice.statistics !== true) expireAnalyticsCookies(doc, host(), GA_COOKIES);
    if (choice.marketing !== true) expireAnalyticsCookies(doc, host(), GCL_COOKIES);
  };

  const apply = (choice) => {
    const record = writeStoredConsent(storage, choice, now());
    hideBanner();
    enforce(record);
    return record;
  };

  const grantAll = () => apply({ statistics: true, marketing: true });
  const declineAll = () => apply({ statistics: false, marketing: false });
  const applySelection = () => apply(readSelection());

  for (const btn of doc.querySelectorAll('[data-consent-accept]')) {
    btn.addEventListener('click', grantAll);
  }
  for (const btn of doc.querySelectorAll('[data-consent-save]')) {
    btn.addEventListener('click', applySelection);
  }
  for (const btn of doc.querySelectorAll('[data-consent-decline]')) {
    btn.addEventListener('click', declineAll);
  }
  for (const btn of doc.querySelectorAll('[data-consent-open]')) {
    btn.hidden = false; // dead without JS, so only revealed here
    btn.addEventListener('click', () => showBanner(btn));
  }

  // Mirror another tab's grant/withdrawal into this one. Reads only — no
  // storage writes here, so tabs cannot ping-pong.
  win.addEventListener?.('storage', (event) => {
    if (event.key !== null && event.key !== CONSENT_KEY) return;
    const current = readStoredConsent(storage) ?? { statistics: false, marketing: false };
    enforce(current);
    if (!banner.hidden) syncSelection(current);
  });

  const stored = readStoredConsent(storage);
  if (!stored) {
    // Covers the v1→v2 migration: a rejected legacy record means consent is
    // no longer demonstrable, so cookies set under it must not survive.
    win[disableFlag] = true;
    expireAnalyticsCookies(doc, host());
    showBanner();
  } else if (stored.statistics) {
    win[disableFlag] = false;
    install({ consent: { statistics: stored.statistics, marketing: stored.marketing } });
  }

  return { grantAll, declineAll, applySelection, showBanner, stored };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initConsent();
}
