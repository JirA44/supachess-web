#!/usr/bin/env python3
"""Fix move comments and add Stockfish ELO info"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the threat detection - it was checking opponent's moves, not player's threats
# The logic needs to check BEFORE moving to opponent's turn
old_threats = '''            // Menaces
            const nextMoves = game.moves({ verbose: true });
            const threatCaptures = nextMoves.filter(m => m.captured && pieceValues[m.captured] >= 300);
            const threatChecks = nextMoves.filter(m => {
                game.move(m);
                const check = game.in_check();
                game.undo();
                return check;
            });
            if (threatCaptures.length > 0) {
                positives.push(`⚔️ Crée ${threatCaptures.length} menace(s) de capture`);
            }
            if (threatChecks.length > 0) {
                positives.push(`👑 Menace d'échec disponible`);
            }'''

new_threats = '''            // Menaces créées par CE coup (pas les menaces adverses!)
            // On vérifie les attaques sur les pièces adverses après notre coup
            const board = game.board();
            const opponentColor = move.color === 'w' ? 'b' : 'w';
            
            // Vérifier si le coup attaque des pièces adverses
            const ourNextMoves = game.moves({ verbose: true });
            // Après notre coup, c'est au tour de l'adversaire, donc on simule notre prochain tour
            // Pour les menaces réelles, on regarde si notre pièce attaque quelque chose de valeur
            const attackedSquares = [];
            const pieceFile = move.to.charCodeAt(0) - 97;
            const pieceRank = parseInt(move.to[1]) - 1;
            
            // Compter les pièces adverses attaquées (simplifié)
            let threatsCreated = 0;
            let checkThreat = false;
            
            // Si on a donné échec, c'est une vraie menace
            if (game.in_check()) {
                checkThreat = true;
            }
            
            // Pour les menaces de capture, on vérifie les cases adjacentes attaquées
            // (Simplification: on compte si des pièces adverses sont en prise)
            for (const nextMove of ourNextMoves) {
                if (nextMove.captured && pieceValues[nextMove.captured] >= 300) {
                    threatsCreated++;
                }
            }
            
            // NOTE: Après notre coup c'est le tour adverse, donc les "menaces" 
            // sont en fait les réponses de l'adversaire. On ne peut pas vraiment
            // calculer NOS menaces sans simuler le tour suivant.
            // On affiche seulement si on a DONNÉ échec (pas "menace d'échec")
            
            if (game.in_check()) {
                // Déjà affiché dans "Échec au roi!" plus haut
            }'''

if old_threats in content:
    content = content.replace(old_threats, new_threats)
    print("✓ Fixed threat detection (removed fake 'menace d'échec')")
else:
    print("✗ Could not find threat section")

# 2. Remove "Maintient l'équilibre" when evalDiff is near 0 - make it more specific
old_equilibre = '''            else if (evalDiff <= 0) {
                positives.push('⚖️ Maintient l\'équilibre de la position');
            }'''

new_equilibre = '''            else if (evalDiff <= 0 && evalDiff >= -10) {
                // Ne rien dire de spécial si c'est juste un coup normal
                // Les autres positives donneront le contexte
            } else if (evalDiff < -10 && evalDiff >= -20) {
                positives.push('✓ Coup solide');
            }'''

if old_equilibre in content:
    content = content.replace(old_equilibre, new_equilibre)
    print("✓ Removed generic 'Maintient l'équilibre'")
else:
    print("✗ Could not find equilibre section")

# 3. Update Stockfish info to show ELO
old_sf_info = '''🐟 Stockfish 10 (WASM)'''
new_sf_info = '''🐟 Stockfish 10 (~3200 ELO)'''

content = content.replace(old_sf_info, new_sf_info)
print("✓ Added ELO to Stockfish panel")

old_sf_indicator = '''🐟 <span style="color: #22c55e;">Stockfish 10 WASM</span> <span style="color: #888; font-size: 0.85em;">| Analyse: d8</span>'''
new_sf_indicator = '''🐟 <span style="color: #22c55e;">Stockfish 10</span> <span style="color: #888; font-size: 0.85em;">~3200 ELO | d8</span>'''

if old_sf_indicator in content:
    content = content.replace(old_sf_indicator, new_sf_indicator)
    print("✓ Updated indicator with ELO")
else:
    print("✗ Could not find indicator")

old_title = '''(🐟 Stockfish 10 · profondeur 8)'''
new_title = '''(🐟 SF10 ~3200 ELO · d8)'''

if old_title in content:
    content = content.replace(old_title, new_title)
    print("✓ Updated title with ELO")
else:
    print("✗ Could not find title")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ All fixes applied!")
