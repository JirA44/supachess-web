/**
 * SUPA Quick Solve — Résolution de problèmes rapide et réactive
 *
 * Dépend de supa-dots-widget.js (moteur d'analyse) et supa-style-engine.js.
 * Inclure en dernier :
 *   <script src="supa-dots-widget.js"></script>
 *   <script src="supa-move-bubbles.js"></script>
 *   <script src="supa-style-engine.js"></script>
 *   <script src="supa-quick-solve.js"></script>
 *
 * Principe : un problème tactique, un chronomètre, une réponse, un verdict.
 * Pas de rechargement, pas d'attente : le problème suivant est jouable
 * immédiatement sur le plateau, en un clic.
 *
 * Source des problèmes : la position courante analysée par le moteur
 * (coup gagnant markedly meilleur que le 2e = problème), donc toujours
 * calibré sur la partie en cours.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    const LEVELS = {
        facile:    { minGap: 150, label: 'Facile',    time: 30 },
        moyen:     { minGap: 80,  label: 'Moyen',     time: 20 },
        difficile: { minGap: 40,  label: 'Difficile', time: 12 },
        expert:    { minGap: 15,  label: 'Expert',    time: 8 },
    };
    const LEVEL_ORDER = ['facile', 'moyen', 'difficile', 'expert'];

    let engine = null;
    let panelEl = null, btnEl = null;
    let puzzle = null;         // { fen, uci, san, level, timeMs, sanSeq, tactic }
    let level = 'moyen';
    let running = false;
    let timeLeft = 0;
    let tickTimer = null;
    let startedAt = 0;
    let streak = 0, best = 0;
    let stats = { solved: 0, failed: 0, totalMs: 0, byLevel: {}, fastest: null };
    let hintUsed = false;

    function getGame() { return engine ? engine.getGame() : null; }
    function getBoardEl() { return engine ? engine.getBoardEl() : null; }

    // ── Construction du problème depuis la position analysée ────────────────
    function buildPuzzle(snap) {
        const g = getGame();
        if (!g || !snap) return null;
        const lv = LEVELS[level];
        const ranked = [];
        for (const key of Object.keys(snap.analysis || {})) {
            const a = snap.analysis[key];
            ranked.push({ key: key, diff: a.diff == null ? 999 : a.diff,
                          quality: a.quality, tactic: a.tactic, sanSeq: a.sanSeq || [] });
        }
        if (ranked.length < 2) return null;
        ranked.sort(function (x, y) { return x.diff - y.diff; });

        const candidates = ranked.filter(function (r) { return r.diff >= lv.minGap; });
        const pick = candidates[0];
        if (!pick) return null;

        const san = uciToSan(g, pick.key);
        if (!san) return null;
        return {
            fen: snap.fen,
            uci: pick.key.slice(0, 4) + (pick.key.length > 4 ? pick.key[4] : ''),
            san: san,
            level: level,
            timeMs: lv.time * 1000,
            gap: pick.diff,
            sanSeq: pick.sanSeq,
            tactic: pick.tactic,
            inBook: !!(snap.bookMoves && snap.bookMoves.has(pick.key)),
        };
    }

    function uciToSan(g, key) {
        try {
            const mv = g.move({ from: key.slice(0, 2), to: key.slice(2, 4),
                                promotion: key.length > 4 ? key[4] : undefined });
            if (!mv) return null;
            g.undo();
            return mv.san;
        } catch (e) { return null; }
    }

    function nextPuzzle() {
        const snap = engine.snapshot();
        let p = buildPuzzle(snap);
        let guard = 0;
        while (!p && guard++ < 6 && level !== 'facile') {
            level = LEVELS[level] ? previousLevel(level) : 'moyen';
            p = buildPuzzle(snap);
        }
        if (!p) {
            setPanel('<div style="color:rgba(255,255,255,0.5);font-size:0.9em">'
                + 'Pas de problème tactique ici — la position est calme. '
                + 'Joue un coup pour faire avancer la partie.</div>');
            return;
        }
        puzzle = p;
        hintUsed = false;
        startTimer();
        renderPanel();
    }

    function previousLevel(l) {
        const i = LEVEL_ORDER.indexOf(l);
        return LEVEL_ORDER[Math.max(0, i - 1)];
    }

    // ── Chronomètre ──────────────────────────────────────────────────────────
    function startTimer() {
        stopTimer();
        startedAt = Date.now();
        timeLeft = puzzle.timeMs;
        paintTimer();
        tickTimer = setInterval(function () {
            timeLeft -= 100;
            if (timeLeft <= 0) { timeLeft = 0; paintTimer(); fail('Temps écoulé'); return; }
            paintTimer();
        }, 100);
    }
    function stopTimer() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

    function paintTimer() {
        const el = document.getElementById('supa-qs-timer');
        if (!el) return;
        const total = puzzle ? puzzle.timeMs : 1;
        const ratio = Math.max(0, timeLeft / total);
        const col = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
        el.style.color = col;
        el.style.background = col + '22';
        el.textContent = '⏱ ' + (timeLeft / 1000).toFixed(1) + 's';
    }

    // ── Verdict ──────────────────────────────────────────────────────────────
    function attempt(uci, san) {
        if (!running || !puzzle) return;
        const elapsed = Date.now() - startedAt;
        if (uci === puzzle.uci) {
            stopTimer();
            const pts = Math.round(10 + (puzzle.gap / 20) + (timeLeft / puzzle.timeMs) * 5);
            win(elapsed, pts);
        } else {
            // un seul essai raté : on montre la solution, on ne pénalise pas la série
            stopTimer();
            showSolution('Moins bien que ' + puzzle.san, san);
        }
    }

    function win(elapsed, pts) {
        running = false;
        streak++;
        if (streak > best) best = streak;
        stats.solved++;
        stats.totalMs += elapsed;
        if (!stats.fastest || elapsed < stats.fastest) stats.fastest = elapsed;
        const b = stats.byLevel[level] || { solved: 0, failed: 0 };
        b.solved++; stats.byLevel[level] = b;

        setPanel(
            '<div style="font-size:1.1em;font-weight:800;color:#22c55e">✅ ' + puzzle.san + '</div>'
            + '<div style="color:#a78bfa;margin:4px 0">+' + pts + ' pts · ' + (elapsed / 1000).toFixed(1)
            + 's · série ' + streak + '</div>'
            + (puzzle.tactic ? '<div style="color:rgba(255,255,255,0.7);font-size:0.9em">'
                + puzzle.tactic + '</div>' : '')
            + (puzzle.sanSeq && puzzle.sanSeq.length > 1
                ? '<div style="color:rgba(255,255,255,0.45);font-size:0.85em;margin-top:4px">'
                + puzzle.sanSeq.join(' → ') + '</div>' : '')
            + '<div style="margin-top:8px;font-size:0.85em;color:rgba(255,255,255,0.5)">'
            + 'Espace ou ⏎ = problème suivant</div>');
        setBoardHint(true);
        document.dispatchEvent(new CustomEvent('supa:solve', {
            detail: { ok: true, level: level, ms: elapsed, points: pts, san: puzzle.san,
                      tactic: puzzle.tactic, gap: puzzle.gap },
        }));
    }

    function fail(reason) {
        running = false;
        const b = stats.byLevel[level] || { solved: 0, failed: 0 };
        b.failed++; stats.byLevel[level] = b;
        showSolution(reason || 'Raté', null);
        document.dispatchEvent(new CustomEvent('supa:solve', {
            detail: { ok: false, level: level, san: puzzle ? puzzle.san : null },
        }));
    }

    function showSolution(headline, playedSan) {
        if (streak > 0) streak = 0;
        const lv = LEVELS[level];
        setPanel(
            '<div style="font-size:1.05em;font-weight:800;color:#ef4444">' + headline + '</div>'
            + '<div style="color:rgba(255,255,255,0.7);margin:4px 0">Solution : <b>'
            + (puzzle ? puzzle.san : '—') + '</b>'
            + (puzzle && puzzle.sanSeq && puzzle.sanSeq.length > 1
                ? ' — ' + puzzle.sanSeq.join(' → ') : '') + '</div>'
            + '<div style="color:rgba(255,255,255,0.45);font-size:0.85em">'
            + (puzzle && puzzle.tactic ? puzzle.tactic + ' · ' : '')
            + 'Difficulté ' + lv.label + ' · on repassera en '
            + previousLevel(level) + '</div>'
            + '<div style="margin-top:8px;font-size:0.85em;color:rgba(255,255,255,0.5)">'
            + 'Espace ou ⏎ = problème suivant</div>');
        setBoardHint(false);
        // descente automatique si l'échec se répète
        const b = stats.byLevel[level];
        if (b && b.failed >= b.solved + 2 && level !== 'facile') level = previousLevel(level);
    }

    // ── Raccourcis clavier ───────────────────────────────────────────────────
    function onKey(e) {
        if (!running) return;
        if (e.key === 'h' || e.key === 'H') { hintUsed = true; showHint(); }
    }
    function onKeyNext(e) {
        if (running) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextPuzzle(); }
    }

    function showHint() {
        if (!puzzle) return;
        setPanel('<div style="color:#eab308;font-weight:700">💡 Cherche un coup qui '
            + (puzzle.tactic || 'gagne du matériel') + '</div>'
            + '<div style="color:rgba(255,255,255,0.6);margin-top:4px">'
            + 'L\'avantage est de ' + puzzle.gap + ' centipions face au 2e meilleur coup.</div>');
    }

    // ── Ecoute des coups joués sur le plateau ────────────────────────────────
    function onBoardClick(e) {
        if (!running || !puzzle) return;
        const sqEl = e.target.closest('[data-square]');
        if (!sqEl) return;
        const g = getGame();
        if (!g) return;
        const from = puzzle.uci.slice(0, 2), to = puzzle.uci.slice(2, 4);
        const clickSq = sqEl.getAttribute('data-square');
        if (clickSq !== from && clickSq !== to) return;
        attempt(puzzle.uci, clickSq);
    }

    function setBoardHint(on) {
        const b = getBoardEl();
        if (!b) return;
        b.style.outline = on ? '3px solid #22c55e' : '';
        b.style.outlineOffset = on ? '-3px' : '';
    }

    // ── Panneau ──────────────────────────────────────────────────────────────
    function setPanel(html) {
        if (panelEl) panelEl.innerHTML = html;
    }

    function renderPanel() {
        if (!panelEl) return;
        const lv = LEVELS[level];
        setPanel(
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
            + '<span style="font-weight:800;color:#c4b5fd;flex:1">⚡ Résolution rapide</span>'
            + '<span id="supa-qs-timer" style="font-weight:800;padding:2px 7px;border-radius:999px;'
            + 'font-size:0.85em"></span></div>'
            + '<div style="font-size:0.85em;color:rgba(255,255,255,0.55);margin-bottom:6px">'
            + 'Trouve le meilleur coup. Série : <b style="color:#fff">' + streak + '</b>'
            + ' · record ' + best + '</div>'
            + '<div style="font-size:0.85em;color:rgba(255,255,255,0.5)">Difficulté : '
            + LEVEL_ORDER.map(function (k) {
                return '<span data-supa-qs-lvl="' + k + '" style="cursor:pointer;padding:1px 5px;'
                    + 'border-radius:6px;font-weight:700;background:'
                    + (k === level ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)')
                    + ';color:' + (k === level ? '#c4b5fd' : 'rgba(255,255,255,0.45)') + '">'
                    + LEVELS[k].label + '</span>';
            }).join(' ') + '</div>'
            + '<div style="margin-top:8px;color:rgba(255,255,255,0.4);font-size:0.78em">'
            + 'H = indice · Espace = suivant · '
            + stats.solved + ' résolus / ' + (stats.solved + stats.failed) + '</div>');
        panelEl.querySelectorAll('[data-supa-qs-lvl]').forEach(function (el) {
            el.addEventListener('click', function () {
                level = el.getAttribute('data-supa-qs-lvl');
                nextPuzzle();
            });
        });
        paintTimer();
    }

    function createPanel() {
        panelEl = document.createElement('div');
        panelEl.id = 'supa-quicksolve-panel';
        panelEl.style.cssText = [
            'position:fixed', 'top:20px', 'right:20px', 'z-index:9998',
            'width:270px', 'background:rgba(15,10,30,0.94)', 'backdrop-filter:blur(10px)',
            'border:1px solid rgba(34,197,94,0.35)', 'border-radius:14px',
            'padding:12px 14px', 'color:#e5e7eb',
            'font-family:system-ui,-apple-system,sans-serif', 'font-size:0.8em',
            'box-shadow:0 8px 32px rgba(0,0,0,0.6)', 'display:none',
        ].join(';');
        document.body.appendChild(panelEl);
    }

    function createButton() {
        btnEl = document.createElement('button');
        btnEl.id = 'supa-quicksolve-btn';
        btnEl.innerHTML = '⚡ Solve <span id="supa-quicksolve-lbl">OFF</span>';
        btnEl.title = 'SUPA Quick Solve — résolution rapide et réactive';
        btnEl.style.cssText = [
            'position:fixed', 'bottom:20px', 'right:150px', 'z-index:9999',
            'padding:10px 18px', 'background:rgba(34,197,94,0.14)', 'color:#4ade80',
            'border:2px solid rgba(34,197,94,0.45)', 'border-radius:12px',
            'cursor:pointer', 'font-size:0.88em', 'font-weight:700',
            'backdrop-filter:blur(8px)', 'transition:all 0.2s',
            'font-family:system-ui,sans-serif', 'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        ].join(';');
        btnEl.addEventListener('click', toggle);
        document.body.appendChild(btnEl);
    }

    function toggle() { setRunning(!running); }

    function setRunning(val) {
        running = val;
        const lbl = document.getElementById('supa-quicksolve-lbl');
        if (lbl) lbl.textContent = running ? 'ON' : 'OFF';
        if (btnEl) {
            btnEl.style.color = running ? '#86efac' : '#4ade80';
            btnEl.style.background = running ? 'rgba(34,197,94,0.28)' : 'rgba(34,197,94,0.14)';
        }
        if (running) {
            panelEl.style.display = 'block';
            const b = getBoardEl();
            if (b) b.addEventListener('click', onBoardClick, true);
            document.addEventListener('keydown', onKey);
            document.addEventListener('keydown', onKeyNext);
            nextPuzzle();
        } else {
            stopTimer();
            panelEl.style.display = 'none';
            const b = getBoardEl();
            if (b) b.removeEventListener('click', onBoardClick, true);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('keydown', onKeyNext);
            setBoardHint(false);
        }
    }

    // ── API publique ─────────────────────────────────────────────────────────
    window.supaQuickSolve = {
        start: function () { setRunning(true); },
        stop: function () { setRunning(false); },
        isRunning: function () { return running; },
        next: nextPuzzle,
        getPuzzle: function () { return puzzle; },
        getStats: function () {
            const s = JSON.parse(JSON.stringify(stats));
            s.streak = streak;
            s.best = best;
            s.avgMs = s.solved ? Math.round(s.totalMs / s.solved) : null;
            return s;
        },
        reset: function () { stats = { solved: 0, failed: 0, totalMs: 0, byLevel: {}, fastest: null };
                               streak = 0; best = 0; },
        setLevel: function (l) { if (LEVELS[l]) { level = l; if (running) nextPuzzle(); } },
        getLevels: function () { return LEVELS; },
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        engine = window.supaDots;
        if (!engine) {
            console.warn('[supa-quick-solve] window.supaDots introuvable.');
            return;
        }
        if (!getBoardEl()) return;
        createPanel();
        createButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200); });
    } else {
        setTimeout(init, 1200);
    }

})();
