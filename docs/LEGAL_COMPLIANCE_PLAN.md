# Legal Compliance Plan — webmcpify.at

- **Audit date:** 2026-07-24
- **Jurisdiction:** Austria (operator seat, `.at` domain, WKO member; German-language variant targets DACH visitors)
- **Site:** https://webmcpify.at (static landing page, EN + `/de/`) — deployed from `main` @ `350f00c`, docroot `/opt/webmcpify` on tuejon.at (nginx, netcup DE)
- **Business entity:** TWB-Digital OG, FN 663697a (LG Korneuburg), Waldweg 28/2, 2020 Hollabrunn, UID ATU82973212 — microenterprise (3 partners), WKO Fachgruppe UBIT NÖ
- **Business type:** purely informational presentation of the operator's open-source MIT-licensed developer tool. No e-commerce, no forms, no newsletter, no accounts.
- **Also audited:** the undeployed measurement branch `feat/privacy-safe-measurement` (worktree `../webmcpify.at-measurement`, PR #5 — GA4)
- **Previous audit:** none found (no prior compliance plan in this repo) — no diff section.

> **Disclaimer:** This is a technical audit, not legal advice. Draft legal texts below are
> starting points and must be reviewed by a qualified attorney before publication.

---

## Executive summary

The site is in **unusually good shape for its size** — the Imprint passes every mandatory
WKO checklist item for an OG operating a "kleine Website", there are no cookies, no forms,
no analytics, HSTS is on, and the correct decision was made to hold back GA4 until the
consent work exists. **The absence of a cookie banner is correct today and must be
preserved** (DSB: no banner where nothing non-essential is stored — a consent banner for
nothing is itself a dark-pattern risk).

Exactly **one active legal breach** exists: **there is no Datenschutzerklärung**, although
the site processes personal data (nginx access logs with full IPs; visitor IP/user-agent
disclosed to Google via CDN-loaded fonts). The WKO is explicit that the IP address alone
triggers the full GDPR Art. 13 information duty. Everything else is either preventive
(GA4 launch gate), trivial hardening, or polish.

Priorities: **P1** create the privacy policy + self-host the fonts (removes the only
third-country transfer and an entire policy section). **P2** the GA4/consent launch gate
for PR #5 — including a structural fix: gating the gtag `<script>` alone is insufficient
because `analytics.js` self-executes and queues events that would flush after consent-less
load. **P3/P4** hardening and polish.

---

## Priority 1 — CRITICAL (active legal risk)

### 1.1 Create a Datenschutzerklärung (privacy policy) page and link it from every footer

- **Status today:** No privacy policy exists anywhere. Footer links only the Imprint
  (`index.html:555`, `de/index.html:555`, no footer at all on `imprint.html`).
- **Why (plain language):** The server writes access logs containing full IP addresses
  (verified on tuejon.at: default combined log format, `/var/log/nginx/access.log`,
  rotated daily, kept 14 days), and every page load currently sends the visitor's IP and
  user-agent to Google (fonts CDN). An IP address is personal data (CJEU C-582/14
  *Breyer*), so GDPR Art. 13 information duties apply in full — "static site with no
  forms" is not an exemption. All 14 items of the WKO Datenschutzerklärung checklist
  currently FAIL.
- **Legal basis:** Art. 12, 13 DSGVO; § 165 Abs 3 TKG 2021 (info duty covers the
  localStorage key even though it needs no consent). Sanctions frame: Art. 83 DSGVO;
  § 165 TKG up to €50,000 (Fernmeldebehörde).
- **What to ADD:**
  - New file `privacy.html` (same bilingual EN/DE pattern, layout and lang-toggle as
    `imprint.html`; `noindex, follow` is fine, must not be Disallowed in robots.txt).
    Full draft text below under **Draft legal text**.
  - Footer link on `index.html` (after the Imprint link, `index.html:555`) —
    `<a href="/privacy.html"><span lang="en">Privacy</span><span lang="de">Datenschutz</span></a>`
    — then regenerate `de/index.html` via `python3 build-de.py` (bilingual spans need no
    new REPLACEMENTS entry).
  - A link on `imprint.html` (e.g. in the `.top` bar or below the content) so the two
    legal pages cross-reference; and a back-link on `privacy.html`.
- **Constraint from the official checklist:** the Datenschutzerklärung must be its **own
  footer entry**, *not* folded into the Imprint page — WKO/EDSA explicitly reject
  imprint-only publication ("Der Hinweis im Impressum alleine ist … nicht ausreichend").
- **Abmahnrisiko:** limited in Austria (consumers lack standing; competitor UWG standing
  for GDPR breaches is unsettled), but this is the defect the DSB itself flagged in its
  Google-Fonts Prüfverfahren, and it is the one item a DSB complaint would win on today.
- **Effort:** M (one new page + two footer edits + regenerate `/de/`).

### 1.2 Self-host the two Google Fonts (remove the CDN embed)

- **Files:** `index.html:47-50` (two `preconnect` + stylesheet + noscript fallback),
  `imprint.html:10-12`, `de/index.html:47-50` (regenerated).
- **What to REMOVE:** all four lines referencing `fonts.googleapis.com` /
  `fonts.gstatic.com` on each page.
- **What to ADD:** download Familjen Grotesk + Spline Sans Mono (both SIL OFL — self-
  hosting is expressly permitted) as woff2, serve from `/fonts/`, and add `@font-face`
  rules with `font-display: swap` to the existing inline `<style>` blocks. The nginx
  vhost already long-caches `woff2` (7d) — no server change needed.
- **Why (plain language, honest framing):** In **Austria** this is *not* the
  catastrophic liability German blog posts suggest: the DSB's Prüfverfahren (Newsletter
  4/2023) found **no unlawful processing** in CDN font loading (legitimate interest can
  cover it, no consent needed), and the LG f. ZRS Wien has ruled the €100/€190 Abmahn
  model **abusive** (test case + rulings through 30.12.2025). What the DSB *did* fault
  was the **information duty** — exactly what this site currently breaches (see 1.1).
  Meanwhile the German line (LG München I 3 O 17493/20) is now before the CJEU via BGH
  VI ZR 258/24. Self-hosting removes the transfer, the recipient, the entire
  privacy-policy section, a render-blocking cross-origin connection, and all residual
  DE-visitor exposure — the WKO's own recommendation. Ten-minute fix, zero downside.
