#!/usr/bin/env python3
"""Add game over modal with bilan and PGN download"""

# Read the file
with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Old handleGameOver function
old_func = '''        function handleGameOver() {
            let message = '';
            let result = '';

            if (game.in_checkmate()) {
                if (game.turn() === 'w') {
                    message = '🎉 Les noirs gagnent par échec et mat!';
                    result = 'loss';
                    sessionStats.losses++;
                } else {
                    message = '🏆 Victoire par échec et mat!';
                    result = 'win';
                    sessionStats.wins++;

                    // Partie parfaite?
                    const totalMoves = sessionStats.totalMoves;
                    const goodMoves = sessionStats.perfectMoves + sessionStats.brilliantMoves + sessionStats.goodMoves;
                    if (totalMoves > 0 && goodMoves / totalMoves >= 0.95) {
                        unlockAchievement('ach-perfect');
                    }
                }
            } else if (game.in_draw() || game.in_stalemate()) {
                message = '🤝 Match nul';
                result = 'draw';
                sessionStats.draws++;
            } else if (game.in_threefold_repetition()) {
                message = '🔄 Nulle par répétition';
                result = 'draw';
                sessionStats.draws++;
            } else if (game.insufficient_material()) {
                message = '⚖️ Nulle - Matériel insuffisant';
                result = 'draw';
                sessionStats.draws++;
            }

            document.getElementById('move-analysis').innerHTML =
                `<strong style="font-size: 1.2em;">${message}</strong>`;

            showToast(message, result === 'win' ? 'success' : 'info', 5000);
            saveToLocalStorage();

            // Sauvegarder la partie sur le serveur
            if (result) {
                saveGameToServer(result);
            }
        }'''

