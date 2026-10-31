import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'site-search-index.json'), 'utf8'));
assert.equal(index.version, '20261031');
assert.ok(Array.isArray(index.entries) && index.entries.length >= 200);
const counts = index.entries.reduce((out, item) => (out[item.type] = (out[item.type] || 0) + 1, out), {});
assert.ok(counts.Page >= 100);
assert.ok(counts['Partie PGN'] >= 15);
assert.ok(counts['Leçon'] >= 30);
assert.ok(counts['Exercice tactique'] >= 35);
assert.ok(counts['Exercice de finale'] >= 10);
for (const entry of index.entries) {
  assert.ok(entry.title && entry.text, 'every indexed result has a title and searchable text');
  assert.ok(['supachess', 'supachess-web'].includes(entry.repo), 'only published site repositories are indexed');
  assert.ok(!entry.path.startsWith('/') && !entry.path.includes('..'), 'result paths stay inside published routes');
}
assert.ok(index.entries.some(entry => entry.title === 'Couper le roi avec la tour' && entry.path.includes('lesson=capablanca-rook-king')));
assert.ok(index.entries.some(entry => entry.title === 'Position Philidor' && entry.path.includes('endgame=philidor')));
assert.ok(index.entries.some(entry => entry.title.includes('Fourchette de cavalier') && entry.path.includes('puzzle=knight-fork-A')));
console.log('Site search index checks passed:', index.entries.length, 'searchable entries');
