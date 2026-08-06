import test from 'node:test';
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS, INSTALL_ROUTES } from '../webmcp/tools.js';
import { buildManifest } from '../build-manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
// Globbed, not listed: a page added later must advertise the manifest too, and a
// hardcoded list would silently exempt it.
const PAGES = globSync('**/*.html', { cwd: root }).map((p) => relative('.', p)).sort();

const manifest = JSON.parse(read('.well-known/webmcp.json'));
const listed = (name) => manifest.tools.find((t) => t.name === name);

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

test('the published manifest is the generated one, byte for byte', () => {
  // Names alone would let a description, schema, enum, or annotation change slip
  // through — so the file must equal what build-manifest.mjs produces right now.
  assert.equal(
    read('.well-known/webmcp.json'),
    buildManifest(),
    'manifest is stale — run `node build-manifest.mjs` and commit the result',
  );
});

test('the manifest lists exactly the tools the page exposes', () => {
  const declarative = [...read('index.html').matchAll(/\btoolname="([a-z0-9_]+)"/g)].map((m) => m[1]);
  assert.ok(TOOLS.length > 0 && declarative.length > 0, 'no tools found to compare');

  assert.deepEqual(
    manifest.tools.map((t) => t.name).sort(),
    [...TOOLS.map((t) => t.name), ...declarative].sort(),
    'manifest and page tools drifted apart',
  );
  for (const tool of TOOLS) {
    const entry = listed(tool.name);
    assert.equal(entry.description, tool.description, `${tool.name}: description drifted`);
    assert.deepEqual(entry.inputSchema, tool.inputSchema, `${tool.name}: inputSchema drifted`);
    assert.deepEqual(entry.annotations, tool.annotations, `${tool.name}: annotations drifted`);
  }
  // The declarative entry has no runtime object — the browser derives it from the
  // form, so it is marked as such and checked against the markup below.
  for (const name of declarative) {
    assert.equal(listed(name).declarative, true, `${name} must be marked declarative`);
  }
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
    // `required` is what makes the browser-derived schema require `agent` —
    // without it the published manifest would promise a stricter contract.
    assert.match(markup, /<select id="install-agent" name="agent" required/, `${page}: select lost id/name/required`);
    assert.match(markup, /toolparamdescription="[^"]{20,}"/, `${page}: select needs a param description`);
    assert.match(markup, /<label for="install-agent">/, `${page}: select has no label`);
    assert.match(markup, /<button class="copy-btn" type="submit"/, `${page}: no submit path`);

    const options = [...markup.matchAll(/<option value="([a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(options, ['npx', 'plugin', 'git'], `${page}: install routes drifted`);
    const entry = listed('show_install_command');
    assert.deepEqual(entry.inputSchema.properties.agent.enum, options, `${page}: manifest enum ≠ form options`);
    assert.deepEqual(entry.inputSchema.required, ['agent'], `${page}: manifest requiredness ≠ the required select`);
    // The form is the source for the declarative tool: an agent reads the
    // tooldescription, a crawler reads the manifest — they must say the same thing.
    assert.equal(
      entry.description,
      markup.match(/(?:^|\s)tooldescription="([^"]*)"/)[1],
      `${page}: manifest description ≠ the form's tooldescription`,
    );
    assert.equal(
      entry.inputSchema.properties.agent.description,
      markup.match(/(?:^|\s)toolparamdescription="([^"]*)"/)[1],
      `${page}: manifest param description ≠ toolparamdescription`,
    );
  }
});

test('every route the schema promises can actually be rendered and returned', () => {
  const routes = ['npx', 'plugin', 'git'];

  const variants = [...read('index.html').matchAll(/^ {4}([a-z]+): \{$/gm)].map((m) => m[1]);
  assert.deepEqual(variants, routes, 'INSTALL_VARIANTS drifted from the form');
  assert.deepEqual(Object.keys(INSTALL_ROUTES), routes, 'INSTALL_ROUTES drifted from the form');

  assert.deepEqual(listed('get_install_command').inputSchema.properties.agent.enum, routes);
  for (const route of routes) {
    assert.match(INSTALL_ROUTES[route], /webmcpify/, `${route}: install text looks empty`);
  }
});

test('the no-script fallback names the routes the picker would otherwise hide', () => {
  for (const page of ['index.html', 'de/index.html']) {
    const html = read(page);
    // Both selectors must stay id-qualified: the noscript block sits before the
    // main stylesheet, so a bare `.alt-routes` loses the cascade and the fallback
    // stays invisible exactly when it is the only thing a visitor has.
    assert.match(
      html,
      /<noscript><style>#install-picker \.cmd-label \{ display: none; \} #install-picker \.alt-routes \{ display: block; \}<\/style><\/noscript>/,
      `${page}: no-script rule missing or not specific enough to win the cascade`,
    );
    const fallback = html.match(/<p class="alt-routes">[\s\S]*?<\/p>/)?.[0] ?? '';
    assert.match(fallback, /plugin marketplace add TueJon\/webmcpify/, `${page}: plugin route missing`);
    assert.match(fallback, /git clone https:\/\/github\.com\/TueJon\/webmcpify/, `${page}: git route missing`);
    for (const lang of ['en', 'de']) {
      assert.match(fallback, new RegExp(`<span lang="${lang}">`), `${page}: fallback not bilingual`);
    }
  }
});
