# Legal Compliance Plan — webmcpify.at

- **Audit date:** 2026-07-24 (re-audit, same day — iteration 2, post-merge)
- **Jurisdiction:** Austria (operator seat, `.at` domain, WKO member; German-language variant targets DACH visitors)
- **Site:** https://webmcpify.at (static landing page, EN + `/de/`) — deployed from `main` @ `65e392c`, docroot `/opt/webmcpify` on tuejon.at (nginx, netcup DE). Live deployment confirmed in this audit: response `content-length`/`etag` for `/` and `/privacy.html` match the local repo byte-for-byte, `last-modified: Fri, 24 Jul 2026 18:39:25 GMT`.
- **Business entity:** TWB-Digital OG, FN 663697a (LG Korneuburg), Waldweg 28/2, 2020 Hollabrunn, UID ATU82973212 — microenterprise (3 partners), WKO Fachgruppe UBIT NÖ
- **Business type:** informational presentation of the operator's open-source MIT-licensed developer tool, now with consent-gated first-party GA4 web measurement. Still no e-commerce, no forms, no newsletter, no accounts.
- **Previous audit:** this same file, base commit `350f00c`, written earlier the same day (2026-07-24). Since then, two PRs merged and deployed: `bc77d86` (privacy policy, self-hosted fonts, consent-clean localStorage — closes P1.1/P1.2/P3.1/P4.1/P4.2/P4.3 from that audit) and `65e392c` (the GA4 measurement branch that audit reviewed pre-deploy as PR #5, now live). This document supersedes it; see **Previous Audit Diff** below.

> **Disclaimer:** This is a technical audit, not legal advice. Draft legal texts below are
> starting points and must be reviewed by a qualified attorney before publication.

---

## Executive summary

Every Priority 1 and Priority 4 item, and one of two Priority 3 items, from this morning's
audit are **done and verified live**: I ran the site's unit test suite (18/18 passing),
then loaded production in a fresh, cookie-free browser profile and drove the actual consent
flow end to end. First load makes **zero requests to any Google domain and sets no cookies**
— every request is same-origin (self-hosted fonts, own JS). Clicking "Allow measurement"
loads `gtag.js`, writes a timestamped consent record, and sets `_ga`/`_ga_45GCGY7SQN`
(`Secure;SameSite=Lax`, 90-day expiry); reloading with a stored grant starts analytics
silently; declining via the reopened "Cookie settings" control expires the Google cookies
immediately. Accept and Decline are pixel-identical (`.btn`, no `.primary` modifier on
either). The privacy policy is live, self-hosted fonts load with zero third-party
connections, and the accessibility/wording polish items (P4.1–P4.3) all landed too.

Two things changed the picture from this morning, both only visible from a **live,
post-deploy** vantage point that a pre-merge code review couldn't have caught:

1. **The consent action is not granular enough.** Accepting "Allow measurement" grants
   `ad_storage` + `ad_user_data` alongside `analytics_storage` in one non-separable action
   — confirmed live: it fires a `google.at/ads/ga-audiences` request (an Ads-linked
   audience/remarketing-adjacent signal), not just the GA4 measurement hit. The banner and
   privacy policy describe this only as "Google Analytics 4" web measurement. GDPR's
   specificity requirement (Art. 4(11), 7(1) DSGVO; EDPB Guidelines 05/2020 §3.2) generally
   requires separable consent per distinct purpose — and if consent for a bundle isn't
   "specific," the doctrine treats it as **no valid consent at all** for the bundle, which
   would mean the site's entire GA4 deployment currently rests on shaky footing, not just
   the ads-signal slice. No DSB/EDPB decision was found ruling on this exact bundling
   pattern, so this is a reasoned risk assessment, not a confirmed violation — but it's
   sharpened by a **Google architecture change on 2026-06-15** that made `ad_storage` the
   sole gate for GA4→Ads data flow (previously "Google Signals" was a second, independent
   gate). See **P1.1**.
2. **The site is now live, so two "verify before production traffic" items from this
   morning's plan are live obligations, not launch-gate checklist items anymore.** My test
   generated real `_ga`/`_ga_45GCGY7SQN` cookies against the production stream
   (`G-45GCGY7SQN`) — real visitor data is already flowing to Google. The privacy policy
   currently *asserts as fact* that a Google Ads Data Processing Terms agreement and a
   netcup Art. 28 DPA are "in place." Whether that's actually true in the respective admin
   consoles wasn't (and can't be, by me) confirmed — this needs a same-week check. See
   **P2.1–P2.3**.

