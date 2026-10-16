(function () {
  'use strict';
  var script = document.currentScript;
  var root = script && script.src ? new URL('../', script.src) : new URL('./', location.href);
  var style = document.createElement('style');
  style.id = 'supachess-global-ux';
  style.textContent = [
    'img[src*="/wK.svg"],img[src*="/wQ.svg"],img[src*="/wR.svg"],img[src*="/wB.svg"],img[src*="/wN.svg"],img[src*="/wP.svg"]{opacity:1!important;visibility:visible!important;filter:none!important}',
    '.piece.white,.piece[data-color="white"],.piece[data-piece^="w"]{opacity:1!important;visibility:visible!important;filter:none!important}',
    '.supachess-page-back{display:block;width:max-content;max-width:100%;margin:12px auto;padding:10px 18px;border:1px solid currentColor;border-radius:999px;background:#12354a;color:#fff!important;font:600 15px/1.3 system-ui,sans-serif;text-decoration:none;box-shadow:0 2px 8px #0003}',
    '.supachess-page-back:hover{background:#1b526f;text-decoration:underline}',
    '.supachess-page-back:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}',
    '.supachess-page-back--top{margin-top:0}'
  ].join('');
  (document.head || document.documentElement).appendChild(style);
  function addBackLinks() {
    if (!document.body || document.querySelector('.supachess-page-back')) return;
    var previous = document.referrer;
    var target = root.href + 'index.html';
    try {
      var ref = new URL(previous);
      if (ref.origin === location.origin && ref.href !== location.href) target = ref.href;
    } catch (_) {}
    function makeLink(position) {
      var link = document.createElement('a');
      link.className = 'supachess-page-back supachess-page-back--' + position;
      link.href = target;
      link.textContent = '← Page précédente';
      link.setAttribute('aria-label', 'Revenir à la page précédente');
      return link;
    }
    document.body.insertBefore(makeLink('top'), document.body.firstChild);
    document.body.appendChild(makeLink('bottom'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBackLinks, { once: true });
  else addBackLinks();
})();