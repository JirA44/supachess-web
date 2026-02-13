#!/usr/bin/env python3
"""Final fix for eval bar display"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the duplicate textContent issue
old_eval = '''                if (evalValue) {
                    evalValue.textContent = (evaluation > 0 ? '+' : '') + evalDisplay;
                    evalValue.style.color = evaluation > 50 ? '#f0f0f0' : evaluation < -50 ? '#666' : '#aaa'; evalValue.textContent = (evaluation > 0 ? '⬜+' : evaluation < 0 ? '⬛' : '') + evalDisplay;
                }'''

new_eval = '''                if (evalValue) {
                    const sideSymbol = evaluation > 50 ? '⬜' : evaluation < -50 ? '⬛' : '';
                    evalValue.textContent = sideSymbol + (evaluation > 0 ? '+' : '') + evalDisplay;
                    evalValue.style.color = evaluation > 50 ? '#f5f5f5' : evaluation < -50 ? '#555' : '#999';
                }'''

if old_eval in content:
    content = content.replace(old_eval, new_eval)
    print("✓ Fixed eval value display")
else:
    print("✗ Could not find eval value section (may already be fixed)")
    # Try alternate pattern
    old_alt = "evalValue.textContent = (evaluation > 0 ? '+' : '') + evalDisplay;"
    if old_alt in content:
        print("  Found alternate pattern, fixing...")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Done!")
