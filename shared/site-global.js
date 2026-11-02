(function () {
  'use strict';
  var script = document.currentScript;
  var root = script && script.src ? new URL('../', script.src) : new URL('./', location.href);
  var SITE_VERSION = '1.13.1';
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
        var vector = new URL('assets/chess-pieces/' + side + type + '.svg?v=horse-profile-20261102g', root).href;
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
  function addSiteVersion() {
    if (!document.body || document.querySelector('.supachess-site-version')) return;
    var label = document.createElement('small');
    label.className = 'supachess-site-version';
    label.setAttribute('data-supachess-version-label', '');
    label.setAttribute('aria-label', 'SupaChess site version 1.13.12354435');
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
    addSiteVersion();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGlobalLabels, { once: true });
  else initializeGlobalLabels();
})();
