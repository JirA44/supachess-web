#!/usr/bin/env python3
"""Fix to record opponent moves in gameHistory with comments"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add function to record opponent move after analyzePlayerMove function
# Find a good place to insert the function
insert_marker = '''        function analyzePlayerMove(move) {'''

record_opponent_func = '''        // Enregistrer le coup de l'adversaire dans l'historique
        function recordOpponentMove(move) {
            if (!move) return;

            // Calculer l'évaluation
            const evalScore = evaluateBoard();

            // Générer un commentaire simple pour l'adversaire
            let comment = '';
            if (move.captured) {
                const pieceNames = { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' };
                comment = `Capture: ${pieceNames[move.captured] || move.captured}`;
            } else if (move.san.includes('+')) {
                comment = 'Échec!';
            } else if (move.san === 'O-O' || move.san === 'O-O-O') {
                comment = 'Roque';
            } else if (move.flags.includes('p')) {
                comment = 'Promotion!';
            }

            // Ajouter à l'historique
            if (!window.gameHistory) window.gameHistory = [];
            window.gameHistory.push({
                moveNum: Math.ceil(game.history().length / 2),
                san: move.san,
                color: 'Noirs',
                eval: evalScore,
                evalDiff: 0,
                rating: null, // Pas de note pour l'adversaire
                quality: '🤖 IA',
                comment: comment,
                tactical: [],
                isOpponent: true
            });
        }

        '''

if insert_marker in content:
    content = content.replace(insert_marker, record_opponent_func + insert_marker)
    print("✓ Added recordOpponentMove function")
else:
    print("✗ Could not find insert marker for recordOpponentMove")

# Add call to recordOpponentMove in fallbackToMinimax (after game.move)
old_minimax = '''            if (bestMove && isAIThinking) {
                game.move(bestMove);
                board.position(game.fen());
                lastEval = evaluateBoard();
                updateGameInfo();
            }
            thinkingEl.classList.remove('active');
            isAIThinking = false;
        }'''

new_minimax = '''            if (bestMove && isAIThinking) {
                const aiMove = game.move(bestMove);
                board.position(game.fen());
                lastEval = evaluateBoard();
                recordOpponentMove(aiMove); // Enregistrer le coup adverse
                updateGameInfo();
            }
            thinkingEl.classList.remove('active');
            isAIThinking = false;
        }'''

if old_minimax in content:
    content = content.replace(old_minimax, new_minimax)
    print("✓ Added recordOpponentMove call in fallbackToMinimax")
else:
    print("✗ Could not find fallbackToMinimax move section")

# Add call to recordOpponentMove in Stockfish callback (after game.move succeeds)
old_sf_move = '''                            const move = game.move({ from, to, promotion });
                            if (move) {
                                board.position(game.fen());
                                lastEval = evaluateBoard();
                                updateGameInfo();
                            } else {'''

new_sf_move = '''                            const move = game.move({ from, to, promotion });
                            if (move) {
                                board.position(game.fen());
                                lastEval = evaluateBoard();
                                recordOpponentMove(move); // Enregistrer le coup adverse
                                updateGameInfo();
                            } else {'''

if old_sf_move in content:
    content = content.replace(old_sf_move, new_sf_move)
    print("✓ Added recordOpponentMove call in Stockfish callback")
else:
    print("✗ Could not find Stockfish move section")

# Also need to add for native engine moves
old_native = '''                    const move = game.move({ from, to, promotion });
                    if (move) {
                        board.position(game.fen());
                        lastEval = evaluateBoard();
                        updateGameInfo();
                    } else {
                        console.warn('[Native] Invalid move:', moveStr);'''

new_native = '''                    const move = game.move({ from, to, promotion });
                    if (move) {
                        board.position(game.fen());
                        lastEval = evaluateBoard();
                        recordOpponentMove(move); // Enregistrer le coup adverse
                        updateGameInfo();
                    } else {
                        console.warn('[Native] Invalid move:', moveStr);'''

if old_native in content:
    content = content.replace(old_native, new_native)
    print("✓ Added recordOpponentMove call in native engine callback")
else:
    print("✗ Could not find native engine move section")

# Fix showGameReport to work even without gameHistory (use game.history() as fallback)
old_report_check = '''        function showGameReport() {
            const hasCurrentGame = window.gameHistory && window.gameHistory.length > 0;
            const hasPastGames = window.allGamesHistory && window.allGamesHistory.length > 0;

            if (!hasCurrentGame && !hasPastGames) {
                showToast('Aucune partie à analyser', 'warning');
                return;
            }'''

new_report_check = '''        function showGameReport() {
            const hasCurrentGame = window.gameHistory && window.gameHistory.length > 0;
            const hasPastGames = window.allGamesHistory && window.allGamesHistory.length > 0;
            const hasChessHistory = game && game.history().length > 0;

            if (!hasCurrentGame && !hasPastGames && !hasChessHistory) {
                showToast('Aucune partie à analyser', 'warning');
                return;
            }

            // Si pas de gameHistory mais des coups ont été joués, créer un rapport basique
            if (!hasCurrentGame && hasChessHistory && !hasPastGames) {
                const history = game.history({ verbose: true });
                const opponent = window.currentOpponent || difficultyLevels[difficulty]?.name || 'IA';
                const pgn = game.pgn();

                let reportHTML = `
                    <div id="game-report-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 10000; overflow-y: auto; padding: 20px;">
                        <div style="max-width: 900px; margin: 0 auto; background: var(--bg-secondary); border-radius: 15px; padding: 25px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h2 style="color: var(--accent-primary); margin: 0;">📊 Rapport de Partie</h2>
                                <button onclick="document.getElementById('game-report-modal').remove()" style="background: var(--error); border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; color: white;">✕ Fermer</button>
                            </div>

                            <div style="background: rgba(0,217,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid var(--accent-primary);">
                                <h3 style="color: var(--accent-primary); margin: 0 0 15px 0;">🎮 Partie vs ${opponent}</h3>
                                <p style="color: #888;">Total: ${Math.ceil(history.length / 2)} coups</p>

                                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-top: 15px; font-family: monospace; max-height: 300px; overflow-y: auto;">
                                    <strong style="color: #00d9ff;">Notation PGN:</strong><br><br>
                                    <span style="color: #ddd; white-space: pre-wrap;">${pgn || 'Aucun coup joué'}</span>
                                </div>

                                <button onclick="downloadCurrentPGN()" style="margin-top: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; color: white; font-size: 1em;">📥 Télécharger PGN</button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', reportHTML);
                return;
            }'''

if old_report_check in content:
    content = content.replace(old_report_check, new_report_check)
    print("✓ Fixed showGameReport to work with game.history() fallback")
else:
    print("✗ Could not find showGameReport check section")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ Opponent moves recording fix applied!")
