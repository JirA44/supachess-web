const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('TOURNAMENT_SIMULATOR.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('renderParticipants();', '') + '\nglobalThis.model = { ALL_ENGINES, makeRandom, simulateGame, getConfiguredElo };';
const context = {}; vm.runInNewContext(script, context);

test('historic and lite profiles are selectable and clearly marked as simulated', () => {
  const ids = context.model.ALL_ENGINES.map(p => p.id);
  for (const id of ['carlsen','kasparov','sf16','sf17','sf18','sf19']) assert.ok(ids.includes(id));
  for (const p of context.model.ALL_ENGINES.filter(p => ['carlsen','kasparov','sf16','sf17','sf18','sf19'].includes(p.id))) assert.match(p.kind, /historique|simulé/);
  assert.match(html, /Aucun moteur d’échecs ne calcule de coups/);
});

test('same seed reproduces the same simulated match results', () => {
  const a=context.model.ALL_ENGINES[1], b=context.model.ALL_ENGINES[3];
  const run=()=>{const random=context.model.makeRandom(120);return Array.from({length:20},()=>context.model.simulateGame(a,b,random));};
  assert.deepEqual(run(),run());
});

test('configured SupaEngine level is used while other profile ratings stay fixed', () => {
  context.document = { getElementById: id => ({ value: id === 'cfg-level' ? '3150' : '' }) };
  assert.equal(context.model.getConfiguredElo(context.model.ALL_ENGINES.find(p => p.id === 'supa')), 3150);
  assert.equal(context.model.getConfiguredElo(context.model.ALL_ENGINES.find(p => p.id === 'carlsen')), 2830);
});
