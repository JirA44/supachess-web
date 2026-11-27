# SupaChess — Learn and progress at chess

[![Live site](https://img.shields.io/badge/live-jira44.github.io%2Fsupachess--web-2ea44f)](https://jira44.github.io/supachess-web/)
[![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-181717)](https://github.com/JirA44/supachess-web)
[![Stack](https://img.shields.io/badge/stack-vanilla%20HTML%2FCSS%2FJS-0d6efd)](https://developer.mozilla.org/en-US/docs/Web)
[![Engine](https://img.shields.io/badge/engine-Stockfish.js%20%2B%20WebAssembly-cd5c2b)](https://github.com/nmrugg/stockfish.js)
[![Chess rules](https://img.shields.io/badge/chess.js-0.10.3-b58877)](https://github.com/jhlywa/chess.js)
[![Tests](https://img.shields.io/badge/tests-Playwright%20%2B%20node%3Atest-4c1)](https://playwright.dev/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](./LICENSE)

**SupaChess** is a browser-based chess learning project: play a game, review it move by move, and turn recurring mistakes into focused training. Everything runs client-side — no build step, no bundler, no server requirement.

- **Live site**: <https://jira44.github.io/supachess-web/>
- **Repository**: <https://github.com/JirA44/supachess-web>
- **Related projects**: [SupaChess](https://jira44.github.io/supachess/) · [Gematria Academy](https://gematria-academy.pages.dev/)

---

## What is SupaChess for?

SupaChess turns a played game into a training session: spot the critical moments, understand the mistakes, and decide what to practise next.

## Why use it?

Knowing the best move is not enough to improve. You need to return to the position, compare the alternatives, and understand what actually changed. SupaChess gathers games, exercises and analysis tools into a single path that runs entirely in the browser.

## Examples

- **Play to train** — open a difficulty, play a game, then review the moves flagged as inaccuracies or mistakes.
- **Study an annotated game** — walk through half-moves on the board and stop on the positions that raise questions.
- **Train a weakness** — pick a recurring theme (pieces left hanging, missed tactics, a failing opening) and replay exercises on that theme.

> Engine evaluations are analysis aids. They depend on the engine, its search depth and the position. They are not explanations by themselves, and they are never a substitute for human review.

## The hub

`index.html` is the single entry point. It groups every page into four sections, each split into sub-folders with live counters:

| Section | Modules | Content |
| --- | --- | --- |
| **Jouer & Analyser** | 12 | Chess Coach, AI Coach, ChessNova, SupaEngine, generated puzzle lab, tactical generator, player analysis, annotated games |
| **Académie & Entraînement** | 11 | Standalone training, openings, endgames, tactics, tactical defence, daily challenge, Fischer academy, variants course, rules & history, lessons |
| **Bibliothèque des Parties Légendaires** | 17 | Human champions (Fischer, Kasparov, Tal, Karpov, Carlsen, AlphaZero), historical engines (Stockfish vs Komodo, Leela, Deep Blue), creative ChessNova games |
| **Laboratoire IA & Dashboards** | 17 | Live tracking, ELO curves, tournaments, statistics, skill radar, learning reports, archives |

### Global search

The sticky search bar at the top of the hub searches every module in place:

- `/` or `Ctrl+K` focuses the field from anywhere on the page.
- Matching is accent-insensitive (`defense` finds `Défense`).
- Non-matching sections and folders hide themselves while you type.
- The autocomplete list shows up to five results with a category badge; `↑`/`↓`, `Enter`, `Escape` and `Tab` work as expected.
- Recent searches and the most visited modules are stored locally under `supachess_hub_history` in `localStorage` (nothing leaves the browser).

## Direct links

| Page | What it does |
| --- | --- |
| [`index.html`](./index.html) | Hub with global search and the four sections |
| [`CHESS_COACH.html`](./CHESS_COACH.html) | Interactive coaching and move-quality review |
| [`GENERATEUR_PARTIES_BRILLANTES.html`](./GENERATEUR_PARTIES_BRILLANTES.html) | Generate 2800+ Elo candidate games with Stockfish, then convert positions into puzzles |
| [`TACTICAL_DEFENSE.html`](./TACTICAL_DEFENSE.html) | Defence puzzle trainer with engine-computed lines |
| [`TRAINING_TACTICS.html`](./TRAINING_TACTICS.html) | Tactics curriculum |
| [`TRAINING_OPENINGS.html`](./TRAINING_OPENINGS.html) | Opening repertoire trainer |
| [`TRAINING_ENDGAMES.html`](./TRAINING_ENDGAMES.html) | Endgame technique trainer |
| [`DAILY_CHALLENGE.html`](./DAILY_CHALLENGE.html) | Daily puzzle set |
| [`FISCHER_ACADEMY.html`](./FISCHER_ACADEMY.html) | Opening and decision-making academy |
| [`web/legendary-games/`](./web/legendary-games/) | Annotated legendary games with a shared board protocol |
| [`SUIVI_PARTIES_LIVE.html`](./SUIVI_PARTIES_LIVE.html) | Live game tracking |
| [`TRAINING_DASHBOARD.html`](./TRAINING_DASHBOARD.html) | Training dashboard and statistics |

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Markup | HTML5 | Static pages, no templating at runtime |
| Styles | Modern CSS | Custom properties, grid/flex layouts, `prefers-reduced-motion` support |
| Logic | Vanilla JavaScript (ES modules + classic scripts) | No framework, no transpiler, no bundler |
| Chess rules | [chess.js](https://github.com/jhlywa/chess.js) `0.10.3` | Move generation, legality, FEN/PGN |
| Engine | [Stockfish.js](https://github.com/nmrugg/stockfish.js) `16`–`19` | Runs in a Web Worker |
| **WebAssembly** | Stockfish `.wasm` build | The engine ships a **WebAssembly** core next to the JavaScript glue: the `.js` loader and the `.wasm` binary must come from the **same build** (Lite or Full). The generator verifies both file names and byte sizes before starting, and confirms the version from the engine's own `uci` answer |
| Board | Custom SVG renderer + shared board protocol | Same board contract across the legendary-game pages |
| Persistence | `localStorage` | Progress, ratings, generated libraries, search history |
| Optional services | Firebase (compat SDK) | Community features only — every training page works without it |
| i18n | `shared/i18n.js` + `shared/translations/` | French and English strings |
| Tests | Playwright (e2e), `node --test` (unit), custom static checks | See `npm run` below |

## Running it locally

```bash
# any static server works
python -m http.server 8080
# then open http://127.0.0.1:8080/index.html
```

Install the test dependencies with `npm ci` (Node 20+ recommended).

## Tests

```bash
npm run test:site     # static coherence checks (links, ids, duplicated assets)
npm run test:unit     # unit + syntax + i18n + keyboard navigation suites
npm run test:e2e      # Playwright end-to-end scenarios
node scripts/test_hub_search.mjs      # hub global search behaviour
node scripts/test_generator_page.mjs  # generator tabs, chips, loader and engine contract
python scripts/verify_hub_pages.py index.html js/hub-search.js GENERATEUR_PARTIES_BRILLANTES.html
python scripts/build_sitemap.py       # regenerate sitemap.xml and robots.txt
```

## SEO

- One canonical URL per page (`https://jira44.github.io/supachess-web/`), unique `<title>`, 130–155 character meta description, Open Graph and Twitter cards.
- `sitemap.xml` lists the 90 public pages, `robots.txt` allows crawling and points to the sitemap. Both are generated by `scripts/build_sitemap.py`.
- `hub.html` still lacks a canonical tag: it is a legacy alternative hub and should either be redirected to `index.html` or given its own canonical in a later cleanup.

## Deployment

The site is static. GitHub Pages serves `main` as-is; Cloudflare Pages can host the same folder.

```bash
npx wrangler pages deploy . --project-name=supachess-web   # Cloudflare Pages
```

`_headers` provides the security headers and caching policy, `_redirects` keeps the legacy URLs working.

## Contributing

1. Fork the repository and create a branch.
2. Keep the no-build constraint: plain HTML, CSS and JavaScript that run from `file://` or any static server.
3. Update the documentation in the same change as the code, and add or update the matching test.
4. Open a pull request.

## License

MIT — see [LICENSE](./LICENSE).

## Related projects

- [SupaChess](https://jira44.github.io/supachess/) — the wider chess project.
- [Gematria Academy](https://gematria-academy.pages.dev/) — the companion learning academy.

---

## Français

La documentation d'origine en français est conservée ci-dessous.

## À quoi sert SupaChess ?

Le site donne un espace pour jouer et étudier les échecs. Il vise à aider les joueurs à comprendre leurs décisions et à transformer les erreurs récurrentes en thèmes d’entraînement.

## Pourquoi l’utiliser ?

Connaître une bonne réponse ne suffit pas toujours pour progresser. Il faut pouvoir revenir à la position, comparer les choix possibles et comprendre ce qui a changé. SupaChess rassemble des parties, des exercices et des outils d’analyse dans un parcours accessible depuis le navigateur.

## Exemples d’utilisation

- **Jouer pour s’entraîner** : ouvrir le site, choisir une difficulté disponible et jouer une partie ; après la partie, relever les coups signalés comme erreurs ou imprécisions.
- **Étudier une partie** : ouvrir une partie commentée disponible, suivre les demi-coups sur l’échiquier et s’arrêter aux positions qui posent question.
- **Travailler une faiblesse** : après plusieurs parties, choisir un thème récurrent — par exemple les pièces en prise ou les tactiques manquées — puis refaire des exercices sur ce thème.

Les évaluations automatiques sont des aides à l’analyse. Elles dépendent du moteur, de sa profondeur et de la position ; elles ne remplacent pas une explication compréhensible ni une revue humaine.


## 🚀 Améliorations Version 2.0

### ✨ Algorithme IA Avancé
- **Minimax avec Alpha-Beta Pruning** : Algorithme de recherche optimisé pour des décisions tactiques profondes
- **Évaluation positionnelle** : Tables de position pour pions et cavaliers
- **Évaluation tactique** : Contrôle du centre, sécurité du roi, mobilité
- **Profondeur variable** : 2-5 demi-coups selon la difficulté
- **Tri des coups** : Optimisation de l'élagage alpha-beta

### 🎯 Analyse Tactique Enrichie
- **Classification précise des coups** :
  - 🌟 Brillant (evalDiff ≤ -50 ou capture majeure)
  - ✅ Excellent (evalDiff ≤ -20)
  - 👍 Bon coup (evalDiff ≤ 0)
  - ⚠️ Imprécision (evalDiff ≤ 50)
  - ❌ Erreur (evalDiff ≤ 100)
  - 💥 Gaffe (evalDiff > 100)

- **Détection de motifs tactiques** :
  - Captures gagnantes / échanges / sacrifices
  - Fourchettes (attaques multiples)
  - Échecs et promotions
  - Échec et mat

### 💾 Persistance et Gestion d'Erreurs
- **LocalStorage** : Sauvegarde automatique toutes les 30s
- **Auto-save toggleable** : Activation/désactivation manuelle
- **Gestion d'erreurs robuste** : Try-catch sur toutes les opérations critiques
- **Notifications toast** : Feedback visuel pour toutes les actions

### 🎨 Interface Améliorée
- **Animations fluides** :
  - Glow effect sur le titre
  - Animations de déblocage des achievements
  - Effet ripple sur les boutons
  - Shake effect sur les gaffes
  - Pulse effect sur les coups brillants

- **Feedback visuel enrichi** :
  - Couleurs selon qualité du coup
  - Indicateur de réflexion de l'IA
  - Badges tactiques colorés
  - Graphique ELO avec tooltips améliorés

- **Responsive design** : Adaptation mobile/tablette

### 📊 Statistiques Avancées
- **Métriques étendues** :
  - ELO estimé (400-2800)
  - Précision moyenne (%)
  - Coups parfaits / brillants
  - Gaffes / erreurs / imprécisions
  - Parties jouées / victoires / défaites / nuls

- **Graphique de progression** :
  - Historique ELO (max 100 points)
  - Mise à jour en temps réel
  - Export JSON avec horodatage

### 🏆 Achievements
- 🎮 Première Partie
- ⭐ Coup Brillant
- 💯 Partie Parfaite (95%+ bons coups)
- ⚔️ Tacticien (10+ coups parfaits)
- 🎓 Érudit (Niveau Expert)

## 📦 Installation et Déploiement

### Déploiement sur Cloudflare Pages

```bash
# Méthode 1: Via Wrangler CLI
cd aimix-cloudflare
npx wrangler pages deploy . --project-name=aimix-chess

# Méthode 2: Via Dashboard Cloudflare
# 1. Connectez-vous à https://dash.cloudflare.com/
# 2. Pages → Créer un projet → Télécharger les fichiers
# 3. Sélectionnez tous les fichiers du dossier
```

### Déploiement via Git

```bash
# 1. Initialisez un repo git
git init
git add .
git commit -m "feat: AIMix Pro v2.0 avec IA minimax avancée"

# 2. Poussez vers GitHub/GitLab
git remote add origin https://github.com/JirA44/supachess-web.git
git push -u origin main

# 3. Sur Cloudflare Pages, connectez votre repo
# Dashboard → Pages → Connecter à Git → Sélectionner le repo
```

## 🎮 Utilisation

1. **Ouvrez** le site : <https://jira44.github.io/supachess-web/> (Hub Central)
2. **Choisissez** votre niveau de difficulté
3. **Jouez** en déplaçant les pièces blanches
4. **Analysez** vos coups en temps réel
5. **Progressez** en suivant votre ELO

## 🔧 Configuration

### Headers de Sécurité
Le fichier `_headers` configure :
- Protection XSS et clickjacking
- Content Security Policy (CSP)
- Cache optimisé pour performance

### Redirections
Le fichier `_redirects` gère :
- Redirect racine → page principale
- Compatibilité anciennes URLs
- Fallback 404

## 📊 Métriques de Performance

- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3.0s
- **Lighthouse Score** : 95+
- **Bundle Size** : ~35KB (HTML)

## 🔐 Sécurité

- Headers de sécurité complets
- CSP stricte
- Validation des entrées utilisateur
- Gestion d'erreurs robuste
- Pas de failles XSS/CSRF

## 🛠️ Technologies Utilisées

- **Chess.js** : Logique des échecs
- **Chessboard.js** : Interface de l'échiquier
- **Chart.js** : Visualisation de progression
- **Vanilla JS** : Pas de framework, performances optimales
- **LocalStorage API** : Persistance des données

## 📝 Changelog

### Version 2.0 (2025-01-20)
- ✅ Algorithme minimax avec alpha-beta pruning
- ✅ Analyse tactique avancée avec détection de motifs
- ✅ Persistance LocalStorage avec auto-save
- ✅ Gestion d'erreurs complète avec try-catch
- ✅ Animations et feedback visuel enrichi
- ✅ Graphique ELO amélioré avec tooltips
- ✅ Interface responsive et accessible
- ✅ Configuration Cloudflare optimisée
- ✅ Documentation complète

### Version 1.0 (Original)
- IA basique (sélection aléatoire)
- Analyse simpliste (matériel seulement)
- Pas de persistance
- Interface basique

## 🤝 Contribution

Les contributions sont les bienvenues! Pour proposer des améliorations :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 License

MIT License - Voir le fichier LICENSE pour plus de détails

## 🎯 Roadmap

- [ ] Intégration Stockfish WASM pour analyse encore plus profonde
- [ ] Mode analyse de parties PGN
- [ ] Système de puzzles tactiques
- [ ] Multijoueur en ligne
- [ ] Thèmes d'échiquier personnalisables
- [ ] Support multilingue
- [ ] Application mobile (PWA)

## 📞 Support

Pour toute question ou problème :
- Questions et problèmes : ouvrir une issue sur GitHub.
- 🐛 Issues : [GitHub Issues](https://github.com/JirA44/supachess-web/issues)

---

**Développé avec ❤️ pour la communauté des échecs**
