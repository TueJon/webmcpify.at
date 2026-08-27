# webmcpify.at

Landing page for [webmcpify](https://github.com/TueJon/webmcpify) — an agent skill that
makes existing web apps agent-ready via [WebMCP](https://webmachinelearning.github.io/webmcp/)
(`document.modelContext`), with a human approval gate and real-browser verification of
every exposed tool.

Static site with a dependency-free German-page generator: HTML, CSS, JavaScript,
`robots.txt` and `sitemap.xml` are served directly.
English default with a client-side German toggle. `/de/` is the crawlable German
variant — regenerate it with `python3 build-de.py` after editing `index.html`
and commit both files (hreflang pairs live in both pages and `sitemap.xml`).

Routes:

| Path | Purpose |
|---|---|
| `/` · `/de/` | start page (bilingual copy, `/de/` generated from `index.html`) |
| `/webmcp-agent-skill/` | the category page: **its title and `<h1>` must keep the phrase "WebMCP agent skill"** — `webmcpify` is a coined single token and cannot rank for it. Bilingual in place, no separate `/de/` variant, so it is not part of `build-de.py`. Per-runtime install instructions live here. |
| `/docs/` | technical entry point: coverage targets, proof layers and dated source boundaries |
| `/docs/site-tools/` | dated ChatGPT Site tools setup and troubleshooting guide; official claims must stay sourced |
| `/imprint.html` · `/privacy.html` | legal pages (`noindex`) |

`tests/pages.test.mjs` guards the parts that silently rot: the consent surface on
every page, a self-canonical per indexable page, the category phrase on
`/webmcp-agent-skill/`, that the start and documentation pages form a linked
tree, that every public route remains in the sitemap, and that every `FAQPage`
schema answer still exists in the visible copy of its page.

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
