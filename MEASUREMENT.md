# Privacy-safe launch measurement

The site records two first-party events: a successful install-command copy and a
click from the site to the WebMCPify GitHub repository. It deliberately does not
measure page views or identify visitors.

## Data contract

The browser reduces an exact allowlisted UTM triple to one fixed code:

| Code | `utm_source` | `utm_medium` | `utm_campaign` |
|---|---|---|---|
| `show-hn` | `hacker-news` | `referral` | `launch-2026` |
| `chrome-group` | `chrome-group` | `community` | `launch-2026` |
| `console` | `console-dev` | `referral` | `launch-2026` |
| `changelog` | `changelog` | `referral` | `launch-2026` |
| `linkedin` | `linkedin` | `social` | `launch-2026` |
| `reddit` | `reddit` | `social` | `launch-2026` |
| `google-cpc` | `google` | `cpc` | `webmcpify-search-test` |

Anything else becomes `other`; a visit without UTM input becomes `direct`.
`utm_content` and `utm_term` are accepted only as signals that attribution was
attempted and are never stored. The fixed code lives in `sessionStorage` for the
tab lifetime. The input query is removed from browser history immediately.

Each event is an empty same-origin `POST` to a fixed path such as
`/__measure/install-command-copy/show-hn`. There are no cookies, request bodies,
third-party scripts, persistent visitor IDs, fingerprinting fields, or arbitrary
query values.

## Server setup and retention

1. Put the `geo`, `map`, and `log_format` declarations documented in
   `ops/nginx/measurement.conf` in nginx's `http {}` context.
2. Include the file's `location` block in the existing webmcpify.at server.
3. Add stable office/VPN CIDRs to `geo` for internal-traffic exclusion. This
   comparison happens in memory; the address is omitted from the event log.
4. Install `ops/logrotate.d/webmcpify-events` as
   `/etc/logrotate.d/webmcpify-events` and validate with `logrotate -d`.
5. Prefer `$uri`, not `$request`/`$request_uri`, in the ordinary access-log
   format so landing-page query values are not retained there either.

The event log contains only UTC timestamp, method, allowlisted path, and status.
It rotates daily and is deleted after 30 days. Raw logs stay on the host and are
never exported. Aggregated weekly CSV counts may be copied into the issue report.

## Weekly derivation

Run on the host:

```sh
sudo ./ops/weekly-metrics.sh /var/log/nginx/webmcpify-events.log 7
```

The script reads current and rotated logs, rejects malformed/non-allowlisted
rows, and emits `event,attribution,count`. Counts are event totals, not unique
people or sessions; do not label them as users or conversion rate. Internal test
requests are excluded by nginx before logging. For an end-to-end smoke test, use
an external test address, trigger each event once, confirm two `204` responses,
then confirm the two fixed-path rows and remove them from the aggregate manually.

## Campaign URL examples

```text
https://webmcpify.at/?utm_source=hacker-news&utm_medium=referral&utm_campaign=launch-2026
https://webmcpify.at/?utm_source=chrome-group&utm_medium=community&utm_campaign=launch-2026
https://webmcpify.at/?utm_source=google&utm_medium=cpc&utm_campaign=webmcpify-search-test&utm_content=ad-a&utm_term=webmcp
```

The final two parameters in the Google example are intentionally discarded. Add
a new source only by extending the code, nginx path allowlist, documentation, and
tests together; never accept an arbitrary campaign string.
