(function () {
  'use strict';
  var script = document.currentScript;
  var root = script && script.src ? new URL('../', script.src) : new URL('./', location.href);
  var SITE_VERSION = '1.13.139';
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
  style.textContent += '.supachess-global-settings{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:8px auto;padding:0 12px}.supachess-global-settings a{display:inline-block;padding:8px 12px;border:1px solid #7892ad;border-radius:999px;background:#13253b;color:#fff!important;font:600 13px/1.25 system-ui,sans-serif;text-decoration:none}.supachess-global-settings a:hover{background:#1c3c5c;text-decoration:underline}.supachess-global-settings a:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}@media(max-width:520px){.supachess-global-settings a{font-size:12px;padding:7px 10px}}';
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
            node.style.backgroundImage = 'url("' + vector + '")';
          };
          artwork.onerror = function () {
            if (node.getAttribute('data-supachess-vector-src') !== vector) return;
            node.classList.remove('supachess-vector-piece');
            node.style.backgroundImage = 'none';
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
    var appearance = document.createElement('a');
    appearance.href = '#supachess-appearance';
    appearance.textContent = french ? '🎨 Apparence' : '🎨 Appearance';
    var analysis = document.createElement('a');
    analysis.href = new URL('PLAYER_ANALYSIS.html', root).href;
    analysis.textContent = french ? '📊 Analyse' : '📊 Analysis';
    analysis.setAttribute('aria-label', french ? 'Ouvrir l’analyse de style SupaChess' : 'Open SupaChess player analysis');
    nav.appendChild(appearance);
    nav.appendChild(analysis);
    var topBack = document.querySelector('.supachess-page-back--top');
    if (topBack && topBack.parentNode) topBack.parentNode.insertBefore(nav, topBack.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);

    var preferences = loadGlobalPreferences();
    applyGlobalPreferences(preferences);
    var dialog = document.createElement('dialog');
    dialog.className = 'supachess-preferences';
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
      event.preventDefault();
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
    label.setAttribute('aria-label', 'SupaChess site version 1.13.135');
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
    host.insertAdjacentElement('afterend', button);
    button.insertAdjacentElement('afterend', panel);
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
  evalStyle.textContent = '.evalbar[hidden],.eval-bar-wrap[hidden],.eval-bar-container[hidden],.eval-bar[hidden]{display:none!important}.supachess-eval-toggle{display:block;margin:8px auto;padding:8px 14px;border:1px solid #78c6dc;border-radius:9px;background:#12354a;color:#fff;font:600 14px/1.3 system-ui,sans-serif;cursor:pointer}.supachess-eval-toggle:hover{background:#1b526f}.supachess-eval-toggle:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}.supachess-eval-panel{max-width:600px;margin:6px auto 14px;padding:10px 12px;border:1px solid #466078;border-radius:10px;background:#101c2c;color:#f4f7fb}.supachess-eval-track{position:relative;height:20px;overflow:hidden;border-radius:7px;background:#202a3a;border:1px solid #77889e}.supachess-eval-white{height:100%;width:50%;background:#f5f5f2;transition:width .25s}.supachess-eval-track span{position:absolute;inset:0;display:grid;place-items:center;color:#101827;font:700 13px/1 system-ui,sans-serif;text-shadow:0 0 2px #fff}.supachess-eval-note{margin:6px 0 0;text-align:center;font:12px/1.4 system-ui,sans-serif;color:#c6d2df}.supachess-eval-panel[hidden]{display:none!important}';
  (document.head || document.documentElement).appendChild(evalStyle);

  function initializeGlobalLabels() {
    initializeEvalBar();
    addBackLinks();
    addSettingsLinks();
    addSiteVersion();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGlobalLabels, { once: true });
  else initializeGlobalLabels();
})();
