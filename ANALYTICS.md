# Google Analytics 4

Status: live since 2026-07-24 behind a two-category consent banner
(Statistics / Marketing). The compliance record is
`docs/LEGAL_COMPLIANCE_PLAN.md`; the category split implements its P1.1
finding (granular consent per purpose, EDPB 05/2020 §3.2).

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
on every page: start page, `/de/`, imprint, privacy). Basic Consent Mode:
before opt-in, nothing runs — no gtag.js request, no `dataLayer` command, no
cookie, no listener. `analytics.js` has no import side effects;
`installAnalytics()` is called exclusively by `consent.js` after a stored or
fresh grant of the Statistics category.

Consent is granular per purpose (two categories, chosen independently on the
same first layer):

- **Statistics** grants `analytics_storage` only: GA4 page/event measurement,
  cookies `_ga`/`_ga_*`. Ads click identifiers (`gclid`, `gbraid`, `wbraid`,
  `dclid` & co.) are stripped from the reported `page_location` under a
  Statistics-only grant; only `utm_*` campaign parameters are kept.
- **Marketing** grants `ad_storage` + `ad_user_data`: Google Ads conversion
  attribution and audience signals, cookie `_gcl_au`, click IDs included in
  `page_location`. Marketing is explicitly additive — every Ads signal flows
  through the GA4 tag (there is no standalone Ads tag), so the banner enables
  the Marketing checkbox only once Statistics is selected ("requires
  Statistics" is part of its label), and a stored marketing-without-statistics
  record is rejected as invalid topology.
- `ad_personalization` is **never** granted in any configuration, and
  `ads_data_redaction` is enabled whenever Marketing is denied (defense in
  depth: Consent Mode denial restricts cookie use, but does not by itself
  guarantee zero Ads-domain requests).

Mechanics:

- **Banner** (`#consent`): non-modal bottom region, so the page, imprint, and
  privacy policy stay reachable. Two unchecked category checkboxes (a
  `fieldset` with a screen-reader legend) plus "Reject all" / "Save choices" /
  "Allow all", all with identical `.btn` styling and equal flex width across
  wraps — equal visual weight, one-click rejection, nothing pre-ticked. The
  first layer names the controller and the withdrawal path (DSB FAQ). Case
  law: DSB D124.0507/24 (orf.at, visual prominence) and, separately, BVwG
  W108 2284491-1 (first-layer rejection); EDPB 05/2020 §3.2 (granularity).
- **Storage**: the decision is stored as `wmcp-consent` in localStorage
  (`{v: 2, statistics: boolean, marketing: boolean, ts: ISO-8601}`) —
  timestamped for Art. 7(1) demonstrability (one current-state timestamp, not
  a per-purpose history), no identifier. v1 records (the pre-split single
  "analytics" grant) are rejected, their `_ga*`/`_gcl*` cookies are expired
  at load, and those visitors are asked again with the granular banner.
- **Withdrawal**: a "Cookie settings" button on every page reopens the banner
  with the stored selection (focus moves to the first control; it returns to
  the opener on save). Revoking Statistics sets `ga-disable-<id>` and expires
  `_ga*`; revoking Marketing expires `_gcl*`; either pushes a Consent Mode
  `update` — only to the tag this site installed (own sentinel, not any
  `window.gtag`). A `storage` listener mirrors grant/withdrawal into other
  open tabs without writing back.
- **Consent Mode v2**: `installAnalytics()` queues Google's documented
  basic-mode sequence before injecting the script — fully denied
  `consent default`, `ads_data_redaction` when Marketing is denied, then the
  visitor's actual choice as `consent update`, then `js`/`config`. Nothing
  fires pre-consent because the tag only ever loads after the Statistics
  opt-in.

## Tag behavior

`analytics.js` (post-consent only):

- loads `gtag.js` directly from `www.googletagmanager.com`;
- reports a PII-safe `page_location`: origin + path + known attribution
  parameters only — `utm_*` always, Ads click IDs (`gclid` & co.) only with
  Marketing granted; arbitrary query parameters and fragments never reach
  Google;
- removes known tracking parameters from the visible browser URL;
- explicitly disables Google Signals and ad-personalization signals;
- pins `cookie_domain` to `webmcpify.at` and sets `Secure;SameSite=Lax`;
- limits the Analytics cookie to 90 days from first creation rather than the
  default rolling two-year lifetime;
- sends no user ID, custom user properties, form values, or arbitrary event
  parameters. With Marketing granted, the Google Ads link additionally sets
  `_gcl_au` (disclosed in the banner and privacy policy); with Marketing
  denied, the ad-side signals stay off (`ad_storage`/`ad_user_data` denied).

## Verification

Run:

```sh
node --test tests/analytics.test.mjs tests/consent.test.mjs
python3 build-de.py
```

Before production activation, verify in a real browser (network tab + Tag
Assistant): zero requests to google domains and zero cookies before any banner
interaction; after "Allow all" the four Consent Mode v2 signals with
`ad_personalization` denied; after a Statistics-only grant — including a
`?gclid=test` landing — no `stats.g.doubleclick.net` / `/ads/ga-audiences`
requests, no `_gcl_au` cookie, and no click ID anywhere in the collect
payload (hits carry `gcs=G101`); refusal and withdrawal stopping collection
and expiring the category's cookies, including from a second open tab.
Repeat the pass on `/`, `/de/`, `/imprint.html`, and `/privacy.html`. The
Google Ads campaign must remain paused throughout; conversions await their
first production events.

Account-level (Google admin consoles, not code): confirm the Google Ads Data
Processing Terms acceptance, check the account's "Google products & services"
data-sharing toggle, review the Google tag's "Restrict advertising data
transmission" setting and connected destinations (Google collapsed the
Signals toggle on 2026-06-15 — Ads settings and Consent Mode are now the
controlling layer for linked-Ads data).

After an approved deployment, use GA4 Realtime/DebugView and trigger exactly
one copy and one GitHub click. Confirm `page_view`, `install_command_copy`, and
`github_outbound`, then confirm that no extra custom parameters were sent.
