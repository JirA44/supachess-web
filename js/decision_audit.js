/* Lightweight browser-side anti-surprise audit; Stockfish remains authoritative. */
(function (root) {
    function auditMove(game, move) {
        var before = game.fen();
        var legal = game.moves({ verbose: true });
        var selected = legal.find(function (candidate) {
            return candidate.san === move || (candidate.from + candidate.to) === move;
        });
        if (!selected) return { error: 'Coup illégal ou introuvable', fen: before };

        game.move(selected);
        var replies = game.moves({ verbose: true });
        var forcing = replies.filter(function (candidate) {
            return candidate.san.indexOf('+') !== -1 || candidate.san.indexOf('#') !== -1 || candidate.captured;
        });
        var result = {
            move: selected.san,
            fen_before: before,
            fen_after: game.fen(),
            opponent_legal_moves: replies.length,
            refutation_candidates: forcing.slice(0, 12).map(function (candidate) { return candidate.san; }),
            surprise_risk: Math.min(100, forcing.length * 10 + (replies.length > 35 ? 20 : 0)),
            note: 'Audit heuristique: vérifier avec Stockfish avant de conclure.'
        };
        game.undo();
        return result;
    }

    root.SupaChessDecisionAudit = { auditMove: auditMove };
}(window));
