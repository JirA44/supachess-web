'use strict';

/**
 * Stockfish-inspired learning primitives. Pure functions: no engine, browser or network needed.
 * All centipawn scores MUST be supplied from the same engine/search configuration,
 * in the same side-to-move-independent perspective (white positive).
 */
const SKILLS = Object.freeze({
  missed_threat: 'Anticiper la meilleure réponse adverse',
  candidate_comparison: 'Comparer plusieurs coups candidats',
  calculation_depth: 'Approfondir les variantes critiques',
  tactical_safety: 'Détecter les gaffes et tactiques',
  positional_play: 'Améliorer la coordination des pièces',
  endgame: 'Convertir et défendre les finales'
});

function classifyMove({ beforeCp, afterCp, mover, mateBefore = null, mateAfter = null }) {
  if (!['w', 'b'].includes(mover)) throw new TypeError('mover must be w or b');
  if (![beforeCp, afterCp].every(Number.isFinite)) throw new TypeError('evaluations must be finite centipawn numbers');
  if (mateBefore !== null || mateAfter !== null) return { category: 'review_mate', lossCp: null, note: 'Examiner la ligne de mat séparément : les centipions ne suffisent pas.' };
  const orientation = mover === 'w' ? 1 : -1;
  const lossCp = Math.max(0, Math.round((beforeCp - afterCp) * orientation));
  const category = lossCp >= 250 ? 'blunder' : lossCp >= 120 ? 'mistake' : lossCp >= 50 ? 'inaccuracy' : 'acceptable';
  return { category, lossCp, note: 'Seuils pédagogiques indicatifs, non équivalents aux annotations Stockfish/Chess.com.' };
}

function pickLearningPriorities(observations, count = 3) {
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  return Object.entries(SKILLS).map(([id, title]) => {
    const rows = observations.filter(o => o && o.skill === id && Number.isFinite(o.score) && o.score >= 0 && o.score <= 1);
    const attempts = rows.length;
    const mastery = attempts ? rows.reduce((a, o) => a + o.score, 0) / attempts : null;
    // No data = assessment required, NOT a confirmed weakness.
    const priority = mastery === null ? null : (1 - mastery) * Math.min(1, attempts / 8);
    return { id, title, attempts, mastery, priority, confidence: attempts >= 20 ? 'high' : attempts >= 8 ? 'medium' : 'low' };
  }).sort((a,b) => (b.priority ?? -1) - (a.priority ?? -1)).slice(0, Math.max(0, count));
}

function buildExplanation({ played, candidateMoves, opponentReply, theme }) {
  if (typeof played !== 'string' || !Array.isArray(candidateMoves)) throw new TypeError('invalid move data');
  return {
    played,
    alternatives: candidateMoves.filter(m => m && typeof m.san === 'string').map(m => ({ san: m.san, cp: Number.isFinite(m.cp) ? m.cp : null })),
    opponentReply: typeof opponentReply === 'string' ? opponentReply : null,
    skill: Object.hasOwn(SKILLS, theme) ? theme : 'candidate_comparison',
    caveat: 'Les intentions ne sont pas déduites du moteur : vérifier FEN, légalité et variantes avec un véritable moteur UCI.'
  };
}

module.exports = { SKILLS, classifyMove, pickLearningPriorities, buildExplanation };
