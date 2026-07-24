# webmcpify.at

Landing page for [webmcpify](https://github.com/TueJon/webmcpify) — an agent skill that
makes existing web apps agent-ready via [WebMCP](https://webmachinelearning.github.io/webmcp/)
(`document.modelContext`), with a human approval gate and real-browser verification of
every exposed tool.

Static site (no build step): `index.html` + `robots.txt` + `sitemap.xml`.
English default with a client-side German toggle. `/de/` is the crawlable German
variant — regenerate it with `python3 build-de.py` after editing `index.html`
and commit both files (hreflang pairs live in both pages and `sitemap.xml`).

Production: https://webmcpify.at

Google Analytics 4 measurement is documented in
[`ANALYTICS.md`](ANALYTICS.md). The integration is proposed in PR #5 but is not
deployed. A separate legal/privacy audit and the documented consent gate must be
completed before merge and production activation.

Run its dependency-free contract tests with `node --test tests/analytics.test.mjs tests/consent.test.mjs`.

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
