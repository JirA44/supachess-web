/* ============================================
   ChessNova i18n System
   Detection: localStorage > navigator.language > 'en'
   ============================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 'chessnova_lang';
    var SUPPORTED = ['en', 'fr'];
    var DEFAULT_LANG = 'en';
    var translations = {};
    var currentLang = DEFAULT_LANG;
    var basePath = '';

    // Resolve the base path for loading translation files
    function resolveBasePath() {
        var scripts = document.querySelectorAll('script[src*="i18n.js"]');
        if (scripts.length > 0) {
            var src = scripts[scripts.length - 1].getAttribute('src');
            basePath = src.substring(0, src.lastIndexOf('/'));
        }
    }

    // Detect preferred language
    function detectLang() {
        // 1. Check localStorage
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;

        // 2. Check navigator.language
        var navLang = (navigator.language || navigator.userLanguage || '').substring(0, 2).toLowerCase();
        if (SUPPORTED.indexOf(navLang) !== -1) return navLang;

        // 3. Default
        return DEFAULT_LANG;
    }

    // Load translation JSON
    function loadTranslation(lang, callback) {
        if (translations[lang]) {
            callback();
            return;
        }
        var url = basePath + '/translations/' + lang + '.json';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        translations[lang] = JSON.parse(xhr.responseText);
                    } catch (e) {
                        console.warn('[i18n] Failed to parse ' + lang + '.json:', e);
                        translations[lang] = {};
                    }
                } else {
                    console.warn('[i18n] Failed to load ' + lang + '.json (status ' + xhr.status + ')');
                    translations[lang] = {};
                }
                callback();
            }
        };
        xhr.send();
    }

    // Apply translations to all data-i18n elements
    function applyTranslations() {
        var dict = translations[currentLang] || {};
        var elements = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < elements.length; i++) {
            var key = elements[i].getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                // Check for placeholder attribute
                var attr = elements[i].getAttribute('data-i18n-attr');
                if (attr === 'placeholder') {
                    elements[i].placeholder = dict[key];
                } else {
                    elements[i].textContent = dict[key];
                }
            }
        }
        // Update toggle button
        var toggleLabel = document.querySelector('.cn-lang-label');
        if (toggleLabel) {
            toggleLabel.textContent = currentLang.toUpperCase();
        }
        var toggleFlag = document.querySelector('.cn-lang-flag');
        if (toggleFlag) {
            toggleFlag.textContent = currentLang === 'fr' ? '\uD83C\uDDEB\uD83C\uDDF7' : '\uD83C\uDDEC\uD83C\uDDE7';
        }
    }

    // Switch language
    function switchLang(lang) {
        if (SUPPORTED.indexOf(lang) === -1) return;
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        loadTranslation(lang, function () {
            applyTranslations();
        });
    }

    // Toggle between supported languages
    function toggleLang() {
        var idx = SUPPORTED.indexOf(currentLang);
        var next = SUPPORTED[(idx + 1) % SUPPORTED.length];
        switchLang(next);
    }

    // Create toggle button
    function createToggle() {
        var toggle = document.createElement('div');
        toggle.className = 'cn-lang-toggle';
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('aria-label', 'Switch language');
        toggle.setAttribute('tabindex', '0');
        toggle.innerHTML =
            '<span class="cn-lang-flag">' + (currentLang === 'fr' ? '\uD83C\uDDEB\uD83C\uDDF7' : '\uD83C\uDDEC\uD83C\uDDE7') + '</span>' +
            '<span class="cn-lang-label">' + currentLang.toUpperCase() + '</span>';
        toggle.addEventListener('click', toggleLang);
        toggle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleLang();
            }
        });
        document.body.appendChild(toggle);
    }

    // Initialize
    function init() {
        resolveBasePath();
        currentLang = detectLang();

        // Load current language then apply
        loadTranslation(currentLang, function () {
            createToggle();
            applyTranslations();
        });

        // Pre-load the other language in background
        var otherLang = currentLang === 'en' ? 'fr' : 'en';
        loadTranslation(otherLang, function () { });
    }

    // Expose API
    window.ChessNovaI18n = {
        switchLang: switchLang,
        toggleLang: toggleLang,
        getLang: function () { return currentLang; },
        t: function (key) {
            var dict = translations[currentLang] || {};
            return dict[key] || key;
        },
        applyTranslations: applyTranslations
    };

    // Init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
