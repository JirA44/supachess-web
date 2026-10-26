import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../shared/profiles.js', import.meta.url), 'utf8');
const saved = {
  'supachess-book-lessons-v1': JSON.stringify({
    'capablanca-rook-king': { completed: true, completedAt: '2026-10-24T10:00:00.000Z' },
    'larsen-center-break': { completed: true, completedAt: '2026-10-25T10:00:00.000Z' },
    'unfinished': { completed: false },
  }),
  'supachess_reviewed_pgns': JSON.stringify([
    { id: 'latest-with-errors', correctionExercises: [
      { classification: 'mistake' },
      { classification: 'inaccuracy' },
      { classification: 'blunder' },
    ] },
    { id: 'older-without-exercises', correctionExercises: [] },
  ]),
};
const sandbox = {
  window: { ChessNovaI18n: { t: (key) => key } },
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

const html = profiles.renderLocalLearningPanel();
assert.match(html, /profile_resume_exercises/);
assert.match(html, /resume-exercises=latest-with-errors/);
assert.match(html, /profile_resume_lessons/);
assert.match(html, /profile_work_on/);
assert.match(html, /profile_lesson_progress/);
console.log('Profile learning progress tests passed');
