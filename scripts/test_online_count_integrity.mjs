import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../CHESSNOVA.html', import.meta.url), 'utf8');
const match = source.match(/async function updateOnlinePlayers\(\)\s*\{[\s\S]*?\r?\n        \}/);
assert.ok(match, 'online counter updater exists');
const elements = Object.fromEntries(['online-players', 'real-players', 'simulated-players', 'visitors-count']
  .map(id => [id, { textContent: '' }]));
const context = {
  API_URL: 'https://example.test',
  document: { getElementById: id => elements[id] },
  console: { warn() {} },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}) })
};
vm.runInNewContext(`${match[0]}\nglobalThis.runUpdate = updateOnlinePlayers;`, context);
await context.runUpdate();
for (const item of Object.values(elements)) assert.equal(item.textContent, '—', 'missing counts stay unavailable');

context.fetch = async () => ({ ok: true, status: 200, json: async () => ({
  online: 0, realPlayers: 0, simulatedPlayers: 2, visitors: 1
}) });
await context.runUpdate();
assert.deepEqual(Object.values(elements).map(item => item.textContent), ['0', '0', '2', '1'],
  'real API zero values are preserved');

context.fetch = async () => { throw new Error('permission denied'); };
await context.runUpdate();
for (const item of Object.values(elements)) assert.equal(item.textContent, '—', 'request errors never invent counts');

context.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
await context.runUpdate();
for (const item of Object.values(elements)) assert.equal(item.textContent, '—', 'HTTP errors never invent counts');

console.log('Online count integrity checks passed.');
