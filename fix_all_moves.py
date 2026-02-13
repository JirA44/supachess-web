#!/usr/bin/env python3
"""Fix to show all moves, not just Stockfish-analyzed ones"""

# Read the file
with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Reset analysisAborted at start of updateSuggestedMovesWithStockfish
old_start = '''        async function updateSuggestedMovesWithStockfish() {
            const container = document.getElementById('suggested-moves-list');
            const statsContainer = document.getElementById('moves-stats');
            if (!container || game.game_over()) return;

            if (!stockfish || !stockfishReady) {'''

new_start = '''        async function updateSuggestedMovesWithStockfish() {
            const container = document.getElementById('suggested-moves-list');
            const statsContainer = document.getElementById('moves-stats');
            if (!container || game.game_over()) return;

            // Reset le flag d'annulation pour permettre l'analyse
            analysisAborted = false;

            if (!stockfish || !stockfishReady) {'''

if old_start in content:
    content = content.replace(old_start, new_start)
    print("✓ Added analysisAborted reset at start of updateSuggestedMovesWithStockfish")
else:
    print("✗ Could not find updateSuggestedMovesWithStockfish start")

# Fix 2: Merge Stockfish results with ALL moves instead of replacing
old_merge = '''                // Mettre à jour avec scores Stockfish
                if (sfResults.length > 0) {
                    sfResults.sort((a, b) => b.sfScore - a.sfScore);
                    const bestScore = sfResults[0].sfScore;

                    allEvaluatedMoves = sfResults.map(item => {
                        const evalDiff = bestScore - item.sfScore;
                        let category;
                        if (evalDiff <= 10) category = 'excellent';
                        else if (evalDiff <= 30) category = 'good';
                        else if (evalDiff <= 80) category = 'ok';
                        else if (evalDiff <= 150) category = 'dubious';
                        else if (evalDiff <= 300) category = 'bad';
                        else category = 'blunder';

                        return {
                            move: item.move,
                            evalScore: item.sfScore,
                            evalDiff,
                            category,
                            isStockfish: true
                        };
                    });

                    renderFilteredMoves();'''

new_merge = '''                // Mettre à jour avec scores Stockfish (FUSIONNER, pas remplacer)
                if (sfResults.length > 0) {
                    sfResults.sort((a, b) => b.sfScore - a.sfScore);
                    const bestScore = sfResults[0].sfScore;

                    // Créer un map pour lookup rapide des scores SF
                    const sfScoreMap = new Map();
                    sfResults.forEach(item => {
                        sfScoreMap.set(item.move.san, item.sfScore);
                    });

                    // Mettre à jour TOUS les coups avec les scores Stockfish si disponibles
                    allEvaluatedMoves = allEvaluatedMoves.map(item => {
                        const sfScore = sfScoreMap.get(item.move.san);
                        if (sfScore !== undefined) {
                            const evalDiff = bestScore - sfScore;
                            let category;
                            if (evalDiff <= 10) category = 'excellent';
                            else if (evalDiff <= 30) category = 'good';
                            else if (evalDiff <= 80) category = 'ok';
                            else if (evalDiff <= 150) category = 'dubious';
                            else if (evalDiff <= 300) category = 'bad';
                            else category = 'blunder';

                            return {
                                move: item.move,
                                evalScore: sfScore,
                                evalDiff,
                                category,
                                isStockfish: true
                            };
                        }
                        // Garder l'éval minimax pour les coups non analysés par Stockfish
                        return { ...item, isStockfish: false };
                    });

                    // Re-trier par score (SF d'abord, puis minimax)
                    allEvaluatedMoves.sort((a, b) => {
                        // Priorité aux coups analysés par Stockfish
                        if (a.isStockfish && !b.isStockfish) return -1;
                        if (!a.isStockfish && b.isStockfish) return 1;
                        return b.evalScore - a.evalScore;
                    });

                    renderFilteredMoves();'''

if old_merge in content:
    content = content.replace(old_merge, new_merge)
    print("✓ Changed to merge Stockfish results with all moves")
else:
    print("✗ Could not find merge section")

# Write back
with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ All fixes applied!")