- **Legal basis:** Art. 6(1)(f), Art. 13(1)(e)–(f), Art. 44 ff. DSGVO (transfer leg
  currently covered by DPF adequacy (EU) 2023/1795 for Google LLC; appeal C-703/25 P
  pending).
- **Abmahnrisiko:** low in Austria (see above), residual for German visitors; drops to
  zero after self-hosting.
- **Effort:** M (asset download + 3 file edits + regenerate).
- **Sequencing note:** do this **before or together with** 1.1 — then the privacy policy
  never needs a Google Fonts section (a policy describing transfers that don't occur is
  itself inaccurate).

---

## Priority 2 — HIGH (must be fixed before the pending GA4 branch may deploy)

### 2.1 GA4 launch gate for `feat/privacy-safe-measurement` (PR #5)

Not a live violation — the branch is correctly undeployed and its own `analytics.js`
header says deployment "is gated on the consent/privacy work". This section is that
gate's spec. **Deploying the branch as-is would be unlawful** (§ 165 Abs 3 TKG 2021:
prior opt-in before the `_ga`/`_ga_*` cookies are written; Art. 6(1)(a) DSGVO). The DPF
resolved the *transfer* question from DSB D155.027 (22.12.2021), **not** the consent
question.

**Decision to make first (product decision, not legal):**
- **Option A — cookieless self-hosted analytics** (Plausible, Umami, Matomo in
  consent-free config): counts install-copies and GitHub clicks **without any banner**,
  keeping the site consent-surface-free. Loses Google Ads conversion import.
- **Option B — GA4 as prepared**: keeps the Ads conversion pipeline (the reason this
  branch exists — paused campaign `24069120625` imports `install_command_copy` as its
  Primary conversion), at the price of a CMP and a banner meeting the strictest banner
  case law in the EU. If the Ads campaign is the point, Option B is the coherent choice —
  but make it deliberately.

**If Option B, all of the following are required before merge/deploy:**

1. **Structural consent gating (code fix in the branch).** Gating only the external
   gtag `<script>` is **insufficient**: `analytics.js` self-executes on import
   (`analytics.js:110-113`), immediately queues `js`/`config` (with the original page
   URL) into `window.dataLayer`, and attaches the two event listeners — everything
   queued would flush the moment gtag.js later loads. The consent gate must wrap
   `installAnalytics()` itself: nothing pushed to `dataLayer`, no listeners, no script
   injection until consent for the analytics category is granted. Implement Consent
   Mode v2 in **basic** configuration (default `denied` set before any config; tag
   fires nothing pre-consent). "Advanced" mode (cookieless pings pre-consent) is the
   contested/weaker position — do not use it.
