#!/usr/bin/env python3
"""Add Stockfish version and depth info"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Stockfish panel header to show version
old_sf_panel = '''                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                            <span style="font-size: 1.2em;">🐟</span>
                            <span style="color: #3b82f6; font-weight: bold; font-size: 0.85em;">Stockfish</span>
                        </div>
                        <div id="sf-best-move" style="font-size: 1.3em; font-weight: bold; color: #fff;">-</div>
                        <div id="sf-eval" style="font-size: 0.8em; color: #888;">En attente...</div>'''

new_sf_panel = '''                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                            <span style="font-size: 1.2em;">🐟</span>
                            <span style="color: #3b82f6; font-weight: bold; font-size: 0.85em;">Stockfish 10</span>
                            <span style="color: #666; font-size: 0.7em;">(WASM)</span>
                        </div>
                        <div id="sf-best-move" style="font-size: 1.3em; font-weight: bold; color: #fff;">-</div>
                        <div id="sf-eval" style="font-size: 0.8em; color: #888;">En attente...</div>
                        <div id="sf-depth" style="font-size: 0.7em; color: #666; margin-top: 2px;">Profondeur: 8</div>'''

if old_sf_panel in content:
    content = content.replace(old_sf_panel, new_sf_panel)
    print("✓ Updated Stockfish panel with version info")
else:
    print("✗ Could not find Stockfish panel")

# 2. Update the indicator to show more info
old_indicator = '''indicator.innerHTML = '🐟 <span style="color: #22c55e;">Stockfish Actif</span>';'''
new_indicator = '''indicator.innerHTML = '🐟 <span style="color: #22c55e;">Stockfish 10 WASM</span> <span style="color: #888; font-size: 0.85em;">| Analyse: d8</span>';'''

if old_indicator in content:
    content = content.replace(old_indicator, new_indicator)
    print("✓ Updated Stockfish indicator")
else:
    print("✗ Could not find Stockfish indicator")

# 3. Update "Tous les Coups" title to show depth
old_title = '''📚 Tous les Coups <span style="font-size: 0.85em; color: #888;">(analysés par 🐟 Stockfish)</span>'''
new_title = '''📚 Tous les Coups <span style="font-size: 0.85em; color: #888;">(🐟 Stockfish 10 · profondeur 8)</span>'''

if old_title in content:
    content = content.replace(old_title, new_title)
    print("✓ Updated moves title with depth info")
else:
    print("✗ Could not find moves title")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ Stockfish info added!")
