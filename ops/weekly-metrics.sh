#!/bin/sh
set -eu

log_file=${1:-/var/log/nginx/webmcpify-events.log}
days=${2:-7}

case "$days" in *[!0-9]*|'') echo "days must be a positive integer" >&2; exit 2;; esac
start=$(date -u -d "$days days ago" +%Y-%m-%dT%H:%M:%S)

printf 'event,attribution,count\n'
zcat -f -- "$log_file"* 2>/dev/null | awk -v start="$start" '
  $1 >= start && $2 == "POST" && $4 == "204" {
    n = split($3, p, "/")
    if (n == 4 && p[2] == "__measure" &&
        (p[3] == "install-command-copy" || p[3] == "github-outbound") &&
        p[4] ~ /^(direct|other|show-hn|chrome-group|console|changelog|linkedin|reddit|google-cpc)$/) {
      count[p[3] SUBSEP p[4]]++
    }
  }
  END {
    for (key in count) {
      split(key, v, SUBSEP)
      print v[1] "," v[2] "," count[key]
    }
  }
' | sort
