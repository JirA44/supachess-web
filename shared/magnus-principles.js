/* Repères pédagogiques inspirés de Carlsen, pas des citations ni une évaluation. */
(function (root) {
    'use strict';
    const principles = [
        { id: 'opponent', title: 'Comprendre le projet adverse', text: 'Avant ton plan, cherche les échecs, captures et menaces adverses. Quelle réponse te gênerait le plus ?' },
        { id: 'pieces', title: 'Améliorer les pièces', text: 'Repère ta pièce la moins utile et une case où elle aiderait davantage. Un recul peut préparer une meilleure route.' },
        { id: 'pressure', title: 'Accumuler sans forcer', text: 'Si aucune suite forcée ne fonctionne, améliore la position et conserve la pression. Un coup calme peut créer un nouveau problème.' },
        { id: 'exchange', title: 'Échanger avec un but', text: 'Avant une capture, compare la structure de pions et l’activité des pièces restantes. Moins de pièces ne signifie pas automatiquement une meilleure finale.' },
        { id: 'counterplay', title: 'Limiter le contre-jeu', text: 'Cherche la rupture de pion ou la colonne qui libérerait l’adversaire. Vérifie si tu peux la contrôler sans abandonner une menace urgente.' },
        { id: 'king', title: 'Activer le roi en finale', text: 'Avec peu de matériel et sans dames, cherche une route sûre pour rapprocher le roi des pions. Calcule les échecs et les courses à la promotion.' },
        { id: 'passed', title: 'Soutenir le pion passé', text: 'Un pion passé offre un objectif concret : faut-il le soutenir, bloquer le roi adverse ou le pousser ? Vérifie le blocus et les réponses avant d’avancer.' },
        { id: 'resilience', title: 'Garder des ressources', text: 'Dans une position difficile, cherche une défense active, une simplification utile ou une répétition salvatrice. Après une erreur, réévalue la position présente.' }
    ];

    function select(game) {
        if (game.game_over()) return [];
        if (game.in_check()) return [{ id: 'check', title: 'Répondre à l’échec', text: 'Priorité immédiate : sortir de l’échec. Compare les réponses légales et les menaces qui restent après chacune.' }];
        const board = game.board();
        const pieces = [];
        board.forEach((row, r) => row.forEach((p, c) => { if (p) pieces.push({ ...p, r, c }); }));
        const color = game.turn();
        const nonPawn = pieces.filter(p => p.type !== 'p' && p.type !== 'k');
        const endgame = !pieces.some(p => p.type === 'q') && nonPawn.length <= 4;
        const passed = pieces.find(p => p.type === 'p' && p.color === color && !pieces.some(e =>
            e.type === 'p' && e.color !== color && Math.abs(e.c - p.c) <= 1 &&
            (color === 'w' ? e.r < p.r : e.r > p.r)));
        const chosen = [principles[0], endgame ? principles[5] : principles[1]];
        if (passed) {
            const square = String.fromCharCode(97 + passed.c) + (8 - passed.r);
            chosen.push({ ...principles[6], text: `Ton pion ${square} est passé : aucun pion adverse devant lui sur sa colonne ou les colonnes voisines. ${principles[6].text}` });
        } else chosen.push(endgame ? principles[3] : principles[4]);
        return chosen;
    }

    function render(game, elementId) {
        const el = root.document && root.document.getElementById(elementId);
        if (!el) return;
        el.replaceChildren();
        const heading = root.document.createElement('strong');
        heading.textContent = 'Repères Magnus — pour cette position';
        el.appendChild(heading);
        const tips = select(game);
        if (!tips.length) {
            const p = root.document.createElement('p');
            p.textContent = 'Partie terminée : reviens sur les échanges, les menaces et les occasions d’améliorer tes pièces.';
            el.appendChild(p);
        }
        tips.forEach(tip => {
            const p = root.document.createElement('p');
            const title = root.document.createElement('strong');
            title.textContent = tip.title + '. ';
            p.append(title, root.document.createTextNode(tip.text));
            el.appendChild(p);
        });
        const link = root.document.createElement('a');
        link.href = 'MAGNUS_PRINCIPLES.html';
        link.textContent = 'Les 8 principes et leur routine de pratique →';
        link.style.color = '#22d3ee';
        el.appendChild(link);
        const note = root.document.createElement('p');
        note.textContent = 'Pistes à vérifier avec les variantes : elles ne modifient pas le classement des coups.';
        note.style.fontSize = '0.85em';
        el.appendChild(note);
    }
    const api = { principles, select, render };
    root.MagnusPrinciples = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
