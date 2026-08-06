/**
 * WebMCP tools for webmcpify.at itself — the site practices what it preaches.
 * Registered via the vendored webmcpify runtime; no-op in browsers without WebMCP.
 */
import { createToolScope } from './webmcpify.js';
import { TOOLS } from './tools.js';

// The WebMCP surface may be injected after page load (extension content scripts,
// origin-trial timing). Retry until it appears instead of probing once and giving up.
const surface = () => document.modelContext ?? navigator.modelContext;
let attempts = 0;
const tryRegister = () => {
  if (surface()) { createToolScope('webmcpify-site', TOOLS); return; }
  if (++attempts < 40) setTimeout(tryRegister, 500);
};
tryRegister();
