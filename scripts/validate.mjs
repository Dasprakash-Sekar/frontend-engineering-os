#!/usr/bin/env node
// FEOS repository validator. Zero dependencies. Run: node scripts/validate.mjs [--git]
// Exits 1 on any error. Warnings do not fail the run.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, 'plugins', 'feos', 'skills');

const PRINCIPLES = 'frontend-engineering-principles';
const WORKFLOWS = [
  'project-architect',
  'build-frontend-app',
  'develop-frontend-feature',
  'migrate-frontend-app',
  'audit-frontend-quality',
];
const REFERENCES = [
  'react-internals',
  'frontend-architecture',
  'frontend-state-architecture',
  'frontend-resilience',
  'frontend-performance-engineering',
  'frontend-security-audit',
  'frontend-testing-strategy',
  'frontend-production-readiness',
];
const ALL = [PRINCIPLES, ...WORKFLOWS, ...REFERENCES];

// Frontmatter fields documented for Claude Code skills.
const ALLOWED_FIELDS = new Set([
  'name', 'description', 'when_to_use', 'argument-hint', 'arguments',
  'disable-model-invocation', 'user-invocable', 'allowed-tools', 'disallowed-tools',
  'model', 'effort', 'context', 'agent', 'background', 'hooks', 'paths', 'shell',
  'metadata', 'license', 'compatibility',
]);
const MAX_DESCRIPTION = 1024; // Agent Skills limit; stricter than Claude Code's 1,536 listing cap
const MAX_LINES = 500;
const REFERENCE_SECTIONS = [
  '## 1. Scope and boundaries', '## 2. When to consult', '## 3. Mental model',
  '## 4. Decision criteria', '## 5. Scenarios', '## 6. Anti-patterns',
  '## 7. Version checks', '## 8. Validation',
];

const errors = [];
const warnings = [];
const passed = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const read = (p) => readFileSync(p, 'utf8');

function parseFrontmatter(text, file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) { err(`${file}: missing frontmatter block`); return null; }
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const kv = /^([A-Za-z_-]+):\s?(.*)$/.exec(line);
    if (!kv) { err(`${file}: frontmatter line is not "key: value" -> ${line.slice(0, 60)}`); continue; }
    fields[kv[1]] = kv[2].trim();
  }
  return { fields, body: text.slice(m[0].length) };
}

// ---- 1. Skill folders and metadata -------------------------------------------------
const skills = {};
if (!existsSync(SKILLS_DIR)) {
  err('plugins/feos/skills does not exist');
} else {
  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) { err(`plugins/feos/skills/${e.name}: only skill folders belong here`); continue; }
    if (!ALL.includes(e.name)) err(`plugins/feos/skills/${e.name}: folder is not a known FEOS skill`);
  }
  for (const name of ALL) {
    const file = join(SKILLS_DIR, name, 'SKILL.md');
    if (!existsSync(file)) { err(`${name}: SKILL.md is missing`); continue; }
    const text = read(file);
    const fm = parseFrontmatter(text, rel(file));
    if (!fm) continue;
    const { fields, body } = fm;
    for (const k of Object.keys(fields)) {
      if (!ALLOWED_FIELDS.has(k)) err(`${name}: unsupported frontmatter field "${k}"`);
    }
    if (fields.name !== name) err(`${name}: frontmatter name "${fields.name}" does not match the folder`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) err(`${name}: name must be kebab-case, at most 64 characters`);
    const d = fields.description || '';
    if (!d) err(`${name}: description is missing`);
    if (d.length > MAX_DESCRIPTION) err(`${name}: description is ${d.length} characters (max ${MAX_DESCRIPTION})`);
    const lines = text.split(/\r?\n/).length;
    if (lines > MAX_LINES) err(`${name}: ${lines} lines (max ${MAX_LINES})`);
    if (/\r\n/.test(text)) warn(`${name}: file uses CRLF line endings`);
    skills[name] = { fields, body, lines, descLen: d.length };
  }
  if (Object.keys(skills).length === ALL.length) passed.push(`${ALL.length} skill folders present with valid metadata (5 workflows, 8 references, 1 principles)`);
}

// ---- 2. Structure rules --------------------------------------------------------------
for (const name of REFERENCES) {
  const s = skills[name]; if (!s) continue;
  for (const h of REFERENCE_SECTIONS) if (!s.body.includes(h)) err(`${name}: missing section "${h}"`);
}
if (skills[PRINCIPLES] && skills[PRINCIPLES].fields['user-invocable'] !== 'false') {
  err(`${PRINCIPLES}: must set "user-invocable: false"`);
}
for (const name of [...WORKFLOWS, ...REFERENCES]) {
  const s = skills[name]; if (!s) continue;
  if (!s.body.includes(`Load the \`${PRINCIPLES}\` skill`)) err(`${name}: does not load the principles skill`);
  if (!s.fields['argument-hint']) warn(`${name}: no argument-hint`);
}

