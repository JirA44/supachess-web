#!/usr/bin/env python3
"""Fix evaluation display to show white/black advantage instead of just green/red"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the eval display in renderFilteredMoves
old_eval = '''                const evalDisplay = (item.evalScore / 100).toFixed(2);
                const isPositive = item.evalScore >= 0;'''

new_eval = '''                const evalDisplay = (Math.abs(item.evalScore) / 100).toFixed(2);
                const isPositive = item.evalScore >= 0;
                const sideIndicator = isPositive ? '⬜' : '⬛'; // Blanc ou Noir gagne'''

if old_eval in content:
    content = content.replace(old_eval, new_eval)
    print("✓ Added side indicator variable")
else:
    print("✗ Could not find eval display setup")

# Fix the display line to use the side indicator
old_display = '''                                <span style="color: ${isPositive ? '#4ade80' : '#ef4444'}; font-family: monospace; font-size: 0.9em;">🐟 ${isPositive ? '+' : ''}${evalDisplay}</span>'''

new_display = '''                                <span style="color: ${isPositive ? '#4ade80' : '#ef4444'}; font-family: monospace; font-size: 0.9em;">🐟 ${sideIndicator}${isPositive ? '+' : '-'}${evalDisplay}</span>'''

if old_display in content:
    content = content.replace(old_display, new_display)
    print("✓ Updated display to show white/black indicator")
else:
    print("✗ Could not find display line")

# Also fix the SF best move panel
old_sf_panel = '''                        sfBest.style.color = best.evalScore >= 0 ? '#4ade80' : '#ef4444';
                        const evalStr = (best.evalScore / 100).toFixed(2);
                        sfEval.textContent = `Éval: ${best.evalScore >= 0 ? '+' : ''}${evalStr}`;'''

new_sf_panel = '''                        sfBest.style.color = best.evalScore >= 0 ? '#4ade80' : '#ef4444';
                        const evalStr = (Math.abs(best.evalScore) / 100).toFixed(2);
                        const sideEmoji = best.evalScore >= 0 ? '⬜' : '⬛';
                        sfEval.textContent = `Éval: ${sideEmoji}${best.evalScore >= 0 ? '+' : '-'}${evalStr}`;'''

if old_sf_panel in content:
    content = content.replace(old_sf_panel, new_sf_panel)
    print("✓ Updated SF panel eval display")
else:
    print("✗ Could not find SF panel section")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ Eval display fix applied!")
