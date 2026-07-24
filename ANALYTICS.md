# Google Analytics 4

Status: implemented in PR #5, not deployed. Legal/privacy audit pending.

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
and retention is not reset on new user activity.

The existing `TWB-Digital` Analytics account is shared by other properties, so
its account-level data-sharing switches were deliberately left unchanged.
Changing them here would affect unrelated properties.

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

## Tag behavior

`analytics.js`:

- loads `gtag.js` directly from `www.googletagmanager.com`;
- sends the initial page URL to GA4 so UTM and Google Ads click attribution work;
- then removes known tracking parameters from the visible browser URL;
- explicitly disables Google Signals and ad-personalization signals;
- limits the Analytics cookie to 90 days from first creation rather than the
  default rolling two-year lifetime;
- sends no user ID, custom user properties, form values, or arbitrary event
  parameters.

## Required before production

This implementation intentionally does **not** claim DSGVO/GDPR compliance.
Loading GA4 and setting Analytics cookies before consent is not appropriate for
EEA production traffic without a valid legal basis. Before deploying, add an
appropriate privacy notice and either:

1. integrate a CMP using basic Consent Mode so the Google tag is blocked until
   opt-in; or
2. document and validate another legal basis with the responsible privacy
   owner.

After that work, verify consent withdrawal, tag blocking before opt-in, and the
four Consent Mode v2 signals (`analytics_storage`, `ad_storage`,
`ad_user_data`, and `ad_personalization`) in Tag Assistant.

## Legal-audit handoff

PR #5 must remain unmerged until the separate legal/privacy audit records its
decision and updates the implementation and notices as needed. At minimum, that
session should:

1. confirm the legal basis, controller/processor wording, international-transfer
   disclosures, retention disclosure, and withdrawal route;
2. update the privacy notice and cookie/CMP copy in both language variants;
3. implement the selected consent design so no GA request or Analytics cookie is
   created before the required opt-in;
4. prove that refusal and withdrawal stop subsequent collection;
5. verify the four Consent Mode v2 signals and both explicit events without
   enabling Ads personalization, Google Signals, or Enhanced Measurement.

Record the audit outcome in this file and the PR before approving merge or
deploy. The Google Ads campaign must remain paused throughout.

## Verification

Run:

```sh
node --test tests/analytics.test.mjs
python3 build-de.py
```

After an approved deployment, use GA4 Realtime/DebugView and trigger exactly
one copy and one GitHub click. Confirm `page_view`, `install_command_copy`, and
`github_outbound`, then confirm that no extra custom parameters were sent.
