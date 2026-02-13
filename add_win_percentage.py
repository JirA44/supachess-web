#!/usr/bin/env python3
"""Add win percentage display next to evaluation"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add win percentage display element after eval-value
old_html = '''                    <div style="text-align: center; font-size: 1.5em; font-weight: bold;" id="eval-value">0.0</div>
                </div>

                <!-- RECOMMANDATIONS ENGINES -->'''

new_html = '''                    <div style="display: flex; justify-content: center; align-items: center; gap: 15px;">
                        <div style="font-size: 1.5em; font-weight: bold;" id="eval-value">0.0</div>
                        <div id="win-percent" style="font-size: 1.1em; color: #888; font-family: monospace;">
                            <span style="color: #f5f5f5;">⬜ 50%</span> / <span style="color: #555;">⬛ 50%</span>
                        </div>
                    </div>
                </div>

                <!-- RECOMMANDATIONS ENGINES -->'''

if old_html in content:
    content = content.replace(old_html, new_html)
    print("✓ Added win percentage display element")
else:
    print("✗ Could not find eval-value section")

# 2. Update the JavaScript to calculate win percentage
old_js = '''                if (evalValue) {
                    const sideSymbol = evaluation > 50 ? '⬜' : evaluation < -50 ? '⬛' : '';
                    evalValue.textContent = sideSymbol + (evaluation > 0 ? '+' : '') + evalDisplay;
                    evalValue.style.color = evaluation > 50 ? '#f5f5f5' : evaluation < -50 ? '#555' : '#999';
                }'''

new_js = '''                if (evalValue) {
                    const sideSymbol = evaluation > 50 ? '⬜' : evaluation < -50 ? '⬛' : '';
                    evalValue.textContent = sideSymbol + (evaluation > 0 ? '+' : '') + evalDisplay;
                    evalValue.style.color = evaluation > 50 ? '#f5f5f5' : evaluation < -50 ? '#555' : '#999';
                }

                // Calcul du pourcentage de victoire (formule Lichess/Chess.com)
                const winPercent = document.getElementById('win-percent');
                if (winPercent) {
                    // Formule: win% = 50 + 50 * (2 / (1 + 10^(-eval/400)) - 1)
                    const evalPawns = evaluation / 100;
                    const whiteWin = Math.round(50 + 50 * (2 / (1 + Math.pow(10, -evalPawns / 4)) - 1));
                    const blackWin = 100 - whiteWin;
                    winPercent.innerHTML = `<span style="color: #f5f5f5;">⬜ ${whiteWin}%</span> / <span style="color: #666;">⬛ ${blackWin}%</span>`;
                }'''

if old_js in content:
    content = content.replace(old_js, new_js)
    print("✓ Added win percentage calculation")
else:
    print("✗ Could not find eval JS section")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ Win percentage display added!")
