/**
 * SUPA Style Engine — Styles de joueurs, patterns, parcours
 *
 * Dépend de supa-move-bubbles.js (window.supaBubbles) pour le journal des coups.
 * Inclure APRÈS supa-move-bubbles.js :
 *   <script src="supa-dots-widget.js"></script>
 *   <script src="supa-move-bubbles.js"></script>
 *   <script src="supa-style-engine.js"></script>
 *
 * Ce que ça fait :
 *   1. Compare ton profil de jeu aux styles de grands joueurs (Kasparov, Carlsen…)
 *   2. Détecte les patterns récurrents dans tes coups et donne la leçon associée
 *   3. Tient le registre des sacrifices gagnants / perdants
 *   4. Propose des parcours d'entraînement (par style, par type de sacrifice)
 */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    // ── Profils de styles ────────────────────────────────────────────────────
    // Chaque dimension est un poids 0→1. Les vecteurs sont des Traversées
    // de nos features mesurées, calibrées sur le jeu connu des maîtres.
    const DIMS = [
        'sacrifice', 'agression', 'developpement', 'roque', 'centre',
        'securiteRoi', 'poussePions', 'activiteTours', 'reine', 'finale',
    ];

    const STYLES = {
        kasparov: {
            name: 'Kasparov',
            emoji: '🐯',
            era: '1973-2005',
            pitch: 'Attaque permanente, pression maximale, refus de la partie patiente.',
            vector: { sacrifice: 0.95, aggression: 0.95, developpement: 0.9, roque: 0.85,
                      centre: 0.9, securiteRoi: 0.6, poussePions: 0.9, activiteTours: 0.85,
                      reine: 0.5, finale: 0.75 },
            colors: { accent: '#ef4444' },
            lessons: [
                'Le sacrifice n’est pas un pari : c’est une position forcée que l’adversaire refuse.',
                'Pression permanente : chaque coup doit créer une menace, sinon il est inutile.',
                'Calcul long avant le coup : si tu vois trois coups possibles, joue le troisième.',
            ],
            patterns: ['sacrificeAttaque', 'echecTempo', 'centreOccupation', 'changementPiece'],
        },
        carlsen: {
            name: 'Carlsen',
            emoji: '👑',
            era: '2004-',
            pitch: 'Économie de temps, pression lente, aucune failledans le quarry de la pièce.',
            vector: { sacrifice: 0.45, aggression: 0.6, developpement: 0.95, roque: 0.95,
                      centre: 0.85, securiteRoi: 0.9, poussePions: 0.7, activiteTours: 0.8,
                      reine: 0.45, finale: 0.95 },
            colors: { accent: '#22c55e' },
            lessons: [
                'Gagner une pièce lentement ne vaut pas perdre une pièce.',
                'Développe tes pièces par paires et force l’adversaire à décider.',
                'En finale, le pion passé est une arme : compte les tempi.',
            ],
            patterns: ['developpementRapide', 'structureSolide', 'pionPasse', 'echecTempo'],
        },
        fischer: {
            name: 'Fischer',
            emoji: '🧊',
            era: '1958-1972',
            pitch: 'Occupation totale de la case centrale, formation de tours, zéro approximation.',
            vector: { sacrifice: 0.6, aggression: 0.85, developpement: 1.0, roque: 1.0,
                      centre: 0.95, securiteRoi: 0.95, poussePions: 0.75, activiteTours: 0.95,
                      reine: 0.4, finale: 0.6 },
            colors: { accent: '#3b82f6' },
            lessons: [
                'La case centrale est une forteresse : occupe-la avant tout le reste.',
                'Prépare la formation de tours pendant que ton adversaire réfléchit.',
                'Joue le coup le plus simple qui gagne 20 coups de suite.',
            ],
            patterns: ['developpementRapide', 'centreOccupation', 'activiteTours', 'changementPiece'],
        },
        tal: {
            name: 'Tal',
            emoji: '⚡',
            era: '1956-1976',
            pitch: 'Le théâtre : chaos calculé, sacrifices en série, mat avant laATERIALe résorption.',
            vector: { sacrifice: 1.0, aggression: 1.0, developpement: 0.8, roque: 0.5,
                      centre: 0.7, securiteRoi: 0.4, poussePions: 0.9, activiteTours: 0.8,
                      reine: 0.7, finale: 0.5 },
            colors: { accent: '#eab308' },
            lessons: [
                'Deux sacrifices valent mieux qu’un : l’adversaire ne peut pas les voir tous les deux.',
                'L’attaque se mène avec la reine en première ligne, pas derrière.',
                'Chaos ≠ hasard : chaque sacrifice doit avoir une réfutation:forcée.',
            ],
            patterns: ['sacrificeAttaque', 'echecTempo', 'reineActive', 'sacrificeEnChaine'],
        },
        capablanca: {
            name: 'Capablanca',
            emoji: '🧠',
            era: '1901-1942',
            pitch: 'Simplicité pure : les meilleurs coups sont les plus faciles.',
            vector: { sacrifice: 0.5, aggression: 0.55, developpement: 0.95, roque: 0.85,
                      centre: 0.85, securiteRoi: 0.9, poussePions: 0.6, activiteTours: 0.75,
                      reine: 0.4, finale: 0.9 },
            colors: { accent: '#a78bfa' },
            lessons: [
                'Détache la dame dès que possible : elle est plus forte qu’un cavalier développé.',
                'Simplifie : un échange difficile est une faute de temps.',
                'En finale, la position d’un pion compte plus que l’activité.',
            ],
            patterns: ['developpementRapide', 'reineActive', 'echangeForce', 'finale'],
        },
        botvinnik: {
            name: 'Botvinnik',
            emoji: '🧱',
            era: '1931-1996',
            pitch: 'Préparation d acier : chaque partie est une campagne methodique.',
            vector: { sacrifice: 0.4, aggression: 0.55, developpement: 0.9, roque: 0.9,
                      centre: 0.95, securiteRoi: 0.95, poussePions: 0.85, activiteTours: 0.7,
                      reine: 0.4, finale: 0.9 },
            colors: { accent: '#0ea5e9' },
            lessons: [
                'Choisis une structure de pions et refuse de la 바꾸 ensuite.',
                'L preparation: chaque coup doit avoir une raison deux coups plus tard.',
                'Cherche la case faible adverse et attaque-la sans arrêt.',
            ],
            patterns: ['centreOccupation', 'structureSolide', 'pionPasse', 'echangeForce'],
        },
        alekhine: {
            name: 'Alekhine',
            emoji: '👑',
            era: '1924-1946',
            pitch: 'Polyvalence : tactique et position dans le même morceau.',
            vector: { sacrifice: 0.75, aggression: 0.85, developpement: 0.9, roque: 0.8,
                      centre: 0.85, securiteRoi: 0.75, poussePions: 0.8, activiteTours: 0.8,
                      reine: 0.55, finale: 0.7 },
            colors: { accent: '#f97316' },
            lessons: [
                'Le style s’adapte à l’adversaire, pas à ton ego.',
                'Un sacrifice correct vaut mieux qu’une combinaison ratée.',
                'Sacrifie quand la position le demande, jamais pour principle.',
            ],
            patterns: ['sacrificeAttaque', 'echecTempo', 'reineActive', 'echangeForce'],
        },
    };

    const PATTERNS = {
        sacrificeAttaque: {
            name: 'Sacrifice d\'attaque',
            test: function (f) { return f.sacrificeRate >= 0.12 && f.aggression >= 0.4; },
            lesson: 'Tu sacrifies souvent en attaque. Vérifie chaque fois que le sacrifice est '
                  + 'forcée (l’adversaire n’a pas d’autre coup que la prise).',
            style: 'tal',
        },
        sacrificeEnChaine: {
            name: 'Sacrifices en chaîne',
            test: function (f) { return f.sacrificeChains >= 2; },
            lesson: 'Deux sacrifices successifs dans la même partie : excellent signe de '
                  + 'calcul tactique. Continue à vérifier la réfutation du 2e.',
            style: 'tal',
        },
        echecTempo: {
            name: 'Échecs de tempo',
            test: function (f) { return f.checkRate >= 0.18; },
            lesson: 'Tu donnes beaucoup d’échecs. Chaque échec doit forcer une réponse : '
                  + 'sinon tu perds un tempo et l’initiative.',
            style: 'kasparov',
        },
        developpementRapide: {
            name: 'Développement rapide',
            test: function (f) { return f.developEarly >= 5; },
            lesson: 'Plus de 5 pièces développées avant le 10e coup : excellent. '
                  + 'Garde ce rythme même contre les ouvertures qui ne demandent rien.',
            style: 'fischer',
        },
        centreOccupation: {
            name: 'Occupation du centre',
            test: function (f) { return f.centerEarly >= 3; },
            lesson: 'Tu occupes le centre tôt. Ne le quitte pas ensuite sans raison tactique.',
            style: 'fischer',
        },
        structureSolide: {
            name: 'Structure saine',
            test: function (f) { return f.isolatedPawns <= 1 && f.doubledPawns <= 1; },
            lesson: 'Peu de pions isolés ou doublés : ta structure supporte les échanges. '
                  + 'Défends les pions faibles au lieu de les échanger.',
            style: 'botvinnik',
        },
        pionPasse: {
            name: 'Pion passé',
            test: function (f) { return f.passedPawns >= 1; },
            lesson: 'Un pion passé est une arme. Compte les tempi adverses : '
                  + 'il gagne s’il avance avec le tempo.',
            style: 'carlsen',
        },
        reineActive: {
            name: 'Reine active',
            test: function (f) { return f.earlyQueenMoves >= 2; },
            lesson: 'Tu sors la reine tôt. Vérifie qu’elle n’est pas sur une case '
                  + 'attaquée — sinon tu perds un tempo.',
            style: 'capablanca',
        },
        echangeForce: {
            name: 'Échanges forcés',
            test: function (f) { return f.forcedExchangeRate >= 0.2; },
            lesson: 'Tu obliges souvent l’adversaire à échanger. C’est un très bon signe : '
                  + 'tu supprimes la contrepartie adverse.',
            style: 'botvinnik',
        },
        finale: {
            name: 'Jeu de finale',
            test: function (f) { return f.pieceExchanges >= 6; },
            lesson: 'La partie s’est échangée : phase de finale. Active tes rois, '
                  + 'pousse tes pions passés.',
            style: 'carlsen',
        },
        activiteTours: {
            name: 'Tours actives',
            test: function (f) { return f.activeRooks >= 2; },
            lesson: 'Tes tours trouvent des lignes. Continue à chercher la colonne ouverte.',
            style: 'fischer',
        },
        changementPiece: {
            name: 'Changements de pièces',
            test: function (f) { return f.pieceSwaps >= 3; },
            lesson: 'Tu changes souvent de pièces pour)… désorganiser l’adversaire. '
                  + 'Vérifie que le tempo est payé.',
            style: 'kasparov',
        },
        surDeveloppement: {
            name: 'Sous-développement',
            test: function (f) { return f.developEarly <= 1 && f.movesTotal >= 12; },
            lesson: 'Attention : peu de pièces développées en milieu de partie. '
                  + 'Développe avant toute attaque — l’attaque sans développement échoue.',
            style: 'carlsen',
        },
        roqueTardif: {
            name: 'Roque tardif',
            test: function (f) { return f.castleMove > 8 && f.castleMove !== null; },
            lesson: 'Tu roques après le 8e coup. Castelle tôt : le roi en sécurité '
                  + 'libère la dame et les tours.',
            style: 'fischer',
        },
    };

    // ── Extraction de features depuis une partie ─────────────────────────────
    function emptyFeatures() {
        return {
            movesTotal: 0,
            sacrificeRate: 0, sacrificeChains: 0,
            checkRate: 0, captureRate: 0,
            developEarly: 0, centerEarly: 0,
            isolatedPawns: 0, doubledPawns: 0, passedPawns: 0,
            earlyQueenMoves: 0, castleMove: null,
            pieceExchanges: 0, pieceSwaps: 0, activeRooks: 0,
            forcedExchangeRate: 0,
            aggression: 0, developpement: 0, roque: 0, centre: 0,
            securiteRoi: 0, poussePions: 0, activiteTours: 0, reine: 0, finale: 0,
        };
    }

    function centralSquare(sq) {
        return (sq[0] === 'd' || sq[0] === 'e') && (sq[1] === '4' || sq[1] === '5');
    }

    function computeFeatures(game, moveLog) {
        const f = emptyFeatures();
        if (!game || typeof Chess === 'undefined') return f;

        const ChessCtor = window.Chess;
        const tmp = new ChessCtor();
        const played = new Set();
        const sacChain = [];
        let checks = 0, caps = 0, sacs = 0, exchanges = 0, swaps = 0, forcedEx = 0;
        let sacRun = 0;
        let activeRook = 0;
        const lastRookSq = new Map();

        for (let i = 0; i < moveLog.length; i++) {
            const rec = moveLog[i];
            f.movesTotal++;

            const mv = tmp.move({
                from: rec.from, to: rec.to,
                promotion: rec.promotion || undefined,
            });
            if (!mv) break;

            if (mv.san && (mv.san.includes('+') || mv.san.includes('#'))) checks++;
            if (mv.captured) caps++;

            if (rec.isSacrifice) { sacs++; sacRun++; }
            else sacRun = 0;

            if (mv.captured && mv.piece !== 'p' && VALUE[mv.piece] >= 3
                && VALUE[mv.piece] >= (VALUE[mv.captured] || 0)) exchanges++;
            if (mv.san && mv.san.includes('=')) swaps++;

            // développement avant le 10e coup de chaque camp
            if (i < 20) {
                if ((mv.piece === 'n' || mv.piece === 'b') && !played.has(rec.from)) f.developEarly++;
                if (mv.piece === 'p' && centralSquare(rec.from) && centralSquare(rec.to)) f.centerEarly++;
                if (mv.piece === 'q' && i < 14) f.earlyQueenMoves++;
            }

            if (mv.san && (mv.san.includes('O-O') || mv.san.includes('O-O-O'))) {
                if (f.castleMove === null) f.castleMove = Math.floor(i / 2) + 1;
            }
            if (rec.tactic && /Sacrifice/.test(rec.tactic)) forcedEx++;

            // tours actives : la tour change-t-elle souvent de colonne ?
            if (mv.piece === 'r') {
                const key = mv.color + rec.from;
                if (lastRookSq.has(key) && lastRookSq.get(key) !== rec.from[0]) activeRook++;
                lastRookSq.set(key, rec.to);
            }
            played.add(rec.to);
        }

        const pieces = tmp.board().flat().filter(Boolean);
        for (const p of pieces) {
            if (p.type !== 'p') continue;
            const file = p.square.charCodeAt(0);
            const rank = parseInt(p.square[1], 10);
            let sameFile = 0, blockedF = false, blockedB = false;
            for (const q of pieces) {
                if (q.type !== 'p' || q.color !== p.color) continue;
                if (q.square.charCodeAt(0) === file) sameFile++;
                if (q.square.charCodeAt(0) === file - 1 && q.square[1] === String(rank - 1)) blockedF = true;
                if (q.square.charCodeAt(0) === file + 1 && q.square[1] === String(rank + 1)) blockedB = true;
            }
            if (sameFile === 1) f.isolatedPawns++; else if (sameFile > 1) f.doubledPawns++;
            if (!blockedF && !blockedB) f.passedPawns++;
        }

        f.sacrificeRate = f.movesTotal ? sacs / f.movesTotal : 0;
        f.checkRate     = f.movesTotal ? checks / f.movesTotal : 0;
        f.captureRate   = f.movesTotal ? caps / f.movesTotal : 0;
        f.sacrificeChains = sacRun;
        f.activeRooks   = activeRook;
        f.pieceExchanges = exchanges;
        f.pieceSwaps    = swaps;
        f.forcedExchangeRate = f.movesTotal ? forcedEx / f.movesTotal : 0;

        // ── Normalisation en vecteur de style 0→1 ────────────────────────────
        f.agression        = clamp01(f.captureRate * 2.2 + f.checkRate * 1.6);
        f.sacrifice        = clamp01(f.sacrificeRate * 6);
        f.developpement    = clamp01(f.developEarly / 8);
        f.centre           = clamp01(f.centerEarly / 5);
        f.roque            = f.castleMove === null ? 0.35 : clamp01(1 - (f.castleMove - 1) / 9);
        f.securiteRoi      = clamp01(1 - f.isolatedPawns * 0.25 - f.doubledPawns * 0.2);
        f.reine            = clamp01(f.earlyQueenMoves / 3);
        f.poussePions      = clamp01(f.centerEarly / 6 + f.passedPawns * 0.2);
        f.activiteTours    = clamp01(f.activeRooks / 4);
        f.finale           = clamp01(f.pieceExchanges / 8);

        return f;
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v || 0)); }

    // ── Comparaison aux styles ───────────────────────────────────────────────
    function similarity(userVec, styleVec) {
        let num = 0, nu = 0, ns = 0;
        for (const d of DIMS) {
            const u = userVec[d] || 0;
            const s = styleVec[d] || 0;
            num += u * s; nu += u * u; ns += s * s;
        }
        if (!nu || !ns) return 0;
        return num / (Math.sqrt(nu) * Math.sqrt(ns));
    }

    function rankStyles(f) {
        const out = [];
        for (const key of Object.keys(STYLES)) {
            const s = STYLES[key];
            const sim = similarity(f, s.vector);
            const shared = s.patterns.filter(function (p) {
                return PATTERNS[p] && PATTERNS[p].test(f);
            });
            const pct = Math.round(sim * 100);
            out.push({
                key: key, name: s.name, emoji: s.emoji, era: s.era,
                pitch: s.pitch, accent: s.colors.accent,
                similarity: sim, percent: pct,
                sharedPatterns: shared.map(function (p) { return PATTERNS[p].name; }),
            });
        }
        out.sort(function (a, b) { return b.similarity - a.similarity; });
        return out;
    }

    // ── Détection de patterns ────────────────────────────────────────────────
    function detectPatterns(f) {
        const found = [];
        for (const key of Object.keys(PATTERNS)) {
            const p = PATTERNS[key];
            let hit = false;
            try { hit = !!p.test(f); } catch (e) { hit = false; }
            if (hit) found.push({ key: key, name: p.name, lesson: p.lesson, style: p.style });
        }
        return found;
    }

    // ── Registre des sacrifices ──────────────────────────────────────────────
    function sacrificeLedger(moveLog) {
        const sac = moveLog.filter(function (m) { return m.isSacrifice; });
        const winning = [], losing = [], limite = [];
        for (const m of sac) {
            if (m.score >= 8.5) winning.push(m);
            else if (m.score >= 5) limite.push(m);
            else losing.push(m);
        }
        const avg = function (arr) {
            if (!arr.length) return null;
            return arr.reduce(function (a, m) { return a + m.score; }, 0) / arr.length;
        };
        const total = sac.length || 1;
        return {
            total: sac.length,
            winning: winning.length,
            limite: limite.length,
            losing: losing.length,
            winRate: Math.round((winning.length / total) * 100),
            avgScore: avg(sac),
            avgWinning: avg(winning),
            avgLosing: avg(losing),
            best: winning.slice().sort(function (a, b) { return b.score - a.score; })[0] || null,
            worst: losing.slice().sort(function (a, b) { return a.score - b.score; })[0] || null,
            list: sac,
        };
    }

    // ── Résolution de problèmes : rapidité et précision ──────────────────────
    function solveStats() {
        const qs = window.supaQuickSolve;
        if (!qs || !qs.getStats) return null;
        const s = qs.getStats();
        const attempts = s.solved + s.failed;
        return {
            solved: s.solved,
            failed: s.failed,
            attempts: attempts,
            accuracy: attempts ? Math.round((s.solved / attempts) * 100) : null,
            avgMs: s.avgMs,
            fastest: s.fastest,
            streak: s.streak,
            best: s.best,
            byLevel: s.byLevel,
        };
    }

    // Croise la précision tactique avec le temps de réaction
    function solveProfile() {
        const s = solveStats();
        if (!s || !s.attempts) return null;
        const speed = s.avgMs == null ? 0.5
            : Math.max(0, Math.min(1, 1 - (s.avgMs - 2000) / 12000));
        const acc = (s.accuracy == null ? 50 : s.accuracy) / 100;
        return {
            stats: s,
            vitesse: speed,
            precision: acc,
            indice: Math.round(speed * 40 + acc * 60),
            lecture: acc >= 0.8 && speed >= 0.7 ? 'Calcul rapide, très fiable'
                : acc >= 0.8 ? 'Bonne lecture, mais trop de temps de réflexion'
                : speed >= 0.7 ? 'Vif mais imprécis : vérifie avant de jouer'
                : 'Prends le temps de calculer la réfutation',
        };
    }

    // ── Coups brillants à appliquer (le « trouveur ») ────────────────────────
    function brilliantTargets(snap, limit) {
        if (!snap) return [];
        const out = [];
        for (const key of Object.keys(snap.analysis || {})) {
            const a = snap.analysis[key];
            if (a.quality !== 'bril' && a.quality !== 'best' && a.quality !== 'excel') continue;
            out.push({
                uci: key, quality: a.quality, tactic: a.tactic || null,
                diff: a.diff, sanSeq: a.sanSeq || [], inBook: !!(snap.bookMoves && snap.bookMoves.has(key)),
            });
        }
        out.sort(function (a, b) { return (a.diff || 0) - (b.diff || 0); });
        return out.slice(0, limit || 5);
    }

    // ── Parcours d'entraînement ─────────────────────────────────────────────
    const PARCOURS = {
        parStyle: function (styleKey) {
            const s = STYLES[styleKey];
            if (!s) return null;
            const steps = [
                { title: 'Observer', body: 'Regarde 3 parties de ' + s.name + ' et note chaque sacrifice sur une feuille.' },
                { title: 'Reproduire', body: 'Rejoue une de ses parties coup par coup contre l\'assistant, sans regarder le texte.' },
                { title: 'Appliquer', body: 'Dans une partie libre, cherche au moins 2 fois par partie un pattern de ' + s.name + '.' },
                { title: 'Vérifier', body: 'Compare tes patterns détectés à ceux de ' + s.name + ' : la similarité doit monter.' },
            ];
            return { key: 'style:' + styleKey, title: 'Parcours ' + s.name, emoji: s.emoji,
                     goal: s.pitch, steps: steps, patterns: s.patterns };
        },
        parSacrifices: function () {
            return {
                key: 'sacrifices',
                title: 'Parcours sacrifices',
                emoji: '🎯',
                goal: 'Distinguer le sacrifice forcé du sacrifice ditrile. '
                    + 'Objectif : 70% de sacrifices gagnants.',
                steps: [
                    { title: 'Sacrifice gagnant', body: 'Trouve un coup où l\'adversaire DOIT accepter la pièce. Le moteur le marque 🌟.' },
                    { title: 'Sacrifice perdant', body: 'Joue un sacrifice non forcé et regarde la note /10 tomber. Note la tentation.' },
                    { title: 'Chaîne', body: 'Enchaîne deux sacrifices dont le premier est forcé : le second devient crédible.' },
                    { title: 'Filtre', body: 'Avant chaque sacrifice, demande-toi : « quelle est la réfutation ? ». Sans réponse, ne sacrifice pas.' },
                ],
            };
        },
        parFinales: function () {
            return {
                key: 'finales',
                title: 'Parcours finales',
                emoji: '👑',
                goal: 'Convertir l\'avantage en victoire : pions passés, activity des tours, roi actif.',
                steps: [
                    { title: 'Planifier', body: 'Compte tes pions passers et les cases de promotion avant de pousser.' },
                    { title: 'Roi actif', body: 'Avance ton roi tant que la partie n\'est pas tranchée.' },
                    { title: 'Technique', body: 'Traîne les tours sur les pions arriérés au lieu de chercher des pions.' },
                ],
            };
        },
    };

    function listParcours() {
        const out = [];
        for (const key of Object.keys(STYLES)) {
            const p = PARCOURS.parStyle(key);
            if (p) out.push(p);
        }
        out.push(PARCOURS.parSacrifices());
        out.push(PARCOURS.parFinales());
        return out;
    }

    // ── Rapport complet ──────────────────────────────────────────────────────
    function report() {
        const log = window.supaBubbles ? window.supaBubbles.getHistory() : [];
        const game = engineGame();
        const f = computeFeatures(game, log);
        return {
            moves: log.length,
            features: f,
            styles: rankStyles(f),
            patterns: detectPatterns(f),
            sacrifices: sacrificeLedger(log),
            solve: solveStats(),
            solveProfile: solveProfile(),
            log: log,
        };
    }

    function engineGame() {
        if (window.supaDots && window.supaDots.getGame) return window.supaDots.getGame();
        return null;
    }

    // ── API publique ─────────────────────────────────────────────────────────
    window.supaStyle = {
        DIMS: DIMS,
        STYLES: STYLES,
        PATTERNS: PATTERNS,
        STYLES_LIST: Object.keys(STYLES),
        report: report,
        computeFeatures: computeFeatures,
        rankStyles: rankStyles,
        detectPatterns: detectPatterns,
        sacrificeLedger: sacrificeLedger,
        brilliantTargets: brilliantTargets,
        solveStats: solveStats,
        solveProfile: solveProfile,
        listParcours: listParcours,
        parStyle: PARCOURS.parStyle,
        parSacrifices: PARCOURS.parSacrifices,
        parFinales: PARCOURS.parFinales,
        getStyle: function (key) { return STYLES[key] || null; },
    };

    // Réévalue le rapport dès qu'un coup est noté
    document.addEventListener('supa:moveEvaluated', function () {
        document.dispatchEvent(new CustomEvent('supa:styleUpdated', { detail: report() }));
    });

})();
