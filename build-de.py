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
    ("{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"What is WebMCP?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"A proposed web standard (W3C Web Machine Learning CG) that lets a page register typed tools browser AI agents can call instead of screen-scraping your DOM. It's currently running as a Chrome origin trial.\"}}, {\"@type\": \"Question\", \"name\": \"Will webmcpify touch code I didn't approve?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"No. Every diff hunk must map to an approved tool or recorded setup; the audit phase flags anything else in the report. Files that were dirty before the run are never modified.\"}}, {\"@type\": \"Question\", \"name\": \"Is this a security risk for my app?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Tools may only call code paths your UI already uses: same endpoints, validation and auth. The server remains the trust boundary. Server mutations need per-tool approval; auth, signup, billing, payment and credential-returning tools are excluded. An irreversible delete can only open the app's own confirmation UI.\"}}, {\"@type\": \"Question\", \"name\": \"Which agents can run webmcpify, and which can use the result?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"It runs in any agent that loads skills — Claude Code, Codex, Cursor, opencode, Copilot. The result is plain, dependency-free WebMCP integration: any browser agent that speaks WebMCP can call your tools, regardless of vendor.\"}}]}",
     "{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"Was ist WebMCP?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Ein vorgeschlagener Webstandard (W3C Web Machine Learning CG), mit dem eine Seite typisierte Tools registriert, die Browser-KI-Agents aufrufen können, statt dein DOM zu scrapen. Läuft aktuell als Chrome Origin Trial.\"}}, {\"@type\": \"Question\", \"name\": \"Fasst webmcpify Code an, den ich nicht freigegeben habe?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Nein. Jeder Diff-Hunk muss einem freigegebenen Tool oder dokumentiertem Setup zuordenbar sein; alles andere flaggt die Audit-Phase im Report. Dateien, die vor dem Run dirty waren, werden nie angefasst.\"}}, {\"@type\": \"Question\", \"name\": \"Ist das ein Sicherheitsrisiko für meine App?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Tools dürfen nur Code-Pfade aufrufen, die deine UI ohnehin nutzt: gleiche Endpoints, Validierung und Auth. Der Server bleibt die Trust Boundary. Server-Mutationen brauchen Freigabe pro Tool; Auth-, Signup-, Billing-, Zahlungs- und Credential-ausgebende Tools sind ausgeschlossen. Eine irreversible Löschung darf nur die bestehende Bestätigungs-UI der App öffnen.\"}}, {\"@type\": \"Question\", \"name\": \"Welche Agents können webmcpify ausführen, und welche das Ergebnis nutzen?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Er läuft in jedem Agent, der Skills lädt — Claude Code, Codex, Cursor, opencode, Copilot. Das Ergebnis ist reine, dependency-freie WebMCP-Integration: jeder Browser-Agent, der WebMCP spricht, kann deine Tools aufrufen.\"}}]}"),
    ('<html lang="en" data-lang="en">', '<html lang="de" data-lang="de">'),
    ("<title>webmcpify: the WebMCP agent skill that makes your web app agent-ready</title>",
     "<title>webmcpify: der WebMCP-Agent-Skill, der deine Web-App agent-ready macht</title>"),
    ('<meta name="description" content="webmcpify is a WebMCP agent skill for curated core coverage or route-by-route parity: inventory, approval, integration and real-browser verification. Open source, MIT.">',
     '<meta name="description" content="webmcpify ist ein WebMCP Agent-Skill für kuratierte Kernabdeckung oder routenweise Parität: Inventar, Freigabe, Integration und Verifikation im echten Browser. Open Source, MIT.">'),
    ('<link rel="canonical" href="https://webmcpify.at/">',
     '<link rel="canonical" href="https://webmcpify.at/de/">'),
    ('<meta property="og:url" content="https://webmcpify.at/">',
     '<meta property="og:url" content="https://webmcpify.at/de/">'),
    ('<meta property="og:title" content="webmcpify: the WebMCP agent skill that makes your web app agent-ready">',
     '<meta property="og:title" content="webmcpify: der WebMCP-Agent-Skill, der deine Web-App agent-ready macht">'),
    ('<meta property="og:description" content="webmcpify is a WebMCP agent skill for curated core coverage or route-by-route parity: inventory, approval, integration and real-browser verification. Open source, MIT.">',
     '<meta property="og:description" content="webmcpify ist ein WebMCP Agent-Skill für kuratierte Kernabdeckung oder routenweise Parität: Inventar, Freigabe, Integration und Verifikation im echten Browser. Open Source, MIT.">'),
    ('<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="de_AT">'),
    ('<meta property="og:locale:alternate" content="de_AT">', '<meta property="og:locale:alternate" content="en_US">'),
    ('<meta name="twitter:title" content="webmcpify: the WebMCP agent skill that makes your web app agent-ready">',
     '<meta name="twitter:title" content="webmcpify: der WebMCP-Agent-Skill, der deine Web-App agent-ready macht">'),
    ('<meta name="twitter:description" content="webmcpify is a WebMCP agent skill for curated core coverage or route-by-route parity: inventory, approval, integration and real-browser verification. Open source, MIT.">',
     '<meta name="twitter:description" content="webmcpify ist ein WebMCP Agent-Skill für kuratierte Kernabdeckung oder routenweise Parität: Inventar, Freigabe, Integration und Verifikation im echten Browser. Open Source, MIT.">'),
    ('<button type="button" data-set-lang="en" aria-pressed="true">EN</button>',
     '<button type="button" data-set-lang="en" aria-pressed="false">EN</button>'),
    ('<button type="button" data-set-lang="de" aria-pressed="false">DE</button>',
     '<button type="button" data-set-lang="de" aria-pressed="true">DE</button>'),
    ('<meta property="og:image:alt" content="webmcpify: make your web app agent-ready with WebMCP">',
     '<meta property="og:image:alt" content="webmcpify: mach deine Web-App agent-ready mit WebMCP">'),
    ('<meta name="twitter:image:alt" content="webmcpify: make your web app agent-ready with WebMCP">',
     '<meta name="twitter:image:alt" content="webmcpify: mach deine Web-App agent-ready mit WebMCP">'),
    ('aria-label="Language"', 'aria-label="Sprache"'),
    ('<title id="fig1-title">Diagram: a browser app exposing typed tools to an AI agent</title>',
     '<title id="fig1-title">Diagramm: eine Browser-App stellt einem KI-Agent typisierte Tools bereit</title>'),
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
