/**
 * Tool contracts for webmcpify.at — pure data, no side effects on import.
 * Split from the registration entry point so tests can compare these contracts
 * against the published .well-known/webmcp.json manifest.
 */

const INSTALL_ROUTES = {
  npx: [
    '$ npx skills add TueJon/webmcpify   # any agent: Claude Code, Codex, Cursor, opencode, …',
    '$ claude',
    '> /webmcpify',
  ].join('\n'),
  plugin: [
    '# in Claude Code',
    '> /plugin marketplace add TueJon/webmcpify',
    '> /plugin install webmcpify@webmcpify',
    '> /webmcpify',
  ].join('\n'),
  git: [
    '$ git clone https://github.com/TueJon/webmcpify ~/.claude/skills/webmcpify',
    '$ claude',
    '> /webmcpify',
  ].join('\n'),
};

const PHASES = [
  ['DETECT', 'identifies stack, build commands, auth model, and how the app starts locally'],
  ['INVENTORY', 'maps every user action and drafts one candidate tool per action; zero code changes'],
  ['GATE', 'the human approves or rejects every tool; server mutations need individual sign-off'],
  ['INTEGRATE', 'registers approved tools via document.modelContext, feature-detected, using only code paths the UI already uses'],
  ['VERIFY', 'runs every tool in real Chrome: schema check, valid and invalid calls, resulting UI state'],
  ['HEAL', 'fixes failed tools (implementation only) and re-verifies everything; escalates after three attempts'],
  ['AUDIT', 'maps every diff hunk to an approved tool or recorded setup; the rest gets flagged'],
];

const currentLang = () => (document.documentElement.dataset.lang === 'de' ? 'de' : 'en');

const faqEntries = () =>
  [...document.querySelectorAll('.faq details')].map((d) => {
    const lang = currentLang();
    const q = d.querySelector(`summary [lang="${lang}"]`)?.textContent?.trim() ?? '';
    const a = d.querySelector(`p [lang="${lang}"]`)?.textContent?.trim() ?? '';
    return `Q: ${q}\nA: ${a}`;
  });

const TOOLS = [
  {
    name: 'get_install_command',
    description:
      'Returns the terminal commands to install the webmcpify skill and start the pipeline, for a given install route. Read-only; does not change the page (use show_install_command for that).',
    inputSchema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          enum: ['npx', 'plugin', 'git'],
          description:
            'Install route: npx (skills CLI, works with any agent), plugin (Claude Code plugin marketplace), git (manual clone). Defaults to npx.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: ({ agent } = {}) =>
      `${INSTALL_ROUTES[agent] ?? INSTALL_ROUTES.npx}\n\nThe skill is MIT-licensed and self-contained: https://github.com/TueJon/webmcpify`,
  },
  {
    name: 'get_pipeline_overview',
    description:
      'Returns the seven phases of the webmcpify pipeline (DETECT through AUDIT) with a one-line explanation each. Read-only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => PHASES.map(([n, d], i) => `${i + 1}. ${n} — ${d}`).join('\n'),
  },
  {
    name: 'get_faq',
    description:
      'Returns the FAQ of webmcpify.at (what WebMCP is, code-safety guarantees, security model, supported agents) in the currently selected page language. Read-only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => faqEntries().join('\n\n'),
  },
  {
    name: 'set_language',
    description:
      'Switches the page language between English and German. Client-side only: updates the visible copy and stores the preference in localStorage.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'de'], description: 'Target page language' },
      },
      required: ['language'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: ({ language }) => {
      if (typeof setLang === 'function') setLang(language);
      else {
        document.documentElement.dataset.lang = language;
        document.documentElement.lang = language;
      }
      // A tool call is an explicit request, so persisting is the §165(3) TKG
      // exempt case — page setLang() itself deliberately no longer stores.
      try { localStorage.setItem('wmcp-lang', language); } catch {}
      return `Page language switched to ${language === 'de' ? 'German' : 'English'}.`;
    },
  },
];

export { TOOLS, INSTALL_ROUTES };
