const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.wrangler', 'coverage', 'dist', 'build']);
const EXTERNAL_SCHEMES = /^(?:https?:|mailto:|tel:|javascript:|data:|blob:|about:|file:)/i;

function walk(dir, predicate) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...walk(path.join(dir, entry.name), predicate));
    } else if (entry.isFile() && predicate(entry.name)) found.push(path.join(dir, entry.name));
  }
  return found;
}
function decodeEntities(value) {
  return value.replace(/&amp;/gi, '&').replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal))).replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}
function refsFromCss(content, file) {
  return [...content.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)].map(([, value]) => ({ file, value: decodeEntities(value), kind: 'css-url' }));
}
function refsFromHtml(content, file) {
  const refs = [];
  const withoutScripts = content.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const attr = /\b(href|src|poster|action|srcset|style)\s*=\s*(["'])(.*?)\2/gis;
  for (const [, name, , raw] of withoutScripts.matchAll(attr)) {
    const value = decodeEntities(raw.trim());
    if (name.toLowerCase() === 'srcset') {
      for (const item of value.split(',')) refs.push({ file, value: item.trim().split(/\s+/)[0], kind: 'srcset' });
    } else if (name.toLowerCase() === 'style') refs.push(...refsFromCss(value, file));
    else refs.push({ file, value, kind: name.toLowerCase() });
  }
  for (const [, style] of content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) refs.push(...refsFromCss(style, file));
  for (const [, target] of content.matchAll(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/gi)) refs.push({ file, value: target, kind: 'script-navigation' });
  for (const [, target] of content.matchAll(/window\.open\(\s*["']([^"']+)["']/gi)) refs.push({ file, value: target, kind: 'script-navigation' });
  return refs;
}
function definedAnchors(file) {
  const content = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const [, , value] of content.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)) names.add(decodeEntities(value));
  return names;
}
function redirectMap() {
  const file = path.join(ROOT, '_redirects');
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const [from, to] = line.trim().split(/\s+/);
    if (from && to && !from.startsWith('#')) map.set(from, to);
  }
  return map;
}
function resolveLocal(fromFile, raw, map) {
  const value = raw.trim();
  if (!value || EXTERNAL_SCHEMES.test(value) || value.startsWith('//') || value.startsWith('#') || /\$\{|\{\{|\}\}/.test(value)) return null;
  const sourceUrl = '/' + path.relative(ROOT, fromFile).split(path.sep).join('/');
  const parsed = new URL(value, `http://supa.local${sourceUrl}`);
  let targetPath = decodeURIComponent(parsed.pathname);
  if (map.has(targetPath)) targetPath = map.get(targetPath);
  const target = path.resolve(ROOT, '.' + targetPath);
  if (!target.startsWith(ROOT + path.sep) && target !== ROOT) return { target, fragment: parsed.hash.slice(1), invalid: true };
  let resolvedTarget = target;
  if (fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory()) resolvedTarget = path.join(resolvedTarget, 'index.html');
  if (!fs.existsSync(resolvedTarget) && !path.extname(resolvedTarget) && fs.existsSync(resolvedTarget + '.html')) resolvedTarget += '.html';
  return { target: resolvedTarget, fragment: decodeURIComponent(parsed.hash.slice(1)), invalid: false };
}

const htmlFiles = walk(ROOT, (name) => /\.html?$/i.test(name));
const refs = htmlFiles.flatMap((file) => refsFromHtml(fs.readFileSync(file, 'utf8'), file));
for (const file of walk(ROOT, (name) => /\.css$/i.test(name))) refs.push(...refsFromCss(fs.readFileSync(file, 'utf8'), file));
const routes = redirectMap();
const issues = [];
const checked = new Set();
for (const ref of refs) {
  const resolved = resolveLocal(ref.file, ref.value, routes);
  if (!resolved) continue;
  const key = `${ref.file}:${ref.kind}:${ref.value}`;
  if (checked.has(key)) continue;
  checked.add(key);
  if (resolved.invalid || !fs.existsSync(resolved.target)) {
    issues.push(`${path.relative(ROOT, ref.file)} [${ref.kind}] -> ${ref.value}`);
  } else if (resolved.fragment && /\.html?$/i.test(resolved.target) && !definedAnchors(resolved.target).has(resolved.fragment)) {
    issues.push(`${path.relative(ROOT, ref.file)} [fragment] -> ${ref.value}`);
  }
}

test('all repository HTML pages and local assets have resolvable links', () => {
  assert.ok(htmlFiles.length >= 90, `expected the recursive audit to include the large site, got ${htmlFiles.length} HTML pages`);
  assert.deepEqual(issues, [], `Unresolved local references (${checked.size} checked across ${htmlFiles.length} HTML files):\n${issues.join('\n')}`);
});
