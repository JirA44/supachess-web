
// SupaChess Enhanced Evaluation v2.0
// Piece-Square Tables for positional play

const PST = {
    p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k_mg: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
    k_eg: [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50]
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluatePosition(game) {
    const fen = game.fen();
    const board = game.board();

    let score = 0;
    let whiteMaterial = 0;
    let blackMaterial = 0;
    let pieceCount = 0;

    // Count material and position
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (!piece) continue;

            pieceCount++;
            const sq = rank * 8 + file;
            const sqFlip = (7 - rank) * 8 + file;
            const pieceType = piece.type;
            const isWhite = piece.color === 'w';

            // Material
            const materialValue = PIECE_VALUES[pieceType] || 0;
            if (isWhite) {
                whiteMaterial += materialValue;
                score += materialValue;
            } else {
                blackMaterial += materialValue;
                score -= materialValue;
            }

            // Position (PST)
            let pstValue = 0;
            if (pieceType === 'p') pstValue = PST.p[isWhite ? sqFlip : sq];
            else if (pieceType === 'n') pstValue = PST.n[isWhite ? sqFlip : sq];
            else if (pieceType === 'b') pstValue = PST.b[isWhite ? sqFlip : sq];
            else if (pieceType === 'r') pstValue = PST.r[isWhite ? sqFlip : sq];
            else if (pieceType === 'q') pstValue = PST.q[isWhite ? sqFlip : sq];
            else if (pieceType === 'k') {
                // Use endgame table if low material
                const isEndgame = whiteMaterial + blackMaterial < 2600;
                pstValue = isEndgame ? PST.k_eg[isWhite ? sqFlip : sq] : PST.k_mg[isWhite ? sqFlip : sq];
            }

            score += isWhite ? pstValue : -pstValue;
        }
    }

    // Mobility bonus
    const moves = game.moves().length;
    score += moves * 5;

    // Check bonus
    if (game.isCheck()) {
        score += game.turn() === 'w' ? -50 : 50;
    }

    // Return from perspective of side to move
    return game.turn() === 'w' ? score : -score;
}

function findBestZupMoveEnhanced() {
    if (!game) return null;
    const fen = game.fen();
    const moves = game.moves({ verbose: true });

    // Check opening book first
    if (game.history().length < 30 && openingBook) {
        const bookMove = getOpeningMove(fen);
        if (bookMove) {
            const from = bookMove.substring(0, 2);
            const to = bookMove.substring(2, 4);
            for (const m of moves) {
                if (m.from === from && m.to === to) {
                    console.log('[ZUP] Opening book:', m.san);
                    return m.san;
                }
            }
        }
    }

    let bestMove = null;
    let bestScore = -Infinity;
    const boardFen = fen.split(' ')[0];

    for (const move of moves) {
        let score = 0;

        // Q-table knowledge
        const moveKey = boardFen + '_' + move.from + move.to;
        if (zupQTable[moveKey] !== undefined) {
            score += zupQTable[moveKey] * 3;
        }

        // Resulting position
        game.move(move);
        const resultFen = game.fen().split(' ')[0];

        // Q-table position score
        const posScore = zupQTable[resultFen];
        if (posScore !== undefined) {
            score += posScore * 2;
        }

        // Enhanced evaluation
        score += evaluatePosition(game) / 100;

        game.undo();

        // Capture bonus (MVV-LVA)
        if (move.captured) {
            const victimValue = PIECE_VALUES[move.captured] || 100;
            const attackerValue = PIECE_VALUES[move.piece] || 100;
            score += (victimValue - attackerValue / 10) / 100;
        }

        // Check bonus
        if (move.san.includes('+')) score += 0.5;
        if (move.san.includes('#')) score += 100;

        // Small random
        score += Math.random() * 0.05;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move.san;
        }
    }

    return bestMove;
}

// Export for use
window.evaluatePosition = evaluatePosition;
window.findBestZupMoveEnhanced = findBestZupMoveEnhanced;