Priorities: **P1** split the consent categories (Statistics vs. Marketing) before the
paused Ads campaign is ever unpaused. **P2** confirm the two Google account-level items and
the netcup DPA now that real traffic flows, and put the "Cookie settings" control on every
page, not just the homepage. **P3** the still-open items from this morning (security
headers, Art. 30 register). **P4** watch-list additions (DPF under fresh political/judicial
stress; Google's June 2026 architecture change).

---

## Priority 1 — CRITICAL

### 1.1 Split the consent banner into separate Statistics / Marketing categories

- **Files:** `analytics.js:78-83` (`CONSENT_STATE`), `consent.js:79-102` (`grant`/`decline`),
  `index.html:577-593` + `de/index.html` (banner markup), `privacy.html` (GA4 section).
- **What's there today:** one banner, one pair of buttons, one stored boolean
  (`{v:1, analytics: boolean, ts}`). Accepting pushes all four Consent Mode v2 signals
  (`ad_storage: granted, ad_user_data: granted, ad_personalization: denied,
  analytics_storage: granted`) as a single atomic default. Verified live: this causes a
  request to `google.at/ads/ga-audiences` (an Ads-audience-signal endpoint; Google's own
  Consent Mode docs gate *personalized* remarketing behind `ad_personalization`, which
  stays denied here — but since 2026-06-15 `ad_storage` alone is the sole/exclusive gate
  for the broader category of GA4→Google Ads data sharing, per Google's own migration
  notes and independent commentary from the same window). The banner text and privacy
  policy describe the single action only as GA4 "measurement," mentioning Ads only for the
  `_gcl_au` conversion-attribution cookie — not for the audience-signal behavior.
- **Why (plain language):** GDPR requires consent to be *specific* — a data subject must be
  able to accept one purpose without accepting another bundled into the same click
  (Art. 4(11), 7(1) DSGVO; EDPB Guidelines 05/2020 §3.2: "data subjects should be free to
  choose which purpose they accept rather than having to consent to a bundle of processing
  purposes"). Plain analytics measurement and Ads-linked signal sharing are the kind of
  distinct purposes that reference CMPs (Cookiebot, Usercentrics) already split into
  separate "Statistics" and "Marketing" categories for this exact GA4+Ads scenario — that
  industry convention is itself evidence of where the purpose boundary sits. If a regulator
  or court found this bundle insufficiently specific, the legal consequence isn't just "the
  Ads part was unlawful" — non-specific consent is treated as **no valid consent for the
  bundle**, so the GA4 analytics processing done under it would also lack a lawful basis.
- **Confidence/uncertainty (be explicit with counsel):** no DSB, EDPB, or Austrian court
  decision was found ruling on this precise "GA4 + Ads Consent Mode signals in one banner
  category" pattern — this is a reasoned application of general granularity doctrine, not
  a settled violation. The counter-argument (defensible today, not permanently): the single
  most sensitive sub-behavior, personalized ad targeting, stays technically blocked via
  `ad_personalization: denied`, and GA4's own audience-export-to-Ads feature additionally
  requires Ads Personalization to be on before an audience becomes an active remarketing
  list — so no personalized ad currently results from this. Whether that technical
  safety net is enough to satisfy "specific consent" as a matter of law is exactly the open
  question; recommend a lawyer weigh in, but the fix is cheap enough to do regardless.
- **What to EDIT:** replace the single grant/decline action with two independently
  toggleable categories, each sending its own `gtag('consent', 'update', …)`:
  - **Statistics** → `{analytics_storage: 'granted'}` only.
  - **Marketing** → `{ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted-or-denied per user choice}`
    (a separate, explicit choice — don't silently grant `ad_personalization` just because
    Marketing is on; that's a distinct, more sensitive purpose again).
  - Consent Mode default (pre-interaction) stays fully denied for all four signals, as
    today.
  - Stored record becomes `{v:2, statistics: boolean, marketing: boolean, ts}` — bump the
    version so `readStoredConsent` rejects the old `v:1` shape and re-prompts existing
    visitors (correct behavior: their old consent wasn't for this granularity).
  - Privacy-policy GA4 section: split into two paragraphs, "Statistics" (GA4 page/event
    measurement) and "Marketing" (Ads conversion attribution + `_gcl_au` + audience
    signals), each naming its own purpose and cookies.
  - Banner copy: add a second sentence + toggle before the accept action, or a "Manage
    choices" expansion — keep both category actions and the top-level accept-all/reject-all
    actions at equal visual weight (same `.btn` styling, no color/size differentiation).
  - Draft copy for both is in **Draft legal text** below.
- **Legal basis:** Art. 4(11), 6(1)(a), 7(1) DSGVO; § 165 Abs 3 TKG 2021; EDPB Guidelines
  05/2020 §3.2 (granularity).
- **Abmahnrisiko:** moderate. Austrian cookie-banner enforcement is currently the most
  active DSB/BVwG lane (three orf.at-line decisions in two years, most recently BVwG
  ~2026-05-25 reaffirming strict scrutiny of banner design) — a granularity gap is exactly
  the kind of design defect that lane targets, even though no case has yet named this
  specific bundling pattern.
- **Effort:** M (consent.js/analytics.js logic split + banner markup + privacy-policy
  rewrite of one section + regenerate `/de/`). Do this before the paused Google Ads
  campaign is ever activated — an active campaign with a non-granular consent basis is a
  materially worse position than a paused one.
- **IMPLEMENTED same day** (branch `fix/consent-granularity`), with two deliberate
  topology decisions after an independent technical critique:
  - **Marketing is additive, not free-standing**: every Ads signal on this site rides on
    the GA4 tag (no standalone `AW-` tag), so a marketing-only grant would either force
    the contested cookieless "advanced mode" (tag loaded with `analytics_storage`
    denied) or silently do nothing — collecting a consent that is never acted on. The
    banner therefore enables the Marketing checkbox only once Statistics is selected,
    labels it "requires Statistics", and rejects a stored marketing-without-statistics
    record. If genuinely independent Marketing consent is ever needed, the clean
    architecture is a separately gated Ads conversion tag — documented here, not built.
  - **Ads click IDs follow the Marketing category**: `page_location` sent to GA now
    carries `utm_*` always but `gclid`/`gbraid`/`wbraid`/`dclid` & co. only when
    Marketing is granted (previously they were sent on any grant — which would have
    contradicted the split policy text). `ads_data_redaction` is additionally enabled
    whenever Marketing is denied, and the tag uses Google's documented denied-default →
    chosen-update Consent Mode sequence.
  - Hardening in the same pass: v1-record migration expires the old cookies; a
    `storage` listener mirrors withdrawal across open tabs; consent updates target only
    the site's own tag instance; cookie expiry matchers anchored to the `_ga`, `_gcl`
    and `_gac` name families (so `_garden`-style names survive while the Ads
    attribution cookies an ad click sets are actually cleared).
  - A second adversarial review pass then closed four more gaps, two of which could
    have let a visitor's data reach Google beyond their choice:
    - **Withdrawal during the tag download.** `gtag.js` loads asynchronously; a consent
      change in that window used to append a denial *after* the already-queued wider
      grant, so gtag would process the marketing-granted config (with its click-ID page
      location) first. The queue is still ours until gtag takes it over, so a change
      now rewrites the pending commands in place instead of appending.
    - **Referrer leak.** The tag request was started before the address bar was
      cleaned, so the `Referer` on that cross-origin request could still carry `gclid`
      under a Statistics-only grant. The URL is now cleaned first and the script
      element carries `referrerpolicy="origin"`.
    - **Equal-weight buttons on wrap.** A wrapping flex row distributes free space per
      line, so a lone "Allow all" could stretch across a full row and read as the
      prominent option; the actions are now an equal-column grid that becomes equal
      full-width rows on narrow screens (verified: 133px × 3 at 1280px, 324px × 3 at
      500px).
    - **Policy/behavior mismatches.** The privacy policy claimed each category was
      independently choosable (it is not — Marketing is additive) and described both
      localStorage entries with one language-only sentence; both are corrected, and
      `_gac_*` is now disclosed alongside `_gcl_au`.

---

## Priority 2 — HIGH (confirm now that real traffic is live)

### 2.1 Confirm the Google Ads Data Processing Terms are actually accepted

- `privacy.html:76` (and the EN mirror) states as fact: *"A data processing agreement with
  Google (Google Ads Data Processing Terms) is in place."* `ANALYTICS.md:156` (this
  morning's audit, item 4) listed accepting this as a **pre-deploy** requirement. The
  branch is now deployed and my test generated real `_ga`/`_ga_45GCGY7SQN` cookies against
  the live production property (`G-45GCGY7SQN`) — real personal data (pseudonymous client
  IDs, IP-derived geo, device/browser data) is already flowing to Google.
- **Why:** Art. 28 DSGVO requires the processor agreement to be concluded before
  processing begins, not after. If this wasn't actually accepted in the Google Ads/Analytics
  admin console before the merge, the site is currently both processing without a
  concluded Art. 28 agreement *and* publishing an inaccurate statement of fact on a legal
  page.
- **Action:** log into the Google Ads / Analytics admin console, confirm or accept the Data
  Processing Terms for the linked property/account, note the acceptance date, and record it
  in the **Auftragsverarbeiter register** below. Not verifiable by this audit (no account
  access) — treat as unconfirmed until checked.
- **Effort:** S (minutes in the admin console, not a code change).

### 2.2 Check the "Google products & services" account-level data-sharing toggle

- `ANALYTICS.md:39-45` flags this as unchecked: the shared `TWB-Digital` GA account's
  data-sharing settings were deliberately left unchanged (they affect other properties
  too). If "Google products & services" sharing is **on**, Google acts as an independent
  controller for that data slice, and the privacy policy must disclose that (or the toggle
  must be off for this account).
- Same urgency as 2.1 — this was a pre-launch checklist item and the launch has happened.
- **Added in the re-audit's technical critique:** in the same console session, also review
  the Google tag's **"Restrict advertising data transmission"** setting (Google's
  tag-level control, stronger than plain `ad_storage: denied`) and the tag's **connected
  destinations / GA4→Ads import configuration**. Since Google's 2026-06-15 change, Ads
  settings and Consent Mode are the controlling layer for linked-Ads data flow — the
  in-page consent signals alone don't guarantee zero Ads-domain requests, so the
  account-side restriction is the second half of the P1.1 category separation.
- **Effort:** S.

### 2.3 Confirm/conclude the netcup hosting DPA

- Carried over unchanged from this morning's processor register ("Check/conclude").
  `privacy.html:67` now live asserts *"Mit der netcup GmbH besteht ein
  Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO"* — the same "is this actually true"
  question as 2.1, but lower urgency since server hosting (and therefore this processing)
  predates today and isn't new exposure from this deploy.
- **Effort:** S — netcup offers a standard AVV in its customer panel; confirm it's
  concluded for this account and record the date.

### 2.4 Add the consent-withdrawal control to every page, not just the homepage

- **Files:** `imprint.html`, `privacy.html` — neither loads `consent.js` nor renders a
  "Cookie settings" button; only `index.html`/`de/index.html` do. `privacy.html:77`
  honestly discloses this ("via 'Cookie settings' **in the footer of the start page**"), so
  there's no misleading claim — but this morning's own P2.1 gate spec (item 2) called for
  the control "on every page," and withdrawal being "as easy as giving consent" (Art. 7(3)
  DSGVO) is a little harder to satisfy when two of the site's four pages require navigating
  back to the homepage first via the "← webmcpify.at" link.
- **What to ADD:** `<script type="module" src="/consent.js"></script>` plus the
  `data-consent-open` footer button (and, if the visitor hasn't decided yet, the same
  banner markup) on `imprint.html` and `privacy.html`. `consent.js` already handles a
  missing `#consent` element gracefully (`initConsent` returns `null` if `getElementById`
  finds nothing) — but for the settings button to work on these pages the banner element
  needs to exist there too.
- **Abmahnrisiko:** low — the one-click-away path already exists and is honestly
  disclosed. Effort: S. Bundle with 1.1's markup changes to avoid touching the banner
  twice.

---

## Priority 3 — MEDIUM (carried over from this morning, still open)

### 3.1 Add missing security headers on the vhost

- **File (server, not repo):** `/etc/nginx/sites-available/25-webmcpify.conf` on
  tuejon.at. Confirmed still missing via live header check today:
  `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/CSP `frame-ancestors`.
  HSTS is present and correct (`strict-transport-security: max-age=31536000`).
- **New since this morning:** if a CSP is added, it now needs to allowlist
  `www.googletagmanager.com` (script-src), plus GA4/Ads collection endpoints observed live
  today — `region1.analytics.google.com`, `stats.g.doubleclick.net`,
  `www.google.at`/`www.google.com` (connect-src/img-src as applicable) — since GA4 is no
  longer hypothetical, it's the live default gtag.js load path.
- **Legal basis:** Art. 32 DSGVO. **Effort:** S.

### 3.2 Create the Art. 30 Verzeichnis von Verarbeitungstätigkeiten (company-wide)

- Unchanged from this morning — still not created. The GA4 launch makes this slightly more
  concrete to write (the processor register below is a ready-made set of entries) but it's
  still a company-wide document, not a webmcpify.at file change. **Effort:** M.

---

## Priority 4 — LOW / watch list

### 4.1 Watch: EU-US Data Privacy Framework under fresh political/judicial stress

New since this morning. On **2026-06-29** the US Supreme Court ruled 6-3 in *Trump v.
Slaughter* (No. 25-332) that statutory limits on presidential removal of FTC commissioners
are unconstitutional, overturning *Humphrey's Executor* (1935). Because the European
Commission's DPF adequacy decision ((EU) 2023/1795) relies on FTC independence as an
enforcement safeguard, this triggered immediate scrutiny; noyb/Max Schrems sent the
Commission a letter on **2026-06-30** arguing no other US authority can remedy the gap.
**The adequacy decision has not been suspended** as of this audit — GA4's US transfer leg
remains lawful today — but commentators flag possible suspension within 6–18 months or
CJEU annulment on a multi-year horizon (the Schrems I/II pattern), compounding the
already-pending *Latombe* appeal (C-703/25 P). No action needed now; re-check this section
before any significant new US-transfer commitment and periodically thereafter.

### 4.2 Watch: Google's 2026-06-15 GA4 ↔ Google Ads architecture change

New since this morning, and the direct trigger for the P1.1 finding: Google collapsed the
"Google Signals" admin toggle to reporting-only and made `ad_storage` the sole/exclusive
consent gate for GA4→Ads data flow. This is exactly the kind of unilateral platform change
that can silently widen what a previously-reviewed consent setup actually authorizes —
worth a standing note to re-verify data flows if Google announces further Consent Mode
changes, rather than assuming a past audit stays valid indefinitely.

### 4.3 Everything else from the morning audit's Priority 4 — done, no further action

`imprint.html` "Sitz" label, the two softened marketing claims (`index.html`/`de/index.html`
"costs almost nothing" / "kostet fast nichts", `llms.txt` "behaves identically"), and the
three accessibility items (dynamic DE `aria-label`, translated SVG `<title>`, toast text
inserted on show, `og:image:alt`/`twitter:image:alt`) were all fixed in `bc77d86`/`65e392c`
— verified in this audit (see **Previous Audit Diff**). BaFG remains inapplicable
(unchanged, two independent grounds). Git-history exposure and the README SSH-detail note
remain unchanged, low-severity, no action needed.

---

## Draft legal text (lawyer review required)

Marked **[DRAFT]**. Only the *new* P1.1 split-consent building block is drafted below —
everything else in the live pages (Impressum, the rest of the privacy policy) was already
reviewed this morning and is unchanged in substance.

### Consent banner — two-category version [DRAFT, EN]

> With your consent we process data in two ways. **Statistics**: we measure how this page
> is used with Google Analytics 4 (cookies `_ga`, `_ga_*`). **Marketing**: if additionally
> enabled, Google Analytics shares usage signals with our linked Google Ads account for
> conversion attribution and audience measurement (cookie `_gcl_au` and related Ads
> signals). Nothing is loaded and no cookies are set for a category unless you enable it.
> Details in the [privacy policy].
>
> [ Reject all ] [ Statistics ⚪ ] [ Marketing ⚪ ] [ Allow selected ] [ Allow all ]

### Consent banner — two-category version [DRAFT, DE]

> Mit Ihrer Einwilligung verarbeiten wir Daten auf zwei Wegen. **Statistik**: Wir messen die
> Nutzung dieser Seite mit Google Analytics 4 (Cookies `_ga`, `_ga_*`). **Marketing**: Wenn
> zusätzlich aktiviert, teilt Google Analytics Nutzungssignale mit unserem verknüpften
> Google-Ads-Konto zur Conversion-Zuordnung und Zielgruppenmessung (Cookie `_gcl_au` und
> verwandte Ads-Signale). Ohne Ihre Aktivierung wird für die jeweilige Kategorie nichts
> geladen und kein Cookie gesetzt. Details in der [Datenschutzerklärung].
>
> [ Alle ablehnen ] [ Statistik ⚪ ] [ Marketing ⚪ ] [ Auswahl erlauben ] [ Alle erlauben ]

*(All actions same `.btn` styling, equal visual weight, single first layer — no
color/size/position nudging toward any option, per DSB D124.0507/24.)*

### privacy.html — GA4 section replacement, split by category [DRAFT, EN excerpt]

> **Statistics** — with your consent (Art. 6(1)(a) GDPR, § 165(3) TKG 2021), we use Google
> Analytics 4 (Google Ireland Ltd., Dublin) to measure page views and two interaction
> events (copying the install command, clicking GitHub links). This sets `_ga`/`_ga_*`
> cookies, limited to 90 days.
>
> **Marketing** — if you additionally consent, usage data is shared with our linked Google
> Ads account for conversion attribution and audience measurement, setting `_gcl_au` and
> related cookies. Personalized advertising remains disabled regardless of this choice.
>
> You can change either choice at any time via "Cookie settings," available on every page
> of this site.

*(DE mirror: same structure/tone as the existing privacy.html German text.)*

---

## Cookie & storage inventory (updated — reflects live verification)

| Key/Cookie | Type | Set by | Purpose | Personal data? | Duration | Consent required? | Category |
|---|---|---|---|---|---|---|---|
| `wmcp-lang` | localStorage | toggle click / WebMCP `set_language` | Language preference | No | Until site data cleared | No (§165(3) TKG) | Essential/Functional |
| `wmcp-consent` | localStorage | `consent.js` | Stores `{v:1, analytics, ts}` — **becomes `{v:2, statistics, marketing, ts}` under P1.1** | No (no identifier) | Until site data cleared | No (consent-state storage is itself exempt, DSB FAQ) | Essential |
| `_ga` | Cookie | gtag.js, post-consent only | GA4 client ID | Yes (pseudonymous) | 90 days (`cookie_expires` set explicitly) | **Yes** | Statistics |
| `_ga_45GCGY7SQN` | Cookie | gtag.js, post-consent only | GA4 session state | Yes | 90 days | **Yes** | Statistics |
| `_gcl_au` | Cookie | gtag.js w/ Google Ads link | Ads conversion attribution | Yes | ~90 days (Google default) | **Yes** | Marketing (not observed in this session — no `gclid` present; disclosed regardless) |
| — (network only, no cookie) | Request | `google.at/ads/ga-audiences` | Ads-linked audience/measurement signal, fires on Statistics-style consent today — **should require Marketing consent under P1.1** | Likely yes (tied to client ID) | N/A | Currently bundled into the single consent action — **gap, see P1.1** | Should be Marketing |

Verified live 2026-07-24: first load sets **zero** cookies and makes **zero** requests to
any Google domain (only same-origin: `/`, `/fonts/fonts.css`, `/consent.js`,
`/analytics.js`, `/webmcp/*`, two self-hosted `.woff2`, `/favicon.ico`). sessionStorage,
IndexedDB, Cache API, service workers: still none.

## Auftragsverarbeiter (processor) register

| Service | Provider | Country | Data processed | DPA required? | DPA status | Transfer mechanism |
|---|---|---|---|---|---|---|
| Hosting (tuejon.at server) | netcup GmbH, Karlsruhe | DE (EU) | Access logs (IP, UA, timestamps) | Yes (Art. 28) | **Unconfirmed — check/conclude (P2.3)** | EU only |
| Google Analytics 4 (now live) | Google Ireland Ltd | IE (US sub-processing) | Pseudonymous usage data (see inventory above) | Yes | **Unconfirmed — privacy.html asserts "in place," not verified against the admin console (P2.1)** | EU→US: DPF adequacy (EU) 2023/1795 — **watch: under fresh scrutiny since 2026-06-29, see P4.1** |
| Google Ads (linked, conversion + audience signals) | Google Ireland Ltd / Google LLC | IE / US | `gclid`, `_gcl_au`, audience/remarketing signal (`ga-audiences`) | Yes | Same as above — bundled with the GA4 DPT | Same as above |
| Let's Encrypt (TLS) | ISRG | US | No visitor personal data (cert issuance only) | No | N/A | N/A |

---

## Files confirmed compliant (reviewed, no changes needed)

Everything confirmed compliant this morning remains so (imprint.html core content, robots.txt,
sitemap.xml, HSTS/TLS, `rel="noopener"` links, BaFG inapplicability). Newly verified in this
re-audit:

- **`consent.js` / `analytics.js` logic** — structural gating confirmed live: no dataLayer
  command, no script injection, no cookie before consent; module has no import side
  effects; `installAnalytics()` only ever called post-grant. All 18 unit tests pass
  (`tests/analytics.test.mjs`, `tests/consent.test.mjs`).
- **Button equality** — `data-consent-accept`/`data-consent-decline` share one `.btn` class
  with no `.primary`/color/size modifier on either — confirmed via CSS read, not just
  visual inspection.
- **Withdrawal flow** — live-tested: "Cookie settings" reopens the banner (focus lands on
  the triggering button — keyboard-operable), declining after a prior grant clears
  `_ga`/`_ga_45GCGY7SQN` immediately and updates the stored record with a fresh timestamp.
- **PII-safe `page_location`** — live-verified: sent value was the clean origin+path with
  no fragment or non-attribution query params.
- **Font self-hosting** — zero requests to `fonts.googleapis.com`/`fonts.gstatic.com`
  anywhere in the repo or on the live first load.
- **`de/index.html` regeneration** — diffed against `build-de.py`'s `REPLACEMENTS` list;
  confirmed machine-generated, not hand-edited, including the three new entries (image alt
  text, `aria-label`, SVG `<title>`) added to the script itself.
- **No forms, no API calls anywhere** in `index.html`, `de/index.html`, `imprint.html`,
  `privacy.html` — CORS/CSRF/rate-limiting remain not applicable.
- **Non-modal consent banner (`role="region"`, not `role="dialog"`/`aria-modal`)** — a
  deliberate deviation from this morning's suggested pattern that, on reflection, better
  satisfies the underlying constraint ("must not block Impressum/Datenschutz access") than
  a focus-trapped modal would; treated as compliant, not a defect.

## Implementation order

1. **P1.1** split consent categories (code: `consent.js`, `analytics.js`, banner markup,
   privacy-policy section) — do this first since P2.4's markup changes touch the same
   banner element.
2. **P2.4** add the banner + `consent.js` include to `imprint.html`/`privacy.html` in the
   same pass.
3. **P2.1 / P2.2 / P2.3** — admin-console confirmations, parallel to the above, no code
   dependency. Do this week given real traffic is already flowing.
4. **P3.1** security headers (server-side, independent; update CSP domain allowlist to
   match whatever P1.1 lands on).
5. **P3.2** Art. 30 records (company-level, parallel to everything).
6. **P4.1/P4.2** — no action, re-check periodically.

## Validation sources (official checklists used)

Carried over from this morning (imprint/privacy/cookie WKO checklists, DSB FAQ, DSB
Google-Fonts Prüfverfahren, DSB EU-US DPF page — all still current, retrieved
2026-07-24) plus new sources consulted in this re-audit:

| Source | URL | Result |
|---|---|---|
| Google — Consent Mode signal reference | developers.google.com/tag-platform/security/concepts/consent-mode | Confirms `ad_personalization` denied blocks personalized remarketing; does not by itself confirm `ad_storage`+`ad_user_data` alone are purpose-neutral |
| Google — GA4 audience sharing with linked Ads | support.google.com/analytics/answer/12800258 | Confirms Ads Personalization is a prerequisite for *exporting* a GA4 audience as an active remarketing list |
| EDPB Guidelines 05/2020 on consent, §3.2 | edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en | Granularity/specificity standard underlying P1.1 |
| BVwG ORF.at cookie-banner ruling | dataprotect.at/2026/05/25/… | Reaffirms strict scrutiny of banner design in Austria; revision admitted to VwGH, not yet final |
| DPF / *Trump v. Slaughter* analysis | hunton.com …, activemind.legal/guides/dpf-supreme-court | Basis for the P4.1 watch item; DPF not suspended as of this audit |
| Independent commentary, GA4↔Ads June 2026 change | piwik.pro/blog/…, digitalapplied.com/blog/ga4-consent-split-june-15-2026-… | Basis for the P1.1/P4.2 finding; third-party analysis, not official Google or DPA guidance |

(Retrieval date for the new sources: 2026-07-24, via a dedicated research pass in this
audit. Same caveat as this morning applies: no independent packet-level verification of
what Google's servers actually do with the `ga-audiences` request payload was possible.)

## Legal references

Carried over in full from this morning's audit (§ 5 ECG; § 3 Z 1 ECG; § 14 UGB; § 25
MedienG; § 165 Abs 3 TKG 2021; §§ 1, 2 UWG; DSGVO Art. 6, 7, 12–21, 28, 30, 32, 37, 44 ff.,
77, 82, 83; adequacy decision (EU) 2023/1795; CJEU C-582/14 *Breyer*; EuG T-553/23
*Latombe*/C-703/25 P; DSB D155.027; DSB D124.0507/24; BVwG W108 2284491-1; WP29 Opinion
04/2012; EDPB Cookie Banner Taskforce Report). **New in this audit:**

- EDPB Guidelines 05/2020 on consent under GDPR (edpb.europa.eu) — granularity standard,
  §3.2, underlying P1.1.
- BVwG ORF.at ruling, ~2026-05-25 (dataprotect.at, cybernews.com/de) — reaffirms Austrian
  banner-design scrutiny; revision admitted to VwGH.
- *Trump v. Slaughter*, No. 25-332, US Supreme Court, 2026-06-29 (overturning
  *Humphrey's Executor*) — basis for the DPF watch item (P4.1).
- noyb/Schrems letter to the European Commission, 2026-06-30, re DPF adequacy following
  the FTC ruling.
- Google Ads/GA4 Consent Mode architecture change, effective 2026-06-15 (Google's own
  migration documentation plus independent commentary) — basis for P1.1/P4.2.

---

## Previous Audit Diff

Comparing this document to this morning's version (base commit `350f00c`) after the
`bc77d86`/`65e392c` merges:

### Fixed (verified live in this audit)
- **P1.1** Privacy policy created and live at `/privacy.html`, linked from every footer and
  from the Imprint.
- **P1.2** Google Fonts self-hosted; zero third-party font requests on live first load.
- **P3.1** `wmcp-lang` now persists only on explicit toggle click, not on automatic
  first-load language detection.
- **P4.1** Imprint address row relabeled "Seat & address"/"Sitz & Anschrift."
- **P4.2** Absolute marketing claims softened ("costs almost nothing"/"kostet fast nichts";
  llms.txt "behaves identically" instead of "byte-identical").
- **P4.3** Accessibility polish: German `aria-label` now set dynamically instead of staying
  English; SVG figure `<title>` translated in the German variant; copy-toast text is
  inserted on show (real screen-reader announcement, not just an opacity toggle);
  `og:image:alt`/`twitter:image:alt` added and localized.
- **P2.1 (mostly)** The GA4 launch gate's structural/technical requirements are met and
  verified live: consent-gated script injection, equal-weight one-click accept/decline,
  timestamped storage, working withdrawal, Consent Mode v2 basic configuration, PII-safe
  `page_location`, accurate retention wording, expanded cookie inventory. This item is not
  fully closed — see **Still open** and **New** below for what remains.

### Still open (unchanged since this morning)
- **P3.2** Security headers on the nginx vhost (`X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`/CSP) — confirmed still absent via live header check.
- **P3.3** Art. 30 Verzeichnis von Verarbeitungstätigkeiten — not yet created
  (company-wide, not a repo change).
- **netcup DPA** — processor register still says "check/conclude," now re-flagged as P2.3
  given real production traffic.
- **Watch list** — CJEU *Latombe*/C-703/25 P and the BGH VI ZR 258/24 referral remain
  pending, unchanged.

### New (found only in this re-audit — required live, post-deploy testing to surface)
- **P1.1** Consent-category granularity gap: `ad_storage`/`ad_user_data` bundled with
  `analytics_storage` under one non-granular "Allow measurement" action; live-verified
  `ads/ga-audiences` request on consent grant. Not detectable from the pre-merge code
  review alone — it only became observable by actually granting consent against production
  and watching the network panel.
- **P2.1/P2.2** Google Ads Data Processing Terms acceptance and the account-level
  "Google products & services" data-sharing toggle — were pre-deploy checklist items this
  morning; now live obligations since real visitor data is flowing and I generated real
  production cookies during this audit's verification.
- **P2.4** The "Cookie settings" withdrawal control exists only on the homepage, not on
  `imprint.html`/`privacy.html` — a gap against this morning's own P2.1 gate spec (item 2:
  "on every page"), though honestly disclosed in the current privacy-policy text.
- **P4.1** DPF watch-list update: *Trump v. Slaughter* (2026-06-29) and the resulting
  noyb/Schrems letter (2026-06-30) — new developments since this morning, not yet actionable
  but worth tracking.
- **P4.2** Google's 2026-06-15 GA4↔Ads architecture change, the direct technical trigger
  for the P1.1 finding.
