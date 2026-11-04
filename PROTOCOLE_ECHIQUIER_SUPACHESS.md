# Protocole commun des échiquiers SupaChess

**Version du protocole : 1.1.0**  
**Portée :** toutes les pages SupaChess qui affichent un échiquier ou un diagramme.

## Règle de publication

Un échiquier ne passe à l’état prêt qu’après les contrôles applicables. Toute erreur bloque la certification et doit produire un état visible et compréhensible. Une vérification en attente reste temporaire et bornée; elle ne vaut jamais validation.

## Phases obligatoires

| Phase | Travail | Contrôle de sortie |
| --- | --- | --- |
| 1. Cadrage | Identifier l’usage, les joueurs/couleurs, l’orientation, les phases pédagogiques et la séquence attendue. | Le parcours est déterministe et décrit; aucun état de départ parasite n’est ajouté. |
| 2. Source | Établir la FEN initiale et les coups depuis une partie, une variante ou une position explicitement sourcée. | FEN complète; source et métadonnées cohérentes lorsqu’elles existent. |
| 3. Légalité | Vérifier la FEN puis rejouer chaque demi-coup dans l’ordre avec chess.js. | Aucun roi manquant/adjacent, pion impossible, droit de roque incohérent, coup illégal ni variante incomplète. |
| 4. Construction | Construire le plateau à partir du même état validé, avec 64 cases distinctes, pièces lisibles, orientation correcte et commandes accessibles. | 8×8 cases, coordonnées uniques, noms accessibles et aucune ressource de pièce cassée. |
| 5. Rendu | Contrôler les dimensions après montage et après changements de taille. | Plateau carré, visible, sans chevauchement; résultat vérifié sur ordinateur et mobile lors de la revue visuelle. |
| 6. Évaluation | Ajouter une barre verticale à côté de chaque plateau. | Barre présente et accessible. Afficher « — » tant qu’aucune vraie évaluation moteur n’est disponible; ne pas inventer de score. |
| 7. Certification | Enregistrer protocole, version, FEN connue, contrôles passés et date. | Certificat uniquement si le plateau et sa barre passent les contrôles; sinon l’échiquier est refusé et la cause est affichée. |
| 8. Régression | Rejouer les contrôles automatisés et vérifier les pages touchées. | Aucun échiquier précédemment valide ne casse; les nouvelles erreurs sont bloquantes. |

## API commune

Le chargeur global expose `window.SupaChessBoardProtocol` :

- `validateFen(fen)` contrôle la position.
- `validateLine(fen, moves, Chess)` rejoue une suite de coups UCI.
- `create(fen, options)` construit un échiquier à partir d’une position validée.
- `inspect(element)` contrôle un échiquier déjà présent dans une page.
- `ensureEvaluationBar(element)` garantit la barre latérale.
- `updateEvaluation(element, centipawns, perspective)` rafraîchit la barre à partir d’une évaluation réelle fournie par le moteur.
- `certify(element, inspection)` atteste les contrôles passés et refuse un échiquier incomplet.

Les créateurs de pages doivent appeler `updateEvaluation` à chaque nouvelle réponse du moteur. Le rail seul ne transforme pas une absence de moteur en analyse. Les pages doivent charger le protocole par le chargeur global versionné pour conserver le cache busting.

## États et traçabilité

- `pending` : attente de montage/rendu, avec nombre de tentatives limité.
- `ready` : contrôles techniques réussis et certificat attaché.
- `rejected` : contrôle bloquant; plateau masqué et raison affichée.
- Attributs : `data-supa-board-phase`, `data-supa-board-status`, `data-supa-board-certificate`, `data-supa-board-certified-at`.

La certification documente les contrôles exécutés; elle ne prétend pas prouver l’absence absolue de tout défaut visuel sur chaque appareil. La revue visuelle reste obligatoire pour les changements de rendu.