2. **CMP/banner meeting the Austrian (orf.at) standard** — DSB 28.10.2024,
   GZ D124.0507/24; BVwG 31.07.2024, W108 2284491-1; BVwG 23.04.2026, W171 2303402-1;
   EDPB Cookie Banner Taskforce (18.01.2023):
   - Accept and Reject on the **same first layer**, **identical visual weight** — same
     background, text color, font size, padding, border. No color nudging (the DSB
     ordered orf.at to redesign for exactly this).
   - Rejection in **one click**, never more clicks than acceptance.
   - No pre-ticked boxes, no confirm-shaming labels.
   - Consent stored **with timestamp** (Art. 7(1) demonstrability); the consent-status
     record itself may be stored without a unique identifier (DSB FAQ).
   - **Persistent revocation path**: a "Cookie-Einstellungen"/"Cookie settings" footer
     link on every page that reopens the banner; withdrawal as easy as giving consent
     (Art. 7(3)).
   - Banner must not block access to Imprint/Privacy pages.
   - Banner accessibility: `role="dialog"`, `aria-modal`, focus trap, keyboard
     operability.
3. **Privacy-policy section for GA4** (building block in Draft legal text below) —
   added in the same PR, plus the "no analytics" sentence removed.
4. **Google Ads Data Processing Terms** (Art. 28) accepted for the property; record
   the acceptance in the processor register below.
5. **Cookie inventory correctness:** with the Google Ads link + auto-tagging, expect
   `_gcl_au` (and possibly other `_gcl_*`) **advertising** cookies in addition to
   `_ga`/`_ga_*` — advertising cookies are never "technically necessary" (DSB FAQ,
   BVwG W214 2223400-1). Verify post-deploy which cookies actually appear and mirror
   them in the banner categories and the inventory table.
   Consider setting `cookie_domain` explicitly (default scopes `_ga` to the highest
   available domain) and `cookie_flags: 'Secure;SameSite=Lax'`.
6. **PII-in-URL hygiene:** `page_location` is sent as the **original** `location.href`
   (`analytics.js:74-88`) — the URL "cleaning" only rewrites the visible address bar
   afterwards. On this site query params are almost certainly UTM/gclid only, but
   Google's PII policy puts the obligation on the operator; consider stripping
   non-attribution params from `page_location` before sending, or accept and document
   the residual risk.
