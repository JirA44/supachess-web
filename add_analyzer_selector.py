#!/usr/bin/env python3
"""Add analyzer level selector"""

with open('AIMIX_TEACHER_ENHANCED.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the title section with a selector
old_title = '''                <!-- SECTION COUPS POSSIBLES -->
                <div id="suggested-moves-section" style="margin-bottom: 20px; background: rgba(0,0,0,0.4); border-radius: 10px; padding: 15px; border: 1px solid rgba(0,217,255,0.2);">
                    <h4 style="color: var(--accent-primary); margin-bottom: 10px; font-size: 0.9em;">
                        📚 Tous les Coups <span style="font-size: 0.85em; color: #888;">(🐟 SF10 ~2200 ELO · prof. 8 coups)</span>
                    </h4>'''

new_title = '''                <!-- SECTION COUPS POSSIBLES -->
                <div id="suggested-moves-section" style="margin-bottom: 20px; background: rgba(0,0,0,0.4); border-radius: 10px; padding: 15px; border: 1px solid rgba(0,217,255,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                        <h4 style="color: var(--accent-primary); margin: 0; font-size: 0.9em;">
                            📚 Tous les Coups <span id="analyzer-info" style="font-size: 0.85em; color: #888;">(🐟 SF10 ~2200 ELO)</span>
                        </h4>
                        <select id="analyzer-level" onchange="changeAnalyzerLevel(this.value)" style="padding: 4px 8px; border-radius: 5px; border: 1px solid #3b82f6; background: rgba(59,130,246,0.2); color: #fff; font-size: 0.75em; cursor: pointer;">
                            <option value="5" data-elo="1800">⚡ Rapide (prof. 5)</option>
                            <option value="8" selected data-elo="2200">⚖️ Standard (prof. 8)</option>
                            <option value="12" data-elo="2500">🔍 Précis (prof. 12)</option>
                            <option value="15" data-elo="3000">🎯 Expert (prof. 15)</option>
                            <option value="18" data-elo="3400">💎 Maximum (prof. 18)</option>
                        </select>
                    </div>'''

if old_title in content:
    content = content.replace(old_title, new_title)
    print("✓ Added analyzer selector UI")
else:
    print("✗ Could not find title section")

# 2. Add the JavaScript variable and function
old_js_marker = '''        // Analyse Stockfish pour les suggestions
        let stockfishAnalysisQueue = [];
        let isAnalyzing = false;
        let analysisAborted = false;'''

new_js_marker = '''        // Analyse Stockfish pour les suggestions
        let stockfishAnalysisQueue = [];
        let isAnalyzing = false;
        let analysisAborted = false;
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
            updateSuggestedMoves();
            showToast(`🐟 Analyse: profondeur ${analyzerDepth} (~${level.elo} ELO)`, 'info', 2000);
        }'''

if old_js_marker in content:
    content = content.replace(old_js_marker, new_js_marker)
    print("✓ Added analyzer JavaScript")
else:
    print("✗ Could not find JS marker")

# 3. Update the analyzeWithStockfish call to use analyzerDepth
old_analyze_call = '''analyzeWithStockfish(fenAfter, 8, (result) => {'''
new_analyze_call = '''analyzeWithStockfish(fenAfter, analyzerDepth, (result) => {'''

if old_analyze_call in content:
    content = content.replace(old_analyze_call, new_analyze_call)
    print("✓ Updated analyze call to use dynamic depth")
else:
    print("✗ Could not find analyze call")

# 4. Update the indicator
old_indicator = '''indicator.innerHTML = '🐟 <span style="color: #22c55e;">Stockfish 10</span> <span style="color: #888; font-size: 0.85em;">~2200 ELO | prof. 8</span>';'''
new_indicator = '''const lvl = analyzerLevels[analyzerDepth] || analyzerLevels[8];
                    indicator.innerHTML = `🐟 <span style="color: #22c55e;">Stockfish 10</span> <span style="color: #888; font-size: 0.85em;">~${lvl.elo} ELO | prof. ${analyzerDepth}</span>`;'''

if old_indicator in content:
    content = content.replace(old_indicator, new_indicator)
    print("✓ Updated indicator to be dynamic")
else:
    print("✗ Could not find indicator")

with open('AIMIX_TEACHER_ENHANCED.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ Analyzer selector added!")
