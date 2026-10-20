'use strict';

/**
 * Méthodes Magnus Carlsen — modules d'entraînement positionnel et décisionnel.
 * Distinction pédagogique obligatoire: "observable" = vérifiable dans les parties publiques
 * (motifs, plans, conversions) ; "hypothèse" = inférence sur le raisonnement intérieur.
 * Aucun exercice n'invente de partie: les PGN sont fournis par l'appelant (parties réelles).
 */

const METHODS = [
  {id: 'pattern_recognition', title: 'Reconnaissance des motifs', observable: true,
   description: 'banque de motifs (fourchettes, clouages, structures, finales) mémorisés en blocs',
   exercise: 'montrer une position 3s: nommer le motif et le plan associé',
   verification: 'temps de reconnaissance + exactitude sur 20 positions'},
  {id: 'opponent_anticipation', title: 'Anticiper la réponse adverse', observable: true,
   description: 'avant de jouer, lister les 2 réponses adverses les plus fortes',
   exercise: 'pour un coup choisi, écrire la meilleure réponse adverse puis la parer',
   verification: '% de réponses adverses réellement anticipées dans ses parties analysées'},
  {id: 'prophylaxis', title: 'Prophylaxie', observable: true,
   description: 'identifier le plan adverse et l\'empêcher AVANT qu\'il n\'arrive',
   exercise: 'trouver le coup qui paralyse le plan adverse sans affaiblir le sien',
   verification: 'coups prophylactiques joués vs opportunités manquées (moteur)'},
  {id: 'worst_piece', title: 'Améliorer la pire pièce', observable: true,
   description: 'à chaque coup calme, repositionner la pièce la moins active',
   exercise: 'position stable: identifier la pire pièce et son meilleur poste',
   verification: 'delta d\'activité moyen des pièces (moteur)'},
  {id: 'counterplay_restriction', title: 'Restreindre le contre-jeu', observable: true,
   description: 'fermer les contre-possibilités avant de lancer sa propre action',
   exercise: 'avant une attaque: lister les 3 contre-jeux adverses et les neutraliser',
   verification: 'parties: attaques qui marchent sans encaisser de contre-jeu'},
  {id: 'small_advantages', title: 'Accumuler de petits avantages', observable: true,
   description: 'empiler de minces avantages (tempos, cases, structures) sans précipitation',
   exercise: 'jouer 10 coups calmes successifs en améliorant une mesure à chaque fois',
   verification: 'courbe d\'évaluation moteur en pente douce et croissante'},
  {id: 'positional_pressure', title: 'Pression positionnelle', observable: true,
   description: 'exercer une pression durable sur une faiblesse fixée',
   exercise: 'fixer une faiblesse puis accumuler les pièces dessus',
   verification: 'pièges: nb de pièces sur la faiblesse vs défenseurs'},
  {id: 'conversion', title: 'Conversion des avantages', observable: true,
   description: 'transformer avantage positionnel → matériel → finale gagnante, sans risker',
   exercise: 'positions avec avantage +1: jouer la conversion la plus simple',
   verification: '% de conversions réussies sans dilapidation (moteur)'},
  {id: 'defense_resilience', title: 'Défense et résilience', observable: true,
   description: 'positions inférieures: tenir, créer du désordre utile, chercher le contre-jeu',
   exercise: 'tenir 20 coups en position -2 sans craquer',
   verification: '% de sauvetages en position défavorable'},
  {id: 'technical_endings', title: 'Finales techniques', observable: true,
   description: 'positions de référence (Lucena, Philidor, opposition, règle du carré)',
   exercise: 'jouer 10 finales théoriques sans erreur',
   verification: 'score parfait exigé sur les bases de finales'},
  {id: 'strategic_flexibility', title: 'Adaptation et flexibilité', observable: true,
   description: 'changer de plan quand la position l\'exige (aile dame ↔ aile roi)',
   exercise: 'parties: détecter le moment où l\'ancien plan devient faux',
   verification: 'corrélation entre changement de plan et changement de structure'},
];

function listMethods() {
  return METHODS.map(({id, title, observable}) => ({id, title, observable}));
}

function buildTrainingModule(id, gameReferences = []) {
  const m = METHODS.find(x => x.id === id);
  if (!m) throw new RangeError(`méthode inconnue: ${id}`);
  return {
    id: m.id, title: m.title,
    status: m.observable ? 'observable_dans_les_parties' : 'hypothese_de_raisonnement',
    description: m.description,
    exercise: m.exercise,
    verification: m.verification,
    games: gameReferences.filter(g => g && typeof g.pgn === 'string'), // PGN réels fournis
    caveat: 'Méthode = cadre de décision observé, PAS une preuve du raisonnement intérieur de Carlsen.',
  };
}

module.exports = {METHODS, listMethods, buildTrainingModule};
