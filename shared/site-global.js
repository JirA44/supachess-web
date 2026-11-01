(function () {
  'use strict';
  var script = document.currentScript;
  var root = script && script.src ? new URL('../', script.src) : new URL('./', location.href);
  var style = document.createElement('style');
  style.id = 'supachess-global-ux';
  style.textContent = [
    'img[src*="/wK.svg"],img[src*="/wQ.svg"],img[src*="/wR.svg"],img[src*="/wB.svg"],img[src*="/wN.svg"],img[src*="/wP.svg"]{opacity:1!important;visibility:visible!important;filter:none!important}',
    '.piece.white,.piece[data-color="white"],.piece[data-piece^="w"]{opacity:1!important;visibility:visible!important;filter:none!important}',
    '.supachess-filled-white-piece{color:#fff!important;-webkit-text-fill-color:#fff!important;fill:#fff!important;-webkit-text-stroke:1.2px #111!important;paint-order:stroke fill;opacity:1!important;filter:none!important;text-shadow:0 1px 2px rgba(0,0,0,.8)!important}',
    '.supachess-filled-black-piece{color:#171717!important;-webkit-text-fill-color:#171717!important;fill:#171717!important;-webkit-text-stroke:1px #f8fafc!important;paint-order:stroke fill;opacity:1!important;filter:none!important;text-shadow:0 1px 1px rgba(255,255,255,.55)!important}',
    '.supachess-page-back{display:block;width:max-content;max-width:100%;margin:12px auto;padding:10px 18px;border:1px solid currentColor;border-radius:999px;background:#12354a;color:#fff!important;font:600 15px/1.3 system-ui,sans-serif;text-decoration:none;box-shadow:0 2px 8px #0003}',
    '.supachess-page-back:hover{background:#1b526f;text-decoration:underline}',
    '.supachess-page-back:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}',
    '.supachess-page-back--top{margin-top:0}'
  ].join('');
  (document.head || document.documentElement).appendChild(style);\n
  // Normalize outline Unicode chess symbols to solid glyphs; CSS determines side color.
  var outlineToSolid = { '♔':'♚', '♕':'♛', '♖':'♜', '♗':'♝', '♘':'♞', '♙':'♟' };
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
      var glyph = (node.textContent || '').trim();
      if (outlineToSolid[glyph]) node.textContent = outlineToSolid[glyph];
    });
  }
  normalizeChessGlyphs(document);
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') normalizeChessGlyphs(record.target.parentElement);
        else Array.prototype.forEach.call(record.addedNodes, normalizeChessGlyphs);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBackLinks, { once: true });
  else addBackLinks();
})();