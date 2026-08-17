import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [
  'index.html',
  'de/index.html',
  'webmcp-agent-skill/index.html',
  'imprint.html',
  'privacy.html',
];

/** Indexable page → the canonical URL it must declare for itself. */
const CANONICALS = {
  'index.html': 'https://webmcpify.at/',
  'de/index.html': 'https://webmcpify.at/de/',
  'webmcp-agent-skill/index.html': 'https://webmcpify.at/webmcp-agent-skill/',
};

const read = (page) => readFileSync(join(root, page), 'utf8');
/** Typography differs between prose and JSON strings; parity is about wording. */
const normalize = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

test('every page carries the full consent surface', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(root, page), 'utf8');
    for (const marker of [
      'id="consent"',
      'data-consent-cat="statistics"',
      'data-consent-cat="marketing"',
      'data-consent-accept',
      'data-consent-save',
      'data-consent-decline',
      'data-consent-open',
      'src="/consent.js"',
    ]) {
      assert.ok(html.includes(marker), `${page} is missing ${marker}`);
    }
    assert.ok(!html.includes('fonts.googleapis.com'), `${page} references the fonts CDN`);
  }
});

test('every indexable page declares its own canonical and stays indexable', () => {
  for (const [page, url] of Object.entries(CANONICALS)) {
    const html = read(page);
    assert.ok(
      html.includes(`<link rel="canonical" href="${url}">`),
      `${page} must declare canonical ${url}`,
    );
    assert.ok(!/name="robots"[^>]*noindex/.test(html), `${page} must not be noindex`);
  }
});

/**
 * The category-phrase guard. webmcpify is a coined single token: it cannot match
 * a search for "webmcp agent skill", so this page exists to carry those words in
 * its title and h1. Losing them there silently undoes the reason it was built.
 */
test('the agent-skill page carries the category phrase in title and h1', () => {
  const html = read('webmcp-agent-skill/index.html');
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] ?? '';
  assert.match(normalize(title).toLowerCase(), /webmcp agent skill/);
  assert.match(normalize(h1).toLowerCase(), /webmcp agent skill/);
});

/** An orphan page is reachable only through the sitemap. Keep it linked. */
test('the agent-skill page is linked from the start pages and the sitemap', () => {
  for (const page of ['index.html', 'de/index.html']) {
    assert.ok(
      read(page).includes('href="/webmcp-agent-skill/"'),
      `${page} must link to /webmcp-agent-skill/`,
    );
  }
  assert.ok(
    read('sitemap.xml').includes('<loc>https://webmcpify.at/webmcp-agent-skill/</loc>'),
    'sitemap.xml must list /webmcp-agent-skill/',
  );
});

test('the public product pages surface the accurately scoped verification demo', () => {
  const video = 'proof/artifacts/webmcpify-proof-480p.mp4';
  for (const page of ['index.html', 'de/index.html', 'webmcp-agent-skill/index.html']) {
    const html = read(page);
    assert.ok(html.includes(video), `${page} must link the uncut proof recording`);
    assert.match(html, /63[- ](?:second|Sekunden)/, `${page} must describe the proof length`);
    assert.ok(
      html.includes('does not execute the full skill pipeline'),
      `${page} must state the runtime demo boundary`,
    );
  }
});

/** Schema that disagrees with the visible answer is the kind of drift crawlers punish. */
test('every FAQPage answer also exists in the visible copy of its page', () => {
  for (const page of ['index.html', 'de/index.html', 'webmcp-agent-skill/index.html']) {
    const html = read(page);
    const schema = html.match(/<script type="application\/ld\+json" id="faq-schema">(.*?)<\/script>/s)?.[1];
    assert.ok(schema, `${page} must carry the FAQ schema`);
    const body = normalize(html.replace(schema, ''));
    for (const entry of JSON.parse(schema).mainEntity) {
      const answer = normalize(entry.acceptedAnswer.text);
      assert.ok(body.includes(answer), `${page}: schema answer missing from visible copy: ${answer.slice(0, 60)}…`);
    }
  }
});

test('the marketing checkbox starts disabled and no category is pre-ticked', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.match(html, /data-consent-cat="marketing" disabled/, `${page} marketing not locked`);
    assert.ok(
      !/data-consent-cat="[^"]+"[^>]*\schecked[\s>]/.test(html),
      `${page} pre-ticks a consent category`,
    );
  }
});
