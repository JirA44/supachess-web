#!/usr/bin/env python3
"""Make eval bar dynamically show the proportion"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the eval bar section to also change the gradient
old_code = '''                // Mise à jour de la barre d'évaluation (limite à ±5 pions)
                if (evalIndicator) {
                    const clampedEval = Math.max(-500, Math.min(500, evaluation));
                    const percent = 50 + (clampedEval / 500) * 50;
                    evalIndicator.style.left = percent + '%';
                }'''

new_code = '''                // Mise à jour de la barre d'évaluation (limite à ±5 pions)
                const evalBar = document.getElementById('eval-bar');
                if (evalIndicator && evalBar) {
                    const clampedEval = Math.max(-500, Math.min(500, evaluation));
                    const percent = 50 + (clampedEval / 500) * 50;
                    evalIndicator.style.left = percent + '%';
                    // Mettre à jour le gradient de la barre (noir à gauche, blanc à droite)
                    evalBar.style.background = `linear-gradient(90deg, #1a1a2e 0%, #1a1a2e ${percent}%, #f0f0f0 ${percent}%, #f0f0f0 100%)`;
                }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("✓ Made eval bar gradient dynamic")
else:
    print("✗ Could not find eval bar update section")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Done!")
