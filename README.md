# webmcpify.at

Landing page for [webmcpify](https://github.com/TueJon/webmcpify) — an agent skill that
makes existing web apps agent-ready via [WebMCP](https://webmachinelearning.github.io/webmcp/)
(`document.modelContext`), with a human approval gate and real-browser verification of
every exposed tool.

Static site (no build step): `index.html` + `robots.txt` + `sitemap.xml`.
English default with a client-side German toggle. `/de/` is the crawlable German
variant — regenerate it with `python3 build-de.py` after editing `index.html`
and commit both files (hreflang pairs live in both pages and `sitemap.xml`).

Routes:

| Path | Purpose |
|---|---|
| `/` · `/de/` | start page (bilingual copy, `/de/` generated from `index.html`) |
| `/webmcp-agent-skill/` | the category page: **its title and `<h1>` must keep the phrase "WebMCP agent skill"** — `webmcpify` is a coined single token and cannot rank for it. Bilingual in place, no separate `/de/` variant, so it is not part of `build-de.py`. Per-runtime install instructions live here. |
| `/imprint.html` · `/privacy.html` | legal pages (`noindex`) |

`tests/pages.test.mjs` guards the parts that silently rot: the consent surface on
every page, a self-canonical per indexable page, the category phrase on
`/webmcp-agent-skill/`, that the start pages and the sitemap still link it (an
unlinked page is reachable through the sitemap only), and that every `FAQPage`
schema answer still exists in the visible copy of its page.

Production: https://webmcpify.at

Google Analytics 4 measurement is documented in
[`ANALYTICS.md`](ANALYTICS.md). It is live behind a two-category consent
banner (Statistics / Marketing); the compliance record lives in
[`docs/LEGAL_COMPLIANCE_PLAN.md`](docs/LEGAL_COMPLIANCE_PLAN.md).

Run its dependency-free contract tests with `node --test tests/analytics.test.mjs tests/consent.test.mjs tests/pages.test.mjs`.

## Deploy

The site is served directly from a git clone on the host — no build, no pipeline:

- Host: `tuejon.at`, docroot `/opt/webmcpify` (clone of `main`), nginx vhost
  `/etc/nginx/sites-available/25-webmcpify.conf` (TLS via Let's Encrypt/certbot,
  http→https and www→apex 301s, HSTS).
- Redeploy after merging to `main`:

  ```bash
  ssh tj@tuejon.at 'cd /opt/webmcpify && git pull'
  ```

- Verify: `curl -sI https://webmcpify.at/` (200, `strict-transport-security` present)
  and spot-check changed pages.
