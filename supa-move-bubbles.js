/**
 * SUPA Move Bubbles — Note + symbole d'annotation après chaque coup joué
 *
 * Dépend de supa-dots-widget.js (window.supaDots) pour le moteur d'analyse.
 * Inclure APRÈS supa-dots-widget.js :
 *   <script src="supa-dots-widget.js"></script>
 *   <script src="supa-move-bubbles.js"></script>
 *
 * Ce que ça fait :
 *   1. Bulle flottante sur la case d'arrivée après chaque coup du joueur :
 *      note décimale + évaluation + symbole (!!, !, !?, ?, ??, ???)
 *   2. Résumé chiffré : « X coups jouables — Y brillants, Z très bons, ... »
 *   3. Panneau des coups recommandés, cliquables pour jouer le coup
 *
 * Note /10 = écart au meilleur coup (centipions), fenêtre de mesure :
 *   diff = score(meilleur coup) - score(coup joué)
 *   0 cp → 10/10 · 10 cp → 9.5 · 30 → 8.5 · 60 → 7 · 120 → 5 · 300+ → 2 · mat perdu → 0
 */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    const QCOLORS = {
        bril:    '#e879f9',
        best:    '#8b5cf6',
        excel:   '#3b82f6',
        good:    '#22c55e',
        ok:      '#eab308',
        inaccu:  '#f97316',
        blunder: '#ef4444',
        legal:   'rgba(200,200,200,0.45)',
    };
    const QLABEL = {
        bril: 'Brillant', best: 'Meilleur', excel: 'Excellent',
        good: 'Très bon', ok: 'Correct', inaccu: 'Imprécision', blunder: 'Gaffe',
    };

    // Note /10 déduite de l'écart au meilleur coup (cp)
    function diffToScore(diff, info) {
        if (info && info.isLosingMate) return 0;
        const d = Math.max(0, diff == null ? 999 : diff);
        if (d <= 0)  return 10;
        if (d <= 5)  return 9.5;
        if (d <= 10) return 9;
        if (d <= 20) return 8.5;
        if (d <= 30) return 8;
        if (d <= 45) return 7;
        if (d <= 60) return 6;
        if (d <= 90) return 5;
        if (d <= 120) return 4;
        if (d <= 180) return 3;
        if (d <= 300) return 2;
        return 1;
    }

    // Symbole d'annotation échiquéographique standard
    function annotationFor(score, info) {
        if (info && info.isLosingMate) return '???';
        if (info && info.quality === 'bril') {
            return info.isSacrifice ? '!!' : '!';
        }
        if (score >= 10) return '!';
        if (score >= 8.5) return '!?';
        if (score >= 6) return '';
        if (score >= 4) return '?!';
        if (score >= 2) return '?';
        return '??';
    }

    function scoreText(score) {
        return (Math.round(score * 2) / 2).toFixed(1);
    }

    // Éval position (pions, perspective blancs) — ex: -0.05, +0.35, #3
    function evalText(info) {
        if (!info) return '';
        if (info.isLosingMate) return 'Mat';
        if (info.isMate && info.mateIn) return '#' + info.mateIn;
        if (info.score == null) return '';
        const pawns = info.score / 100;
        return (pawns > 0 ? '+' : '') + pawns.toFixed(2);
    }

    // ── State ────────────────────────────────────────────────────────────────
    let engine   = null;   // window.supaDots
    let lastSnap = null;    // dernier snapshot reçu
    let enabled  = true;
    let bubbles  = [];      // [{ el, timer }]
    let panelEl  = null;
    let btnEl    = null;
    let watchTimer = null;
    let lastFen  = null;
    let unsubs   = [];
    const moveLog = [];    // journal des coups évalués (pour le module styles)

    function getGame() { return engine ? engine.getGame() : null; }
    function getBoardEl() { return engine ? engine.getBoardEl() : null; }

    // ── Bulle flottante sur une case ─────────────────────────────────────────
    function squareEl(sq) {
        const b = getBoardEl();
        if (!b) return null;
        return b.querySelector('[data-square="' + sq + '"]');
    }

    function showBubble(sq, payload) {
        const target = squareEl(sq);
        if (!target) return;
        const rect = target.getBoundingClientRect();

        const el = document.createElement('div');
        el.className = 'supa-bubble';
        el.setAttribute('data-supa-bubble', '1');
        el.style.cssText = [
            'position:fixed',
            'left:' + Math.round(rect.left) + 'px',
            'top:' + Math.round(rect.top) + 'px',
            'width:' + Math.round(rect.width) + 'px',
            'height:' + Math.round(rect.height) + 'px',
            'z-index:10050',
            'pointer-events:none',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'gap:1px', 'font-family:system-ui,-apple-system,sans-serif',
            'animation:supaBubbleIn .28s cubic-bezier(.34,1.56,.64,1)',
        ].join(';');

        const sym = document.createElement('div');
        sym.textContent = payload.symbol || '·';
        sym.style.cssText = [
            'font-size:' + Math.round(rect.width * 0.34) + 'px',
            'font-weight:900', 'line-height:1',
            'color:' + payload.color,
            'text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 10px ' + payload.color + '88',
            'font-family:ui-monospace,Menlo,monospace',
        ].join(';');

        const note = document.createElement('div');
        note.textContent = payload.score;
        note.style.cssText = [
            'font-size:' + Math.round(rect.width * 0.26) + 'px',
            'font-weight:800', 'line-height:1',
            'color:#fff',
            'text-shadow:0 1px 3px rgba(0,0,0,.95)',
        ].join(';');

        const evalLine = document.createElement('div');
        evalLine.textContent = payload.eval || '';
        evalLine.style.cssText = [
            'font-size:' + Math.round(rect.width * 0.2) + 'px',
            'font-weight:700', 'line-height:1',
            'color:rgba(255,255,255,.75)',
            'text-shadow:0 1px 3px rgba(0,0,0,.95)',
            'font-family:ui-monospace,Menlo,monospace',
        ].join(';');

        el.appendChild(sym);
        if (payload.symbol) el.appendChild(note);
        if (payload.eval) el.appendChild(evalLine);
        document.body.appendChild(el);
        bubbles.push({ el: el, timer: null });

        // repositionne si la fenêtre change de taille
        const onResize = function () {
            const r2 = target.getBoundingClientRect();
            el.style.left = Math.round(r2.left) + 'px';
            el.style.top = Math.round(r2.top) + 'px';
            el.style.width = Math.round(r2.width) + 'px';
            el.style.height = Math.round(r2.height) + 'px';
        };
        window.addEventListener('resize', onResize);
        setTimeout(function () { window.removeEventListener('resize', onResize); }, 4000);

        const entry = bubbles[bubbles.length - 1];
        entry.timer = setTimeout(function () { removeBubble(el); }, 4200);    }

    function removeBubble(el) {
        const i = bubbles.findIndex(function (b) { return b.el === el; });
        if (i >= 0) {
            clearTimeout(bubbles[i].timer);
            bubbles.splice(i, 1);
        }
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function clearBubbles() {
        for (const b of bubbles) clearTimeout(b.timer);
        bubbles = [];
        document.querySelectorAll('[data-supa-bubble]').forEach(function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
        });
    }

    function injectStyles() {
        if (document.getElementById('supa-bubble-css')) return;
        const s = document.createElement('style');
        s.id = 'supa-bubble-css';
        s.textContent =
            '@keyframes supaBubbleIn{' +
              '0%{opacity:0;transform:scale(.5) translateY(6px)}' +
              '60%{opacity:1;transform:scale(1.12) translateY(0)}' +
              '100%{opacity:1;transform:scale(1)}}' +
            '@keyframes supaBubbleOut{' +
              '0%{opacity:1;transform:scale(1)}' +
              '100%{opacity:0;transform:scale(.85)}}' +
            '@keyframes supaFadeUp{' +
              '0%{opacity:0;transform:translateY(8px)}' +
              '100%{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(s);
    }

    // ── Résumé chiffré des coups disponibles ─────────────────────────────────
    function tally(analysis, bookMoves) {
        const t = { total: 0, brilliant: 0, best: 0, excel: 0, good: 0, ok: 0, inaccu: 0, blunder: 0, book: 0 };
        for (const key of Object.keys(analysis)) {
            const a = analysis[key];
            t.total++;
            if (bookMoves && bookMoves.has(key)) t.book++;
            switch (a.quality) {
                case 'bril':    t.brilliant++; break;
                case 'best':    t.best++;     break;
                case 'excel':   t.excel++;    break;
                case 'good':    t.good++;     break;
                case 'ok':      t.ok++;       break;
                case 'inaccu':  t.inaccu++;   break;
                case 'blunder': t.blunder++;  break;
            }
        }
        return t;
    }

    function createPanel() {
        panelEl = document.createElement('div');
        panelEl.id = 'supa-bubbles-panel';
        panelEl.style.cssText = [
            'position:fixed', 'bottom:70px', 'left:20px', 'z-index:9998',
            'width:290px', 'max-height:60vh', 'overflow-y:auto',
            'background:rgba(15,10,30,0.94)', 'backdrop-filter:blur(10px)',
            'border:1px solid rgba(139,92,246,0.35)', 'border-radius:14px',
            'padding:12px 14px', 'color:#e5e7eb',
            'font-family:system-ui,-apple-system,sans-serif', 'font-size:0.8em',
            'box-shadow:0 8px 32px rgba(0,0,0,0.6)', 'display:none',
        ].join(';');
        document.body.appendChild(panelEl);
    }

    function renderPanel(snap) {
        if (!panelEl) return;
        const t = tally(snap.analysis, snap.bookMoves);
        const moves = rankedMoves(snap).slice(0, 6);

        const parts = [];
        parts.push('<div style="font-weight:800;font-size:0.95em;margin-bottom:6px;color:#c4b5fd">'
            + '🎯 Coups disponibles</div>');
        parts.push('<div style="font-size:1.05em;font-weight:800;margin-bottom:6px">'
            + t.total + ' coups jouables</div>');

        const chips = [
            ['bril',    '🌟 ' + t.brilliant + ' brillant' + (t.brilliant > 1 ? 's' : '')],
            ['best',    '🟣 ' + t.best + ' meilleur' + (t.best > 1 ? 's' : '')],
            ['excel',   '🔵 ' + t.excel + ' excellent' + (t.excel > 1 ? 's' : '')],
            ['good',    '🟢 ' + t.good + ' très bon' + (t.good > 1 ? 's' : '')],
            ['ok',      '🟡 ' + t.ok + ' correct' + (t.ok > 1 ? 's' : '')],
            ['inaccu',  '🟠 ' + t.inaccu + ' imprécision' + (t.inaccu > 1 ? 's' : '')],
            ['blunder', '🔴 ' + t.blunder + ' gaffe' + (t.blunder > 1 ? 's' : '')],
        ].filter(function (c) { return parseInt(c[1].replace(/\D+/g, ''), 10) > 0; });

        parts.push('<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">'
            + chips.map(function (c) {
                return '<span style="background:' + QCOLORS[c[0]] + '22;color:' + QCOLORS[c[0]]
                    + ';border:1px solid ' + QCOLORS[c[0]] + '55;border-radius:999px;'
                    + 'padding:2px 7px;font-size:0.85em;font-weight:700">' + c[1] + '</span>';
            }).join('') + '</div>');

        if (t.book) {
            parts.push('<div style="color:#a78bfa;font-size:0.85em;margin-bottom:6px">📖 '
                + t.book + ' coup(s) dans les parties de grands maîtres</div>');
        }

        if (moves.length) {
            parts.push('<div style="color:rgba(255,255,255,0.45);font-size:0.8em;'
                + 'margin:8px 0 4px;text-transform:uppercase;letter-spacing:.06em">Recommandés</div>');
            for (const m of moves) {
                const col = QCOLORS[m.quality] || QCOLORS.legal;
                const sc  = diffToScore(m.diff, m);
                parts.push(
                    '<div data-supa-rec="' + m.uci + '" style="display:flex;align-items:center;gap:6px;'
                    + 'padding:5px 6px;border-radius:8px;cursor:pointer;margin-bottom:2px;'
                    + 'border-left:3px solid ' + col + ';background:rgba(255,255,255,0.04)">'
                    + '<span style="font-weight:800;color:' + col + ';min-width:34px">' + m.san + '</span>'
                    + '<span style="font-size:0.85em;color:rgba(255,255,255,0.55);flex:1;overflow:hidden;'
                    + 'text-overflow:ellipsis;white-space:nowrap">' + (m.tactic || QLABEL[m.quality] || '') + '</span>'
                    + '<span style="font-weight:800;font-size:0.85em">' + scoreText(sc) + '</span>'
                    + '</div>');
            }
            parts.push('<div style="color:rgba(255,255,255,0.3);font-size:0.72em;margin-top:6px">'
                + 'Clique un coup pour le jouer</div>');
        }

        panelEl.innerHTML = parts.join('');
        panelEl.querySelectorAll('[data-supa-rec]').forEach(function (row) {
            row.addEventListener('click', function () {
                playUci(row.getAttribute('data-supa-rec'));
            });
        });
    }

    function rankedMoves(snap) {
        const g = getGame();
        if (!g) return [];
        const out = [];
        for (const key of Object.keys(snap.analysis)) {
            const a = snap.analysis[key];
            const san = uciToSan(g, key);
            if (!san) continue;
            const uci = key.slice(0, 4) + (key.length > 4 ? key[4] : '');
            out.push({
                uci: uci, san: san, quality: a.quality, diff: a.diff,
                tactic: a.tactic, isMate: a.isMate, mateIn: a.mateIn,
                sanSeq: a.sanSeq || [],
            });
        }
        out.sort(function (x, y) { return (x.diff || 0) - (y.diff || 0); });
        return out;
    }

    function uciToSan(g, key) {
        if (!key || key.length < 4) return null;
        try {
            const mv = g.move({
                from: key.slice(0, 2), to: key.slice(2, 4),
                promotion: key.length > 4 ? key[4] : undefined,
            });
            if (!mv) return null;
            g.undo();
            return mv.san;
        } catch (e) { return null; }
    }

    function playUci(uci) {
        const g = getGame();
        if (!g || !uci) return;
        try {
            const mv = g.move({
                from: uci.slice(0, 2), to: uci.slice(2, 4),
                promotion: uci.length > 4 ? uci[4] : undefined,
            });
            if (!mv) return;
            if (engine.getBoard()) engine.getBoard().position(g.fen());
            if (typeof window.onUserMove === 'function') window.onUserMove(mv);
            else if (typeof window.makeMove === 'function') window.makeMove(mv);
            engine.refresh();
        } catch (e) {}
    }

    // ── Détection du coup joué + notation ─────────────────────────────────────
    function evaluatePlayedMove(prevSnap, snap) {
        const g = getGame();
        if (!g || !prevSnap) return;
        const prevCount = prevSnap.moveCount;
        const nowCount  = snap.moveCount;
        if (nowCount !== prevCount + 1) return;   // rien d'anormal (undo, nouvelle partie…)

        const mv = snap.history[nowCount - 1];
        if (!mv) return;
        const key = mv.from + mv.to + (mv.promotion || '');
        const info = prevSnap.analysis[key];
        if (!info) return;

        const diff = info.diff == null ? 0 : info.diff;
        const san  = uciToSanFromHistory(mv);

        const enriched = {
            quality: info.quality,
            diff: diff,
            isMate: info.isMate || false,
            mateIn: info.mateIn || null,
            tactic: info.tactic || null,
            sanSeq: info.sanSeq || [],
        };
        enriched.isSacrifice = isSacrificeLookahead(g, mv);

        const score = diffToScore(diff, enriched);
        const symbol = annotationFor(score, enriched);
        const color = QCOLORS[info.quality] || QCOLORS.legal;

        showBubble(mv.to, { score: scoreText(score), symbol: symbol, color: color, eval: evalText(info) });

        const record = {
            san: san,
            from: mv.from,
            to: mv.to,
            piece: mv.piece,
            captured: mv.captured || null,
            color: mv.color,
            diff: diff,
            score: score,
            symbol: symbol,
            quality: info.quality,
            tactic: enriched.tactic,
            isSacrifice: enriched.isSacrifice,
            sanSeq: enriched.sanSeq,
            moveNumber: nowCount,
        };
        moveLog.push(record);
        if (moveLog.length > 400) moveLog.shift();

        document.dispatchEvent(new CustomEvent('supa:moveEvaluated', { detail: record }));
        return record;
    }

    function uciToSanFromHistory(mv) {
        if (!mv) return '';
        return mv.san || (mv.from + '-' + mv.to);
    }

    function isSacrificeLookahead(g, mv) {
        if (!mv || !mv.captured) return false;
        // un vrai sacrifice = la pièce prise vaut plus que la pièce jouée
        const order = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const taken = order[mv.captured] || 0;
        const played = order[mv.piece] || 0;
        return taken > played;
    }

    // ── Watcher FEN (déclenche l'analyse après chaque coup) ──────────────────
    function watchFen() {
        if (watchTimer) clearInterval(watchTimer);
        watchTimer = setInterval(function () {
            if (!enabled || !engine) return;
            const g = getGame();
            if (!g) return;
            const fen = g.fen();
            if (fen === lastFen) return;
            const isFirst = lastFen === null;
            lastFen = fen;
            if (isFirst) return;
            if (!engine.isReady()) return;
            engine.refresh();
        }, 350);
    }

    // ── Bouton ON/OFF ────────────────────────────────────────────────────────
    function createButton() {
        btnEl = document.createElement('button');
        btnEl.id = 'supa-bubbles-btn';
        btnEl.innerHTML = '💬 Bulles <span id="supa-bubbles-lbl">ON</span>';
        btnEl.title = 'SUPA Bulles — note décimale et évaluation après chaque coup';
        btnEl.style.cssText = [
            'position:fixed', 'bottom:20px', 'left:20px', 'z-index:9999',
            'padding:10px 18px', 'background:rgba(139,92,246,0.18)', 'color:#a78bfa',
            'border:2px solid rgba(139,92,246,0.7)', 'border-radius:12px',
            'cursor:pointer', 'font-size:0.88em', 'font-weight:700',
            'backdrop-filter:blur(8px)', 'transition:all 0.2s',
            'font-family:system-ui,sans-serif', 'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        ].join(';');
        btnEl.addEventListener('click', toggle);
        document.body.appendChild(btnEl);
    }

    function setEnabled(val) {
        enabled = val;
        const lbl = document.getElementById('supa-bubbles-lbl');
        if (lbl) lbl.textContent = enabled ? 'ON' : 'OFF';
        if (btnEl) {
            btnEl.style.color      = enabled ? '#c4b5fd' : '#9ca3af';
            btnEl.style.borderColor = enabled ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.3)';
            btnEl.style.background = enabled ? 'rgba(139,92,246,0.18)' : 'rgba(15,10,30,0.92)';
        }
        if (!enabled) {
            clearBubbles();
            if (panelEl) panelEl.style.display = 'none';
        } else if (lastSnap) {
            panelEl.style.display = 'block';
            renderPanel(lastSnap);
        }
    }

    function toggle() { setEnabled(!enabled); }

    // ── API publique ─────────────────────────────────────────────────────────
    window.supaBubbles = {
        getHistory: function () { return moveLog.slice(); },
        clearHistory: function () { moveLog.length = 0; },
        clear: clearBubbles,
        setEnabled: setEnabled,
        isEnabled: function () { return enabled; },
        getSnapshot: function () { return lastSnap; },
        getPanelEl: function () { return panelEl; },
        renderPanel: function () { if (lastSnap) renderPanel(lastSnap); },
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        injectStyles();
        engine = window.supaDots;
        if (!engine) {
            console.warn('[supa-move-bubbles] window.supaDots introuvable — charge supa-dots-widget.js avant.');
            return;
        }
        if (!getBoardEl()) return;

        createPanel();
        createButton();
        setEnabled(true);
        lastFen = getGame() ? getGame().fen() : null;
        watchFen();

        unsubs.push(engine.onAnalysis(function (snap) {
            if (!enabled) { lastSnap = snap; return; }
            if (lastSnap && snap.moveCount === lastSnap.moveCount + 1) {
                evaluatePlayedMove(lastSnap, snap);
            }
            lastSnap = snap;
            if (panelEl) {
                panelEl.style.display = 'block';
                renderPanel(snap);
            }
        }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 900); });
    } else {
        setTimeout(init, 900);
    }

})();
