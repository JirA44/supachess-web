'use strict';

/**
 * Chess error encyclopedia — bibliothèque structurée des erreurs.
 * Chaque entrée: {code, family, definition, cause, consequences, alternatives, opponentResponses, prevention}.
 * Purement déclaratif: les exemples concrets viennent des parties du joueur (FEN/PGN), jamais inventés.
 */

const ERRORS = [
  {code: 'HANGING_PIECE', family: 'tactique', definition: 'pièce laissée sans défense (en prise)',
   cause: 'surcharge d\'attention sur le plan, oubli du balayage des pièces attaquées',
   consequences: 'perte de matériel directe, souvent décisive',
   alternatives: ['défendre la pièce', 'déplacer la pièce', 'contre-attaque avec menace supérieure'],
   opponentResponses: ['prise simple', 'prise avec fourchette derrière'],
   prevention: 'balayage systématique après chaque coup adverse: quelles pièces sont attaquées ?'},
  {code: 'MISSED_FORK', family: 'tactique', definition: 'fourchette adverse non vue (ou fourchette disponible jouée à côté)',
   cause: 'calcul limité aux pièces proches, méconnaissance des cibles de valeur',
   consequences: 'perte du plus gros élément de la fourchette (roi/material)',
   alternatives: ['parade la fourchette', 'sortir la pièce la plus précieuse'],
   opponentResponses: ['exécution de la fourchette puis consolidation'],
   prevention: 'chercher systématiquement: deux cibles de valeur sur une case attaquée ?'},
  {code: 'MISSED_PIN', family: 'tactique', definition: 'clouage non exploité ou non vu',
   cause: 'lignes ouvertes vers le roi/dame non scannées',
   consequences: 'pièce immobilisée perdue ou attaque de roi à travers le clouage',
   alternatives: ['rompre le clouage', 'échanger le cloueur', 'couvrir la ligne'],
   opponentResponses: ['renforcement du clouage puis percée sur la ligne'],
   prevention: 'scanner les lignes dame/roi à chaque coup'},
  {code: 'MISSED_SKEWER', family: 'tactique', definition: 'enfilade non vue (pièces alignées de valeur décroissante)',
   cause: 'alignements diagonales/colonnes non vérifiés',
   consequences: 'perte d\'échange ou de dame derrière une pièce peu précieuse',
   alternatives: ['écarter la pièce arrière', 'interposer'],
   opponentResponses: ['attaque de la pièce avant, capture de la pièce arrière'],
   prevention: 'à chaque coup adverse: y a-t-il alignement de deux pièces de valeur ?'},
  {code: 'SHALLOW_CALCULATION', family: 'calcul', definition: 'calcul arrêté avant la fin de la séquence forcée (échanges, échecs)',
   cause: 'arrêt après l\'échange au lieu de calculer la quiescence',
   consequences: 'surprise tactique 2-3 coups plus loin',
   alternatives: ['continuer le calcul jusqu\'à position calme'],
   opponentResponses: ['coup intermédiaire (zwischenzug) gagnant'],
   prevention: 'règle: ne jamais évaluer en milieu de combinaison; compter les échecs et prises restants'},
  {code: 'BAD_TRADE', family: 'stratégie', definition: 'mauvais échange (donner une pièce active contre une pièce passive)',
   cause: 'comptage matériel sans évaluer l\'activité et la structure',
   consequences: 'dégradation positionnelle progressive, finale inférieure',
   alternatives: ['refuser l\'échange', 'obtenir une compensation structurelle'],
   opponentResponses: ['exploitation de la pièce dominante restante'],
   prevention: 'évaluer activité + structure avant tout échange; qui hérite de la colonne/diagonale ouverte ?'},
  {code: 'MISSED_COUNTERPLAY', family: 'défense', definition: 'contre-attaque disponible ignorée sous pression',
   cause: 'mode passif défensif, incapacité à compter les tempos de menace',
   consequences: 'pression qui s\'aggrave, position se craque seule',
   alternatives: ['contre-jeu immédiat sur une autre zone'],
   opponentResponses: ['doit résoudre sa propre menace avant de finir l\'attaque'],
   prevention: 'compter les menaces: chaque coup adverse crée-t-il une menace, et quel est mon plus rapide ?'},
  {code: 'WEAK_OPENING_PRINCIPLE', family: 'ouverture', definition: 'violation des principes (pièce développée deux fois, roi traînant, dame sortie trop tôt)',
   cause: 'mémoire de variantes sans compréhension des plans',
   consequences: 'retard de développement exploitable',
   alternatives: ['coup de développement simple', 'roquer'],
   opponentResponses: ['ouverture de lignes centrales contre le roi resté au centre'],
   prevention: 'checklist: toutes mes pièces développées ? roi en sécurité ?'},
  {code: 'MIDDLEGAME_PLAN_MISS', family: 'milieu de jeu', definition: 'plan incompatible avec la structure (jouer des deux côtés, affaiblir sans besoin)',
   cause: 'pas d\'identification de la structure (chaîne de pions, colonnes, faiblesse fixée)',
   consequences: 'coups sans menace, avantage adverse qui s\'accumule',
   alternatives: ['plan conforme à la structure'],
   opponentResponses: ['fixation des faiblesses créées'],
   prevention: 'nommer le plan en une phrase avant de jouer'},
  {code: 'ENDGAME_TECHNIQUE', family: 'finale', definition: 'technique de finale erronée (roi passif, promotion lente, perte du tempo)',
   cause: 'méconnaissance des positions théoriques (roi+pion, opposition)',
   consequences: 'nulle jouée en gain, gain jouée en nulle',
   alternatives: ['rentrer dans la case théorique connue'],
   opponentResponses: ['défense théorique correcte'],
   prevention: 'apprendre les positions de référence (Lucena, Philidor, opposition, règle du carré)'},
  {code: 'PREMATURE_CONVERSION', family: 'conversion', definition: 'échanger en finale gagnante trop tôt ou compliquer au lieu de simplifier',
   cause: 'risque résiduel non évalué (côté joueur comme côté adverse)',
   consequences: 'avantage dissipé',
   alternatives: ['simplifier quand l\'avantage est réel, conserver les tensions sinon'],
   opponentResponses: ['contre-jeu sur les complications'],
   prevention: 'question avant chaque échange: l\'avantage augmente-t-il après ?'},
  {code: 'UNNECESSARY_RISK', family: 'défense', definition: 'prendre un risque sans nécessité dans une position stable',
   cause: 'ennui positionnel, goût de complication, sous-estimation du contre-jeu',
   consequences: 'transformation d\'une position confortable en melee incertaine',
   alternatives: ['coup d\'amélioration calme (repositionner la pire pièce)'],
   opponentResponses: ['tourner le risque en attaque'],
   prevention: 'si la position ne l\'exige pas: améliorer la pire pièce plutôt que créer des faiblesses'},
];

function encyclopedia() {
  return ERRORS.map(({code, family, definition, cause, consequences, alternatives, opponentResponses, prevention}) =>
    ({code, family, definition, cause, consequences, alternatives, opponentResponses, prevention}));
}

/** Classe une observation de partie (fournie par classifyMove) vers les codes de l'encyclopédie. */
function mapCategoryToError(category, context = {}) {
  const mapping = {
    blunder: context.tactical === false ? 'MIDDLEGAME_PLAN_MISS' : 'HANGING_PIECE',
    mistake: context.theme ?? 'SHALLOW_CALCULATION',
    inaccuracy: 'SHALLOW_CALCULATION',
    acceptable: null,
  };
  return mapping[category] ?? null;
}

module.exports = {encyclopedia, mapCategoryToError, ERRORS};
