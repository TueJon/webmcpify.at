/**
 * Minimal first-party measurement for the two launch events that matter.
 *
 * No cookies, identity, arbitrary query values, referrers, or third-party code.
 * Incoming campaign parameters are reduced to one fixed code before session
 * storage. Event requests contain no body or query string.
 */

const STORAGE_KEY = 'webmcpify-attribution-v1';
const EVENT_ROOT = '/__measure';

export const ATTRIBUTION_RULES = Object.freeze([
  ['show-hn', { source: 'hacker-news', medium: 'referral', campaign: 'launch-2026' }],
  ['chrome-group', { source: 'chrome-group', medium: 'community', campaign: 'launch-2026' }],
  ['console', { source: 'console-dev', medium: 'referral', campaign: 'launch-2026' }],
  ['changelog', { source: 'changelog', medium: 'referral', campaign: 'launch-2026' }],
  ['linkedin', { source: 'linkedin', medium: 'social', campaign: 'launch-2026' }],
  ['reddit', { source: 'reddit', medium: 'social', campaign: 'launch-2026' }],
  ['google-cpc', { source: 'google', medium: 'cpc', campaign: 'webmcpify-search-test' }],
]);

const SAFE_CODES = new Set(['direct', 'other', ...ATTRIBUTION_RULES.map(([code]) => code)]);

const normalized = (params, key) => (params.get(key) ?? '').trim().toLowerCase();

export function attributionFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const candidate = {
    source: normalized(params, 'utm_source'),
    medium: normalized(params, 'utm_medium'),
    campaign: normalized(params, 'utm_campaign'),
  };
  const hasCampaignInput = Object.values(candidate).some(Boolean)
    || params.has('utm_content') || params.has('utm_term');
  if (!hasCampaignInput) return 'direct';
  return ATTRIBUTION_RULES.find(([, rule]) =>
    rule.source === candidate.source
    && rule.medium === candidate.medium
    && rule.campaign === candidate.campaign)?.[0] ?? 'other';
}

export function safeStoredAttribution(value) {
  return SAFE_CODES.has(value) ? value : null;
}

function currentAttribution() {
  let stored = null;
  try { stored = safeStoredAttribution(sessionStorage.getItem(STORAGE_KEY)); } catch {}

  const fromUrl = attributionFromSearch(location.search);
  const hasUtm = /(?:^|[?&])utm_(?:source|medium|campaign|content|term)=/i.test(location.search);
  const code = hasUtm ? fromUrl : (stored ?? fromUrl);
  try { sessionStorage.setItem(STORAGE_KEY, code); } catch {}

  // The landing page has no functional query parameters. Remove campaign input
  // after reducing it so it cannot be copied, reflected, or retained in history.
  if (hasUtm && history.replaceState) {
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
  }
  return code;
}

export function eventPath(eventName, attribution) {
  if (!['install-command-copy', 'github-outbound'].includes(eventName)) return null;
  const code = safeStoredAttribution(attribution);
  return code ? `${EVENT_ROOT}/${eventName}/${code}` : null;
}

function emit(eventName) {
  const path = eventPath(eventName, currentAttribution());
  if (!path) return;
  // `credentials: omit` guarantees browser cookies are not attached. Keepalive
  // preserves the outbound-click signal during navigation without sendBeacon's
  // implicit credential behavior.
  fetch(path, { method: 'POST', body: '', credentials: 'omit', keepalive: true }).catch(() => {});
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  currentAttribution();
  window.addEventListener('webmcpify:install-copy', () => emit('install-command-copy'));
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-measure="github-outbound"]')) emit('github-outbound');
  }, { capture: true });
}
