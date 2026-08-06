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
[`ANALYTICS.md`](ANALYTICS.md). It is live behind a two-category consent
banner (Statistics / Marketing); the compliance record lives in
[`docs/LEGAL_COMPLIANCE_PLAN.md`](docs/LEGAL_COMPLIANCE_PLAN.md).

Run its dependency-free contract tests with `node --test 'tests/*.test.mjs'`.

## Agent surface

The site is itself agent-ready, in the three layers a WebMCP integration can have:

- **Imperative** — `webmcp/tools.js` holds the tool contracts (`get_install_command`,
  `get_pipeline_overview`, `get_faq`, `set_language`) as pure data;
  `webmcp/site-tools.js` registers them via `document.modelContext` with the
  vendored runtime (`webmcp/webmcpify.js`).
- **Declarative** — the install form (`#install-picker`) carries `toolname`,
  `tooldescription`, `toolautosubmit` and a `required` select with
  `toolparamdescription`, so `show_install_command` exists without JavaScript
  registration. Agents and humans go through the same submit handler; without
  scripting the control row is hidden and every install route is listed as text.
- **Pre-visit discovery** — [`.well-known/webmcp.json`](.well-known/webmcp.json),
  served at `/.well-known/webmcp` (nginx alias, `application/json`) and advertised
  from every page via `<link rel="webmcp">` plus an RFC 8288 `Link` response header.
  The WebMCP spec defines **no** manifest format; this follows the de-facto shape
  third-party crawlers and inspectors probe. Runtime registration stays
  authoritative: the manifest is **generated** — run `node build-manifest.mjs` and
  commit the result after changing any tool contract; the tests fail if the
  committed file is stale or disagrees with the form.

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
