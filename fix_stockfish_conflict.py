#!/usr/bin/env python3
"""Fix Stockfish analysis conflict with AI moves"""

import re

# Read the file
with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Old code to replace
old_code = '''        // Queue pour les analyses Stockfish (évite les conflits)
        let sfAnalysisCallback = null;
        let sfAnalysisLastScore = null;
        let sfAnalysisResolved = false;

        function analyzeWithStockfish(fen, depth, callback) {
            if (!stockfish || !stockfishReady) {
                callback(null);
                return;
            }

            sfAnalysisLastScore = null;
            sfAnalysisResolved = false;
            sfAnalysisCallback = callback;

            // Sauvegarder l'ancien handler et installer le nôtre
            const oldOnMessage = stockfish.onmessage;
            stockfish.onmessage = function(event) {
                const line = typeof event === 'string' ? event : event.data;

                // Stocker le dernier score (on veut le score final, pas le premier!)
                if (line.includes('score cp')) {
                    const match = line.match(/score cp (-?\\d+)/);
                    if (match) {
                        sfAnalysisLastScore = parseInt(match[1]);
                    }
                } else if (line.includes('score mate')) {
                    const match = line.match(/score mate (-?\\d+)/);
                    if (match) {
                        const mateIn = parseInt(match[1]);
                        sfAnalysisLastScore = mateIn > 0 ? 10000 - mateIn * 100 : -10000 + Math.abs(mateIn) * 100;
                    }
                }

                // Attendre "bestmove" pour s'assurer que l'analyse est terminée
                if (line.startsWith('bestmove')) {
                    if (!sfAnalysisResolved && sfAnalysisCallback) {
                        sfAnalysisResolved = true;
                        const cb = sfAnalysisCallback;
                        sfAnalysisCallback = null;
                        // Restaurer l'ancien handler
                        stockfish.onmessage = oldOnMessage;
                        cb(sfAnalysisLastScore);
                    }
                }

                // Aussi traiter les messages pour le jeu normal (bestmove pour l'IA)
                if (oldOnMessage && line.startsWith('bestmove') && pendingMove) {
                    oldOnMessage(event);
                }
            };

            stockfish.postMessage(`position fen ${fen}`);
            stockfish.postMessage(`go depth ${depth}`);

            // Timeout après 1 seconde (ultra rapide pour suggestions)
            setTimeout(() => {
                if (!sfAnalysisResolved && sfAnalysisCallback) {
                    sfAnalysisResolved = true;
                    const cb = sfAnalysisCallback;
                    sfAnalysisCallback = null;
                    stockfish.onmessage = oldOnMessage;
                    stockfish.postMessage('stop');
                    cb(sfAnalysisLastScore);
                }
            }, 1000);
        }'''

# New fixed code
new_code = '''        // Queue pour les analyses Stockfish (évite les conflits)
        let sfAnalysisCallback = null;
        let sfAnalysisLastScore = null;
        let sfAnalysisResolved = false;
        let sfAnalysisTimeoutId = null;
        let analysisAborted = false;

        // Annuler toute analyse en cours (appelé quand l'IA doit jouer)
        function abortAnalysis() {
            analysisAborted = true;
            if (sfAnalysisCallback) {
                sfAnalysisResolved = true;
                sfAnalysisCallback = null;
            }
            if (sfAnalysisTimeoutId) {
                clearTimeout(sfAnalysisTimeoutId);
                sfAnalysisTimeoutId = null;
            }
            if (stockfish && stockfishReady) {
                try { stockfish.postMessage('stop'); } catch(e) {}
            }
            // Restaurer le handler original
            if (window._originalSfHandler && stockfish) {
                stockfish.onmessage = window._originalSfHandler;
            }
        }

        function analyzeWithStockfish(fen, depth, callback) {
            // Si l'analyse a été annulée (IA doit jouer), retourner immédiatement
            if (analysisAborted || !stockfish || !stockfishReady) {
                callback(null);
                return;
            }

            sfAnalysisLastScore = null;
            sfAnalysisResolved = false;
            sfAnalysisCallback = callback;

            // Sauvegarder le handler original une seule fois
            if (!window._originalSfHandler) {
                window._originalSfHandler = stockfish.onmessage;
            }
            const oldOnMessage = window._originalSfHandler;

            stockfish.onmessage = function(event) {
                const line = typeof event === 'string' ? event : event.data;

                // PRIORITÉ 1: Si l'IA attend un coup (pendingMove), lui donner priorité
                if (line.startsWith('bestmove') && pendingMove) {
                    // Annuler l'analyse en cours
                    if (sfAnalysisCallback) {
                        sfAnalysisResolved = true;
                        const cb = sfAnalysisCallback;
                        sfAnalysisCallback = null;
                        cb(null); // Annuler proprement
                    }
                    // Restaurer et appeler le handler original pour l'IA
                    stockfish.onmessage = oldOnMessage;
                    if (oldOnMessage) oldOnMessage(event);
                    return;
                }

                // Stocker le dernier score (on veut le score final, pas le premier!)
                if (line.includes('score cp')) {
                    const match = line.match(/score cp (-?\\d+)/);
                    if (match) {
                        sfAnalysisLastScore = parseInt(match[1]);
                    }
                } else if (line.includes('score mate')) {
                    const match = line.match(/score mate (-?\\d+)/);
                    if (match) {
                        const mateIn = parseInt(match[1]);
                        sfAnalysisLastScore = mateIn > 0 ? 10000 - mateIn * 100 : -10000 + Math.abs(mateIn) * 100;
                    }
                }

                // Attendre "bestmove" pour s'assurer que l'analyse est terminée
                if (line.startsWith('bestmove')) {
                    if (!sfAnalysisResolved && sfAnalysisCallback) {
                        sfAnalysisResolved = true;
                        const cb = sfAnalysisCallback;
                        sfAnalysisCallback = null;
                        // Restaurer l'ancien handler
                        stockfish.onmessage = oldOnMessage;
                        cb(sfAnalysisLastScore);
                    }
                }
            };

            stockfish.postMessage(`position fen ${fen}`);
            stockfish.postMessage(`go depth ${depth}`);

            // Timeout après 1 seconde (ultra rapide pour suggestions)
            sfAnalysisTimeoutId = setTimeout(() => {
                if (!sfAnalysisResolved && sfAnalysisCallback) {
                    sfAnalysisResolved = true;
                    const cb = sfAnalysisCallback;
                    sfAnalysisCallback = null;
                    stockfish.onmessage = oldOnMessage;
                    stockfish.postMessage('stop');
                    cb(sfAnalysisLastScore);
                }
            }, 1000);
        }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("✓ Replaced analyzeWithStockfish function")
else:
    print("✗ Could not find exact match for analyzeWithStockfish")
    # Try to find partial match
    if 'function analyzeWithStockfish' in content:
        print("  (function exists, but text doesn't match exactly)")

# Also need to add abortAnalysis() call in makeAIMove
# Find the line where AI starts moving and add abort call
old_ai = '''            isAIThinking = true;
            const thinkingEl = document.getElementById('thinking');
            thinkingEl.classList.add('active');'''

new_ai = '''            isAIThinking = true;
            const thinkingEl = document.getElementById('thinking');
            thinkingEl.classList.add('active');

            // Annuler toute analyse Stockfish en cours pour éviter les conflits
            abortAnalysis();
            analysisAborted = false; // Reset pour les futures analyses'''

if old_ai in content:
    content = content.replace(old_ai, new_ai)
    print("✓ Added abortAnalysis() call in makeAIMove")
else:
    print("✗ Could not find makeAIMove start")

# Write back
with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ Fix applied!")
