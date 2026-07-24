/**
 * Consent management for webmcpify.at measurement (§165(3) TKG 2021,
 * Art. 6(1)(a)/7 DSGVO). Basic Consent Mode: the Google tag is not loaded,
 * no dataLayer command is queued, and no cookie is written until the visitor
 * opts in via the banner. Both banner actions carry identical styling (DSB
 * D124.0507/24: equal visual weight, rejection in one click), and the banner
 * is non-modal so imprint and privacy policy stay reachable.
 *
 * The stored decision {v, analytics, ts} keeps the consent timestamp
 * (Art. 7(1) demonstrability) and contains no identifier. Withdrawal:
 * the footer "Cookie settings" button reopens the banner; declining sets
 * the ga-disable flag and expires Google cookies.
 */

import { GA_MEASUREMENT_ID, installAnalytics } from './analytics.js';

export const CONSENT_KEY = 'wmcp-consent';

export function readStoredConsent(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(CONSENT_KEY));
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.ts === 'string'
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

export function writeStoredConsent(storage, analytics, ts) {
  const record = { v: 1, analytics, ts };
  try {
    storage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {}
  return record;
}

/** Best-effort removal of Google cookies after withdrawal. */
export function expireAnalyticsCookies(doc, host) {
  const names = (doc.cookie || '')
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter((name) => /^(_ga|_gcl)/.test(name));
  for (const name of names) {
    for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) {
      doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
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

  const showBanner = () => {
    banner.setAttribute(
      'aria-label',
      doc.documentElement?.lang === 'de' ? 'Cookie-Einwilligung' : 'Cookie consent',
    );
    banner.hidden = false;
  };
  const hideBanner = () => {
    banner.hidden = true;
  };

  const startAnalytics = () => {
    win[disableFlag] = false;
    install();
  };
  const grant = () => {
    writeStoredConsent(storage, true, now());
    hideBanner();
    startAnalytics();
  };
  const decline = () => {
    writeStoredConsent(storage, false, now());
    hideBanner();
    // Stops an already-running tag on withdrawal; harmless before any grant.
    win[disableFlag] = true;
    if (typeof win.gtag === 'function') {
      win.gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      });
    }
    expireAnalyticsCookies(doc, win.location?.hostname ?? 'webmcpify.at');
  };

  for (const btn of doc.querySelectorAll('[data-consent-accept]')) {
    btn.addEventListener('click', grant);
  }
  for (const btn of doc.querySelectorAll('[data-consent-decline]')) {
    btn.addEventListener('click', decline);
  }
  for (const btn of doc.querySelectorAll('[data-consent-open]')) {
    btn.hidden = false; // dead without JS, so only revealed here
    btn.addEventListener('click', showBanner);
  }

  const stored = readStoredConsent(storage);
  if (!stored) showBanner();
  else if (stored.analytics) startAnalytics();

  return { grant, decline, showBanner, stored };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initConsent();
}
