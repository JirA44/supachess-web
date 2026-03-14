/**
 * SUPA Dots Widget — Colored move hints + Tactical combinations
 * Include at the end of any page with chessboard.js + chess.js
 * Adds floating ⚡ Dots button (bottom-right). Click to toggle.
 */
(function () {
    'use strict';

    // ── Colours by quality ───────────────────────────────────────────────────
    const C = {
        bril:    '#d0d0d8',
        best:    '#8b5cf6',
        excel:   '#3b82f6',
        good:    '#22c55e',
        ok:      '#eab308',
        inaccu:  '#f97316',
        blunder: '#ef4444',
        legal:   'rgba(200,200,200,0.45)',
    };
    const QLABEL = {
        bril: '🌟 Brillant', best: '🟣 Meilleur', excel: '🔵 Excellent',
        good: '🟢 Très bon', ok: '🟡 OK', inaccu: '🟠 Imprécision', blunder: '🔴 Gaffe',
    };

    // ── State ────────────────────────────────────────────────────────────────
    let sfWorker   = null;
    let sfReady    = false;
    let sfBuf      = [];
    let sfCB       = null;
    let analysis   = {};   // key → { score, diff, quality, pv }
    let pvLines    = [];   // [{ move, score, diff, quality, sanSeq, label }]
    let bookMoves  = new Set();
    let hlEls      = [];
    let active     = false;
    let overlayEl  = null;
    let btnEl      = null;
    let panelEl    = null;
    let analyzeTimer = null;
    let boardEl    = null;
    let currentSel = null;  // currently selected square

    // ── Page object accessors ────────────────────────────────────────────────
    // Tries window properties first, then scans for any chess.js/chessboard.js instance
    function getGame() {
        // 1. Explicit window properties
        for (const n of ['game', 'chess', 'chessGame', 'currentGame', 'gameObj']) {
            try {
                const v = window[n];
                if (v && typeof v.moves === 'function' && typeof v.fen === 'function') return v;
            } catch(e) {}
        }
        // 2. Broad scan (handles let/const variables exported implicitly)
        try {
            for (const k of Object.keys(window)) {
                const v = window[k];
                if (v && typeof v === 'object' && typeof v.moves === 'function' && typeof v.fen === 'function') return v;
            }
        } catch(e) {}
        return null;
    }
    function getBoard() {
        // 1. Explicit window properties
        for (const n of ['board', 'chessboard', 'cb', 'boardObj', 'myBoard']) {
            try {
                const v = window[n];
                if (v && typeof v.position === 'function' && typeof v.orientation === 'function') return v;
            } catch(e) {}
        }
        // 2. Broad scan
        try {
            for (const k of Object.keys(window)) {
                const v = window[k];
                if (v && typeof v === 'object' && typeof v.position === 'function' && typeof v.orientation === 'function') return v;
            }
        } catch(e) {}
        return null;
    }

    // ── Find chessboard.js DOM element ───────────────────────────────────────
    function findBoardEl() {
        const sq = document.querySelector('[data-square]');
        if (sq) {
            let el = sq.parentElement;
            while (el && el.querySelectorAll('[data-square]').length < 64) el = el.parentElement;
            if (el) return el;
        }
        for (const id of ['board', 'myBoard', 'chessboard', 'chess-board']) {
            const el = document.getElementById(id);
            if (el) return el;
        }
        return null;
    }

    // ── Stockfish ────────────────────────────────────────────────────────────
    function initSF() {
        function setupWorker(w) {
            sfWorker = w;
            sfWorker.onmessage = ({ data: line }) => {
                if (line === 'uciok') {
                    sfWorker.postMessage('setoption name Threads value 1');
                    sfWorker.postMessage('setoption name Hash value 32');
                    sfWorker.postMessage('isready');
                } else if (line === 'readyok') {
                    sfReady = true;
                    if (active) analyzePosition();
                } else if (line.startsWith('info') && line.includes('multipv')) {
                    sfBuf.push(line);
                } else if (line.startsWith('bestmove')) {
                    sfBuf.push(line);
                    if (sfCB) { sfCB(sfBuf.slice()); sfCB = null; sfBuf = []; }
                }
            };
            sfWorker.postMessage('uci');
        }
        try {
            setupWorker(new Worker('stockfish.js'));
        } catch(e) {
            fetch('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js')
                .then(r => r.blob())
                .then(b => setupWorker(new Worker(URL.createObjectURL(b))))
                .catch(() => {});
        }
    }

    function sfCall(fen, mpv, depth) {
        return new Promise(resolve => {
            if (!sfReady) { resolve([]); return; }
            sfCB = null; sfBuf = [];
            sfWorker.postMessage('stop');
            sfCB = resolve;
            sfWorker.postMessage(`setoption name MultiPV value ${mpv}`);
            sfWorker.postMessage('setoption name Skill Level value 20');
            sfWorker.postMessage(`position fen ${fen}`);
            sfWorker.postMessage(`go depth ${depth}`);
        });
    }

    // ── PV parsing — capture full principal variation ─────────────────────────
    function parseLines(lines, isBlack) {
        const byRank = {};
        for (const l of lines) {
            if (!l.startsWith('info') || !l.includes('multipv')) continue;
            const rv  = l.match(/multipv (\d+)/);
            const cm  = l.match(/score cp (-?\d+)/);
            const mm  = l.match(/score mate (-?\d+)/);
            const pvm = l.match(/ pv ((?:[a-h][1-8][a-h][1-8][qrbn]? ?)+)/);
            if (!pvm) continue;
            const pvUci = pvm[1].trim();
            const firstMove = pvUci.split(' ')[0];
            let score = 0;
            if (cm) score = parseInt(cm[1]);
            else if (mm) score = parseInt(mm[1]) > 0 ? 30000 : -30000;
            if (isBlack) score = -score;
            const rank = rv ? parseInt(rv[1]) : 99;
            // isMate = true only when the side to move has the mate (positive)
            const mateN = mm ? parseInt(mm[1]) : null;
            byRank[rank] = { rank, move: firstMove, score, pvUci,
                             isMate: !!mm && mateN > 0, mateIn: mateN ? Math.abs(mateN) : null };
        }
        return Object.values(byRank).sort((a, b) => a.rank - b.rank);
    }

    // ── Convert UCI PV → SAN array (using chess.js) ─────────────────────────
    function pvToSan(fen, pvUci, maxMoves) {
        if (typeof Chess === 'undefined') return pvUci.split(' ').slice(0, maxMoves);
        try {
            const tmp  = new Chess(fen);
            const sans = [];
            const uciMoves = pvUci.split(' ').slice(0, maxMoves);
            for (const uci of uciMoves) {
                if (!uci || !/^[a-h][1-8][a-h][1-8]/.test(uci)) break;
                const mv = tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
                if (!mv) break;
                sans.push(mv.san);
            }
            return sans;
        } catch(e) { return []; }
    }

    // ── Tactic label detection ───────────────────────────────────────────────
    function labelTactic(ranked, idx, sanSeq) {
        const r     = ranked[idx];
        const diff  = idx === 0 ? (ranked.length > 1 ? ranked[0].score - ranked[1].score : 0) : 0;
        const san   = sanSeq[0] || '';
        const san2  = sanSeq[1] || '';
        const pvStr = sanSeq.join(' → ');

        if (r.isMate)                            return `☠️ Mat en ${r.mateIn}`;
        if (pvStr.includes('#'))                 return '☠️ Mat forcé !';
        if (diff > 300 && san.includes('x'))     return '🎯 Sacrifice tactique';
        if (diff > 150 && san.includes('x') && san2.includes('+')) return '🎯 Sacrifice + Échec';
        if (diff > 150)                          return '🎯 Combinaison !';
        if (san.includes('x') && san2.includes('x')) return '⚔️ Double capture';
        if (san.includes('+') || san2.includes('+')) return '⚡ Séquence d\'échec';
        if (san.includes('x'))                   return '♟️ Prise intéressante';
        if (idx === 0 && diff > 80)              return '💡 Coup unique';
        return null;  // no special label
    }

    // ── Position analysis ────────────────────────────────────────────────────
    async function analyzePosition() {
        const g = getGame();
        if (!g || !sfReady) return;
        const legalMoves = g.moves({ verbose: true });
        if (!legalMoves.length) return;
        const mpv   = Math.min(legalMoves.length, 30);
        const lines = await sfCall(g.fen(), mpv, 16);
        const ranked = parseLines(lines, g.turn() === 'b');
        if (!ranked.length) return;

        const bestScore   = ranked[0].score;
        const brillantGap = ranked.length >= 2 ? bestScore - ranked[1].score : 0;
        const isBrillant  = brillantGap >= 100;

        analysis = {};
        pvLines  = [];

        for (const r of ranked) {
            const diff = bestScore - r.score;
            let quality;
            if (r.rank === 1 && isBrillant) quality = 'bril';
            else if (diff <= 0)             quality = 'best';
            else if (diff <= 10)            quality = 'excel';
            else if (diff <= 30)            quality = 'good';
            else if (diff <= 60)            quality = 'ok';
            else if (diff <= 120)           quality = 'inaccu';
            else                            quality = 'blunder';

            // Convert pv to SAN (4 moves deep)
            const sanSeq = pvToSan(g.fen(), r.pvUci, 4);
            const tactic = labelTactic(ranked, r.rank - 1, sanSeq);

            analysis[r.move] = { score: r.score, diff, quality, pvUci: r.pvUci, sanSeq, tactic };

            // Only keep tactical highlights and top moves in pvLines
            if (tactic || r.rank <= 5) {
                pvLines.push({ move: r.move, score: r.score, diff, quality, sanSeq, tactic,
                               isMate: r.isMate, mateIn: r.mateIn });
            }
        }

        // Fill in moves SF didn't return
        for (const m of legalMoves) {
            const key = m.from + m.to + (m.promotion || '');
            if (!analysis[key]) analysis[key] = { score: bestScore - 400, diff: 400, quality: 'blunder', sanSeq: [], tactic: null };
        }

        fetchBookMoves(g.fen());
        renderTacticsPanel(null);

        if (currentSel) showMovesForSquare(currentSel);
    }

    async function fetchBookMoves(fen) {
        bookMoves = new Set();
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 3000);
        try {
            const url  = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=30&topGames=0`;
            const resp = await fetch(url, { signal: ctrl.signal });
            clearTimeout(tid);
            if (!resp.ok) return;
            const data = await resp.json();
            for (const m of (data.moves || [])) { if (m.uci) bookMoves.add(m.uci); }
        } catch(_) { clearTimeout(tid); }
    }

    // ── Tactics panel ────────────────────────────────────────────────────────
    function createTacticsPanel() {
        panelEl = document.createElement('div');
        panelEl.id = 'supa-tactics-panel';
        panelEl.style.cssText = [
            'position:fixed',
            'bottom:62px',
            'right:20px',
            'z-index:9998',
            'width:280px',
            'max-height:360px',
            'overflow-y:auto',
            'background:rgba(12,8,25,0.96)',
            'border:1px solid rgba(139,92,246,0.35)',
            'border-radius:14px',
            'padding:12px 10px',
            'font-family:system-ui,sans-serif',
            'font-size:0.8em',
            'box-shadow:0 8px 30px rgba(0,0,0,0.6)',
            'backdrop-filter:blur(10px)',
            'display:none',
        ].join(';');
        document.body.appendChild(panelEl);
    }

    function renderTacticsPanel(filterFromSq) {
        if (!panelEl || !active) return;

        // Determine which lines to show
        let lines = pvLines;
        if (filterFromSq) {
            lines = pvLines.filter(l => l.move.startsWith(filterFromSq));
        }

        // Always show top 5 lines if no filter or filter yields nothing
        if (!lines.length) {
            lines = pvLines.slice(0, 5);
        }

        if (!lines.length) {
            panelEl.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:10px">Analyse en cours…</div>';
            panelEl.style.display = 'block';
            return;
        }

        const title = filterFromSq
            ? `🎯 Tactiques depuis <b>${filterFromSq}</b>`
            : '🎯 Tactiques disponibles';

        const rows = lines.map(l => {
            const color  = C[l.quality] || C.legal;
            const sc     = (l.score >= 0 ? '+' : '') + (l.score / 100).toFixed(2);
            const qlabel = QLABEL[l.quality] || '';
            const seq    = l.sanSeq.length
                ? l.sanSeq.join(' <span style="opacity:0.45">→</span> ')
                : l.move;
            const tacBadge = l.tactic
                ? `<span style="display:inline-block;margin-top:3px;font-size:0.78em;padding:1px 6px;border-radius:6px;background:rgba(139,92,246,0.2);color:#c4b5fd;">${l.tactic}</span>`
                : '';
            return `
            <div style="margin-bottom:7px;padding:7px 9px;border-radius:9px;border-left:3px solid ${color};background:rgba(255,255,255,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                    <span style="font-weight:700;color:${color};font-size:0.9em;">${qlabel}</span>
                    <span style="color:rgba(255,255,255,0.4);font-size:0.82em;">${sc}</span>
                </div>
                <div style="font-family:monospace;font-size:0.97em;color:#e2e8f0;line-height:1.6;">${seq}</div>
                ${tacBadge}
            </div>`;
        }).join('');

        panelEl.innerHTML = `
            <div style="font-weight:700;color:#a78bfa;margin-bottom:8px;font-size:0.85em;">${title}</div>
            ${rows}`;
        panelEl.style.display = 'block';
    }

    // ── Overlay helpers ──────────────────────────────────────────────────────
    function ensureOverlay() {
        if (overlayEl && overlayEl.parentNode) return;
        overlayEl = document.createElement('div');
        overlayEl.id = 'supa-dots-overlay';
        overlayEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:100;';
        const parent = boardEl.parentElement;
        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
        parent.insertBefore(overlayEl, boardEl.nextSibling);
    }

    function squareToPos(sq) {
        const b = getBoard();
        const flipped = b && b.orientation && b.orientation() === 'black';
        const SQ  = boardEl.offsetWidth / 8;
        const col = sq.charCodeAt(0) - 97;
        const row = parseInt(sq[1]) - 1;
        return { x: flipped ? (7 - col) * SQ : col * SQ,
                 y: flipped ? row * SQ : (7 - row) * SQ, SQ };
    }

    function clearHL() { hlEls.forEach(el => el.remove()); hlEls = []; }

    function addHL(sq, quality, isCapture, isBook, givesCheck) {
        const { x, y, SQ } = squareToPos(sq);
        const color = C[quality] || C.legal;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${SQ}px;height:${SQ}px;display:flex;align-items:center;justify-content:center;`;

        const inner = document.createElement('div');
        if (isCapture) {
            const bw = Math.max(3, Math.round(SQ * 0.07));
            inner.style.cssText = `width:88%;height:88%;border-radius:50%;border:${bw}px solid ${color};opacity:0.85;box-shadow:0 0 10px ${color};`;
        } else {
            inner.style.cssText = `width:34%;height:34%;border-radius:50%;background:${color};opacity:0.85;box-shadow:0 0 10px ${color};`;
        }
        wrapper.appendChild(inner);

        if (isBook) {
            const ring = document.createElement('div');
            ring.style.cssText = 'position:absolute;inset:18%;border-radius:50%;border:2px solid #c8974a;box-shadow:0 0 5px #c8974a;pointer-events:none;';
            wrapper.appendChild(ring);
        }
        if (givesCheck) {
            const ci = document.createElement('span');
            ci.style.cssText = 'position:absolute;top:3px;right:3px;font-size:10px;background:rgba(255,210,0,0.9);border-radius:3px;padding:0 2px;line-height:1.4;';
            ci.textContent = '⚡';
            wrapper.appendChild(ci);
        }

        overlayEl.appendChild(wrapper);
        hlEls.push(wrapper);
    }

    // ── Show dots for selected piece ─────────────────────────────────────────
    function showMovesForSquare(sq) {
        clearHL();
        const g = getGame();
        if (!g || !sq || !boardEl) return;
        const moves = g.moves({ verbose: true }).filter(m => m.from === sq);
        if (!moves.length) return;

        const checkSet = new Set();
        for (const m of moves) {
            try {
                const tmp = new Chess(g.fen());
                const res = tmp.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                if (res && tmp.in_check()) checkSet.add(m.from + m.to + (m.promotion || ''));
            } catch(e) {}
        }

        ensureOverlay();
        for (const m of moves) {
            const key        = m.from + m.to + (m.promotion || '');
            const info       = analysis[key];
            const quality    = info ? info.quality : 'legal';
            const isCapture  = !!(m.flags && (m.flags.includes('c') || m.flags.includes('e')));
            const isBook     = bookMoves.has(key);
            const givesCheck = checkSet.has(key);
            addHL(m.to, quality, isCapture, isBook, givesCheck);
        }

        // Update tactics panel filtered to this piece
        renderTacticsPanel(sq);
    }

    // ── Click interception ───────────────────────────────────────────────────
    function attachClickHandler() {
        // mousedown catches drag-start (chessboard.js uses drag, not click)
        boardEl.addEventListener('mousedown', function(e) {
            if (!active) return;
            const sqEl = e.target.closest('[data-square]');
            if (!sqEl) return;
            const sq = sqEl.getAttribute('data-square');
            const g  = getGame();
            if (!g) return;
            const piece = g.get(sq);
            if (piece && piece.color === g.turn()) {
                currentSel = sq;
                showMovesForSquare(sq);
            } else {
                clearHL();
                currentSel = null;
                renderTacticsPanel(null);
            }
        });

        boardEl.addEventListener('click', function(e) {
            if (!active) return;
            const sqEl = e.target.closest('[data-square]');
            if (!sqEl) return;
            const sq = sqEl.getAttribute('data-square');
            const g  = getGame();
            if (!g) return;
            const piece = g.get(sq);
            if (piece && piece.color === g.turn()) {
                currentSel = sq;
                showMovesForSquare(sq);
            } else {
                clearHL();
                currentSel = null;
                renderTacticsPanel(null);
            }
        });

        // Watch for board changes (opponent move, etc.)
        const obs = new MutationObserver(() => {
            if (!active) return;
            clearHL();
            currentSel = null;
            analysis   = {};
            pvLines    = [];
            if (panelEl) panelEl.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:10px">Analyse en cours…</div>';
            clearTimeout(analyzeTimer);
            analyzeTimer = setTimeout(analyzePosition, 400);
        });
        obs.observe(boardEl, { childList: true, subtree: true });
    }

    // ── Toggle button ────────────────────────────────────────────────────────
    function createButton() {
        btnEl = document.createElement('button');
        btnEl.id = 'supa-dots-btn';
        btnEl.innerHTML = '⚡ Dots <span id="supa-dots-lbl">OFF</span>';
        btnEl.title = 'SUPA Dots — Coups colorés + Tactiques';
        btnEl.style.cssText = [
            'position:fixed', 'bottom:20px', 'right:20px', 'z-index:9999',
            'padding:10px 18px', 'background:rgba(15,10,30,0.92)', 'color:#9ca3af',
            'border:2px solid rgba(139,92,246,0.3)', 'border-radius:12px',
            'cursor:pointer', 'font-size:0.88em', 'font-weight:700',
            'backdrop-filter:blur(8px)', 'transition:all 0.2s',
            'font-family:system-ui,sans-serif', 'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        ].join(';');
        btnEl.addEventListener('click', toggle);
        document.body.appendChild(btnEl);
    }

    function setActive(val) {
        active = val;
        const lbl = document.getElementById('supa-dots-lbl');
        if (lbl) lbl.textContent = active ? 'ON' : 'OFF';
        if (btnEl) {
            btnEl.style.color       = active ? '#a78bfa' : '#9ca3af';
            btnEl.style.borderColor = active ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.3)';
            btnEl.style.background  = active ? 'rgba(139,92,246,0.18)' : 'rgba(15,10,30,0.92)';
        }
        if (!val) {
            clearHL();
            currentSel = null;
            if (panelEl) panelEl.style.display = 'none';
        } else {
            analysis = {};
            pvLines  = [];
            analyzePosition();
        }
    }

    function toggle() { setActive(!active); }

    // ── Public API (callable from page onDragStart etc.) ─────────────────────
    window.supaDotsShowMoves = function(sq) {
        if (!active || !boardEl) return;
        const g = getGame();
        if (!g) return;
        const piece = g.get(sq);
        if (piece && piece.color === g.turn()) {
            currentSel = sq;
            showMovesForSquare(sq);
        }
    };
    window.supaDotsActivate = function() { if (!active) setActive(true); };
    window.supaDotsDeactivate = function() { if (active) setActive(false); };

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        boardEl = findBoardEl();
        if (!boardEl) return;
        createButton();
        createTacticsPanel();
        attachClickHandler();
        initSF();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 600));
    } else {
        setTimeout(init, 600);
    }

})();