// ---- 3. Dependency graph: workflows -> references -> principles ------------------------
const LOAD = /[Ll]oad the `([a-z0-9-]+)` skill/g;
const graph = {};
for (const [name, s] of Object.entries(skills)) {
  graph[name] = new Set();
  for (const m of s.body.matchAll(LOAD)) {
    const target = m[1];
    if (!ALL.includes(target)) { err(`${name}: loads unknown skill "${target}"`); continue; }
    if (target !== name) graph[name].add(target);
  }
  // Any backticked token that looks like a FEOS skill name must exist.
  for (const m of s.body.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`/g)) {
    const t = m[1];
    if ((t.startsWith('frontend-') || t.endsWith('-frontend-app') || t.endsWith('-frontend-feature')) && !ALL.includes(t)) {
      err(`${name}: refers to "${t}", which is not a FEOS skill`);
    }
  }
}
for (const name of REFERENCES) {
  for (const t of graph[name] || []) if (t !== PRINCIPLES) err(`${name}: a reference must not load "${t}" (references load only the principles)`);
}
for (const t of graph[PRINCIPLES] || []) err(`${PRINCIPLES}: must not load "${t}"`);
for (const name of WORKFLOWS) {
  for (const t of graph[name] || []) if (WORKFLOWS.includes(t)) err(`${name}: a workflow must not load workflow "${t}" (hand off instead)`);
}
const state = {};
const cycle = (n, path) => {
  if (state[n] === 2) return;
  if (state[n] === 1) { err(`circular skill dependency: ${[...path, n].join(' -> ')}`); return; }
  state[n] = 1;
  for (const t of graph[n] || []) cycle(t, [...path, n]);
  state[n] = 2;
};
Object.keys(graph).forEach((n) => cycle(n, []));
if (!errors.some((e) => /load|circular|refers to/.test(e))) passed.push('dependency graph is one-directional with no cycles; every referenced skill exists');

// ---- 4. Manifests --------------------------------------------------------------------
let pluginVersion = null;
try {
  const plugin = JSON.parse(read(join(ROOT, 'plugins', 'feos', '.claude-plugin', 'plugin.json')));
  const market = JSON.parse(read(join(ROOT, '.claude-plugin', 'marketplace.json')));
  pluginVersion = plugin.version;
  if (plugin.name !== 'feos') err('plugin.json: name must be "feos"');
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(plugin.version || '')) err('plugin.json: version must be semantic (x.y.z)');
  if (plugin.license !== 'MIT') err('plugin.json: license must be MIT');
  const entry = (market.plugins || []).find((p) => p.name === plugin.name);
  if (!entry) err('marketplace.json: no entry whose name matches plugin.json');
  else if (entry.source !== './plugins/feos') err('marketplace.json: entry source must be "./plugins/feos"');
  if (entry && entry.version && entry.version !== plugin.version) err('marketplace.json: entry version differs from plugin.json');
  if (!market.owner || !market.owner.name) err('marketplace.json: owner.name is required');
  passed.push(`manifests are consistent (plugin feos ${plugin.version})`);
} catch (e) {
  err(`manifest could not be read or parsed: ${e.message}`);
}

// ---- 5. Documentation matches implementation ---------------------------------------------
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(ROOT);
const readme = join(ROOT, 'README.md');
if (existsSync(readme)) {
  const t = read(readme);
  for (const n of [...WORKFLOWS, ...REFERENCES]) if (!t.includes(`\`${n}\``)) err(`README.md: skill "${n}" is not listed`);
} else warn('README.md does not exist yet');
const changelog = join(ROOT, 'CHANGELOG.md');
if (existsSync(changelog) && pluginVersion && !read(changelog).includes(`[${pluginVersion}]`)) {
  err(`CHANGELOG.md: no entry for version ${pluginVersion}`);
}
for (const req of ['LICENSE', 'CONTRIBUTING.md', 'CHANGELOG.md', 'SECURITY.md', '.gitignore']) {
  if (!existsSync(join(ROOT, req))) warn(`${req} does not exist yet`);
}
let linkCount = 0;
for (const f of files.filter((p) => p.endsWith('.md'))) {
  const text = read(f).replace(/```[\s\S]*?```/g, '');
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    linkCount++;
    const path = resolve(dirname(f), decodeURIComponent(target.split('#')[0]));
    if (!existsSync(path)) err(`${rel(f)}: broken relative link -> ${target}`);
  }
}
if (!errors.some((e) => /README|CHANGELOG|broken relative link/.test(e))) passed.push(`documentation lists every skill; ${linkCount} relative links resolve`);

