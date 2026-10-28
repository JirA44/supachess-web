/**
 * Verifies the period-statistics logic by extracting the functions from
 * CHESS_COACH.html and running them against a fake progress log.
 * jsdom is used only to provide localStorage/document stubs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, 'CHESS_COACH.html'), 'utf8');

const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
const code = blocks[blocks.length - 1][1];

let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) pass++;
  else failures.push(`${name}: ${detail}`);
}

const DAY = 24 * 3600 * 1000;
const now = Date.now();

// Minimal DOM stubs; these functions only touch these.
// Elements must be cached per id: the page looks them up by id inside
// updatePeriodCharts, so a factory would hand the test a different object.
const elements = new Map();
global.document = {
  getElementById: (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === 'period-select' ? 'month' : '',
        _text: '',
        _html: '',
        set textContent(v) { this._text = v; },
        get textContent() { return this._text; },
        set innerHTML(v) { this._html = v; },
        get innerHTML() { return this._html; },
      });
    }
    return elements.get(id);
  },
  querySelectorAll: () => [],
  querySelector: () => null,
};
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; },
};

const noop = () => {};
const makeChart = (datasetCount) => ({
  data: { labels: [], datasets: Array.from({ length: datasetCount }, () => ({ data: [] })) },
  update: noop,
});
const chartStub = () => makeChart(1);
global.Chart = function () { return chartStub(); };

// Pull out only the pieces under test plus their dependencies.
function extract(startMarker, endMarker) {
  const start = code.indexOf(startMarker);
  if (start === -1) throw new Error(`marker not found: ${startMarker}`);
  const end = endMarker ? code.indexOf(endMarker, start) : code.length;
  return code.slice(start, end === -1 ? code.length : end);
}

const bucketSrc = extract(
  '// Move quality buckets, best first.',
  'function updateProgressFromAnalysis'
);
const periodSrc = extract(
  '// PERIOD STATISTICS',
  'function updateEvalChart'
);

// updateProgressFromAnalysis mutates progress + analyzedMoves + game + saveProgress
const updateSrc = extract('function updateProgressFromAnalysis', 'function updateDashboard');

const sandbox = `
${bucketSrc}
${updateSrc}
var progress = { gameStatsLog: [], weaknesses: {}, gamesAnalyzed: 0, totalAccuracy: 0, accuracyHistory: [], estimatedElo: 0 };
var analyzedMoves = [];
var game = { header: () => ({ White: 'W', Black: 'B', Result: '1-0' }) };
function saveProgress() {}
function updateDashboard() {}
function setMoves(moves) { analyzedMoves = moves; }
// Chart instances are page-level singletons; the sandbox has to declare them
// or updatePeriodCharts cannot resolve the identifier.
var accuracyTrendChart = null;
var moveQualityChart = null;
function setCharts(t, q) { accuracyTrendChart = t; moveQualityChart = q; }
${periodSrc}
return { progress, updateProgressFromAnalysis, periodGames, updatePeriodCharts, MOVE_QUALITY_BUCKETS, STAT_PERIODS, setMoves, setCharts };
`;

const api = new Function(sandbox)();
const setMoves = (moves) => api.setMoves(moves);

// ── Record shape ──────────────────────────────────────────────
{
  api.progress.gameStatsLog.length = 0;
  setMoves([
    { classification: { type: 'brilliant', category: 'tactics' } },
    { classification: { type: 'excellent', category: 'tactics' } },
    { classification: { type: 'excellent', category: 'opening' } },
    { classification: { type: 'blunder', category: 'hanging' } },
    { classification: { type: 'mistake', category: 'endgame' } },
    { classification: { type: 'inaccuracy', category: 'tactics' } },
    { classification: { type: 'good', category: 'tactics' } }
  ]);
  api.updateProgressFromAnalysis(80, 60, 3);

  const log = api.progress.gameStatsLog;
  check('one record per analysis', log.length === 1, `len=${log.length}`);
  const rec = log[0];
  check('record is dated', typeof rec.at === 'number' && Math.abs(rec.at - now) < 5000, String(rec.at));
  check('record keeps both accuracies', rec.whiteAcc === 80 && rec.blackAcc === 60, JSON.stringify(rec));
  check('record keeps move count', rec.moves === 7, String(rec.moves));
  check('record counts brilliant', rec.counts.brilliant === 1, String(rec.counts.brilliant));
  check('record counts excellent x2', rec.counts.excellent === 2, String(rec.counts.excellent));
  check('record counts blunder', rec.counts.blunder === 1, String(rec.counts.blunder));
  check('record counts mistake', rec.counts.mistake === 1, String(rec.counts.mistake));
  check('record counts inaccuracy', rec.counts.inaccuracy === 1, String(rec.counts.inaccuracy));
  check('record counts good', rec.counts.good === 1, String(rec.counts.good));
  check('record counts best=0', rec.counts.best === 0, String(rec.counts.best));
  // weaknesses counts only real errors (inaccuracy/mistake/blunder), not
  // brilliant/excellent/good — that behaviour predates this change.
  check('weaknesses only count errors',
    api.progress.weaknesses.tactics === 1
    && api.progress.weaknesses.hanging === 1
    && api.progress.weaknesses.endgame === 1,
    JSON.stringify(api.progress.weaknesses));
}

// ── Period filtering ──────────────────────────────────────────
{
  api.progress.gameStatsLog = [
    { at: now - 1 * DAY,  counts: {}, avgAcc: 90 },
    { at: now - 6 * DAY,  counts: {}, avgAcc: 85 },
    { at: now - 20 * DAY, counts: {}, avgAcc: 80 },
    { at: now - 200 * DAY, counts: {}, avgAcc: 70 },
  ];
  const week = api.periodGames('week');
  const month = api.periodGames('month');
  const year = api.periodGames('year');
  const all = api.periodGames('all');

  check('week = 2 games', week.length === 2, `len=${week.length}`);
  check('month = 3 games', month.length === 3, `len=${month.length}`);
  check('year = 4 games', year.length === 4, `len=${year.length}`);
  check('all = 4 games', all.length === 4, `len=${all.length}`);
}

// ── Symbol columns ────────────────────────────────────────────
{
  const symbols = api.MOVE_QUALITY_BUCKETS.map(b => b.symbol);
  check('symbols match report table',
    JSON.stringify(symbols) === JSON.stringify(['!!', '!', '!', 'ok', '?!', '?', '??']),
    JSON.stringify(symbols));
}

// ── Chart rendering does not throw ────────────────────────────
{
  api.progress.gameStatsLog = [
    { at: now - 1 * DAY, whiteAcc: 88, blackAcc: 72, counts: { brilliant: 2, excellent: 5, blunder: 1 } },
    { at: now - 3 * DAY, whiteAcc: 75, blackAcc: 81, counts: { mistake: 2, good: 4 } },
  ];
  const trendChart = makeChart(2);   // Blancs + Noirs
  const qualityChart = makeChart(1);
  api.setCharts(trendChart, qualityChart);

  let threw = null;
  try { api.updatePeriodCharts(); } catch (e) { threw = e.message; }
  check('updatePeriodCharts runs', threw === null, String(threw));

  const countEl = document.getElementById('period-games-count');
  check('game count rendered', countEl.textContent === 2, String(countEl.textContent));

  // Ordered oldest-first: the 3-day game (75/81) then yesterday (88/72).
  check('trend chart both series, oldest first',
    trendChart.data.datasets.length === 2
    && JSON.stringify(trendChart.data.datasets[0].data) === '[75,88]'
    && JSON.stringify(trendChart.data.datasets[1].data) === '[81,72]',
    JSON.stringify(trendChart.data.datasets));

  check('quality chart got one row per bucket',
    qualityChart.data.datasets[0].data.length === 7,
    JSON.stringify(qualityChart.data.datasets[0].data));

  check('quality chart totals blunder in the ?? slot',
    qualityChart.data.datasets[0].data[6] === 1,
    JSON.stringify(qualityChart.data.datasets[0].data));

  check('quality chart totals mistake in the ? slot',
    qualityChart.data.datasets[0].data[5] === 2,
    JSON.stringify(qualityChart.data.datasets[0].data));

  const tbody = document.getElementById('period-quality-tbody');
  check('symbol table rendered', String(tbody.innerHTML).includes('??'), 'missing ?? row');
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('  FAIL ' + f);
  process.exit(1);
}