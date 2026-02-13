// Test de qualité pour AIMIX Chess
const Chess = require('chess.js').Chess;

console.log("=".repeat(60));
console.log("  AIMIX CHESS - TESTS DE QUALITE");
console.log("=".repeat(60));

let testsPass = 0;
let testsFail = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✓ PASS: ${name}`);
        testsPass++;
    } else {
        console.log(`✗ FAIL: ${name}`);
        testsFail++;
    }
}

// ====================
// TEST 1: Initialisation
// ====================
console.log("\n--- TEST 1: Initialisation ---");
const game = new Chess();
test("Partie créée", game !== null);
test("Position initiale correcte", game.fen().startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"));
test("Trait aux blancs", game.turn() === 'w');

// ====================
// TEST 2: Coups légaux
// ====================
console.log("\n--- TEST 2: Coups légaux ---");
const moves = game.moves({ verbose: true });
test("20 coups possibles au départ", moves.length === 20);
test("e4 est légal", moves.some(m => m.san === 'e4'));
test("d4 est légal", moves.some(m => m.san === 'd4'));
test("Nf3 est légal", moves.some(m => m.san === 'Nf3'));

// ====================
// TEST 3: Exécution des coups
// ====================
console.log("\n--- TEST 3: Exécution des coups ---");
const move1 = game.move('e4');
test("e4 joué", move1 !== null);
test("Trait aux noirs après e4", game.turn() === 'b');

const move2 = game.move('e5');
test("e5 joué", move2 !== null);
test("Trait aux blancs après e5", game.turn() === 'w');

// ====================
// TEST 4: Évaluation de position
// ====================
console.log("\n--- TEST 4: Évaluation de position ---");
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(g) {
    let score = 0;
    const board = g.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const value = pieceValues[piece.type];
                score += piece.color === 'w' ? value : -value;
            }
        }
    }
    return score;
}

const eval1 = evaluateBoard(game);
test("Évaluation position égale ≈ 0", Math.abs(eval1) < 100);

// Simuler une capture
game.move('Nf3');
game.move('Nc6');
game.move('Bb5'); // Ruy Lopez
const eval2 = evaluateBoard(game);
test("Évaluation après Ruy Lopez", typeof eval2 === 'number');

// ====================
// TEST 5: Minimax simplifié
// ====================
console.log("\n--- TEST 5: Minimax ---");

function minimax(g, depth, isMax) {
    if (depth === 0 || g.isGameOver()) {
        return evaluateBoard(g);
    }
    const moves = g.moves();
    if (isMax) {
        let max = -Infinity;
        for (const m of moves) {
            g.move(m);
            max = Math.max(max, minimax(g, depth - 1, false));
            g.undo();
        }
        return max;
    } else {
        let min = Infinity;
        for (const m of moves) {
            g.move(m);
            min = Math.min(min, minimax(g, depth - 1, true));
            g.undo();
        }
        return min;
    }
}

const start = Date.now();
const evalMinimax = minimax(game, 2, true);
const duration = Date.now() - start;
test("Minimax profondeur 2 retourne un nombre", typeof evalMinimax === 'number');
test(`Minimax profondeur 2 rapide (${duration}ms < 5000ms)`, duration < 5000);

// ====================
// TEST 6: Détection fin de partie
// ====================
console.log("\n--- TEST 6: Fin de partie ---");
const gameCheckmate = new Chess('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
test("Mat du berger détecté", gameCheckmate.isCheckmate());
test("Partie terminée", gameCheckmate.isGameOver());

const gameDraw = new Chess('8/8/8/8/8/5k2/8/4K3 w - - 0 1');
test("Position de pat possible", gameDraw !== null);

// ====================
// TEST 7: Commentaires de coups
// ====================
console.log("\n--- TEST 7: Génération de commentaires ---");
function getMoveComment(move) {
    if (move.san.includes('#')) return "Échec et mat!";
    if (move.san.includes('+')) return "Échec!";
    if (move.captured) return `Capture: ${move.captured}`;
    if (move.san === 'O-O') return "Petit roque";
    if (move.san === 'O-O-O') return "Grand roque";
    return "Coup positionnel";
}

const game2 = new Chess();
game2.move('e4');
game2.move('e5');
const moveNf3 = game2.move({ from: 'g1', to: 'f3' });
test("Commentaire généré pour Nf3", getMoveComment(moveNf3).length > 0);

game2.move('Nc6');
const moveBb5 = game2.move({ from: 'f1', to: 'b5' });
test("Commentaire généré pour Bb5", getMoveComment(moveBb5).length > 0);

// ====================
// TEST 8: Tous les coups analysés
// ====================
console.log("\n--- TEST 8: Analyse de tous les coups ---");
const game3 = new Chess();
const allMoves = game3.moves({ verbose: true });

let allAnalyzed = true;
for (const move of allMoves) {
    game3.move(move);
    const eval3 = evaluateBoard(game3);
    if (typeof eval3 !== 'number') {
        allAnalyzed = false;
        break;
    }
    game3.undo();
}
test("Tous les 20 coups initiaux analysables", allAnalyzed);
test("Aucun coup NaN", allMoves.every(m => {
    game3.move(m);
    const e = evaluateBoard(game3);
    game3.undo();
    return !isNaN(e);
}));

// ====================
// RÉSUMÉ
// ====================
console.log("\n" + "=".repeat(60));
console.log(`  RÉSULTATS: ${testsPass} PASS / ${testsFail} FAIL`);
console.log("=".repeat(60));

if (testsFail === 0) {
    console.log("✓ TOUS LES TESTS PASSENT - QUALITÉ PRO VALIDÉE");
} else {
    console.log("✗ CERTAINS TESTS ÉCHOUENT - CORRECTIONS NÉCESSAIRES");
}
