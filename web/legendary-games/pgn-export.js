/* Export the moves already shown by each legendary-game page as PGN. */
(function () {
  'use strict';

  const page = location.pathname.split('/').pop();
  const players = {
    'carlsen_modern.html': { white: 'Magnus Carlsen', black: 'Sergey Karjakin', date: '2016.??.??', event: 'World Championship Tiebreak, Game 1', result: '*' },
    'karpov_positional.html': { white: 'Anatoly Karpov', black: 'Viktor Korchnoi', date: '1978.10.17', event: 'World Championship Match, Game 32', result: '1-0' },
    'kasparov_immortal.html': { white: 'Garry Kasparov', black: 'Veselin Topalov', date: '1999.01.20', event: 'Hoogovens, Wijk aan Zee', result: '1-0' },
    'tal_masterpiece.html': { white: 'Mikhail Tal', black: 'Vasily Smyslov', date: '1959.??.??' },
    'fischer_game_of_century_interactive_v2.html': { white: 'Donald Byrne', black: 'Robert James Fischer', date: '1956.10.17', event: 'Third Rosenwald Trophy, Round 8', result: '0-1' },
    'kasparov_immortal_1999.html': { white: 'Garry Kasparov', black: 'Veselin Topalov', date: '1999.01.20', event: 'Hoogovens, Wijk aan Zee, Round 4', result: '1-0' },
    'tal_masterpiece_1958.html': { white: 'Mikhail Tal', black: 'Vasily Vasiukov', date: '1958.??.??', event: 'USSR Championship' },
    'karpov_positional_1978.html': { white: 'Anatoly Karpov', black: 'Viktor Korchnoi', date: '1978.??.??', event: 'World Championship Match' },
    'carlsen_brilliancy_2013.html': { white: 'Magnus Carlsen', black: 'Viswanathan Anand', date: '2013.??.??', event: 'World Chess Championship' },
    'alphazero_vs_stockfish.html': { white: 'AlphaZero', black: 'Stockfish 8', date: '2017.??.??', event: 'AlphaZero vs Stockfish, Game 10' },
    'zup_victory_detailed.html': { white: 'ZUP ULTIMATE', black: 'Stockfish MAX', date: '2025.??.??', event: 'SupaChess simulated match', result: '1-0' },
    'supaengine_vs_stockfish_report.html': { white: 'SupaEngine v1.3', black: 'Stockfish 17 (Skill 20)', date: '2026.01.30', event: 'SupaEngine vs Stockfish Test', result: '1/2-1/2' },
    'leela_vs_stockfish_2019.html': { white: 'Leela Chess Zero', black: 'Stockfish 11', date: '2019.??.??', event: 'TCEC Season 16' },
    'deep_blue_kasparov_1997.html': { white: 'Deep Blue', black: 'Garry Kasparov', date: '1997.05.11', event: 'World Championship Match, Game 6', result: '1-0' },
    'alphazero_vs_stockfish_game2.html': { white: 'AlphaZero', black: 'Stockfish 8', date: '2017.??.??', event: 'AlphaZero vs Stockfish, Game 2', result: '1-0' },
    'stockfish_vs_komodo_2018.html': { white: 'Stockfish 9', black: 'Komodo MCTS', date: '2018.??.??', event: 'TCEC Season 13 Final' },
    'alphazero_sacrificial_masterpiece.html': { white: 'AlphaZero', black: 'Stockfish', date: '2017.??.??', event: 'AlphaZero sacrificial masterpiece', result: '1-0' }
  };

  function cleanPgn(value) {
    return String(value || '').replace(/\uFEFF/g, '').replace(/\r/g, '').trim().replace(/\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)(?:!|\?)+/g, '$1');
  }

  function pgnFromMoves(list, info) {
    if (typeof Chess !== 'function') throw new Error('Le moteur chess.js est requis pour générer le PGN.');
    const chess = new Chess();
    for (let index = 0; index < list.length; index += 1) {
      const entry = list[index];
      const san = typeof entry === 'string' ? entry : entry && (entry.move || entry.san);
      if (!san) continue;
      if (!chess.move(san, { sloppy: true })) {
        throw new Error(`Coup PGN illégal à la position ${index + 1}: ${san}`);
      }
    }

    const moves = chess.history();
    const result = info.result || (chess.game_over()
      ? chess.in_checkmate() ? (chess.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2'
      : '*');
    const headers = [
      ['Event', info.event || 'SupaChess - partie légendaire'],
      ['Site', info.site || '?'],
      ['Date', info.date || '????.??.??'],
      ['Round', info.round || '?'],
      ['White', info.white || '?'],
      ['Black', info.black || '?'],
      ['Result', result]
    ];
    const movetext = [];
    for (let index = 0; index < moves.length; index += 1) {
      if (index % 2 === 0) movetext.push(`${Math.floor(index / 2) + 1}.`);
      movetext.push(moves[index]);
    }
    return headers.map(([key, value]) => `[${key} "${String(value).replace(/["\\\\]/g, '')}"]`).join('\n')
      + '\n\n' + movetext.join(' ') + ' ' + result;
  }

  function normalizePgn(value, info) {
    const clean = cleanPgn(value);
    if (/^\[Event\s/m.test(clean)) return clean;
    if (typeof Chess !== 'function') return '';
    const parsed = new Chess();
    if (!parsed.load_pgn(clean)) return '';
    return pgnFromMoves(parsed.history(), info);
  }

  function currentPgn() {
    const info = players[page] || {};
    if (typeof gamePGN !== 'undefined' && gamePGN) return normalizePgn(gamePGN, info);

    const visiblePgn = document.querySelector('.pgn-box, .pgn-container');
    if (visiblePgn && visiblePgn.textContent.trim()) return normalizePgn(visiblePgn.textContent, info);

    if (typeof pgnMoves !== 'undefined' && pgnMoves) return normalizePgn(pgnMoves, info);

    if (typeof gameMoves !== 'undefined' && Array.isArray(gameMoves)) {
      return pgnFromMoves(gameMoves, info);
    }

    if (typeof moves !== 'undefined' && Array.isArray(moves)) {
      return pgnFromMoves(moves, info);
    }
    return '';
  }

  function addPanel() {
    if (document.querySelector('.supachess-pgn-export')) return;
    let pgn = '';
    try {
      pgn = currentPgn();
    } catch (error) {
      console.error('PGN indisponible pour cette partie:', error);
      return;
    }
    if (!pgn) return;

    const panel = document.createElement('section');
    panel.className = 'supachess-pgn-export';
    panel.setAttribute('aria-labelledby', 'supachess-pgn-title');
    panel.innerHTML = `
      <style>
        .supachess-pgn-export{box-sizing:border-box;max-width:960px;margin:24px auto;padding:18px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;color:#0f172a;font-family:system-ui,sans-serif}
        .supachess-pgn-export h2{margin:0 0 10px;font-size:1.2rem}
        .supachess-pgn-export p{margin:0 0 12px;color:#475569}
        .supachess-pgn-export textarea{box-sizing:border-box;width:100%;min-height:180px;padding:12px;border:1px solid #94a3b8;border-radius:8px;background:#fff;color:#111827;font:13px/1.5 ui-monospace,monospace;resize:vertical}
        .supachess-pgn-export .pgn-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .supachess-pgn-export button{padding:9px 13px;border:0;border-radius:7px;background:#155e75;color:#fff;font-weight:700;cursor:pointer}
        .supachess-pgn-export button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
        @media(prefers-color-scheme:dark){.supachess-pgn-export{background:#111827;color:#f8fafc;border-color:#475569}.supachess-pgn-export p{color:#cbd5e1}.supachess-pgn-export textarea{background:#020617;color:#f8fafc;border-color:#64748b}}
      </style>
      <h2 id="supachess-pgn-title">PGN de la partie</h2>
      <p>PGN des coups présents sur cette page. « * » indique que le résultat final n’est pas renseigné dans la séquence.</p>
      <textarea aria-label="Notation PGN de la partie" readonly spellcheck="false"></textarea>
      <div class="pgn-actions"><button type="button" data-action="copy">Copier le PGN</button><button type="button" data-action="download">Télécharger le fichier .pgn</button></div>
      <p class="pgn-status" role="status" aria-live="polite"></p>`;

    const textarea = panel.querySelector('textarea');
    const status = panel.querySelector('.pgn-status');
    textarea.value = pgn;
    panel.querySelector('[data-action="copy"]').addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(pgn);
      } catch (_) {
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
      }
      status.textContent = 'PGN copié.';
    });
    panel.querySelector('[data-action="download"]').addEventListener('click', function () {
      const blob = new Blob([pgn + '\n'], { type: 'application/x-chess-pgn;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = page.replace(/\.html$/i, '') + '.pgn';
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = 'Téléchargement du PGN lancé.';
    });

    const anchor = document.querySelector('.back-section, .back-button, main, .container, .game-container') || document.body;
    if (anchor === document.body) document.body.appendChild(panel);
    else if (anchor.classList.contains('back-section')) anchor.parentNode.insertBefore(panel, anchor);
    else anchor.appendChild(panel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPanel, { once: true });
  else addPanel();
})();
