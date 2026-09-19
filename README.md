# webmcpify.at

Landing page for [webmcpify](https://github.com/TueJon/webmcpify) — an agent skill that
makes existing web apps agent-ready via [WebMCP](https://webmachinelearning.github.io/webmcp/)
(`document.modelContext`), with a human approval gate and real-browser verification of
every exposed tool.

This repository contains the static site. It uses plain HTML, CSS and JavaScript,
plus dependency-free generators for derived files.

Routes:

| Path | Purpose |
|---|---|
| `/` · `/de/` | Start page in English and German |
| `/webmcp-agent-skill/` | WebMCP agent skill overview and installation instructions |
| `/docs/` | Technical documentation |
| `/docs/site-tools/` | ChatGPT Site tools setup and troubleshooting guide |
| `/imprint.html` · `/privacy.html` | legal pages (`noindex`) |

Production: https://webmcpify.at

Google Analytics 4 measurement is documented in
[`ANALYTICS.md`](ANALYTICS.md). It is live behind a two-category consent
banner (Statistics / Marketing); the compliance record lives in
[`docs/LEGAL_COMPLIANCE_PLAN.md`](docs/LEGAL_COMPLIANCE_PLAN.md).

## Development

After editing `index.html`, regenerate and commit the German page:

```sh
python3 build-de.py
```

After changing a tool contract, regenerate and commit the discovery manifest:

```sh
node build-manifest.mjs
```

Run the dependency-free contract tests with:

```sh
node --test 'tests/*.test.mjs'
```

## Agent surface

The site is itself agent-ready, in the three layers a WebMCP integration can have:

- **Imperative** — tool contracts in `webmcp/tools.js` are registered through
  `document.modelContext` by `webmcp/site-tools.js`.
- **Declarative** — the install form exposes an equivalent tool through HTML
  attributes and keeps the same workflow available without scripting.
- **Pre-visit discovery** — [`.well-known/webmcp.json`](.well-known/webmcp.json)
  advertises the available tools to compatible crawlers and inspectors.

## Deploy

Pull requests run the contract tests and generated-file checks. Merges to `main`
deploy automatically and verify the public routes.
