import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'de/index.html', 'imprint.html', 'privacy.html'];

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
