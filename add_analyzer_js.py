#!/usr/bin/env python3
"""Add analyzer JavaScript variables and function"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_js = '''        let analysisAborted = false;

        // Annuler toute analyse en cours (appelé quand l'IA doit jouer)'''

new_js = '''        let analysisAborted = false;
        let analyzerDepth = 8; // Profondeur d'analyse par défaut
        
        const analyzerLevels = {
            5: { elo: 1800, name: 'Rapide' },
            8: { elo: 2200, name: 'Standard' },
            12: { elo: 2500, name: 'Précis' },
            15: { elo: 3000, name: 'Expert' },
            18: { elo: 3400, name: 'Maximum' }
        };
        
        function changeAnalyzerLevel(depth) {
            analyzerDepth = parseInt(depth);
            const level = analyzerLevels[analyzerDepth];
            const infoEl = document.getElementById('analyzer-info');
            if (infoEl && level) {
                infoEl.textContent = `(🐟 SF10 ~${level.elo} ELO)`;
            }
            // Relancer l'analyse avec la nouvelle profondeur
            if (stockfishReady) {
                updateSuggestedMoves();
            }
            showToast(`🐟 Analyse: profondeur ${analyzerDepth} (~${level.elo} ELO)`, 'info', 2000);
        }

        // Annuler toute analyse en cours (appelé quand l'IA doit jouer)'''

if old_js in content:
    content = content.replace(old_js, new_js)
    print("✓ Added analyzer JavaScript")
else:
    print("✗ Could not find JS location")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Done!")