# New handleGameOver function with modal
new_func = '''        function handleGameOver() {
            let message = '';
            let result = '';
            let emoji = '';

            if (game.in_checkmate()) {
                if (game.turn() === 'w') {
                    message = 'Les noirs gagnent par échec et mat!';
                    emoji = '😔';
                    result = 'loss';
                    sessionStats.losses++;
                } else {
                    message = 'Victoire par échec et mat!';
                    emoji = '🏆';
                    result = 'win';
                    sessionStats.wins++;

                    // Partie parfaite?
                    const totalMoves = sessionStats.totalMoves;
                    const goodMoves = sessionStats.perfectMoves + sessionStats.brilliantMoves + sessionStats.goodMoves;
                    if (totalMoves > 0 && goodMoves / totalMoves >= 0.95) {
                        unlockAchievement('ach-perfect');
                    }
                }
            } else if (game.in_draw() || game.in_stalemate()) {
                message = 'Match nul';
                emoji = '🤝';
                result = 'draw';
                sessionStats.draws++;
            } else if (game.in_threefold_repetition()) {
                message = 'Nulle par répétition';
                emoji = '🔄';
                result = 'draw';
                sessionStats.draws++;
            } else if (game.insufficient_material()) {
                message = 'Nulle - Matériel insuffisant';
                emoji = '⚖️';
                result = 'draw';
                sessionStats.draws++;
            }

            document.getElementById('move-analysis').innerHTML =
                `<strong style="font-size: 1.2em;">${emoji} ${message}</strong>`;

            saveToLocalStorage();

            // Sauvegarder la partie sur le serveur
            if (result) {
                saveGameToServer(result);
            }

            // Afficher le modal de fin de partie
            showGameOverModal(result, message, emoji);
        }

        function showGameOverModal(result, message, emoji) {
            // Calculer les stats de la partie
            const history = game.history({ verbose: true });
            const totalMoves = Math.ceil(history.length / 2);
            const playerMoves = history.filter((m, i) => i % 2 === 0).length;

            // Stats depuis gameHistory si disponible
            const gameStats = window.gameHistory || [];
            const brilliants = gameStats.filter(m => m.rating >= 9).length;
            const goodMoves = gameStats.filter(m => m.rating >= 7 && m.rating < 9).length;
            const inaccuracies = gameStats.filter(m => m.rating >= 5 && m.rating < 7).length;
            const mistakes = gameStats.filter(m => m.rating >= 3 && m.rating < 5).length;
            const blunders = gameStats.filter(m => m.rating < 3).length;
            const avgRating = gameStats.length > 0
                ? (gameStats.reduce((a, b) => a + b.rating, 0) / gameStats.length).toFixed(1)
                : '-';

            // Calculer l'accuracy
            const accuracy = gameStats.length > 0
                ? Math.round((gameStats.filter(m => m.rating >= 7).length / gameStats.length) * 100)
                : 0;

            const opponent = window.currentOpponent || difficultyLevels[difficulty]?.name || 'IA';
            const resultColor = result === 'win' ? '#4ade80' : result === 'loss' ? '#f87171' : '#fbbf24';
            const resultBg = result === 'win' ? 'rgba(74,222,128,0.15)' : result === 'loss' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)';

            const modalHTML = `
                <div id="game-over-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; padding: 30px; max-width: 500px; width: 100%; border: 2px solid ${resultColor}; box-shadow: 0 0 50px ${resultColor}40;">

                        <!-- Résultat -->
                        <div style="text-align: center; margin-bottom: 25px;">
                            <div style="font-size: 4em; margin-bottom: 10px;">${emoji}</div>
                            <h2 style="color: ${resultColor}; margin: 0; font-size: 1.8em;">${message}</h2>
                            <p style="color: #888; margin: 10px 0 0 0;">vs ${opponent}</p>
                        </div>

                        <!-- Stats de la partie -->
                        <div style="background: ${resultBg}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <h3 style="color: #00d9ff; margin: 0 0 15px 0; text-align: center;">📊 Bilan de la partie</h3>

                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5em; color: #00d9ff;">${totalMoves}</div>
                                    <div style="color: #888; font-size: 0.8em;">Coups</div>
                                </div>
                                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5em; color: #4ade80;">${avgRating}/10</div>
                                    <div style="color: #888; font-size: 0.8em;">Moyenne</div>
                                </div>
                                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5em; color: #a78bfa;">${accuracy}%</div>
                                    <div style="color: #888; font-size: 0.8em;">Précision</div>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center;">
                                <div style="background: rgba(250,204,21,0.2); padding: 8px; border-radius: 6px;">
                                    <div style="color: #facc15; font-weight: bold;">⭐${brilliants}</div>
                                    <div style="color: #888; font-size: 0.7em;">Brillant</div>
                                </div>
                                <div style="background: rgba(74,222,128,0.2); padding: 8px; border-radius: 6px;">
                                    <div style="color: #4ade80; font-weight: bold;">✓${goodMoves}</div>
                                    <div style="color: #888; font-size: 0.7em;">Bon</div>
                                </div>
                                <div style="background: rgba(251,191,36,0.2); padding: 8px; border-radius: 6px;">
                                    <div style="color: #fbbf24; font-weight: bold;">?${inaccuracies}</div>
                                    <div style="color: #888; font-size: 0.7em;">Imprécis</div>
                                </div>
                                <div style="background: rgba(251,146,60,0.2); padding: 8px; border-radius: 6px;">
                                    <div style="color: #fb923c; font-weight: bold;">?${mistakes}</div>
                                    <div style="color: #888; font-size: 0.7em;">Erreur</div>
                                </div>
                                <div style="background: rgba(248,113,113,0.2); padding: 8px; border-radius: 6px;">
                                    <div style="color: #f87171; font-weight: bold;">✗${blunders}</div>
                                    <div style="color: #888; font-size: 0.7em;">Gaffe</div>
                                </div>
                            </div>
                        </div>

                        <!-- Boutons -->
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button onclick="downloadCurrentPGN()" style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; color: white; font-size: 1em; font-weight: bold;">
                                📥 Télécharger PGN
                            </button>
                            <button onclick="showGameReport()" style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%); border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; color: white; font-size: 1em; font-weight: bold;">
                                📊 Voir Rapport
                            </button>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button onclick="closeGameOverModal(); startNewGame();" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 15px 20px; border-radius: 10px; cursor: pointer; color: white; font-size: 1.1em; font-weight: bold;">
                                🔄 Nouvelle Partie
                            </button>
                            <button onclick="closeGameOverModal()" style="flex: 0; background: rgba(255,255,255,0.1); border: 1px solid #444; padding: 15px 20px; border-radius: 10px; cursor: pointer; color: #888; font-size: 1em;">
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Supprimer modal existant si présent
            const existingModal = document.getElementById('game-over-modal');
            if (existingModal) existingModal.remove();

            // Ajouter le modal
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        function closeGameOverModal() {
            const modal = document.getElementById('game-over-modal');
            if (modal) modal.remove();
        }

        function downloadCurrentPGN() {
            const pgn = game.pgn();
            if (!pgn) {
                showToast('Aucune partie à télécharger', 'error');
                return;
            }

            const opponent = window.currentOpponent || difficultyLevels[difficulty]?.name || 'IA';
            const date = new Date().toISOString().split('T')[0];
            const result = game.in_checkmate()
                ? (game.turn() === 'w' ? '0-1' : '1-0')
                : game.in_draw() ? '1/2-1/2' : '*';

            let pgnContent = `[Event "AIMix Pro Game"]\\n`;
            pgnContent += `[Site "AIMix Chess"]\\n`;
            pgnContent += `[Date "${date}"]\\n`;
            pgnContent += `[White "${currentUser?.username || 'Player'}"]\\n`;
            pgnContent += `[Black "${opponent}"]\\n`;
            pgnContent += `[Result "${result}"]\\n\\n`;
            pgnContent += pgn;

            const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aimix_${date}_vs_${opponent.replace(/[^a-zA-Z0-9]/g, '_')}.pgn`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('📥 PGN téléchargé!', 'success');
        }'''

if old_func in content:
    content = content.replace(old_func, new_func)
    print("✓ Replaced handleGameOver with new version including modal")
else:
    print("✗ Could not find handleGameOver function")
    # Debug
    if 'function handleGameOver()' in content:
        print("  (function exists but doesn't match exactly)")

# Write back
with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fix applied!")
