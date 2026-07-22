#!/usr/bin/env python3
"""Generate de/index.html from index.html.

The page carries both languages inline (<span lang="en">/<span lang="de">,
CSS-toggled via <html data-lang>), so the German variant is the same document
with German defaults and German metadata. Run after editing index.html:

    python3 build-de.py

and commit the regenerated de/index.html alongside index.html.
"""
import pathlib
import sys

SRC = pathlib.Path(__file__).parent / "index.html"
DST = pathlib.Path(__file__).parent / "de" / "index.html"

REPLACEMENTS = [
    ('<html lang="en" data-lang="en">', '<html lang="de" data-lang="de">'),
    ("<title>webmcpify — make your web app agent-ready</title>",
     "<title>webmcpify — mach deine Web-App agent-ready</title>"),
    ('<meta name="description" content="webmcpify wires your existing web app into WebMCP: inventory, approval, integration, real-browser verification. Open source, MIT.">',
     '<meta name="description" content="webmcpify verbindet deine bestehende Web-App mit WebMCP: Inventar, Freigabe, Integration, Verifikation im echten Browser. Open Source, MIT.">'),
    ('<link rel="canonical" href="https://webmcpify.at/">',
     '<link rel="canonical" href="https://webmcpify.at/de/">'),
    ('<meta property="og:url" content="https://webmcpify.at/">',
     '<meta property="og:url" content="https://webmcpify.at/de/">'),
    ('<meta property="og:title" content="webmcpify — make your web app agent-ready">',
     '<meta property="og:title" content="webmcpify — mach deine Web-App agent-ready">'),
    ('<meta property="og:description" content="webmcpify wires your existing web app into WebMCP: inventory, approval, integration, real-browser verification. Open source, MIT.">',
     '<meta property="og:description" content="webmcpify verbindet deine bestehende Web-App mit WebMCP: Inventar, Freigabe, Integration, Verifikation im echten Browser. Open Source, MIT.">'),
    ('<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="de_AT">'),
    ('<meta property="og:locale:alternate" content="de_AT">', '<meta property="og:locale:alternate" content="en_US">'),
    ('<meta name="twitter:title" content="webmcpify — make your web app agent-ready">',
     '<meta name="twitter:title" content="webmcpify — mach deine Web-App agent-ready">'),
    ('<meta name="twitter:description" content="webmcpify wires your existing web app into WebMCP: inventory, approval, integration, real-browser verification. Open source, MIT.">',
     '<meta name="twitter:description" content="webmcpify verbindet deine bestehende Web-App mit WebMCP: Inventar, Freigabe, Integration, Verifikation im echten Browser. Open Source, MIT.">'),
    ('<button type="button" data-set-lang="en" aria-pressed="true">EN</button>',
     '<button type="button" data-set-lang="en" aria-pressed="false">EN</button>'),
    ('<button type="button" data-set-lang="de" aria-pressed="false">DE</button>',
     '<button type="button" data-set-lang="de" aria-pressed="true">DE</button>'),
]


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    for old, new in REPLACEMENTS:
        if old not in html:
            sys.exit(f"build-de: pattern no longer in index.html, update REPLACEMENTS:\n  {old}")
        html = html.replace(old, new)
    DST.parent.mkdir(exist_ok=True)
    DST.write_text(html, encoding="utf-8")
    print(f"wrote {DST} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
