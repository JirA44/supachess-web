'use strict';
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert');
const enc = require('../js/error-encyclopedia.cjs');
const carlsen = require('../js/carlsen-methods.cjs');
const sf = require('../js/stockfish-methods.cjs');
const coach = require('../js/adaptive-coach.cjs');

test('encyclopédie échecs: 12 erreurs avec cause/conséquences/alternatives/prévention', () => {
  const e = enc.encyclopedia();
  assert.equal(e.length, 12);
  for (const x of e) {
    assert.ok(x.code && x.family && x.definition && x.cause && x.consequences && x.alternatives.length && x.prevention);
  }
});

test('mapping catégorie → code d\'erreur (blunder tactique → HANGING_PIECE)', () => {
  assert.equal(enc.mapCategoryToError('blunder', {tactical: true}), 'HANGING_PIECE');
  assert.equal(enc.mapCategoryToError('blunder', {tactical: false}), 'MIDDLEGAME_PLAN_MISS');
  assert.equal(enc.mapCategoryToError('acceptable'), null);
});

test('méthodes Carlsen: 11 modules, observables vs hypothèses distincts', () => {
  const list = carlsen.listMethods();
  assert.equal(list.length, 11);
  const mod = carlsen.buildTrainingModule('prophylaxis', [{pgn: '1. e4 e5 2. Nf3'}]);
  assert.equal(mod.status, 'observable_dans_les_parties');
  assert.equal(mod.games.length, 1);
  assert.ok(mod.caveat.includes('PAS une preuve'));
  assert.throws(() => carlsen.buildTrainingModule('inconnu'), RangeError);
});

test('méthodes Stockfish: pipeline + mode Pense comme Stockfish', () => {
  assert.equal(sf.listPipeline().length, 8);
  const r = sf.thinkLikeStockfish({
    playerMove: 'Nf3', playerReason: 'développe et menace e5',
    anticipatedReply: 'Nc6',
    engineMultipv: [
      {san: 'Nf3', cp: 30, reply: 'Nc6'},
      {san: 'Bc4', cp: 22, reply: 'Nc6'},
      {san: 'd4', cp: 15, reply: 'exd4'},
    ],
  });
  assert.equal(r.verdict, 'coup identique au top moteur');
  assert.equal(r.anticipatedReplyCorrect, true);
  const r2 = sf.thinkLikeStockfish({playerMove: 'Qh5', playerReason: 'attaque rapide', engineMultipv: [{san: 'Nf3', cp: 30, reply: 'Nc6'}]});
  assert.equal(r2.verdict, 'coup hors candidats moteur');
});

test('diagnostic de calcul: quiescence manquée détectée avec confiance graduée', () => {
  const d = sf.diagnoseCalculation([
    {stoppedInForcing: true, anticipatedReply: false, nCandidates: 2},
    {stoppedInForcing: true, anticipatedReply: false, nCandidates: 4},
    {stoppedInForcing: false, anticipatedReply: true, nCandidates: 5},
    {stoppedInForcing: true, anticipatedReply: false, nCandidates: 2},
  ]);
  assert.ok(d.weaknesses.some(w => w.includes('quiescence')));
  assert.equal(d.confidence, 'low'); // 4 observations
});

test('coach adaptatif: profil avec garde-fou CONFIRMED/PRELIMINARY', () => {
  const obs = [];
  for (let i = 0; i < 8; i++) obs.push({skill: 'candidate_comparison', score: 0.4, gameId: `g${i}`});
  for (let i = 0; i < 4; i++) obs.push({skill: 'endgame', score: 0.85, gameId: `g${i}`});
  obs.push({skill: 'candidate_comparison', score: 0.5, gameId: 'g99', errorCode: 'SHALLOW_CALCULATION'});
  const p = coach.buildPlayerProfile(obs);
  assert.ok(p.weaknesses.some(w => w.skill === 'candidate_comparison' && w.status === 'PRELIMINARY'));
  const path = coach.buildTrainingPath(p);
  assert.ok(path.length >= 1);
  assert.ok(path[0].step1_drill.length > 5);
  const sched = coach.spacedRepetitionSchedule([{id: 'fourchettes', mastery: 0.9, lapses: 0}], '2026-10-20T00:00:00Z');
  assert.equal(sched[0].intervalDays, 25);
  assert.equal(sched[0].nextReview, '2026-11-14');
});

test('dashboard: tendance mesurée sur semaines réelles', () => {
  const p = coach.buildPlayerProfile([{skill: 'endgame', score: 0.6}]);
  const dash = coach.progressDashboard(p, [
    {week: '2026-W40', avgScore: 0.4}, {week: '2026-W41', avgScore: 0.5}, {week: '2026-W42', avgScore: 0.65},
  ]);
  assert.equal(dash.trend, 'en progression');
  assert.equal(dash.weekly.length, 3);
});


test('progression XP sans plafond: niveaux au-delà de 100', () => {
  const source = fs.readFileSync(path.join(__dirname, '../shared/progress.js'), 'utf8');
  const sandbox = { window: { addEventListener() {} } };
  vm.runInNewContext(source, sandbox);
  const progress = sandbox.window.ChessNovaProgress;
  const xpAt102 = progress.getPrestigeXP(102);
  assert.equal(progress.getLevelForXP(xpAt102), 102);
  assert.equal(progress.getLevelForXP(xpAt102 - 1), 101);
  assert.ok(progress.getPrestigeXP(103) > xpAt102);
});
