import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const PAGES = ['index.html', 'de/index.html', 'imprint.html', 'privacy.html'];

const manifest = JSON.parse(read('.well-known/webmcp.json'));

test('the discovery manifest carries the fields crawlers read', () => {
  for (const field of ['name', 'description', 'version', 'homepage', 'tools']) {
    assert.ok(manifest[field], `manifest is missing ${field}`);
  }
  assert.ok(Array.isArray(manifest.tools) && manifest.tools.length > 0, 'no tools listed');
  for (const tool of manifest.tools) {
    assert.match(tool.name, /^[a-z][a-z0-9_]*$/, `bad tool name: ${tool.name}`);
    assert.ok(tool.description?.length > 20, `${tool.name} needs a usable description`);
    assert.equal(tool.inputSchema?.type, 'object', `${tool.name} needs an object inputSchema`);
  }
});

test('every page advertises the manifest', () => {
  for (const page of PAGES) {
    assert.match(
      read(page),
      /<link rel="webmcp" href="\/\.well-known\/webmcp" type="application\/json">/,
      `${page} does not link the manifest`,
    );
  }
});

test('the manifest matches the tools the site actually exposes', () => {
  const imperative = [...read('webmcp/site-tools.js').matchAll(/^ {4}name: '([a-z0-9_]+)',$/gm)]
    .map((m) => m[1]);
  const declarative = [...read('index.html').matchAll(/\btoolname="([a-z0-9_]+)"/g)].map((m) => m[1]);
  const exposed = [...imperative, ...declarative].sort();
  const listed = manifest.tools.map((t) => t.name).sort();

  assert.ok(imperative.length > 0, 'no imperative tools found — check the regex');
  assert.ok(declarative.length > 0, 'no declarative tools found — check the regex');
  assert.deepEqual(listed, exposed, 'manifest and page tools drifted apart');
});

test('the declarative install form stays agent-callable in both languages', () => {
  for (const page of ['index.html', 'de/index.html']) {
    const html = read(page);
    const form = html.match(/<form class="cmd" id="install-picker"[\s\S]*?<\/form>/);
    assert.ok(form, `${page} lost the install form`);
    const markup = form[0];

    assert.match(markup, /toolname="show_install_command"/, `${page}: no toolname`);
    assert.match(markup, /tooldescription="[^"]{40,}"/, `${page}: tooldescription too thin`);
    // Only pure read forms may auto-submit — this one just swaps displayed text.
    assert.match(markup, /toolautosubmit=""/, `${page}: missing toolautosubmit`);
    assert.match(markup, /<select id="install-agent" name="agent"/, `${page}: select lost id/name`);
    assert.match(markup, /toolparamdescription="[^"]{20,}"/, `${page}: select needs a param description`);
    assert.match(markup, /<label for="install-agent">/, `${page}: select has no label`);
    assert.match(markup, /<button class="copy-btn" type="submit"/, `${page}: no submit path`);

    const options = [...markup.matchAll(/<option value="([a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(options, ['npx', 'plugin', 'git'], `${page}: install routes drifted`);
    const schema = manifest.tools.find((t) => t.name === 'show_install_command').inputSchema;
    assert.deepEqual(schema.properties.agent.enum, options, `${page}: manifest enum ≠ form options`);
  }
});

test('the picker renders every route the schema promises', () => {
  const html = read('index.html');
  const routes = [...html.matchAll(/^ {4}([a-z]+): \{$/gm)].map((m) => m[1]);
  assert.deepEqual(routes, ['npx', 'plugin', 'git'], 'INSTALL_VARIANTS drifted from the form');

  const jsRoutes = [...read('webmcp/site-tools.js').matchAll(/^ {2}([a-z]+): \[$/gm)].map((m) => m[1]);
  assert.deepEqual(jsRoutes, ['npx', 'plugin', 'git'], 'INSTALL_ROUTES drifted from the form');
});
