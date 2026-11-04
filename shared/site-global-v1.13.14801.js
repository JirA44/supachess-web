(function () {
  'use strict';
  var script = document.currentScript;
  var root = script && script.src ? new URL('../', script.src) : new URL('./', location.href);
  var SITE_VERSION = '1.13.14807';
  document.documentElement.setAttribute('data-supachess-version', SITE_VERSION);
  var style = document.createElement('style');
  style.id = 'supachess-global-ux';
  style.textContent = [
    'img[src*="/wK.svg"],img[src*="/wQ.svg"],img[src*="/wR.svg"],img[src*="/wB.svg"],img[src*="/wN.svg"],img[src*="/wP.svg"]{opacity:1!important;visibility:visible!important;filter:drop-shadow(0 0 1.6px #101827) drop-shadow(0 0 1px #101827)!important}',
    'img[src*="/bK.svg"],img[src*="/bQ.svg"],img[src*="/bR.svg"],img[src*="/bB.svg"],img[src*="/bN.svg"],img[src*="/bP.svg"]{opacity:1!important;visibility:visible!important;filter:drop-shadow(0 0 1.6px #f8fafc) drop-shadow(0 0 1px #f8fafc)!important}',
    '.piece.white,.piece[data-color="white"],.piece[data-piece^="w"]{opacity:1!important;visibility:visible!important;filter:drop-shadow(0 0 1.6px #101827) drop-shadow(0 0 1px #101827)!important}',
    '.piece.black,.piece[data-color="black"],.piece[data-piece^="b"]{opacity:1!important;visibility:visible!important;filter:drop-shadow(0 0 1.6px #f8fafc) drop-shadow(0 0 1px #f8fafc)!important}',
    '.supachess-filled-white-piece{color:#fff!important;-webkit-text-fill-color:#fff!important;fill:#fff!important;-webkit-text-stroke:2.9px #101827!important;paint-order:stroke fill;opacity:1!important;font-weight:900!important;filter:drop-shadow(0 1px 1px rgba(0,0,0,.85))!important;text-shadow:0 0 2px #101827,1px 0 #101827,-1px 0 #101827,0 1px #101827,0 -1px #101827,1px 1px #101827,-1px -1px #101827,1px -1px #101827,-1px 1px #101827!important}',
    '.supachess-filled-black-piece{color:#171717!important;-webkit-text-fill-color:#171717!important;fill:#171717!important;-webkit-text-stroke:2.7px #f8fafc!important;paint-order:stroke fill;opacity:1!important;font-weight:900!important;filter:drop-shadow(0 1px 1px rgba(255,255,255,.8))!important;text-shadow:0 0 2px #f8fafc,1px 0 #f8fafc,-1px 0 #f8fafc,0 1px #f8fafc,0 -1px #f8fafc,1px 1px #f8fafc,-1px -1px #f8fafc,1px -1px #f8fafc,-1px 1px #f8fafc!important}',
    '.supachess-vector-piece{color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important;background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important}',
    '.supachess-page-back{display:block;width:max-content;max-width:100%;margin:12px auto;padding:10px 18px;border:1px solid currentColor;border-radius:999px;background:#12354a;color:#fff!important;font:600 15px/1.3 system-ui,sans-serif;text-decoration:none;box-shadow:0 2px 8px #0003}',
    '.supachess-page-back:hover{background:#1b526f;text-decoration:underline}',
    '.supachess-page-back:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}',
    '.supachess-page-back--top{margin-top:0}'
  ].join('');
  style.textContent += '.supachess-global-settings{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:8px auto;padding:0 12px}.supachess-global-settings a,.supachess-global-settings button{display:inline-block;padding:8px 12px;border:1px solid #7892ad;border-radius:999px;background:#13253b;color:#fff!important;font:600 13px/1.25 system-ui,sans-serif;text-decoration:none;cursor:pointer}.supachess-global-settings a:hover,.supachess-global-settings button:hover{background:#1c3c5c;text-decoration:underline}.supachess-global-settings a:focus-visible,.supachess-global-settings button:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}@media(max-width:520px){.supachess-global-settings a,.supachess-global-settings button{font-size:12px;padding:7px 10px}}';

  style.textContent += [
    '.supachess-vector-piece{background-color:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important;min-width:0!important;min-height:0!important;display:inline-block!important;width:88%!important;height:88%!important;line-height:1!important}',
    '.supachess-vector-piece{background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important}',
    '.square,.analysis-square,.cell,.big-cell{touch-action:manipulation}',
    '.controls button,.board-controls button,.chess-controls button{min-width:44px;min-height:44px;touch-action:manipulation}',
    '@media(max-width:768px){.board-container,#chessboard,.chessboard,#analysisBoard{max-width:min(100%,88vw,78vh);margin-left:auto;margin-right:auto}.controls{gap:8px;flex-wrap:wrap}.controls button{padding:10px 12px}}',
    '@media(pointer:coarse){.controls button,.board-controls button,.chess-controls button{min-width:48px;min-height:48px}.square,.analysis-square,.cell,.big-cell{transition:none!important}}'
  ].join('');
  (document.head || document.documentElement).appendChild(style);


  style.textContent += [
    '.supachess-preferences{width:min(620px,calc(100vw - 24px));max-width:none;max-height:min(86dvh,760px);padding:0;border:1px solid #52657d;border-radius:18px;background:#101827;color:#eef3f8;box-shadow:0 24px 90px #0009;font:15px/1.5 system-ui,sans-serif}',
    '.supachess-preferences::backdrop{background:rgba(3,7,14,.72);backdrop-filter:blur(3px)}',
    '.supachess-preferences__form{padding:0}.supachess-preferences__header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:20px 22px 12px;border-bottom:1px solid #334155}',
    '.supachess-preferences h2{margin:0;color:#f5d779;font-size:21px}.supachess-preferences h3{margin:0 0 12px;color:#94c9eb;font-size:16px}',
    '.supachess-preferences__intro{margin:6px 0 0;color:#aab8c8;font-size:13px}.supachess-preferences section{padding:17px 22px;border-bottom:1px solid #263347}',
    '.supachess-pref-row{display:grid;grid-template-columns:1fr minmax(150px,220px);align-items:center;gap:12px;margin:11px 0}',
    '.supachess-pref-row select{min-height:40px;padding:8px 10px;border:1px solid #52657d;border-radius:9px;background:#172337;color:#f7fafc;font:inherit}',
    '.supachess-pref-row input[type=range]{width:100%;accent-color:#f5d779}.supachess-pref-row output{color:#f5d779;font-size:12px}',
    '.supachess-pref-check{display:flex;align-items:center;gap:10px;margin:14px 0 2px}.supachess-pref-check input{width:18px;height:18px;accent-color:#f5d779}',
    '.supachess-preferences__analysis-link{display:inline-block;margin-top:8px;padding:8px 11px;border:1px solid #52657d;border-radius:9px;color:#f5d779;text-decoration:none;font-weight:650}',
    '.supachess-preferences__footer{display:flex;justify-content:space-between;gap:10px;padding:14px 22px}.supachess-preferences button{min-height:40px;padding:7px 12px;border:1px solid #60748e;border-radius:9px;background:#1b2a3d;color:#f7fafc;font:600 13px system-ui,sans-serif;cursor:pointer}.supachess-preferences button:hover{background:#263b55}.supachess-preferences__close{font-size:20px!important;line-height:1}.supachess-preferences__footer .secondary{margin-left:auto}',
    '.supachess-preferences :focus-visible{outline:3px solid #f5d779;outline-offset:3px}',
    'body[data-supa-coordinates="off"] .supachess-rank-label,body[data-supa-coordinates="off"] .supachess-file-label,body[data-supa-coordinates="off"] .numeric-fc462,body[data-supa-coordinates="off"] .alpha-d2270,body[data-supa-coordinates="off"] .board-coordinate{display:none!important}',
    'body[data-supa-board-theme="green"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.white-1e1d7,.white-square,.light-square,.square-light,.cell.light,.cell.white,.analysis-square.light,.analysis-square.white,.big-cell.light,.big-cell.white,[data-square-color="light"]){background-color:#eeeed2!important}',
    'body[data-supa-board-theme="green"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.black-3c85d,.black-square,.dark-square,.square-dark,.cell.dark,.cell.black,.analysis-square.dark,.analysis-square.black,.big-cell.dark,.big-cell.black,[data-square-color="dark"]){background-color:#769656!important}',
    'body[data-supa-board-theme="blue"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.white-1e1d7,.white-square,.light-square,.square-light,.cell.light,.cell.white,.analysis-square.light,.analysis-square.white,.big-cell.light,.big-cell.white,[data-square-color="light"]){background-color:#e4edf4!important}',
    'body[data-supa-board-theme="blue"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.black-3c85d,.black-square,.dark-square,.square-dark,.cell.dark,.cell.black,.analysis-square.dark,.analysis-square.black,.big-cell.dark,.big-cell.black,[data-square-color="dark"]){background-color:#6689a8!important}',
    'body[data-supa-board-theme="wood"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.white-1e1d7,.white-square,.light-square,.square-light,.cell.light,.cell.white,.analysis-square.light,.analysis-square.white,.big-cell.light,.big-cell.white,[data-square-color="light"]){background-color:#f0d2aa!important}',
    'body[data-supa-board-theme="wood"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.black-3c85d,.black-square,.dark-square,.square-dark,.cell.dark,.cell.black,.analysis-square.dark,.analysis-square.black,.big-cell.dark,.big-cell.black,[data-square-color="dark"]){background-color:#9d6640!important}',
    'body[data-supa-board-theme="contrast"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.white-1e1d7,.white-square,.light-square,.square-light,.cell.light,.cell.white,.analysis-square.light,.analysis-square.white,.big-cell.light,.big-cell.white,[data-square-color="light"]){background-color:#f8fafc!important}',
    'body[data-supa-board-theme="contrast"] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(.black-3c85d,.black-square,.dark-square,.square-dark,.cell.dark,.cell.black,.analysis-square.dark,.analysis-square.black,.big-cell.dark,.big-cell.black,[data-square-color="dark"]){background-color:#26364a!important}',
    'body[data-supa-piece-scale] :is(.board,.big-board,.complex-board,.analysis-board,#analysisBoard,.chessboard) :is(img.piece,.piece img,.chess-piece,.piece-white,.piece-black,.piece-token,[data-piece^="w"],[data-piece^="b"]){transform:scale(var(--supa-piece-scale,1))}'
  ].join('');
  // Normalize outline Unicode chess symbols to solid glyphs; CSS determines side color.
  var outlineToSolid = { '♔':'♚', '♕':'♛', '♖':'♜', '♗':'♝', '♘':'♞', '♙':'♟' };
  var chessGlyphType = { '♔':'K','♚':'K','♕':'Q','♛':'Q','♖':'R','♜':'R','♗':'B','♝':'B','♘':'N','♞':'N','♙':'P','♟':'P' };
  var chessGlyphSelector = '.chess-piece.white,.chess-piece.black,.piece.white,.piece.black,.piece-white,.piece-black,.white-piece,.black-piece,.piece[data-color="white"],.piece[data-color="black"],[data-piece^="w"],[data-piece^="b"],.piece-token:not(.black-piece),.piece-token.black-piece,.analysis-square[aria-label*="blanc"],.analysis-square[aria-label*="noir"],.complex-board span[aria-label*="blanc"],.complex-board span[aria-label*="noir"]';
  var whiteSideSelector = '.chess-piece.white,.piece.white,.piece-white,.white-piece,.piece[data-color="white"],[data-piece^="w"],.piece-token:not(.black-piece),[aria-label*="blanc"]';
  var blackSideSelector = '.chess-piece.black,.piece.black,.piece-black,.black-piece,.piece[data-color="black"],[data-piece^="b"],.piece-token.black-piece,[aria-label*="noir"]';
  function normalizeChessGlyphs(rootNode) {
    if (!rootNode || (rootNode.nodeType !== 1 && rootNode.nodeType !== 9)) return;
    var nodes = [];
    if (rootNode.nodeType === 1 && rootNode.matches && rootNode.matches(chessGlyphSelector)) nodes.push(rootNode);
    if (rootNode.querySelectorAll) nodes = nodes.concat(Array.prototype.slice.call(rootNode.querySelectorAll(chessGlyphSelector)));
    nodes.forEach(function (node) {
      if (node.tagName === 'IMG' || node.querySelector('svg,img')) return;
      var white = node.matches(whiteSideSelector), black = !white && node.matches(blackSideSelector);
      if (white) node.classList.add('supachess-filled-white-piece');
      if (black) node.classList.add('supachess-filled-black-piece');
      var glyph = (node.textContent || '').trim().replace(/[\uFE0E\uFE0F]/g, '');
      var type = chessGlyphType[glyph];
      if (type && (white || black)) {
        var side = white ? 'w' : 'b';
        var vector = new URL('assets/chess-pieces/' + side + type + '.svg?v=c-burnett-knight-20261102a', root).href;
        if (node.getAttribute('data-supachess-vector-src') !== vector) {
          node.setAttribute('data-supachess-vector-src', vector);
          var artwork = new Image();
          artwork.onload = function () {
            if (node.getAttribute('data-supachess-vector-src') !== vector) return;
            node.classList.add('supachess-vector-piece');
            node.style.setProperty('background-image', 'url("' + vector + '")', 'important');
            node.style.setProperty('background-color', 'transparent', 'important');
          };
          artwork.onerror = function () {
            if (node.getAttribute('data-supachess-vector-src') !== vector) return;
            node.classList.remove('supachess-vector-piece');
            node.style.removeProperty('background-image');
            node.style.removeProperty('background-color');
          };
          artwork.src = vector;
        }
      }
      if (outlineToSolid[glyph]) node.textContent = outlineToSolid[glyph];
    });
  }
  function ensureBoardRanks(rootNode) {
    if (!rootNode || !rootNode.querySelectorAll) return;
    var boards = [];
    if (rootNode.matches && rootNode.matches('.board,.big-board,.board-b72b1,.complex-board,#analysisBoard')) boards.push(rootNode);
    boards = boards.concat(Array.prototype.slice.call(rootNode.querySelectorAll('.board,.big-board,.board-b72b1,.complex-board,#analysisBoard')));
    boards.forEach(function (board) {
      // Chessboard.js already has the rank gutter unless showNotation:false was set.
      if (board.classList.contains('board-b72b1') && board.querySelector('.numeric-fc462,.supachess-rank-label')) return;
      var cells;
      if (board.classList.contains('board-b72b1')) {
        cells = Array.prototype.slice.call(board.querySelectorAll('.square-55d63'));
      } else {
        cells = Array.prototype.slice.call(board.children).filter(function (el) {
          return el.matches('.cell,.big-cell,.analysis-square,span');
        });
      }
      if (cells.length < 64) return;
      for (var row = 0; row < 8; row++) {
        var cell = cells[row * 8];
        if (!cell || cell.querySelector('.supachess-rank-label')) continue;
        var square = cell.getAttribute('data-square') || '';
        var rank = /[1-8]$/.test(square) ? square.slice(-1) : String(8 - row);
        cell.classList.add('supachess-rank-cell');
        var label = document.createElement('span');
        label.className = 'supachess-rank-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = rank;
        cell.appendChild(label);
      }
    });
  }
  var rankStyle = document.createElement('style');
  rankStyle.id = 'supachess-board-ranks';
  rankStyle.textContent = '.supachess-rank-cell{position:relative!important;overflow:visible!important}.supachess-rank-label{position:absolute;left:3px;top:1px;z-index:4;pointer-events:none;display:block!important;font:700 .65rem/1 system-ui,sans-serif!important;color:#101827;-webkit-text-stroke:.35px #fff;paint-order:stroke fill;text-shadow:0 0 2px #fff9}';
  (document.head || document.documentElement).appendChild(rankStyle);
  normalizeChessGlyphs(document);
  ensureBoardRanks(document);
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') normalizeChessGlyphs(record.target.parentElement);
        else Array.prototype.forEach.call(record.addedNodes, normalizeChessGlyphs); ensureBoardRanks(record.target && record.target.nodeType === 1 ? record.target : record.target && record.target.parentElement);
      });
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }
  function addBackLinks() {
    if (!document.body || document.querySelector('.supachess-page-back')) return;
    var target = document.body.getAttribute('data-page-back-url') || root.href + 'index.html';
    if (!document.body.hasAttribute('data-page-back-url')) {
      try {
        var ref = new URL(document.referrer);
        if (ref.origin === location.origin && ref.href !== location.href) target = ref.href;
      } catch (_) {}
    }
    function makeLink(position) {
      var link = document.createElement('a');
      link.className = 'supachess-page-back supachess-page-back--' + position;
      link.href = target;
      var selectedLang = (localStorage.getItem('chessnova_lang') || document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
      link.textContent = selectedLang === 'fr' ? '← Page précédente' : '← Previous page';
      link.setAttribute('aria-label', selectedLang === 'fr' ? 'Revenir à la page précédente' : 'Return to the hub');
      return link;
    }
    document.body.insertBefore(makeLink('top'), document.body.firstChild);
    document.body.appendChild(makeLink('bottom'));
  }
  var GLOBAL_PREFERENCES_KEY = 'supachess_global_preferences_v1';
  function loadGlobalPreferences() {
    var defaults = { boardTheme: 'classic', pieceScale: 1, coordinates: true };
    try {
      var saved = JSON.parse(localStorage.getItem(GLOBAL_PREFERENCES_KEY) || '{}');
      return {
        boardTheme: /^(classic|green|blue|wood|contrast)$/.test(saved.boardTheme) ? saved.boardTheme : defaults.boardTheme,
        pieceScale: Math.min(1.15, Math.max(0.85, Number(saved.pieceScale) || defaults.pieceScale)),
        coordinates: saved.coordinates !== false
      };
    } catch (_) { return defaults; }
  }
  function applyGlobalPreferences(preferences) {
    document.body.setAttribute('data-supa-board-theme', preferences.boardTheme);
    document.body.setAttribute('data-supa-coordinates', preferences.coordinates ? 'on' : 'off');
    document.body.setAttribute('data-supa-piece-scale', '');
    document.documentElement.style.setProperty('--supa-piece-scale', String(preferences.pieceScale));
  }
  function addSettingsLinks() {
    if (!document.body || document.querySelector('.supachess-global-settings')) return;
    var french = (document.documentElement.lang || '').toLowerCase().startsWith('fr')
      || (localStorage.getItem('chessnova_lang') || '').slice(0, 2).toLowerCase() === 'fr';
    var nav = document.createElement('nav');
    nav.className = 'supachess-global-settings';
    nav.setAttribute('aria-label', french ? 'Réglages SupaChess' : 'SupaChess settings');
    var appearance = document.createElement('button');
    appearance.type = 'button';
    appearance.className = 'supachess-settings-action';
    appearance.setAttribute('aria-haspopup', 'dialog');
    appearance.setAttribute('aria-controls', 'supachess-preferences-dialog');
    appearance.textContent = french ? '🎨 Apparence' : '🎨 Appearance';
    var analysis = document.createElement('a');
    analysis.href = new URL('PLAYER_ANALYSIS.html', root).href;
    analysis.textContent = french ? '📊 Analyse' : '📊 Analysis';
    analysis.setAttribute('aria-label', french ? 'Ouvrir l’analyse de style SupaChess' : 'Open SupaChess player analysis');
    var languageGroup = document.createElement('div');
    languageGroup.className = 'supachess-language-control';
    languageGroup.setAttribute('role', 'group');
    languageGroup.setAttribute('aria-label', french ? 'Choisir la langue du site' : 'Choose site language');
    ['fr', 'en'].forEach(function (language) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'supachess-language-button';
      button.textContent = language.toUpperCase();
      button.setAttribute('data-language', language);
      button.setAttribute('aria-pressed', ((localStorage.getItem('chessnova_lang') || document.documentElement.lang || 'en').slice(0, 2).toLowerCase() === language) ? 'true' : 'false');
      button.addEventListener('click', function () {
        function applyLanguage() {
          if (window.ChessNovaI18n && typeof window.ChessNovaI18n.switchLang === 'function') {
            window.ChessNovaI18n.switchLang(language);
            window.setTimeout(updateLanguageButtons, 50);
          }
        }
        if (window.ChessNovaI18n && typeof window.ChessNovaI18n.switchLang === 'function') applyLanguage();
        else {
          var loader = document.querySelector('script[data-supachess-i18n-loader]');
          if (!loader) {
            loader = document.createElement('script');
            loader.src = new URL('shared/i18n.js', root).href;
            loader.setAttribute('data-supachess-i18n-loader', '');
            loader.onload = applyLanguage;
            document.body.appendChild(loader);
          } else loader.addEventListener('load', applyLanguage, { once: true });
        }
      });
      languageGroup.appendChild(button);
    });
    function updateLanguageButtons() {
      var activeLanguage = (localStorage.getItem('chessnova_lang') || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
      languageGroup.querySelectorAll('[data-language]').forEach(function (button) {
        var active = button.getAttribute('data-language') === activeLanguage;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
    var languageStyle = document.createElement('style');
    languageStyle.textContent = '.supachess-language-control{display:inline-flex;gap:4px;align-items:center;padding:3px;border:1px solid #7892ad;border-radius:999px;background:#0d1d30}.supachess-language-button{min-width:42px;min-height:40px;padding:7px 10px;border:0;border-radius:999px;background:transparent;color:#dbeafe;font:700 13px/1.2 system-ui,sans-serif;cursor:pointer}.supachess-language-button[aria-pressed="true"]{background:#0ea5e9;color:#06111f}.supachess-language-button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}.cn-lang-toggle{display:none!important}';
    document.head.appendChild(languageStyle);
    nav.appendChild(languageGroup);
    nav.appendChild(appearance);
    nav.appendChild(analysis);
    var topBack = document.querySelector('.supachess-page-back--top');
    if (topBack && topBack.parentNode) topBack.parentNode.insertBefore(nav, topBack.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);

    var preferences = loadGlobalPreferences();
    applyGlobalPreferences(preferences);
    var dialog = document.createElement('dialog');
    dialog.className = 'supachess-preferences';
    dialog.id = 'supachess-preferences-dialog';
    dialog.setAttribute('aria-labelledby', 'supachess-preferences-title');
    var boardLabels = french
      ? { title: 'Réglages SupaChess', intro: 'Ces choix sont mémorisés sur cet appareil et appliqués sur les pages SupaChess compatibles.', appearance: 'Apparence de l’échiquier', theme: 'Thème des cases', classic: 'Classique', green: 'Vert', blue: 'Bleu', wood: 'Bois', contrast: 'Contraste élevé', pieceSize: 'Taille des pièces', coordinates: 'Afficher les coordonnées', analysis: 'Analyse', analysisText: 'Pour les statistiques et le profil de jeu, ouvre l’analyse de style SupaChess.', openAnalysis: 'Ouvrir l’analyse de style →', reset: 'Réinitialiser les réglages', close: 'Fermer' }
      : { title: 'SupaChess settings', intro: 'These choices are saved on this device and applied across compatible SupaChess pages.', appearance: 'Board appearance', theme: 'Square theme', classic: 'Classic', green: 'Green', blue: 'Blue', wood: 'Wood', contrast: 'High contrast', pieceSize: 'Piece size', coordinates: 'Show coordinates', analysis: 'Analysis', analysisText: 'For player statistics and style profile, open SupaChess player analysis.', openAnalysis: 'Open player analysis →', reset: 'Reset settings', close: 'Close' };
    dialog.innerHTML = '<form method="dialog" class="supachess-preferences__form"><header class="supachess-preferences__header"><div><h2 id="supachess-preferences-title"></h2><p class="supachess-preferences__intro"></p></div><button class="supachess-preferences__close" type="submit" value="close" aria-label="' + boardLabels.close + '">×</button></header><section id="supachess-pref-appearance"><h3></h3><label class="supachess-pref-row"><span class="supachess-pref-label"></span><select id="supa-pref-theme"><option value="classic"></option><option value="green"></option><option value="blue"></option><option value="wood"></option><option value="contrast"></option></select></label><label class="supachess-pref-row"><span class="supachess-pref-label"></span><input id="supa-pref-piece-size" type="range" min="85" max="115" step="5"><output id="supa-pref-piece-size-value"></output></label><label class="supachess-pref-check"><input id="supa-pref-coordinates" type="checkbox"><span></span></label></section><section id="supachess-pref-analysis"><h3></h3><p class="supachess-preferences__intro"></p><a class="supachess-preferences__analysis-link"></a></section><footer class="supachess-preferences__footer"><button id="supa-pref-reset" type="button"></button><button class="supachess-preferences__close secondary" type="submit" value="close"></button></footer></form>';
    dialog.querySelector('#supachess-preferences-title').textContent = boardLabels.title;
    dialog.querySelector('.supachess-preferences__intro').textContent = boardLabels.intro;
    var sections = dialog.querySelectorAll('section h3');
    sections[0].textContent = boardLabels.appearance; sections[1].textContent = boardLabels.analysis;
    dialog.querySelector('#supa-pref-theme').previousElementSibling.textContent = boardLabels.theme;
    ['classic', 'green', 'blue', 'wood', 'contrast'].forEach(function (key) { dialog.querySelector('#supa-pref-theme option[value="' + key + '"]').textContent = boardLabels[key]; });
    dialog.querySelector('#supa-pref-piece-size').previousElementSibling.textContent = boardLabels.pieceSize;
    dialog.querySelector('#supa-pref-coordinates').nextElementSibling.textContent = boardLabels.coordinates;
    dialog.querySelectorAll('.supachess-preferences__intro')[1].textContent = boardLabels.analysisText;
    var analysisLink = dialog.querySelector('.supachess-preferences__analysis-link');
    analysisLink.href = analysis.href; analysisLink.textContent = boardLabels.openAnalysis;
    dialog.querySelector('#supa-pref-reset').textContent = boardLabels.reset;
    dialog.querySelector('.supachess-preferences__close.secondary').textContent = boardLabels.close;
    document.body.appendChild(dialog);

    function savePreferences() {
      preferences.boardTheme = dialog.querySelector('#supa-pref-theme').value;
      preferences.pieceScale = Number(dialog.querySelector('#supa-pref-piece-size').value) / 100;
      preferences.coordinates = dialog.querySelector('#supa-pref-coordinates').checked;
      try { localStorage.setItem(GLOBAL_PREFERENCES_KEY, JSON.stringify(preferences)); } catch (_) {}
      applyGlobalPreferences(preferences);
      dialog.querySelector('#supa-pref-piece-size-value').textContent = Math.round(preferences.pieceScale * 100) + '%';
    }
    function openPreferences() {
      dialog.querySelector('#supa-pref-theme').value = preferences.boardTheme;
      dialog.querySelector('#supa-pref-piece-size').value = Math.round(preferences.pieceScale * 100);
      dialog.querySelector('#supa-pref-coordinates').checked = preferences.coordinates;
      savePreferences();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    appearance.addEventListener('click', function (event) {
      openPreferences();
      dialog.querySelector('#supa-pref-theme').focus();
    });
    dialog.querySelector('#supa-pref-theme').addEventListener('change', savePreferences);
    dialog.querySelector('#supa-pref-piece-size').addEventListener('input', savePreferences);
    dialog.querySelector('#supa-pref-coordinates').addEventListener('change', savePreferences);
    dialog.querySelector('#supa-pref-reset').addEventListener('click', function () {
      preferences = { boardTheme: 'classic', pieceScale: 1, coordinates: true };
      savePreferences();
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  }
  function addSiteVersion() {
    if (!document.body || document.querySelector('.supachess-site-version')) return;
    var label = document.createElement('small');
    label.className = 'supachess-site-version';
    label.setAttribute('data-supachess-version-label', '');
    label.setAttribute('aria-label', 'SupaChess site version ' + SITE_VERSION);
    var french = (document.documentElement.lang || '').toLowerCase().startsWith('fr');
    label.textContent = (french ? 'Version du site : ' : 'Site version: ') + SITE_VERSION;
    var pagePath = (location.pathname || '/').replace(/\/$/, '').split('/').pop() || 'index.html';
    var pageLabel = document.createElement('span');
    pageLabel.textContent = (french ? ' · Page : ' : ' · Page: ') + pagePath;
    label.appendChild(pageLabel);
    label.style.cssText = 'display:block;margin:12px auto;padding:8px 12px;text-align:center;color:#9aa9bd;font:500 12px/1.4 system-ui,sans-serif;opacity:.9;overflow-wrap:anywhere';
    var revisionLabel = document.createElement('span');
    revisionLabel.textContent = french ? ' · Révision GitHub main : ' : ' · GitHub main revision: ';
    label.appendChild(revisionLabel);
    var revisionFallback = document.createElement('span');
    revisionFallback.textContent = french ? 'récupération…' : 'loading…';
    label.appendChild(revisionFallback);
    fetch('https://api.github.com/repos/JirA44/supachess-web/commits/main', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (response) { if (!response.ok) throw new Error('GitHub revision unavailable'); return response.json(); })
      .then(function (commit) {
        if (!commit || !/^[0-9a-f]{40}$/i.test(commit.sha || '')) throw new Error('Invalid GitHub revision');
        var link = document.createElement('a');
        link.href = 'https://github.com/JirA44/supachess-web/commit/' + commit.sha;
        link.textContent = commit.sha;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = 'inherit';
        revisionFallback.replaceWith(link);
      })
      .catch(function () { revisionFallback.textContent = french ? 'indisponible' : 'unavailable'; });
    var libraryLink = document.createElement('a');
    libraryLink.href = new URL('CHESS_LIBRARY.html', root).href;
    libraryLink.textContent = french ? 'Bibliothèque d’exercices' : 'Exercise library';
    libraryLink.style.cssText = 'margin:0 10px;color:inherit;text-decoration:underline';
    label.appendChild(libraryLink);
    var generatedLink = document.createElement('a');
    generatedLink.href = new URL('TRAINING_TACTICS.html?theme=generated', root).href;
    generatedLink.textContent = french ? 'Puzzles générés' : 'Generated puzzles';
    generatedLink.style.cssText = 'margin:0 10px;color:inherit;text-decoration:underline';
    label.appendChild(generatedLink);
    var generatorLink = document.createElement('a');
    generatorLink.href = new URL('GENERATEUR_PARTIES_BRILLANTES.html', root).href;
    generatorLink.textContent = french ? 'Créer un exercice' : 'Create an exercise';
    generatorLink.style.cssText = 'margin:0 10px;color:inherit;text-decoration:underline';
    label.appendChild(generatorLink);
    var footer = document.querySelector('.footer, footer');
    var bottomLink = document.querySelector('.supachess-page-back--bottom');
    if (footer) footer.appendChild(label);
    else if (bottomLink && bottomLink.parentNode) bottomLink.parentNode.insertBefore(label, bottomLink);
    else document.body.appendChild(label);
  }

  function installOptionalEvalBar() {
    var boards = Array.prototype.slice.call(document.querySelectorAll('#board,#chessboard,#lesson-board,.chess-board,.board'))
      .filter(function (el) { return el.getBoundingClientRect().width >= 140 && el.getBoundingClientRect().height >= 140; });
    if (!boards.length) return;
    var board = boards[0];
    if (board.closest && board.closest('.supa-board-certified-layout')) return;
    var existingBars = Array.prototype.slice.call(document.querySelectorAll('.evalbar,.eval-bar-wrap,.eval-bar-container,.eval-bar'))
      .filter(function (el) { return !el.closest('#supachess-optional-eval'); });
    if (document.getElementById('supachess-optional-eval-toggle')) return;
    var button = document.createElement('button');
    button.id = 'supachess-optional-eval-toggle';
    button.type = 'button';
    button.className = 'supachess-eval-toggle';
    button.setAttribute('aria-pressed', 'false');
    var isEnglish = /^en\b/i.test(document.documentElement.lang || '');
    var panel = document.createElement('section');
    panel.id = 'supachess-optional-eval';
    panel.className = 'supachess-eval-panel';
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<div class="supachess-eval-track" aria-label="Évaluation Stockfish"><div class="supachess-eval-white"></div><span></span></div><p class="supachess-eval-note"></p>';
    var host = board.parentElement || board;
    if ((location.pathname || '').endsWith('/PARTIES_BRILLANTES_ENTRAINEMENT.html') && host.classList && host.classList.contains('board-area')) {
      var side = host.querySelector('.side');
      host.insertBefore(button, side || null);
      host.insertBefore(panel, side || null);
    } else {
      var layout = document.createElement('div');
      layout.className = 'supachess-eval-layout';
      var rail = document.createElement('div');
      rail.className = 'supachess-eval-rail';
      host.insertBefore(layout, board);
      layout.appendChild(board);
      layout.appendChild(rail);
      rail.appendChild(button);
      rail.appendChild(panel);
    }
    var track = panel.querySelector('.supachess-eval-track');
    var fill = panel.querySelector('.supachess-eval-white');
    var score = track.querySelector('span');
    var note = panel.querySelector('.supachess-eval-note');
    var storageKey = 'supachess-evalbar-visible-v1';
    var visible = false;
    try { visible = localStorage.getItem(storageKey) === 'true'; } catch (_) {}
    var worker = null, ready = false, busy = false, timer = 0, lastFen = '';
    function getGame() {
      var candidates = [];
      try { if (window.game) candidates.push(window.game); } catch (_) {}
      try { if (window.chess) candidates.push(window.chess); } catch (_) {}
      try { if (window.tacticGame) candidates.push(window.tacticGame); } catch (_) {}
      try { if (typeof game !== 'undefined') candidates.push(game); } catch (_) {}
      try { if (typeof chess !== 'undefined') candidates.push(chess); } catch (_) {}
      try { if (typeof tacticGame !== 'undefined') candidates.push(tacticGame); } catch (_) {}
      for (var i = 0; i < candidates.length; i++) {
        try { if (candidates[i] && typeof candidates[i].fen === 'function') return candidates[i]; } catch (_) {}
      }
      return null;
    }
    function getFen() {
      var g = getGame();
      if (!g) return '';
      try { var fen = g.fen(); return typeof fen === 'string' && fen.split(/\s+/).length >= 4 ? fen : ''; } catch (_) { return ''; }
    }
    function sync() {
      button.setAttribute('aria-pressed', String(visible));
      button.textContent = isEnglish ? (visible ? 'Hide evaluation bar' : 'Show evaluation bar') : (visible ? 'Masquer la barre d’évaluation' : 'Afficher la barre d’évaluation');
      if (existingBars.length) existingBars.forEach(function (el) { el.hidden = !visible; });
      else panel.hidden = !visible;
    }
    function analyze() {
      if (!visible || existingBars.length || !worker || !ready || busy) return;
      var fen = getFen();
      if (!fen) { note.textContent = isEnglish ? 'Position not available.' : 'Position indisponible.'; return; }
      if (fen === lastFen && score.textContent) return;
      lastFen = fen;
      busy = true;
      worker.postMessage('stop');
      worker.postMessage('position fen ' + fen);
      worker.postMessage('go movetime 700');
      clearTimeout(timer);
      timer = setTimeout(function () {
        busy = false;
        if (visible && getFen() !== lastFen) analyze();
      }, 1100);
    }
    function ensureWorker() {
      if (worker || existingBars.length || !visible) return;
      try {
        worker = new Worker(new URL('/supachess/vendor/stockfish-19-lite-single.js', location.origin));
        worker.onmessage = function (event) {
          var line = String(event.data || '');
          if (line === 'uciok') { worker.postMessage('isready'); return; }
          if (line === 'readyok') { ready = true; analyze(); return; }
          if (!line.startsWith('info ')) return;
          var cpMatch = line.match(/\bscore cp (-?\d+)/);
          var mateMatch = line.match(/\bscore mate (-?\d+)/);
          var depthMatch = line.match(/\bdepth (\d+)/);
          if (!cpMatch && !mateMatch) return;
          var fen = getFen();
          if (!fen || fen !== lastFen) return;
          var sideToMove = fen.split(/\s+/)[1];
          var cp = cpMatch ? Number(cpMatch[1]) : (Number(mateMatch[1]) > 0 ? 2000 : -2000);
          if (sideToMove === 'b') cp = -cp;
          var clamped = Math.max(-1000, Math.min(1000, cp));
          fill.style.width = (50 + clamped / 20) + '%';
          score.textContent = mateMatch ? '#' + (Number(mateMatch[1]) * (sideToMove === 'b' ? -1 : 1)) : (cp > 0 ? '+' : '') + (cp / 100).toFixed(2);
          note.textContent = (isEnglish ? 'Local Stockfish · depth ' : 'Stockfish local · profondeur ') + (depthMatch ? depthMatch[1] : '…');
        };
        worker.onerror = function () { note.textContent = isEnglish ? 'Local engine unavailable.' : 'Moteur local indisponible.'; };
        worker.postMessage('uci');
      } catch (_) { note.textContent = isEnglish ? 'Local engine unavailable.' : 'Moteur local indisponible.'; }
    }
    button.addEventListener('click', function () {
      visible = !visible;
      try { localStorage.setItem(storageKey, String(visible)); } catch (_) {}
      sync();
      if (visible) { ensureWorker(); analyze(); }
      else if (worker) worker.postMessage('stop');
    });
    sync();
    if (visible) { ensureWorker(); analyze(); }
    var observer = new MutationObserver(function () {
      if (visible && !existingBars.length) analyze();
    });
    observer.observe(board, { subtree: true, childList: true, attributes: true, characterData: true });
    window.setInterval(function () { if (visible && !existingBars.length) analyze(); }, 1500);
  }
  function initializeEvalBar() {
    var tries = 0;
    var attempt = function () {
      installOptionalEvalBar();
      if (!document.getElementById('supachess-optional-eval-toggle') && tries++ < 20) setTimeout(attempt, 500);
    };
    attempt();
  }
  var evalStyle = document.createElement('style');
  evalStyle.textContent = '.evalbar[hidden],.eval-bar-wrap[hidden],.eval-bar-container[hidden],.eval-bar[hidden]{display:none!important}.supachess-eval-toggle{display:block;margin:8px auto;padding:8px 14px;border:1px solid #78c6dc;border-radius:9px;background:#12354a;color:#fff;font:600 14px/1.3 system-ui,sans-serif;cursor:pointer}.supachess-eval-toggle:hover{background:#1b526f}.supachess-eval-toggle:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}.supachess-eval-panel{max-width:600px;margin:6px auto 14px;padding:10px 12px;border:1px solid #466078;border-radius:10px;background:#101c2c;color:#f4f7fb}.supachess-eval-track{position:relative;height:20px;overflow:hidden;border-radius:7px;background:#202a3a;border:1px solid #77889e}.supachess-eval-white{height:100%;width:50%;background:#f5f5f2;transition:width .25s}.supachess-eval-track span{position:absolute;inset:0;display:grid;place-items:center;color:#101827;font:700 13px/1 system-ui,sans-serif;text-shadow:0 0 2px #fff}.supachess-eval-note{margin:6px 0 0;text-align:center;font:12px/1.4 system-ui,sans-serif;color:#c6d2df}.supachess-eval-panel[hidden]{display:none!important}.supachess-eval-layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(76px,clamp(76px,18vw,150px));gap:10px;align-items:start;max-width:100%;width:100%;box-sizing:border-box}.supachess-eval-layout>*{min-width:0}.supachess-eval-rail{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-content:start;min-width:0}.supachess-eval-rail .supachess-eval-toggle{width:100%;margin:0;padding:7px 5px;font-size:12px}.supachess-eval-rail .supachess-eval-panel{width:100%;max-width:none;margin:0;padding:8px;box-sizing:border-box}.supachess-eval-layout>.board,.supachess-eval-layout>#board,.supachess-eval-layout>#chessboard,.supachess-eval-layout>#lesson-board,.supachess-eval-layout>.chess-board{max-width:100%!important;min-width:0!important}@media(max-width:480px){.supachess-eval-layout{grid-template-columns:minmax(0,1fr) 60px;gap:6px}.supachess-eval-rail .supachess-eval-panel{padding:5px}.supachess-eval-rail .supachess-eval-note{font-size:10px}}';
  (document.head || document.documentElement).appendChild(evalStyle);


  function installMoveTypeNavigator() {
    if (!document.body || document.getElementById('supachess-move-type-nav')) return;
    var board = document.querySelector('#chessboard,#board,#analysisBoard,.chess-board,.board');
    if (!board) return;

    var sources = [];
    try { if (Array.isArray(gameMoves)) sources.push(gameMoves); } catch (_) {}
    try { if (Array.isArray(moves)) sources.push(moves); } catch (_) {}
    try { if (Array.isArray(moveHistory)) sources.push(moveHistory); } catch (_) {}
    try { if (Array.isArray(window.gameMoves)) sources.push(window.gameMoves); } catch (_) {}
    try { if (Array.isArray(window.moves)) sources.push(window.moves); } catch (_) {}
    try { if (Array.isArray(window.moveHistory)) sources.push(window.moveHistory); } catch (_) {}
    sources.sort(function (a, b) { return b.length - a.length; });
    var moveRows = Array.prototype.slice.call(document.querySelectorAll('.move-item,.move-card,[data-ply],[data-move-index]'));
    var gameData = sources.length ? sources[0] : moveRows;
    if (!gameData.length) return;

    var categories = [
      { id: 'brilliant', fr: 'Brillant', en: 'Brilliant' },
      { id: 'best', fr: 'Meilleur', en: 'Best' },
      { id: 'excellent', fr: 'Excellent', en: 'Excellent' },
      { id: 'good', fr: 'Bon', en: 'Good' },
      { id: 'inaccuracy', fr: 'Imprécision', en: 'Inaccuracy' },
      { id: 'mistake', fr: 'Erreur', en: 'Mistake' },
      { id: 'blunder', fr: 'Gaffe', en: 'Blunder' },
      { id: 'missed-win', fr: 'Gain manqué', en: 'Missed win' }
    ];
    function rowFor(index) { return moveRows[index] || null; }
    function flagsFor(item, row) {
      var values = [];
      if (item && typeof item === 'object') {
        ['classification','quality','moveType','type','annotation','comment','tags','label','move','san'].forEach(function (key) {
          if (item[key] != null) values.push(Array.isArray(item[key]) ? item[key].join(' ') : String(item[key]));
        });
        ['brilliant','best','excellent','good','inaccuracy','mistake','blunder','missedWin','missed_win'].forEach(function (key) {
          if (item[key] === true) values.push(key);
        });
      }
      if (row) {
        values.push(row.className || '');
        ['data-quality','data-classification','data-type','data-tags','data-annotation','aria-label'].forEach(function (key) {
          if (row.getAttribute(key)) values.push(row.getAttribute(key));
        });
        values.push(row.textContent || '');
      }
      var raw = values.join(' ').toLowerCase();
      var normalized = raw.normalize ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : raw;
      var san = item && typeof item === 'object' ? String(item.move || item.san || item.notation || '') : '';
      var flags = {};
      if (/brilliant|brillant|\bbril\b|!!|[a-z0-9+#=]{2,10}!!/i.test(raw) || /!!$/.test(san)) flags.brilliant = true;
      if (/blunder|gaffe/.test(normalized) || /\?\?$/.test(san) || /[a-z0-9+#=]{2,10}\?\?/.test(raw)) flags.blunder = true;
      if (/missed[ _-]?win|gain manque|occasion manque/.test(normalized)) flags['missed-win'] = true;
      if (/inaccuracy|imprecision/.test(normalized) || /\?!$/.test(san) || /[a-z0-9+#=]{2,10}\?!/.test(raw)) flags.inaccuracy = true;
      if (/mistake|erreur/.test(normalized) || (/\?$/.test(san) && !/\?\?$/.test(san)) || /[a-z0-9+#=]{2,10}\?(?![!?])/.test(raw)) flags.mistake = true;
      if (/\bbest\b|meilleur/.test(normalized)) flags.best = true;
      if (/\bexcellent\b/.test(normalized) || /!$/.test(san) || /[a-z0-9+#=]{2,10}!(?![!?])/.test(raw)) flags.excellent = true;
      if (/\bgood\b|bon coup/.test(normalized)) flags.good = true;
      return flags;
    }
    function sideFor(item, index) {
      if (item && typeof item === 'object' && (item.color === 'w' || item.color === 'b')) return item.color;
      return index % 2 === 0 ? 'w' : 'b';
    }
    var indexed = gameData.map(function (item, index) {
      var row = rowFor(index);
      var ply = row && Number(row.getAttribute('data-ply'));
      if (!isFinite(ply) || ply < 1) ply = index + 1;
      return { item: item, index: index, ply: ply, side: sideFor(item, index), flags: flagsFor(item, row) };
    });

    var isEnglish = /^en\b/i.test(document.documentElement.lang || '');
    var nav = document.createElement('section');
    nav.id = 'supachess-move-type-nav';
    var navStyle = document.createElement('style');
    navStyle.textContent = '#supachess-move-type-nav{display:flex;flex-wrap:wrap;align-items:flex-end;gap:.65rem;margin:1rem auto;padding:1rem;max-width:100%;max-width:min(100%,72rem);box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;color:#172033;font:inherit}#supachess-move-type-nav label{display:grid;gap:.3rem;min-width:min(10rem,100%);flex:1 1 10rem}#supachess-move-type-nav select,#supachess-move-type-nav button{min-height:44px;max-width:100%;padding:.55rem .75rem;border:1px solid #94a3b8;border-radius:8px;background:#fff;color:inherit;font:inherit;touch-action:manipulation}#supachess-move-type-nav button{cursor:pointer}#supachess-move-type-nav button:focus-visible,#supachess-move-type-nav select:focus-visible{outline:3px solid #2563eb;outline-offset:2px}#supachess-move-type-nav .supa-nav-status{flex:1 0 100%;margin:.1rem 0 0;font-size:.95rem}#supachess-move-type-nav button:active{transform:translateY(1px)}@media(prefers-color-scheme:dark){#supachess-move-type-nav{background:#172033;color:#f8fafc;border-color:#475569}#supachess-move-type-nav select,#supachess-move-type-nav button{background:#0f172a;color:#f8fafc;border-color:#64748b}}@media(min-width:60rem){#supachess-move-type-nav{justify-content:center}}';
    document.head.appendChild(navStyle);
    nav.className = 'supachess-move-type-nav';
    nav.setAttribute('aria-label', isEnglish ? 'Navigate annotated moves' : 'Naviguer entre les coups annotés');
    nav.innerHTML = '<label><span class="supa-nav-type-label"></span><select class="supa-nav-type"></select></label><label><span class="supa-nav-player-label"></span><select class="supa-nav-player"><option value="all"></option><option value="w"></option><option value="b"></option></select></label><button type="button" class="supa-nav-next"></button><button type="button" class="supa-nav-prev"></button><p class="supa-nav-status" aria-live="polite"></p>';
    var typeSelect = nav.querySelector('.supa-nav-type');
    var playerSelect = nav.querySelector('.supa-nav-player');
    var nextButton = nav.querySelector('.supa-nav-next');
    var prevButton = nav.querySelector('.supa-nav-prev');
    var status = nav.querySelector('.supa-nav-status');
    nav.querySelector('.supa-nav-type-label').textContent = isEnglish ? 'Move type' : 'Type de coup';
    nav.querySelector('.supa-nav-player-label').textContent = isEnglish ? 'Player' : 'Joueur';
    playerSelect.options[0].textContent = isEnglish ? 'Both' : 'Les deux';
    playerSelect.options[1].textContent = isEnglish ? 'White' : 'Blancs';
    playerSelect.options[2].textContent = isEnglish ? 'Black' : 'Noirs';
    categories.forEach(function (category) {
      var option = document.createElement('option');
      option.value = category.id;
      option.textContent = isEnglish ? category.en : category.fr;
      typeSelect.appendChild(option);
    });
    var cursors = Object.create(null);
    function matching() {
      var category = typeSelect.value;
      var side = playerSelect.value;
      return indexed.filter(function (entry) {
        return entry.flags[category] && (side === 'all' || entry.side === side);
      });
    }
    function refreshLabels() {
      var category = categories.filter(function (item) { return item.id === typeSelect.value; })[0] || categories[0];
      var label = isEnglish ? category.en.toLowerCase() : category.fr.toLowerCase();
      nextButton.textContent = isEnglish ? '+1 half-move ' + label : '+1 demi-coup ' + label;
      prevButton.textContent = isEnglish ? 'Previous' : 'Précédent';
      var list = matching();
      if (!list.length) status.textContent = isEnglish
        ? 'No move of this type is annotated in this game for this player.'
        : 'Aucun demi-coup de ce type n’est annoté pour ce joueur dans cette partie.';
      else status.textContent = (isEnglish ? list.length + ' matching half-move(s).' : list.length + ' demi-coup(s) correspondant(s).');
    }
    function navigateToPly(ply) {
      try {
        if (typeof goToMove === 'function') { goToMove(ply - 1); return true; }
      } catch (_) {}
      try {
        if (typeof goToMoveNumber === 'function') { goToMoveNumber(ply); return true; }
      } catch (_) {}
      try {
        if (typeof goToPly === 'function') { goToPly(ply); return true; }
      } catch (_) {}
      var start = document.querySelector('#startBtn,#goToStart,#firstMove,[data-action="start"]');
      var next = document.querySelector('#nextBtn,#nextMove,#goToNext,[data-action="next"]');
      if (start && next) {
        start.click();
        for (var i = 0; i < ply; i++) {
          if (next.disabled) return false;
          next.click();
        }
        return true;
      }
      return false;
    }
    nextButton.addEventListener('click', function () {
      var list = matching();
      if (!list.length) { refreshLabels(); return; }
      var key = typeSelect.value + '|' + playerSelect.value;
      var cursor = cursors[key] == null ? 0 : (cursors[key] + 1) % list.length;
      cursors[key] = cursor;
      var entry = list[cursor];
      if (!navigateToPly(entry.ply)) {
        status.textContent = isEnglish ? 'This page does not expose move navigation.' : 'La navigation des coups n’est pas disponible sur cette page.';
        return;
      }
      var move = entry.item && typeof entry.item === 'object' ? (entry.item.move || entry.item.san || entry.item.notation || '') : '';
      status.textContent = (isEnglish ? 'Move ' : 'Demi-coup ') + entry.ply + (move ? ' · ' + move : '') + ' · ' + (cursor + 1) + '/' + list.length;
    });
    prevButton.addEventListener('click', function () {
      var list = matching();
      if (!list.length) { refreshLabels(); return; }
      var key = typeSelect.value + '|' + playerSelect.value;
      var cursor = cursors[key] == null ? list.length - 1 : (cursors[key] - 1 + list.length) % list.length;
      cursors[key] = cursor;
      var entry = list[cursor];
      if (!navigateToPly(entry.ply)) {
        status.textContent = isEnglish ? 'This page does not expose move navigation.' : 'La navigation des coups n’est pas disponible sur cette page.';
        return;
      }
      status.textContent = (isEnglish ? 'Move ' : 'Demi-coup ') + entry.ply + ' · ' + (cursor + 1) + '/' + list.length;
    });
    typeSelect.addEventListener('change', refreshLabels);
    playerSelect.addEventListener('change', refreshLabels);
    refreshLabels();
    var host = board;
    if (typeof board.closest === 'function') host = board.closest('.board-section,.board-panel,.board-area,.board-container') || board.parentElement || board;
    if (host.insertAdjacentElement) host.insertAdjacentElement('afterend', nav);
    else if (host.parentNode) host.parentNode.insertBefore(nav, host.nextSibling);
  }

  function initializeBoardProtocol() {
    if (window.SupaChessBoardProtocol) { window.SupaChessBoardProtocol.bootstrap(document); return; }
    if (document.getElementById('supa-chessboard-protocol-loader')) return;
    var loader = document.createElement('script');
    loader.id = 'supa-chessboard-protocol-loader';
    loader.src = new URL('shared/chessboard-protocol.js?v=1.1.1', root).href;
    loader.onload = function () {
      if (window.SupaChessBoardProtocol) window.SupaChessBoardProtocol.bootstrap(document);
    };
    loader.onerror = function () {
      var warning = document.createElement('p');
      warning.setAttribute('role', 'status');
      warning.textContent = (document.documentElement.lang || '').toLowerCase().startsWith('fr')
        ? 'Le protocole de vérification des échiquiers est indisponible.'
        : 'The chessboard validation protocol is unavailable.';
      warning.style.cssText = 'margin:12px auto;padding:10px;max-width:60rem;border:1px solid #b42318;color:#b42318;text-align:center';
      document.body.appendChild(warning);
    };
    document.head.appendChild(loader);
  }

  function initializeGlobalLabels() {
    initializeBoardProtocol();
    initializeEvalBar();
    installMoveTypeNavigator();
    addBackLinks();
    addSettingsLinks();
    addSiteVersion();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGlobalLabels, { once: true });
  else initializeGlobalLabels();
})();
