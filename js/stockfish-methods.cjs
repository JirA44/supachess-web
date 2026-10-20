'use strict';

/**
 * Méthodes Stockfish — pédagogie du moteur (recherche, MultiPV, quiescence…)
 * + mode interactif « Pense comme Stockfish ».
 * Aucun moteur UCI n'est embarqué: les évaluations cp/multipv sont fournis par l'appelant
 * (moteur externe) et ce module les met en forme, compare et diagnostique.
 */

const PIPELINE = [
  {id: 'candidate_moves', title: 'Génération des coups candidats', note: 'toujours lister 3+ candidats AVANT de calculer'},
  {id: 'iterative_deepening', title: 'Approfondissement itératif', note: 'calculer d\'abord 2 demi-coups, puis étendre les lignes prometteuses'},
  {id: 'opponent_best_reply', title: 'Meilleure réponse adverse', note: 'chaque candidat n\'existe qu\'après sa MEILLEURE réponse adverse'},
  {id: 'quiescence', title: 'Recherche de quiescence', note: 'ne jamais évaluer au milieu des prises/échecs — finir la séquence forcée'},
  {id: 'alphabeta_pruning', title: 'Alpha-bêta et élagage', note: 'élaguer = couper les lignes déjà pires que la meilleure connue'},
  {id: 'multipv', title: 'Comparaison MultiPV', note: 'comparer plusieurs bons coups, pas seulement le meilleur'},
  {id: 'critical_positions', title: 'Positions critiques', note: 'allouer plus de temps aux positions tactiques'},
  {id: 'engine_limits', title: 'Limites de l\'évaluation', note: 'NNUE évalue; elle ne démontre pas — expliquer avec des raisons humaines'},
];

function listPipeline() {
  return PIPELINE.map(({id, title, note}) => ({id, title, note}));
}

/**
 * Mode « Pense comme Stockfish »:
 * 1) le joueur propose son coup + raison + réponse adverse anticipée
 * 2) l'app fournit les candidats moteur (MultiPV, cp) déjà calculés
 * 3) on compare: coup du joueur vs top moteur, écart cp, réfutations
 */
function thinkLikeStockfish({playerMove, playerReason, anticipatedReply, engineMultipv}) {
  if (typeof playerMove !== 'string' || !playerMove) throw new TypeError('coup du joueur requis (SAN)');
  if (typeof playerReason !== 'string' || playerReason.length < 3) throw new TypeError('raison requise (≥3 caractères)');
  if (!Array.isArray(engineMultipv) || !engineMultipv.length) throw new TypeError('multipv moteur requis');
  const top = engineMultipv[0];
  const played = engineMultipv.find(m => m.san === playerMove) ?? null;
  const gapCp = (Number.isFinite(top.cp) && played && Number.isFinite(played.cp)) ? top.cp - played.cp : null;
  return {
    playerMove, playerReason,
    anticipatedReply: anticipatedReply ?? null,
    engineTop: top,
    playedInTop: !!played,
    gapCp,
    verdict: !played ? 'coup hors candidats moteur'
      : gapCp === 0 ? 'coup identique au top moteur'
      : gapCp <= 30 ? 'coup jouable (écart minime)'
      : gapCp <= 120 ? 'coup inférieur (imprécision)'
      : 'coup nettement inférieur (à revoir)',
    anticipatedReplyCorrect: played && top.reply ? (top.reply === anticipatedReply) : null,
    caveat: 'comparaison pédagogique; la légalité et la validité relèvent du moteur UCI réel.',
  };
}

/** Diagnostic de calcul: où le joueur s'arrête trop tôt ? (observations = positions analysées) */
function diagnoseCalculation(observations) {
  if (!Array.isArray(observations)) throw new TypeError('observations requises');
  const stats = {
    quiescence_missed: observations.filter(o => o.stoppedInForcing === true).length,
    best_reply_missed: observations.filter(o => o.anticipatedReply === false).length,
    candidate_few: observations.filter(o => Number.isFinite(o.nCandidates) && o.nCandidates < 3).length,
    total: observations.length,
  };
  const weaknesses = [];
  if (stats.quiescence_missed / Math.max(1, stats.total) > 0.3) weaknesses.push('quiescence: arrêt en pleine séquence de prises/échecs');
  if (stats.best_reply_missed / Math.max(1, stats.total) > 0.3) weaknesses.push('meilleure réponse adverse non anticipée');
  if (stats.candidate_few / Math.max(1, stats.total) > 0.3) weaknesses.push('trop peu de coups candidats générés (<3)');
  return {
    ...stats,
    weaknesses,
    confidence: stats.total >= 20 ? 'high' : stats.total >= 8 ? 'medium' : 'low',
    exercises: weaknesses.includes('quiescence: arrêt en pleine séquence de prises/échecs')
      ? ['exercices de coups intermédiaires (zwischenzug)', 'séquences forcées à terminer jusqu\'à position calme']
      : [],
  };
}

module.exports = {PIPELINE, listPipeline, thinkLikeStockfish, diagnoseCalculation};