// ---- 6. Private information and secrets ------------------------------------------------------
// Patterns are assembled so this file does not match itself.
const bs = '\\\\';
const PRIVATE = [
  [new RegExp(`[A-Za-z]:${bs}(Users|Documents and Settings)${bs}`, 'i'), 'Windows user path'],
  [new RegExp('/(Users|home)/' + '[A-Za-z0-9._-]+/'), 'home directory path'],
  [/(?<![A-Za-z0-9._%+-])(?!noreply@anthropic\.com)[A-Za-z0-9._%+-]+@(?!users\.noreply\.github\.com)(?!example\.(com|org|net))[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'email address'],
  [new RegExp('gh[pousr]_' + '[A-Za-z0-9]{30,}'), 'GitHub token'],
  [new RegExp('AK' + 'IA[0-9A-Z]{16}'), 'AWS access key'],
  [new RegExp('sk-' + '[A-Za-z0-9_-]{24,}'), 'API secret key'],
  [new RegExp('-----BEGIN [A-Z ]*PRIVATE ' + 'KEY-----'), 'private key'],
  [new RegExp('xox[baprs]-' + '[A-Za-z0-9-]{10,}'), 'Slack token'],
];
// Optional, git-ignored list of extra terms a maintainer never wants published.
const termsFile = join(ROOT, '.private-terms');
const extraTerms = existsSync(termsFile)
  ? read(termsFile).split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
  : [];
const TEXT = /\.(md|mjs|js|json|ya?ml|txt|gitignore|gitattributes)$|^(LICENSE|\.gitignore|\.gitattributes)$/;
// In commit messages, attribution trailers legitimately carry a contributor's own email.
const TRAILER = /^\s*(co-authored-by|signed-off-by|reviewed-by|reported-by|helped-by):/i;
const scanText = (label, text, { allowTrailerEmails = false } = {}) => {
  let hits = 0;
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [re, what] of PRIVATE) {
      if (allowTrailerEmails && what === 'email address' && TRAILER.test(line)) continue;
      if (re.test(line)) { err(`${label}:${i + 1}: ${what}`); hits++; }
    }
    for (const term of extraTerms) if (line.toLowerCase().includes(term.toLowerCase())) { err(`${label}:${i + 1}: private term`); hits++; }
  });
  return hits;
};
let scanned = 0;
for (const f of files) {
  const name = f.split(sep).pop();
  if (name === '.private-terms' || !TEXT.test(name)) continue;
  if (statSync(f).size > 2_000_000) { warn(`${rel(f)}: large file skipped by scan`); continue; }
  scanned++;
  scanText(rel(f), read(f));
}
if (!errors.some((e) => /path|email|token|key|private term/i.test(e))) {
  passed.push(`no private paths, emails or secrets in ${scanned} files${extraTerms.length ? ` (plus ${extraTerms.length} local private terms)` : ''}`);
}

// ---- 7. Git history (optional: --git) ------------------------------------------------------
if (process.argv.includes('--git')) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try {
    // Identities. A contributor's own name and email on their commits is their choice, so a
    // non-noreply address is reported as a warning for the maintainer to recognize, not an error.
    // An identity that matches a local private term (for example the maintainer's work identity)
    // is an error: that is the leak this check exists to catch.
    const ids = git('log', '--all', '--format=%an <%ae>|%cn <%ce>').split('\n').filter(Boolean);
    const NOREPLY = /<[^>]*@users\.noreply\.github\.com>$|<noreply@github\.com>$/;
    const people = [...new Set(ids.flatMap((l) => l.split('|').map((p) => p.trim())))];
    for (const who of people) {
      const term = extraTerms.find((t) => who.toLowerCase().includes(t.toLowerCase()));
      if (term) err(`git history: commit identity matches a private term -> ${who}`);
      else if (!NOREPLY.test(who)) warn(`git history: commit identity with a public email (confirm it is an outside contributor) -> ${who}`);
    }
    if (!extraTerms.length) warn('git history: no .private-terms file, so commit identities were not checked against private terms');
    const blobs = git('rev-list', '--all', '--objects').split('\n').filter((l) => l.includes(' '));
    let n = 0;
    for (const l of blobs) {
      const [sha, ...rest] = l.split(' ');
      const path = rest.join(' ');
      if (!TEXT.test(path.split('/').pop()) || path === '.private-terms') continue;
      if (git('cat-file', '-t', sha).trim() !== 'blob') continue;
      n++;
      scanText(`history:${path}@${sha.slice(0, 7)}`, git('cat-file', '-p', sha));
    }
    scanText('history:commit messages', git('log', '--all', '--format=%B'), { allowTrailerEmails: true });
    if (git('remote').trim()) warn(`git: remotes are configured (${git('remote').trim().split('\n').join(', ')})`);
    if (!errors.some((e) => e.startsWith('git history') || e.startsWith('history:'))) {
      passed.push(`git history clean: ${ids.length} commits, ${people.length} identities, none matching a private term; ${n} historical blobs and all commit messages scanned`);
    }
  } catch (e) {
    err(`git history check failed: ${e.message.split('\n')[0]}`);
  }
}

// ---- Report -----------------------------------------------------------------------------------
console.log('FEOS validation\n');
for (const [n, s] of Object.entries(skills)) console.log(`  ${n.padEnd(34)} ${String(s.lines).padStart(3)} lines  description ${String(s.descLen).padStart(4)} chars`);
console.log('');
passed.forEach((p) => console.log(`PASS  ${p}`));
warnings.forEach((w) => console.log(`WARN  ${w}`));
errors.forEach((e) => console.log(`FAIL  ${e}`));
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
