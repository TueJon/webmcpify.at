import test from 'node:test';
import assert from 'node:assert/strict';
import { attributionFromSearch, eventPath, safeStoredAttribution } from '../measurement.js';

test('accepts only exact allowlisted campaign triples', () => {
  assert.equal(attributionFromSearch('?utm_source=hacker-news&utm_medium=referral&utm_campaign=launch-2026'), 'show-hn');
  assert.equal(attributionFromSearch('?utm_source=google&utm_medium=cpc&utm_campaign=webmcpify-search-test&utm_term=webmcp'), 'google-cpc');
});

test('reduces arbitrary campaign input to other', () => {
  assert.equal(attributionFromSearch('?utm_source=%3Cscript%3E&utm_medium=referral&utm_campaign=secret-customer'), 'other');
  assert.equal(attributionFromSearch('?utm_content=anything'), 'other');
  assert.equal(attributionFromSearch(''), 'direct');
});

test('builds only fixed event paths', () => {
  assert.equal(eventPath('install-command-copy', 'show-hn'), '/__measure/install-command-copy/show-hn');
  assert.equal(eventPath('github-outbound', 'direct'), '/__measure/github-outbound/direct');
  assert.equal(eventPath('page-view', 'direct'), null);
  assert.equal(eventPath('github-outbound', '../private'), null);
  assert.equal(safeStoredAttribution('customer-name'), null);
});
