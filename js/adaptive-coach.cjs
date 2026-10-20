'use strict';

/**
 * Coach adaptatif — profil du joueur, parcours personnalisé, révisions espacées.
 * Aucune donnée inventée: tout vient des observations réelles (parties, exercices).
 * Garde-fou: une lacune n'est jamais CONFIRMED sans preuve suffisante.
 */

const {METHODS} = require('./carlsen-methods.cjs');

const MIN_CONFIRMED = 10; // observations par compétence

function buildPlayerProfile(observations) {
  if (!Array.isArray(observations)) throw new TypeError('observations array required');
  const bySkill = {};
  for (const o of observations) {
    if (!o || typeof o.skill !== 'string' || !Number.isFinite(o.score) || o.score < 0 || o.score > 1) continue;
    (bySkill[o.skill] = bySkill[o.skill] || {scores: [], games: new Set()});
    bySkill[o.skill].scores.push(o.score);
    if (o.gameId) bySkill[o.skill].games.add(o.gameId);
  }
  const skills = Object.entries(bySkill).map(([skill, d]) => {
    const mastery = d.scores.reduce((a, b) => a + b, 0) / d.scores.length;
    return {
      skill,
      attempts: d.scores.length,
      mastery: +mastery.toFixed(3),
      trend: d.scores.length >= 4
        ? (d.scores.slice(-3).reduce((a, b) => a + b, 0) / 3 > d.scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3 ? '↗' : '↘')
        : '=',
      evidence: `moyenne sur ${d.scores.length} observations, ${d.games.size} parties distinctes`,
      status: d.scores.length >= MIN_CONFIRMED ? 'CONFIRMED' : 'PRELIMINARY',
    };
  });
  const strengths = skills.filter(s => s.mastery >= 0.7 && s.status === 'CONFIRMED').map(s => s.skill);
  const weaknesses = skills
    .filter(s => s.mastery < 0.5)
    .sort((a, b) => a.mastery - b.mastery)
    .map(s => ({skill: s.skill, mastery: s.mastery, status: s.status, evidence: s.evidence}));
  const errors = observations
    .filter(o => o.errorCode)
    .reduce((acc, o) => { acc[o.errorCode] = (acc[o.errorCode] || 0) + 1; return acc; }, {});
  const topErrors = Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([code, n]) => ({code, count: n, status: n >= MIN_CONFIRMED ? 'CONFIRMED' : 'PRELIMINARY'}));
  return {
    n_observations: observations.length,
    skills,
    strengths,
    weaknesses,
    topErrors,
    diagnosis: `forces: ${strengths.join(', ') || 'à confirmer'} · lacunes prioritaires: ${weaknesses.slice(0, 2).map(w => w.skill).join(', ') || 'aucune détectée'}`,
  };
}

/** Parcours personnalisé: exercices gradués sur les lacunes (méthodes Carlsen + erreurs personnelles). */
function buildTrainingPath(profile, maxSteps = 5) {
  if (!profile || !Array.isArray(profile.weaknesses)) throw new TypeError('profile requis');
  const path = [];
  for (const w of profile.weaknesses.slice(0, maxSteps)) {
    const method = METHODS.find(m => m.id === w.skill) ?? null;
    path.push({
      skill: w.skill,
      status: w.status,
      step1_drill: method ? method.exercise : `exercices ciblés sur les erreurs ${w.skill} issues de vos parties`,
      step2_check: method ? method.verification : 'réussite ≥80% sur 10 positions inédites',
      graduation: 'position calme → position tactique → position de jeu réel',
      evidence: w.evidence,
    });
  }
  if (profile.topErrors.length) {
    path.push({
      skill: 'erreurs_recurrentes',
      status: profile.topErrors[0].status,
      step1_drill: `revoir vos ${profile.topErrors[0].count} occurrences de ${profile.topErrors[0].code} et rejouer l'alternative`,
      step2_check: 'zéro récidive sur les 5 prochaines parties',
      graduation: 'extrait de partie → position rejouée → partie réelle',
      evidence: `erreurs: ${profile.topErrors.map(e => `${e.code}×${e.count}`).join(', ')}`,
    });
  }
  return path.slice(0, maxSteps);
}

/** Révisions espacées (SM-2 simplifié): intervalle selon maîtrise et récidive. */
function spacedRepetitionSchedule(items, todayIso) {
  if (!Array.isArray(items)) throw new TypeError('items requis');
  const today = new Date(todayIso ?? Date.now());
  return items.map(item => {
    const mastery = Number.isFinite(item.mastery) ? item.mastery : 0;
    const lapses = Number.isFinite(item.lapses) ? item.lapses : 0;
    const ease = Math.max(1, Math.min(4, mastery * 4 - lapses * 0.5));
    const intervalDays = mastery >= 0.8 ? Math.round(7 * ease) : mastery >= 0.5 ? 3 : 1;
    const next = new Date(today.getTime() + intervalDays * 86400000);
    return {item: item.id ?? item.skill ?? 'exercice', mastery, lapses, intervalDays,
            nextReview: next.toISOString().slice(0, 10)};
  });
}

function progressDashboard(profile, history) {
  if (!profile || !Array.isArray(history)) throw new TypeError('profil + historique requis');
  const byWeek = {};
  for (const h of history) {
    if (!h || typeof h.week !== 'string' || !Number.isFinite(h.avgScore)) continue;
    byWeek[h.week] = h.avgScore;
  }
  const weeks = Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
  const first = weeks[0]?.[1] ?? null;
  const last = weeks[weeks.length - 1]?.[1] ?? null;
  return {
    skills: profile.skills,
    trend: first !== null && last !== null ? (last > first ? 'en progression' : last < first ? 'en régression' : 'stable') : 'données insuffisantes',
    weekly: weeks.map(([week, avgScore]) => ({week, avgScore})),
    explanation: 'La progression se mesure sur des positions inédites, jamais sur les exercices déjà vus.',
  };
}

module.exports = {buildPlayerProfile, buildTrainingPath, spacedRepetitionSchedule, progressDashboard, MIN_CONFIRMED};