7. **Accurate policy wording (from Google's own docs):** the 2-month retention applies
   to raw event/user-level data (explorations), not standard aggregated reports; GA4
   automatically collects page URL/title/referrer and device/browser data plus the
   pseudonymous `_ga` client ID even with Enhanced Measurement off. The draft below
   already words this correctly — don't overstate the minimization.
8. **Account-level data sharing:** the shared `TWB-Digital` GA account's data-sharing
   toggles were deliberately left unchanged for other properties' sake. Check what they
   are: if "Google products & services" sharing is ON, Google acts as an independent
   controller for that slice and the policy must say so (or the setting must be off).
9. **Re-run the relevant parts of this audit before the deploy** (banner button
   equality, first-load network capture proving zero pre-consent requests/storage).

- **Legal basis:** § 165 Abs 3 TKG 2021; Art. 4(11), 6(1)(a), 7 DSGVO; DSB FAQ
  Cookies; orf.at decisions as cited.
- **Abmahnrisiko:** enforcement is split — Fernmeldebehörde (up to €50k) for § 165 TKG,
  DSB for the GDPR side. Banner dark patterns are the most actively enforced item in
  Austria right now (three orf.at-line decisions in two years).
- **Effort:** L (CMP + code restructure + policy + verification).

---

## Priority 3 — MEDIUM (hardening with legal relevance)

### 3.1 Write `wmcp-lang` only on explicit toggle interaction

- **Files:** `index.html:563-575` (and regenerated `de/index.html`),
  `imprint.html:83-95`. The `setLang()` helper persists to localStorage on **every**
  call — including the automatic first-load call
  `setLang(saved || (navigator.language?.startsWith("de") ? "de" : "en"))`
  (`index.html:575`), which writes to the visitor's device before any user action.
- **Why:** § 165 Abs 3 TKG 2021 covers *all* storage on terminal equipment (DSB FAQ —
  not just cookies). A language preference is the textbook "strictly necessary"
  exemption (WKO Rechtsfrage #19 names Spracheinstellungen), **but** WP29 Opinion
  04/2012 ties the exemption to an *explicit user request* and calls out automatic
  language detection as not being one. Contested, never litigated in Austria, and the
  fix is free: resolve the initial language in memory only; persist solely in the
  toggle click handler (the WebMCP `set_language` tool call is also an explicit request
  — keep persisting there).
- **What to EDIT:** split persistence out of `setLang()` (e.g. `setLang(l)` renders;
  the click handler and the WebMCP tool additionally store). Identical UX for every
  visitor.
- **Abmahnrisiko:** effectively none; defensive correctness.
- **Effort:** S.

### 3.2 Add missing security headers on the vhost

- **File (server, not repo):** `/etc/nginx/sites-available/25-webmcpify.conf` on
  tuejon.at. Present: HSTS (correctly repeated per `add_header` location — the gotcha
  is already documented in the vhost comment). Missing: `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options:
  DENY` (or CSP `frame-ancestors 'none'`).
- A full CSP is **feasible after font self-hosting** (site becomes fully
  self-contained) but the inline `<script>`/`<style>` blocks need `'unsafe-inline'` or
  hashes; treat CSP as optional polish. If GA4 ships, CSP must allow
  `www.googletagmanager.com` + region1 collection endpoints.
- **Legal basis:** Art. 32 DSGVO ("appropriate technical measures") — thin for a static
  site, but these are zero-risk one-liners. Remember the documented nginx behavior:
  repeat every header in each location block that sets any header.
- **Effort:** S.

### 3.3 Create the Art. 30 Verzeichnis von Verarbeitungstätigkeiten (company-wide)

- The Art. 30(5) small-company exemption **does not apply**: continuous website
  operation is "not occasional" processing (practitioner consensus: the exemption
  practically never applies to an ongoing business). TWB-Digital OG should maintain an
  **internal** (never published) records document covering: website/server logs
  (this site and the other TWB sites), planned GA4, plus the ordinary business
  processing that exists anyway (customers, suppliers, payroll).
- The **Cookie & Storage Inventory** and **Processor register** below are ready-made
  entries for it.
- **Effort:** M (hours, company-wide — not a webmcpify.at file change).

---

## Priority 4 — LOW (minor/cosmetic; several are optional)

### 4.1 Label the seat as "Sitz" in the imprint
`imprint.html:59` shows the address as "Address/Anschrift"; § 14 UGB requires the
**Sitz**. The WKO checklist passed it (the seat *is* shown), so this is belt-and-braces:
either relabel the row or add `Sitz: Hollabrunn`. Effort: S.

### 4.2 Soften absolute marketing claims (UWG § 2 hygiene)
Flagged by the technical sweep as theoretical misleading-claims exposure (§ 2 UWG covers
deceptive claims about essential product characteristics; competitor standing required,
risk low):
- "You lose nothing by being early" / "Früh dran zu sein kostet nichts"
  (`index.html:466-471`) — absolute; integration/maintenance cost exists.
- "byte-identical for browsers without WebMCP" (`llms.txt:9`) — literally inaccurate
  (the JS ships and executes; only *visible behavior* is unchanged). Suggest
  "behaves identically in browsers without WebMCP".
- "verifies every tool … audits that no unrelated code changed" (`README.md:5`,
  `index.html` FAQ) — fine as long as the product actually escalates/flags as
  described; keep the wording aligned with actual behavior.
Optional wording edits; do not change product claims without Jonas's sign-off. Effort: S.

### 4.3 Accessibility polish (BaFG does NOT apply — quality only)
BaFG is inapplicable on two independent grounds (no e-commerce service toward a consumer
contract; microenterprise services exemption — <10 heads, ≤€2m). These are
quality/WCAG items, not legal duties:
- German mode keeps English accessible names: `aria-label="Language"`
  (`de/index.html:254`), figure title text (`de/index.html:291`).
- Copy toast `role="status"` toggles only opacity — content never changes, so screen
  readers may not announce it (`index.html:559`, `595`). Insert the text on show (or
  toggle `hidden`) for a real announcement.
- No `og:image:alt`/`twitter:image:alt`; DE pages share the EN og-image.
Effort: S each.

### 4.4 Notes — no action required
- **Git history exposure** (technical sweep): a private Gmail address in commit
  `e1a864c` author metadata and an obsolete phone number at `b53f671:imprint.html:67`.
  Rewriting public history is not warranted; noted for awareness.
- **README documents SSH user/host/docroot** (`README.md:19`) — mild opsec surface in a
  public repo; acceptable, noted.
- **AI crawlers welcomed** by robots.txt to all pages incl. the imprint — the imprint
  data is *legally required to be public*; nothing to fix, just an informed stance.
- **`webmcpify.js` event bridge** (`dispatchAndWait`, `webmcpify.js:189`) broadcasts
  tool-call detail as page-wide CustomEvents — currently **unused** by the site's
  tools; latent integration consideration only.
- **Trip-wire:** adding a blog/news/opinion section would flip the site to a "große
  Website" under § 25 MedienG → Blattlinie + ownership disclosure become mandatory.
  Re-check this plan if that happens.
- **Watch list:** CJEU C-703/25 P (*Latombe*, DPF validity — would reopen every
  US-transfer basis); CJEU reference from BGH VI ZR 258/24 (Art. 82 damages for
  provoked breaches — Abmahn-model revival risk). Neither expected before 2027.
  EU "Digital Omnibus" (draft Art. 88a/88b GDPR — browser-level consent signals,
  6-month re-ask cool-down) — draft only; do not build for it yet.
- **Company-wide side findings** (out of this site's scope): § 14 UGB details are
  required in business **emails** too (Firma, Rechtsform, Sitz, FN, Gericht — check
  signatures of `@twb-digital.at` senders and automated mailers, Zwangsstrafe up to
  €3,600); the EU **ODR platform is abolished** (data deleted 20.07.2025) and leftover
  `ec.europa.eu/consumers/odr` links are now themselves a defect — this site correctly
  has none, but grep the other TWB sites.

---

## Draft legal text (lawyer review required)

Marked **[DRAFT]**. Written to match the imprint's tone (neutral, terse) and its
bilingual `<span lang>` pattern. German is the primary legal text; English mirrors it.
Assumes fonts are **already self-hosted** (P1.2) — if the CDN remains, a Google Fonts
recipient/transfer section must be added instead of the "Schriftarten" section.

### privacy.html — German content [DRAFT]

> **Datenschutzerklärung**
>
> Stand: [DATUM]. Information gemäß Art. 13 DSGVO über die Verarbeitung
> personenbezogener Daten beim Besuch von webmcpify.at.
>
> **Verantwortlicher**
> TWB-Digital OG, Waldweg 28/2, 2020 Hollabrunn, Österreich
> E-Mail: mail@jonastuechler.at · Telefon: +43 650 7939867
> (Weitere Angaben im Impressum. Ein Datenschutzbeauftragter ist nicht bestellt und
> gesetzlich nicht erforderlich.)
>
> **Hosting und Server-Logs**
> Diese Website läuft auf einem von uns verwalteten Server der netcup GmbH,
> Daimlerstraße 25, 76185 Karlsruhe, Deutschland (Serverstandort EU). Beim Aufruf
> verarbeitet der Webserver automatisch: IP-Adresse, Datum und Uhrzeit des Zugriffs,
> aufgerufene URL, HTTP-Status und übertragene Datenmenge, Referrer-URL sowie
> User-Agent (Browser/Betriebssystem). Rechtsgrundlage ist unser berechtigtes
> Interesse am sicheren und stabilen Betrieb der Website, insbesondere zur
> Fehleranalyse und Abwehr von Angriffen (Art. 6 Abs. 1 lit. f DSGVO). Die
> Logdateien werden nach 14 Tagen automatisch gelöscht, nicht mit anderen Daten
> zusammengeführt und nicht an Dritte weitergegeben. Mit der netcup GmbH besteht
> ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.
>
> **Lokale Speicherung (localStorage)**
> Die Website speichert einen einzigen Eintrag im localStorage Ihres Browsers:
> `wmcp-lang` (gewählte Sprache, „en“ oder „de“). Er wird gesetzt, wenn Sie die
> Sprache über den EN/DE-Schalter wählen — oder, sofern Sie einen Browser-Agent
> nutzen, über das WebMCP-Tool `set_language` dieser Seite. Der Eintrag enthält
> keine personenbezogenen Daten, verbleibt ausschließlich in Ihrem Browser und
> wird nicht an uns oder Dritte übertragen (§ 165 Abs. 3 TKG 2021 — unbedingt
> erforderliche Speicherung für den von Ihnen gewünschten Dienst). Er bleibt
> gespeichert, bis Sie die Website-Daten in Ihrem Browser löschen. Cookies setzt
> diese Website nicht.
>
> **Schriftarten**
> Alle Schriftarten werden lokal von unserem Server geladen (Self-Hosting). Beim
> Laden der Seite wird keine Verbindung zu Servern Dritter aufgebaut.
>
> **Keine Analyse- und Trackingdienste**
> Diese Website verwendet keine Analyse-, Tracking- oder Werbedienste und bindet
> keine Inhalte von Drittservern ein.
>
> **Ihre Rechte**
> Ihnen stehen die Rechte auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
> Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
> Datenübertragbarkeit (Art. 20) sowie Widerspruch gegen Verarbeitungen auf
> Grundlage berechtigter Interessen (Art. 21 DSGVO) zu. Anfragen richten Sie an
> mail@jonastuechler.at. Sie haben außerdem das Recht auf Beschwerde bei der
> Aufsichtsbehörde: Österreichische Datenschutzbehörde, Barichgasse 40–42,
> 1030 Wien, Telefon +43 1 52 152-0, E-Mail dsb@dsb.gv.at, www.dsb.gv.at
> (Art. 77 DSGVO).
>
> Eine automatisierte Entscheidungsfindung einschließlich Profiling findet nicht
> statt. Die Bereitstellung personenbezogener Daten ist weder gesetzlich noch
> vertraglich vorgeschrieben; ohne die oben genannten technischen Daten kann die
> Website jedoch nicht ausgeliefert werden.

### privacy.html — English content [DRAFT]

> **Privacy Policy**
>
> Effective: [DATE]. Information per Art. 13 GDPR about the processing of personal
> data when visiting webmcpify.at.
>
> **Controller** — TWB-Digital OG, Waldweg 28/2, 2020 Hollabrunn, Austria.
> mail@jonastuechler.at · +43 650 7939867 (details in the Imprint; no data
> protection officer is appointed or legally required).
>
> **Hosting and server logs** — This site runs on a server we manage at netcup
> GmbH, Daimlerstraße 25, 76185 Karlsruhe, Germany (EU location). The web server
> automatically processes: IP address, date and time of access, requested URL,
> HTTP status and bytes transferred, referrer URL, and user agent. Legal basis:
> our legitimate interest in operating the site securely and reliably, in
> particular troubleshooting and abuse defence (Art. 6(1)(f) GDPR). Log files are
> deleted automatically after 14 days, are not merged with other data, and are not
> shared. A data processing agreement per Art. 28 GDPR is in place with netcup GmbH.
>
> **Local storage** — The site stores a single localStorage entry, `wmcp-lang`
> (chosen language, "en"/"de"), written when you pick a language via the EN/DE
> toggle — or, if you browse with an AI agent, via this page's WebMCP
> `set_language` tool. It contains no personal data, never leaves your browser,
> and only serves to deliver the language you asked for (§ 165(3) TKG 2021 —
> strictly necessary storage). It persists until you clear site data. This site
> sets no cookies.
>
> **Fonts** — All fonts are served from our own server (self-hosted); loading the
> page makes no connection to third-party servers.
>
> **No analytics or tracking** — This site uses no analytics, tracking, or
> advertising services and embeds no third-party content.
>
> **Your rights** — Access (Art. 15 GDPR), rectification (Art. 16), erasure
> (Art. 17), restriction (Art. 18), portability (Art. 20), and objection to
> legitimate-interest processing (Art. 21): write to mail@jonastuechler.at. You
> may also lodge a complaint with the Austrian supervisory authority:
> Österreichische Datenschutzbehörde, Barichgasse 40–42, 1030 Vienna,
> +43 1 52 152-0, dsb@dsb.gv.at, www.dsb.gv.at (Art. 77 GDPR).
>
> No automated decision-making, including profiling, takes place. Providing
> personal data is neither legally nor contractually required; without the
> technical data above, however, the site cannot be delivered.

### GA4 building block [DRAFT — only if/when Option B ships; replaces the "no analytics" section; EN mirror needed]

> **Webanalyse (Google Analytics 4) — nur mit Ihrer Einwilligung**
> Nur wenn Sie über den Einwilligungs-Banner zustimmen (Art. 6 Abs. 1 lit. a
> DSGVO, § 165 Abs. 3 TKG 2021), verwenden wir Google Analytics 4 der Google
> Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland. Google Analytics
> setzt Cookies (`_ga`, `_ga_*`; Laufzeit bei uns auf 90 Tage begrenzt[, sowie
> `_gcl_au` der Google-Ads-Verknüpfung — VERIFIZIEREN]) und verarbeitet die
> aufgerufene Seite (URL, Titel, Referrer), Geräte- und Browserinformationen,
> eine pseudonyme Client-ID sowie zwei Interaktionsereignisse (Kopieren des
> Install-Befehls, Klick auf GitHub-Links). Google Signals und personalisierte
> Werbesignale sind deaktiviert; die Aufbewahrung der Rohdaten auf Nutzerebene
> in Google Analytics beträgt 2 Monate (aggregierte Berichte bleiben darüber
> hinaus bestehen). Empfänger: Google Ireland Ltd.; Übermittlungen an die Google
> LLC (USA) erfolgen auf Grundlage des Angemessenheitsbeschlusses zum EU-US Data
> Privacy Framework (Art. 45 DSGVO). Mit Google besteht ein
> Auftragsverarbeitungsvertrag (Google Ads Data Processing Terms). Die Website
> ist mit Google Ads verknüpft (Conversion-Messung; Verarbeitung der Klick-ID
> `gclid`). Sie können Ihre Einwilligung jederzeit über „Cookie-Einstellungen“
> im Footer mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO). Ohne
> Einwilligung wird Google Analytics nicht geladen und es werden keine Cookies
> gesetzt.

---

## Cookie & storage inventory

| Key/Cookie | Type | Set by | Purpose | Personal data? | Duration | Consent required? | Category |
|---|---|---|---|---|---|---|---|
| `wmcp-lang` | localStorage | `index.html:567` / `de/index.html` / `imprint.html:87` / WebMCP tool `set_language` (`site-tools.js:71`) | Language preference ("en"/"de") | No (not linkable — no accounts) | Until site data cleared | **No** (§ 165(3) TKG strictly-necessary; disclose only). P3.1 makes the exemption airtight | Essential/Functional |
| — | Cookies | — | **The deployed site sets no cookies** (verified live 2026-07-24) | — | — | — | — |
| `_ga` *(planned)* | Cookie | gtag.js (GA4, branch only) | GA4 client ID | Yes (pseudonymous online identifier) | 90 days as configured (`cookie_expires`) | **Yes — prior opt-in** | Statistics |
| `_ga_45GCGY7SQN` *(planned)* | Cookie | gtag.js (GA4, branch only) | Session state | Yes | 90 days as configured | **Yes** | Statistics |
| `_gcl_au` *(possible via Ads link)* | Cookie | gtag.js w/ Google Ads linking | Ads conversion attribution | Yes | ~90 days (Google default) | **Yes** — advertising cookies are never "necessary" (DSB) | Marketing |
| `dataLayer` | JS global (no storage) | analytics.js (branch) | Event queue | Contains page URL pre-consent if not gated → see P2.1 item 1 | Page lifetime | Gate behind consent | — |

sessionStorage, IndexedDB, Cache API, service workers: **none** (confirmed by the
independent technical sweep; a `sessionStorage` implementation existed only in
historical commit `222b21c` and is deleted).

## Auftragsverarbeiter (processor) register

| Service | Provider | Country | Data processed | DPA required? | DPA status | Transfer mechanism |
|---|---|---|---|---|---|---|
| Hosting (tuejon.at server) | netcup GmbH, Karlsruhe | DE (EU) | Access logs (IP, UA, timestamps) on rented infrastructure | Yes (Art. 28) | **Check/conclude** — netcup offers a standard AVV in the customer panel; verify it is concluded for this account | EU only |
| Google Fonts CDN | Google Ireland Ltd / Google LLC | IE / US | Visitor IP, UA, referrer on font fetch | No (Google acts for own purposes; no AVV offered for Fonts) | N/A — **remove via self-hosting (P1.2)** | DPF (until removed) |
| Google Analytics 4 *(planned)* | Google Ireland Ltd | IE (US sub-processing) | Pseudonymous usage data, see building block | Yes | Google Ads Data Processing Terms — **accept & record before deploy** | EU→US: DPF adequacy (EU) 2023/1795; watch C-703/25 P |
| Let's Encrypt (TLS) | ISRG | US | No visitor personal data (cert issuance only) | No | N/A | N/A |

*(These rows double as Verzeichnis-von-Verarbeitungstätigkeiten entries — see P3.3.)*

---

## Files confirmed compliant (reviewed, no changes needed)

- `imprint.html` **content** — passes every mandatory item: § 14 UGB (Firma, Rechtsform,
  Sitz shown, FN, Gericht), § 5 ECG all seven (address, 2 contact channels, WKO
  membership, Aufsichtsbehörde BH Hollabrunn, GewO + RIS access link, UID), § 25 Abs 5
  MedienG kleine-Website triple (Firma, Unternehmensgegenstand, Sitz). Correctly cites
  § 25 (not § 24) MedienG. **Explicit negative findings:** Blattlinie, GISA-Zahl and GLN
  are NOT required for an OG with a kleine Website — do not add them. (Only cosmetic
  P4.1 "Sitz" label remains.)
- **Correct absences:** no cookie banner (right and required to stay absent today), no
  ODR link (platform abolished 2025 — a link would now be the defect), no DPO section
  needed (Art. 37 — no Austrian headcount trigger, unlike Germany's § 38 BDSG).
- `robots.txt` (legal pages not disallowed), `sitemap.xml`, `llms.txt` (content fine;
  one wording nit in P4.2), `build-de.py`, `webmcp/webmcpify.js` + `webmcp/site-tools.js`
  (no external requests, no data collection; `set_language` = explicit user request via
  agent), favicons/og assets, HSTS + TLS + redirect setup on the vhost, `lang`
  attributes (`en`/`de` correct per variant), external links `rel="noopener"`.
- **BaFG:** inapplicable (two independent grounds) — documented in P4.3.

## Implementation order

1. **P1.2 Self-host fonts** (removes the transfer before the policy is written).
2. **P1.1 privacy.html + footer links** on all pages, regenerate `/de/` (`build-de.py`).
3. **P3.1 `wmcp-lang` write-on-toggle** (same regenerate run as step 2).
4. **P3.2 security headers** on the vhost (server-side; independent).
5. **P4.1/4.2/4.3 polish** (imprint "Sitz" label, wording, a11y) — batch with step 2's
   regenerate to avoid double `build-de.py` churn.
6. **P3.3 Art. 30 records** (company-level, parallel to everything).
7. **P2.1 GA4 gate** — only when the campaign decision is made; separate PR on the
   measurement branch; re-verify with a first-load network capture before deploy.

Steps 1–3 and 5 fit in one small PR; nothing depends on P2.1.

## Validation sources (official checklists used)

| Source | URL | Result |
|---|---|---|
| WKO — Website-Impressum OG (PDF, Stand 08/2025) | wko.at/oe/internetrecht/das-korrekte-website-impressum-og.pdf | **PASS** — all §14 UGB (5/5), §5 ECG (7/7 + 1 N/A), §25 Abs 5 MedienG (3/3); große-Website items N/A; §63 GewO/GISA/GLN N/A by the checklist's own scoping; ODR correctly absent |
| WKO — Datenschutzerklärung Checkliste (Stand 01.01.2025) | wko.at/internetrecht/datenschutzerklaerung-checkliste-infopflichten-dsgvo-tkg-we | **FAIL 0/14 applicable items** (no policy exists) — items 2, 9, 11, 12 N/A today; the FAIL list is the build spec for P1.1 |
| WKO — Cookies/Webanalyse Checkliste + Rechtsfrage #19 | wko.at/internetrecht/checkliste-cookies-webanalyse-webshop · wko.at/noe/e-commerce/faq-19-cookies | Mixed: no-consent-needed storage PASS (language key named as necessary); TKG info duty FAIL (undisclosed); analytics-requires-consent binding on P2.1 |
| DSB — FAQ Datenschutz & Cookies | dsb.gv.at/faqs/datenschutz-cookies | PASS on no-banner state ("kein Cookie-Banner notwendig" without non-essential storage); localStorage in scope of § 165(3); 8 banner criteria bind P2.1 |
| DSB — Google-Fonts Prüfverfahren (Newsletter 4/2023) | dsb.gv.at/sites/site0344/media/downloads/newsletter_dsb_4_2023.pdf | No unlawful processing found; **info-duty defect flagged** = this site's gap; self-hosting eliminates the transfer |
| DSB — EU-US DPF page | dsb.gv.at/europa-internationales/eu-us-data-privacy-framework | Adequacy valid for DPF-certified importers; does not touch § 165 TKG consent |

(Retrieval date for all: 2026-07-24. Known-broken official URLs: everything under
`www.dsb.gv.at/download-links/*`; the DSB newsletter archive link to 4/2023 points at
`/#` — the PDF above was recovered via naming pattern.)

## Legal references

**Statutes (AT):** § 5 ECG; § 3 Z 1 ECG; § 14 UGB; § 25 (esp. Abs 5) MedienG; § 165
Abs 3 TKG 2021; §§ 1, 2 UWG; § 63 GewO (inapplicable — Firmenbuch-registered); BaFG
BGBl I 2023/76 (inapplicable); VRUN BGBl I 2024/85 / §§ 619–635 ZPO; DSG (no DPO
threshold). **EU:** DSGVO Art. 6, 7, 12–21, 28, 30, 32, 37, 44 ff., 77, 82, 83;
adequacy decision (EU) 2023/1795 (DPF); Reg. (EU) 2024/3228 (ODR repeal); Dir. (EU)
2019/882 (EAA); Dir. (EU) 2020/1828 (Verbandsklagen).
**Decisions:** CJEU C-582/14 *Breyer*; EuG T-553/23 *Latombe* (03.09.2025, appeal
C-703/25 P pending); DSB 22.12.2021 D155.027 (GA, superseded on the transfer leg by
DPF); DSB 28.10.2024 D124.0507/24 (orf.at banner button equality); BVwG 31.07.2024
W108 2284491-1 (one-extra-click reject unlawful); BVwG 23.04.2026 W171 2303402-1
(nudging; VwGH revision pending); BVwG W214 2223400-1 (ad cookies never necessary);
LG München I 20.01.2022, 3 O 17493/20 (fonts, DE); BGH 28.08.2025 VI ZR 258/24
(CJEU referral); LG f. ZRS Wien font-Abmahn rulings (WKO test case; 14.04.2025;
30.12.2025 — abuse of rights). **Guidance:** WP29 Opinion 04/2012 (WP194); EDPB
Cookie Banner Taskforce Report 18.01.2023; DSB FAQs as cited above.

Full source URLs are preserved in the audit working notes (research agent reports,
2026-07-24). Confidence caveats from research: BaFG § numbering unverified against RIS
(503 at retrieval time); WP194 quotes via secondary sources; DSB/BVwG banner decisions
read via DSB press page + specialist reporting (GDPRhub inaccessible).
