(function () {
  'use strict';
  var script = document.currentScript;
  var root = script && script.src ? new URL('../', script.src) : new URL('./', location.href);
  var SITE_VERSION = '1.13.137';
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
  style.textContent += '.supachess-global-settings{display:flex;justify-content:center;align-items:flex-start;gap:8px;flex-wrap:wrap;margin:8px auto;padding:0 12px}.supachess-global-settings-panel{min-width:180px;max-width:320px;border:1px solid #7892ad;border-radius:12px;background:#13253b;color:#fff;font:600 13px/1.4 system-ui,sans-serif}.supachess-global-settings-panel>summary{padding:8px 12px;cursor:pointer;list-style:none}.supachess-global-settings-panel>summary::-webkit-details-marker{display:none}.supachess-global-settings-body{display:grid;gap:8px;padding:10px 12px;border-top:1px solid #7892ad}.supachess-global-settings-body label{display:grid;gap:5px}.supachess-global-settings-body label:has(input[type=checkbox]){display:flex;align-items:flex-start;gap:7px}.supachess-global-settings-body select{max-width:100%;padding:7px;border-radius:7px;background:#09111f;color:#fff}.supachess-global-settings-panel:focus-within{outline:3px solid #fbbf24;outline-offset:3px}@media(max-width:520px){.supachess-global-settings-panel{width:min(100%,320px)}}';
  (document.head || document.documentElement).appendChild(style);

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
  function addSettingsLinks() {
    if (!document.body || document.querySelector('.supachess-global-settings')) return;
    var nav = document.createElement('nav');
    nav.className = 'supachess-global-settings';
    nav.setAttribute('aria-label', 'Réglages de cette page');
    var french = (document.documentElement.lang || '').toLowerCase().startsWith('fr')
      || (localStorage.getItem('chessnova_lang') || '').slice(0, 2).toLowerCase() === 'fr';
    var themes = {
      green:['#eeeed2','#769656'], blue:['#e8edf5','#7892ad'], wood:['#f0d9b5','#b58863'],
      slate:['#e2e6ed','#788394'], purple:['#f0e8f7','#9a7ab2'], gray:['#e4e4e1','#888985'],
      sand:['#f4e7c8','#c4a06a'], midnight:['#cbd5e1','#334155']
    };
    var labels = french
      ? {green:'Vert classique',blue:'Bleu',wood:'Bois',slate:'Ardoise',purple:'Violet',gray:'Gris',sand:'Sable',midnight:'Nuit'}
      : {green:'Classic green',blue:'Blue',wood:'Wood',slate:'Slate',purple:'Purple',gray:'Gray',sand:'Sand',midnight:'Midnight'};
    var prefs = { board:'green', showComments:true, showMoveInfo:true, outlinedPieces:true };
    try { Object.assign(prefs, JSON.parse(localStorage.getItem('supachess-web-page-prefs-v1') || '{}')); } catch (_) {}
    function save() {
      try { localStorage.setItem('supachess-web-page-prefs-v1', JSON.stringify(prefs)); } catch (_) {}
    }
    function apply() {
      var colors = themes[prefs.board] || themes.green;
      document.documentElement.style.setProperty('--supachess-board-light', colors[0]);
      document.documentElement.style.setProperty('--supachess-board-dark', colors[1]);
      document.documentElement.dataset.gaShowComments = String(prefs.showComments !== false);
      document.documentElement.dataset.gaShowMoveInfo = String(prefs.showMoveInfo !== false);
      document.documentElement.dataset.gaOutlinedPieces = String(prefs.outlinedPieces !== false);
      document.querySelectorAll('#board .white-1e1d7,.board .white-1e1d7').forEach(function (square) { square.style.setProperty('background-color', colors[0], 'important'); });
      document.querySelectorAll('#board .black-3c85d,.board .black-3c85d').forEach(function (square) { square.style.setProperty('background-color', colors[1], 'important'); });
    }
    var style = document.createElement('style');
    style.id = 'supachess-local-page-settings';
    style.textContent = ':root[data-ga-show-comments="false"] .move-comment{display:none!important}:root[data-ga-show-move-info="false"] #moveInfo{display:none!important}:root[data-ga-outlined-pieces="true"] #board .piece-417db{filter:drop-shadow(0 0 1.5px #111)!important}';
    (document.head || document.documentElement).appendChild(style);
    var appearance = document.createElement('details');
    appearance.className = 'supachess-global-settings-panel';
    var appearanceSummary = document.createElement('summary');
    appearanceSummary.textContent = french ? '🎨 Apparence' : '🎨 Appearance';
    appearance.appendChild(appearanceSummary);
    var appearanceBody = document.createElement('div');
    appearanceBody.className = 'supachess-global-settings-body';
    var boardLabel = document.createElement('label');
    boardLabel.textContent = french ? 'Couleurs de l’échiquier' : 'Board colors';
    var boardSelect = document.createElement('select');
    boardSelect.setAttribute('aria-label', boardLabel.textContent);
    Object.keys(themes).forEach(function (key) {
      var option = document.createElement('option'); option.value = key; option.textContent = labels[key]; boardSelect.appendChild(option);
    });
    boardSelect.value = themes[prefs.board] ? prefs.board : 'green';
    boardSelect.addEventListener('change', function () { prefs.board = boardSelect.value; save(); apply(); });
    boardLabel.appendChild(boardSelect);
    appearanceBody.appendChild(boardLabel);
    var pieceLabel = document.createElement('label');
    var pieceToggle = document.createElement('input'); pieceToggle.type = 'checkbox'; pieceToggle.checked = prefs.outlinedPieces !== false;
    pieceToggle.addEventListener('change', function () { prefs.outlinedPieces = pieceToggle.checked; save(); apply(); });
    pieceLabel.appendChild(pieceToggle);
    pieceLabel.appendChild(document.createTextNode(french ? ' Renforcer le contour des pièces' : ' Strengthen piece outlines'));
    appearanceBody.appendChild(pieceLabel);
    appearance.appendChild(appearanceBody);
    var analysis = document.createElement('details');
    analysis.className = 'supachess-global-settings-panel';
    var analysisSummary = document.createElement('summary');
    analysisSummary.textContent = french ? '📊 Analyse' : '📊 Analysis';
    analysis.appendChild(analysisSummary);
    var analysisBody = document.createElement('div');
    analysisBody.className = 'supachess-global-settings-body';
    [
      ['showComments', french ? 'Afficher les commentaires de la partie' : 'Show game comments'],
      ['showMoveInfo', french ? 'Afficher les informations du coup courant' : 'Show current-move details']
    ].forEach(function (entry) {
      var label = document.createElement('label');
      var input = document.createElement('input'); input.type = 'checkbox'; input.checked = prefs[entry[0]] !== false;
      input.addEventListener('change', function () { prefs[entry[0]] = input.checked; save(); apply(); });
      label.appendChild(input); label.appendChild(document.createTextNode(' ' + entry[1])); analysisBody.appendChild(label);
    });
    analysis.appendChild(analysisBody);
    nav.append(appearance, analysis);
    var topBack = document.querySelector('.supachess-page-back--top');
    if (topBack && topBack.parentNode) topBack.parentNode.insertBefore(nav, topBack.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);
    apply();
    if (window.MutationObserver) new MutationObserver(apply).observe(document.body, {childList:true,subtree:true});
  }
  function addSiteVersion() {
    if (!document.body || document.querySelector('.supachess-site-version')) return;
    var label = document.createElement('small');
    label.className = 'supachess-site-version';
    label.setAttribute('data-supachess-version-label', '');
    label.setAttribute('aria-label', 'SupaChess site version 1.13.135');
    var french = (document.documentElement.lang || '').toLowerCase().startsWith('fr');
    label.textContent = (french ? 'Version du site : ' : 'Site version: ') + SITE_VERSION;
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
  function initializeGlobalLabels() {
    addBackLinks();
    addSettingsLinks();
    addSiteVersion();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGlobalLabels, { once: true });
  else initializeGlobalLabels();
})();
