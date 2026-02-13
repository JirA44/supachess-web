import re

with open('D:/TransferFromC/aimix-cloudflare/AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Trouver et remplacer detectTacticalPatterns et countAttackedPieces
old_pattern = r'function detectTacticalPatterns\(move\) \{[\s\S]*?function countAttackedPieces\(square\) \{[\s\S]*?\n        \}'

new_code = '''function detectTacticalPatterns(move) {
            const patterns = [];
            const dominated_board = game.board();
            const playerColor = move.color;

            // === CAPTURE ===
            if (move.captured) {
                const captureValue = pieceValues[move.captured] || 100;
                const pieceValue = pieceValues[move.piece] || 100;
                if (captureValue > pieceValue + 100) {
                    patterns.push('🎯 Capture gagnante');
                } else if (Math.abs(captureValue - pieceValue) <= 100) {
                    patterns.push('⚔️ Échange');
                } else {
                    patterns.push('💀 Sacrifice');
                }
            }

            // === ÉCHEC ===
            if (game.in_check()) {
                patterns.push('👑 Échec');
                if (game.in_checkmate()) {
                    patterns.push('🏆 ÉCHEC ET MAT!');
                }
            }

            // === PROMOTION ===
            if (move.promotion) {
                patterns.push('👑 Promotion');
            }

            // === FOURCHETTE (Fork) ===
            const attackedPieces = getAttackedValuablePieces(move.to);
            if (attackedPieces >= 2) {
                patterns.push('🔱 Fourchette');
            }

            // === CLOUAGE (Pin) ===
            const pin = detectPinAfterMove(dominated_board, playerColor);
            if (pin) {
                patterns.push('📌 Clouage');
            }

            // === ENFILADE (Skewer) ===
            if (['b', 'r', 'q'].includes(move.piece)) {
                const skewer = detectSkewerAfterMove(move, dominated_board, playerColor);
                if (skewer) {
                    patterns.push('🗡️ Enfilade');
                }
            }

            // === ATTAQUE À LA DÉCOUVERTE ===
            if (game.in_check() && !isDirectCheck(move)) {
                patterns.push('💥 Échec à la découverte');
            }

            // === DOUBLE ATTAQUE ===
            const allAttacked = countAttackedPieces(move.to);
            if (allAttacked >= 2 && attackedPieces < 2) {
                patterns.push('⚡ Double attaque');
            }

            return patterns;
        }

        function getAttackedValuablePieces(square) {
            const moves = game.moves({ verbose: true, square: square });
            return moves.filter(m => m.captured && pieceValues[m.captured] >= 300).length;
        }

        function detectPinAfterMove(boardArray, playerColor) {
            const oppColor = playerColor === 'w' ? 'b' : 'w';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = boardArray[r][c];
                    if (!piece || piece.color !== playerColor) continue;
                    if (!['b', 'r', 'q'].includes(piece.type)) continue;

                    const dirs = piece.type === 'b' ? [[1,1],[1,-1],[-1,1],[-1,-1]] :
                                 piece.type === 'r' ? [[0,1],[0,-1],[1,0],[-1,0]] :
                                 [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

                    for (const [dr, dc] of dirs) {
                        let pinnedPiece = null;
                        let nr = r + dr, nc = c + dc;
                        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const target = boardArray[nr][nc];
                            if (target) {
                                if (target.color === oppColor) {
                                    if (!pinnedPiece) {
                                        pinnedPiece = target;
                                    } else if (target.type === 'k' || target.type === 'q') {
                                        return true;
                                    } else break;
                                } else break;
                            }
                            nr += dr; nc += dc;
                        }
                    }
                }
            }
            return false;
        }

        function detectSkewerAfterMove(move, boardArray, playerColor) {
            const oppColor = playerColor === 'w' ? 'b' : 'w';
            const toFile = move.to.charCodeAt(0) - 97;
            const toRank = 8 - parseInt(move.to[1]);

            const dirs = move.piece === 'b' ? [[1,1],[1,-1],[-1,1],[-1,-1]] :
                         move.piece === 'r' ? [[0,1],[0,-1],[1,0],[-1,0]] :
                         [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

            for (const [dr, dc] of dirs) {
                let firstPiece = null;
                let nr = toRank + dr, nc = toFile + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = boardArray[nr][nc];
                    if (target) {
                        if (target.color === oppColor) {
                            if (!firstPiece && ['k', 'q', 'r'].includes(target.type)) {
                                firstPiece = target;
                            } else if (firstPiece) {
                                return true;
                            } else break;
                        } else break;
                    }
                    nr += dr; nc += dc;
                }
            }
            return false;
        }

        function isDirectCheck(move) {
            // Vérifie si c'est la pièce bougée qui donne l'échec directement
            const checkMoves = game.moves({ verbose: true, square: move.to });
            return checkMoves.some(m => m.captured === 'k');
        }

        function countAttackedPieces(square) {
            const moves = game.moves({ verbose: true, square: square });
            return moves.filter(m => m.captured).length;
        }'''

match = re.search(old_pattern, content)
if match:
    content = content[:match.start()] + new_code + content[match.end():]
    print('Tactiques améliorées!')
else:
    print('Pattern non trouvé, recherche alternative...')
    # Recherche plus simple
    start = content.find('function detectTacticalPatterns(move) {')
    if start != -1:
        # Trouver la fin de countAttackedPieces
        end_marker = content.find('// Base de données des ouvertures', start)
        if end_marker != -1:
            content = content[:start] + new_code + '\n\n        ' + content[end_marker:]
            print('Tactiques améliorées (méthode alternative)!')
        else:
            print('Marqueur de fin non trouvé')
    else:
        print('Fonction non trouvée')

with open('D:/TransferFromC/aimix-cloudflare/AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)
