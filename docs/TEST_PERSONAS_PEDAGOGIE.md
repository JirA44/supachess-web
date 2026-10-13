# Tests utilisateurs simulés — parcours pédagogiques (13/10/2026)

Ces personas sont **fictifs**. Ne jamais créer de comptes réels, déclencher Google OAuth ni écrire dans une base de production sans environnement de test autorisé.

## Parcours A — débutant
1. Ouvrir l'accueil en session vierge ; trouver « commencer » sans aide.
2. Créer un compte de test (en staging uniquement), terminer un diagnostic initial.
3. Suivre une leçon débutant, commettre volontairement une erreur, lire l'explication.
4. Réussir un exercice analogue **différent**, quitter puis revenir.
5. Vérifier que l'avancement est sauvegardé et que la prochaine étape est explicite.

## Parcours B — intermédiaire
1. Reprendre un compte fictif avec progrès existant.
2. Naviguer du tableau de bord vers une faiblesse détectée.
3. Faire trois exercices de difficulté croissante, dont un échoué.
4. Vérifier la correction contextualisée, les prérequis et l'absence de saut de niveau arbitraire.
5. Vérifier que la progression n'est pas artificiellement augmentée par des tentatives répétées.

## Parcours C — reprise, accessibilité et sécurité
1. Tester mobile 375px et bureau 1440px, clavier seul et zoom 200 %.
2. Rafraîchir en cours d'exercice : pas de perte silencieuse des réponses.
3. Simuler une panne réseau : message clair, aucune réussite inventée.
4. Se déconnecter ; tenter d'accéder aux progrès depuis une autre session.
5. Vérifier qu'un compte B ne peut pas lire/modifier les données du compte A.

## Critères d'acceptation
- Tous les liens et boutons mènent à la bonne étape ; aucun écran sans issue.
- Échiquier/symboles/illustrations visibles ; aucune ressource en erreur 404.
- Une mauvaise réponse explique **pourquoi**, pas seulement « faux ».
- Prétest et post-test emploient des questions différentes.
- Les mesures séparent score d'exercice, maîtrise et rétention.
- Journaliser PASS / FAIL / BLOCKED / NOT RUN avec URL, navigateur, capture, étapes de reproduction.

## Points propres au projet

**SupaChess :** pièces affichées sur Coach, puzzles et parties commentées ; coup légal/illégal, fourchette, mat simple, analyse après partie et révision d'une erreur.

**Exécution : NOT RUN** — scénarios prêts pour Playwright et essais manuels ; aucun compte ni test réel créé à ce stade.
