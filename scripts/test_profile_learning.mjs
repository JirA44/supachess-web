import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../shared/profiles.js', import.meta.url), 'utf8');
const communitySource = await readFile(new URL('../shared/community.js', import.meta.url), 'utf8');
const english = JSON.parse(await readFile(new URL('../shared/translations/en.json', import.meta.url), 'utf8'));
const saved = {
  'supachess-book-lessons-v1': JSON.stringify({
    'capablanca-rook-king': { completed: true, completedAt: '2026-10-24T10:00:00.000Z' },
    'larsen-center-break': { completed: true, completedAt: '2026-10-25T10:00:00.000Z' },
    'unfinished': { completed: false, attempts: 1 },
  }),
  'supachess_reviewed_pgns': JSON.stringify([
    { id: 'latest-with-errors', accuracy: 82, correctionExercises: [
      { classification: 'mistake' },
      { classification: 'inaccuracy' },
      { classification: 'blunder' },
    ] },
    { id: 'older-without-exercises', accuracy: 91, correctionExercises: [] },
  ]),
  'chessnova_progress': JSON.stringify({ xp: 320, level: 3, currentStreak: 2, puzzlesSolved: 6, practice: { sessions: 9 } }),
  'chessnova_training_openings': JSON.stringify({ completed: ['opening-1', 'opening-2'] }),
  'chessnova_training_endgames': JSON.stringify({ completed: ['endgame-1'] }),
  'chessnova_training_tactics': JSON.stringify({ completedCategories: ['fork', 'pin'] }),
};
const sandbox = {
  window: { ChessNovaI18n: { t: (key) => english[key] || key } },
  document: {},
  localStorage: { getItem: (key) => saved[key] ?? null },
};
vm.runInNewContext(source, sandbox, { filename: 'shared/profiles.js' });
const profiles = sandbox.window.SupaProfiles;
const progress = profiles.readLocalLearningProgress();

assert.equal(progress.completed.length, 2);
assert.equal(progress.moveExercises, 3);
assert.equal(progress.latest.id, 'latest-with-errors');
assert.equal(progress.categoryCounts.mistake, 1);
assert.equal(progress.categoryCounts.inaccuracy, 1);
assert.equal(progress.categoryCounts.blunder, 1);

assert.equal(progress.attempted.length, 3);
assert.equal(progress.xp, 320);
assert.equal(progress.level, 3);
assert.equal(progress.openingMastered, 2);
assert.equal(progress.endgameMastered, 1);
assert.equal(progress.tacticMastered, 2);
assert.equal(progress.puzzlesSolved, 6);
assert.equal(progress.practiceSessions, 9);
assert.deepEqual(Array.from(progress.accuracyGames), [82, 91]);

const html = profiles.renderLocalLearningPanel();
assert.match(html, /Resume my exercises/);
assert.match(html, /resume-exercises=latest-with-errors/);
assert.match(html, /Resume my lessons/);
assert.match(html, /Work on in your games/);
assert.match(html, /Lesson progress/);
assert.match(html, /320 XP/);
assert.match(html, /Level 3/);
assert.match(html, /Mastery and progress/);
assert.match(html, /Opening fundamentals completed/);
assert.match(html, /Tactical themes mastered/);
assert.match(html, /Resume mastery training/);
assert.match(html, /Accuracy by recent game/);
assert.ok(html.includes('TRAINING_OPENINGS.html'));
assert.ok(html.includes('book-lessons.html?next=1'));
assert.ok(communitySource.includes('renderOwnProfileFallback(currentUser)'));
assert.ok(communitySource.includes('else window.SupaProfiles.renderOwnProfileFallback(currentUser)'));
assert.ok(!communitySource.includes('catch (function () { togglePlayersPanel(); })'));
console.log('Profile learning progress tests passed');
