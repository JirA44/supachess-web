#!/usr/bin/env python3
"""Align eval bar indicator with gradient"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''                // Mise à jour de la barre d'évaluation (limite à ±5 pions)
                const evalBar = document.getElementById('eval-bar');
                if (evalIndicator && evalBar) {
                    const clampedEval = Math.max(-500, Math.min(500, evaluation));
                    const percent = 50 + (clampedEval / 500) * 50;
                    evalIndicator.style.left = percent + '%';
                    // Mettre à jour le gradient de la barre (noir à gauche, blanc à droite)
                    evalBar.style.background = `linear-gradient(90deg, #1a1a2e 0%, #1a1a2e ${100-percent}%, #f0f0f0 ${100-percent}%, #f0f0f0 100%)`;
                }'''

new_code = '''                // Mise à jour de la barre d'évaluation (limite à ±5 pions)
                const evalBar = document.getElementById('eval-bar');
                if (evalIndicator && evalBar) {
                    const clampedEval = Math.max(-500, Math.min(500, evaluation));
                    // whitePercent = pourcentage de la barre pour blanc (droite)
                    const whitePercent = 50 + (clampedEval / 500) * 50;
                    // Position du curseur = là où commence le blanc
                    const dividePos = 100 - whitePercent;
                    evalIndicator.style.left = dividePos + '%';
                    // Gradient: noir de 0 à dividePos, blanc de dividePos à 100
                    evalBar.style.background = `linear-gradient(90deg, #1a1a2e 0%, #1a1a2e ${dividePos}%, #f0f0f0 ${dividePos}%, #f0f0f0 100%)`;
                }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("✓ Aligned indicator with gradient")
else:
    print("✗ Could not find eval bar section")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Done!")
