# Google Analytics 4

Status: implemented in PR #5 with consent gating, not deployed. Legal audit
completed 2026-07-24 — see `docs/LEGAL_COMPLIANCE_PLAN.md` (P2.1) for the
launch-gate requirements this implementation satisfies.

The site uses one direct Google tag for page measurement plus two explicit
product-intent events:

| Event | Trigger | GA4 key event |
|---|---|---|
| `install_command_copy` | The install command was copied successfully | Yes |
| `github_outbound` | A webmcpify GitHub link was clicked | Yes |

Enhanced Measurement should remain disabled for this stream. The Google tag
still records its automatically collected events and the default `page_view`;
the two events above cover the launch actions we actually need.

## Property and stream

- Analytics account: `TWB-Digital` (`370724284`)
- GA4 property: `webmcpify.at` (`546963195`)
- Reporting time zone: Austria
- Currency: EUR
- Web stream URL: `https://webmcpify.at`
- Web stream name: `webmcpify.at`
- Web stream ID: `15318350676`
- Measurement ID: `G-45GCGY7SQN`

Enhanced Measurement, Google Signals, user-provided data collection, and
granular location/device data collection are off. Ads personalization is
disabled in all 307 regions. Event and user data retention are both two months,
and retention is not reset on new user activity. Note the two months apply to
raw event/user-level data (explorations); standard aggregated reports persist
beyond that. Even with Enhanced Measurement off, GA4 automatically collects
page URL/title/referrer, device and browser data, and the pseudonymous `_ga`
client ID.

The existing `TWB-Digital` Analytics account is shared by other properties, so
its account-level data-sharing switches were deliberately left unchanged.
Changing them here would affect unrelated properties. Before first production
traffic, check whether "Google products & services" sharing is enabled at
account level — if it is, Google acts as an independent controller for that
shared slice and the privacy notice must say so (or the setting must be off
for this account).

## Google Ads

The property is linked only to Google Ads client account `835-125-6521`, not the
manager account. Personalized advertising and embedded Analytics editing from
Google Ads are off. Auto-tagging is on for attribution, while the existing
fixed UTM suffix remains for readable campaign reporting.

`install_command_copy` is imported as an `Engagement` conversion and is Primary.
`github_outbound` is imported as an `Outbound click` conversion and remains
Secondary so bidding does not optimize for visitors who merely leave for
GitHub. `Engagement` is the campaign's account-default goal; the legacy
`Page view` goal is not used by the campaign. Both new conversions are awaiting
their first production events. The campaign remains paused, so these settings
do not activate ads or spend.

## Consent architecture

`consent.js` is the only entry point (`<script type="module" src="/consent.js">`
in both pages). Basic Consent Mode: before opt-in, nothing runs — no gtag.js
request, no `dataLayer` command, no cookie, no listener. `analytics.js` has no
import side effects; `installAnalytics()` is called exclusively by `consent.js`
after a stored or fresh grant.

- **Banner** (`#consent`): non-modal bottom region, so the page, imprint, and
  privacy policy stay reachable. "Allow measurement" and "Decline" sit on the
  same first layer with identical `.btn` styling — equal visual weight and
  one-click rejection per DSB D124.0507/24 / BVwG W108 2284491-1 (orf.at line).
- **Storage**: the decision is stored as `wmcp-consent` in localStorage
  (`{v: 1, analytics: boolean, ts: ISO-8601}`) — timestamped for Art. 7(1)
  demonstrability, no identifier (DSB FAQ: consent status without a unique ID
  is itself exempt storage).
- **Withdrawal**: a "Cookie settings" footer button (revealed by JS) reopens
  the banner. Declining after a grant sets `ga-disable-<id>`, pushes a
  Consent Mode `denied` update, and expires `_ga*`/`_gcl*` cookies.
- **Consent Mode v2**: `installAnalytics()` pushes
  `consent default {ad_storage/ad_user_data/analytics_storage: granted,
  ad_personalization: denied}` as the first dataLayer command. The granted
  values are correct because the command itself only ever runs post-opt-in.

## Tag behavior

`analytics.js` (post-consent only):

- loads `gtag.js` directly from `www.googletagmanager.com`;
- reports a PII-safe `page_location`: origin + path + known attribution
  parameters only (utm_*, gclid & co.) — arbitrary query parameters and
  fragments never reach Google;
- removes known tracking parameters from the visible browser URL;
- explicitly disables Google Signals and ad-personalization signals;
- pins `cookie_domain` to `webmcpify.at` and sets `Secure;SameSite=Lax`;
- limits the Analytics cookie to 90 days from first creation rather than the
  default rolling two-year lifetime;
- sends no user ID, custom user properties, form values, or arbitrary event
  parameters. The Google Ads link additionally sets `_gcl_au` (disclosed in
  the banner and privacy policy).

## Verification

Run:

```sh
node --test tests/analytics.test.mjs tests/consent.test.mjs
python3 build-de.py
```

Before production activation, verify in a real browser (network tab + Tag
Assistant): zero requests to google domains and zero cookies before any banner
interaction; the four Consent Mode v2 signals after accepting; refusal and
withdrawal stopping collection. The Google Ads campaign must remain paused
throughout; conversions await their first production events.

After an approved deployment, use GA4 Realtime/DebugView and trigger exactly
one copy and one GitHub click. Confirm `page_view`, `install_command_copy`, and
`github_outbound`, then confirm that no extra custom parameters were sent.
