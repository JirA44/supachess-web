/* SupaChess hub — global module search (index.html) */
(function () {
    'use strict';

    var STORAGE_KEY = 'supachess_hub_history';
    var MAX_SEARCHES = 4;
    var MAX_POPULAR = 4;
    var MAX_SUGGESTIONS = 5;

    var input = null;
    var counter = null;
    var list = null;
    var entries = [];
    var folders = [];
    var sections = [];
    var activeIndex = -1;
    var currentMatches = [];

    function normalize(value) {
        return String(value === null || value === undefined ? '' : value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function readHistory() {
        var history = { searches: [], clicks: {} };
        var raw = null;
        try {
            raw = window.localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            raw = null;
        }
        if (!raw) return history;
        try {
            var parsed = JSON.parse(raw);
            if (parsed && Object.prototype.toString.call(parsed.searches) === '[object Array]') {
                parsed.searches.forEach(function (item) {
                    if (typeof item === 'string' && item.trim() && history.searches.length < MAX_SEARCHES) {
                        history.searches.push(item);
                    }
                });
            }
            if (parsed && parsed.clicks && typeof parsed.clicks === 'object') {
                Object.keys(parsed.clicks).forEach(function (id) {
                    var count = Number(parsed.clicks[id]);
                    if (isFinite(count) && count > 0) history.clicks[id] = Math.min(999, Math.floor(count));
                });
            }
        } catch (error) {
            history.searches = [];
            history.clicks = {};
        }
        return history;
    }

    function writeHistory(history) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            return false;
        }
        return true;
    }

    function recordSearch(value) {
        var query = String(value || '').trim();
        if (!query) return;
        var history = readHistory();
        history.searches = history.searches.filter(function (item) {
            return normalize(item) !== normalize(query);
        });
        history.searches.unshift(query);
        history.searches = history.searches.slice(0, MAX_SEARCHES);
        writeHistory(history);
    }

    function recordClick(moduleId) {
        if (!moduleId) return;
        var history = readHistory();
        history.clicks[moduleId] = Math.min(999, (history.clicks[moduleId] || 0) + 1);
        writeHistory(history);
    }

    function textOf(node) {
        return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }

    function closest(node, selector) {
        var current = node;
        while (current && current.nodeType === 1) {
            if (current.matches && current.matches(selector)) return current;
            current = current.parentNode;
        }
        return null;
    }

    function collectEntries() {
        var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-hub-module]'));
        entries = nodes.map(function (node) {
            var heading = node.querySelector('h3');
            var title = node.getAttribute('data-hub-title') || textOf(heading) || node.getAttribute('data-hub-module');
            var description = textOf(node.querySelector('p'));
            var keywords = node.getAttribute('data-keywords') || '';
            var folder = closest(node, '[data-hub-folder]');
            var section = closest(node, '[data-hub-section]');
            var category = node.getAttribute('data-hub-category') ||
                (folder ? folder.getAttribute('data-hub-category') : '') ||
                (section ? section.getAttribute('data-hub-section') : '');
            return {
                node: node,
                id: node.getAttribute('data-hub-module'),
                title: title,
                description: description,
                keywords: keywords,
                category: category,
                href: node.getAttribute('href') || '',
                search: normalize([title, description, keywords, category, node.getAttribute('data-hub-module')].join(' '))
            };
        });
        folders = Array.prototype.slice.call(document.querySelectorAll('[data-hub-folder]')).map(function (folder) {
            return { node: folder, name: folder.getAttribute('data-hub-category') || textOf(folder.querySelector('summary')), opened: folder.open };
        });
        sections = Array.prototype.slice.call(document.querySelectorAll('[data-hub-section]')).map(function (section) {
            return { node: section, name: section.getAttribute('data-hub-section') || '' };
        });
    }

    function scoreToken(entry, token) {
        var title = normalize(entry.title);
        if (title === token) return 100;
        if (title.indexOf(token) === 0) return 80;
        if (title.indexOf(token) >= 0) return 65;
        if (normalize(entry.keywords).indexOf(token) >= 0) return 45;
        if (normalize(entry.category).indexOf(token) >= 0) return 30;
        if (normalize(entry.description).indexOf(token) >= 0) return 20;
        if (entry.search.indexOf(token) >= 0) return 10;
        return 0;
    }

    function matchesQuery(entry, tokens) {
        if (!tokens.length) return true;
        for (var i = 0; i < tokens.length; i++) {
            if (entry.search.indexOf(tokens[i]) < 0) return false;
        }
        return true;
    }

    function applyFilter(query) {
        var normalizedQuery = normalize(query);
        var tokens = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean) : [];
        var matches = [];
        entries.forEach(function (entry) {
            var visible = matchesQuery(entry, tokens);
            entry.node.hidden = !visible;
            if (!visible) return;
            var score = 0;
            tokens.forEach(function (token) {
                score += scoreToken(entry, token);
            });
            entry.score = score;
            matches.push(entry);
        });
        currentMatches = matches;
        folders.forEach(function (folder) {
            var visibleCount = entries.filter(function (entry) {
                return !entry.node.hidden && folder.node.contains(entry.node);
            }).length;
            var counterNode = folder.node.querySelector('[data-hub-folder-count]');
            if (counterNode) counterNode.textContent = '(' + visibleCount + ')';
            if (tokens.length) {
                folder.node.hidden = visibleCount === 0;
                if (visibleCount > 0) folder.node.open = true;
                else folder.node.open = false;
            } else {
                folder.node.hidden = false;
                folder.node.open = folder.opened;
            }
        });
        sections.forEach(function (section) {
            var visibleCount = entries.filter(function (entry) {
                return !entry.node.hidden && section.node.contains(entry.node);
            }).length;
            var counterNode = section.node.querySelector('[data-hub-section-count]');
            if (counterNode) counterNode.textContent = visibleCount + ' module' + (visibleCount > 1 ? 's' : '');
            section.node.hidden = tokens.length ? visibleCount === 0 : false;
        });
        if (counter) {
            counter.textContent = tokens.length
                ? matches.length + ' résultat' + (matches.length > 1 ? 's' : '') + ' sur ' + entries.length + ' modules'
                : entries.length + ' modules disponibles';
        }
        return matches;
    }

    function optionNode(label, badge, href, onSelect) {
        var item = document.createElement('li');
        item.className = 'hub-suggestion';
        item.setAttribute('role', 'option');
        item.id = 'hub-search-option-' + list.children.length;
        item.setAttribute('aria-selected', 'false');
        if (href) {
            var link = document.createElement('a');
            link.href = href;
            link.className = 'hub-suggestion-link';
            link.appendChild(label);
            if (badge) link.appendChild(badge);
            item.appendChild(link);
        } else {
            item.appendChild(label);
            if (badge) item.appendChild(badge);
        }
        item.addEventListener('click', function () {
            if (onSelect) onSelect();
        });
        list.appendChild(item);
        return item;
    }

    function titleNode(text) {
        var span = document.createElement('span');
        span.className = 'hub-suggestion-title';
        span.textContent = text;
        return span;
    }

    function badgeNode(text) {
        var span = document.createElement('span');
        span.className = 'hub-suggestion-badge';
        span.textContent = text || 'Module';
        return span;
    }

    function groupNode(text) {
        var item = document.createElement('li');
        item.className = 'hub-suggestion-group';
        item.setAttribute('role', 'presentation');
        item.textContent = text;
        list.appendChild(item);
        return item;
    }

    function setActive(index) {
        var items = Array.prototype.slice.call(list.querySelectorAll('.hub-suggestion'));
        if (!items.length) {
            activeIndex = -1;
            input.removeAttribute('aria-activedescendant');
            return;
        }
        activeIndex = (index + items.length) % items.length;
        items.forEach(function (item, position) {
            var selected = position === activeIndex;
            item.setAttribute('aria-selected', selected ? 'true' : 'false');
            item.classList.toggle('is-active', selected);
        });
        var active = items[activeIndex];
        if (active) {
            input.setAttribute('aria-activedescendant', active.id);
            if (active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
        }
    }

    function openList() {
        if (!list) return;
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function closeList() {
        if (!list) return;
        list.hidden = true;
        list.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        activeIndex = -1;
    }

    function renderMatches(matches, query) {
        list.innerHTML = '';
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
        if (!matches.length) {
            var empty = document.createElement('li');
            empty.className = 'hub-suggestion-empty';
            empty.setAttribute('role', 'presentation');
            empty.textContent = 'Aucun module ne correspond à « ' + query + ' ».';
            list.appendChild(empty);
            openList();
            return;
        }
        matches.slice().sort(function (a, b) {
            return (b.score || 0) - (a.score || 0) || a.title.localeCompare(b.title, 'fr');
        }).slice(0, MAX_SUGGESTIONS).forEach(function (entry) {
            var activate = function () {
                recordSearch(query);
                if (entry.href) window.location.href = entry.href;
            };
            optionNode(titleNode(entry.title), badgeNode(entry.category), entry.href, activate);
        });
        openList();
    }

    function renderHistory() {
        var history = readHistory();
        list.innerHTML = '';
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
        var popular = Object.keys(history.clicks).sort(function (a, b) {
            return history.clicks[b] - history.clicks[a] || a.localeCompare(b, 'fr');
        }).slice(0, MAX_POPULAR);
        if (popular.length) {
            groupNode('Modules les plus consultés');
            popular.forEach(function (id) {
                var entry = entries.filter(function (item) { return item.id === id; })[0];
                if (!entry) return;
                var badge = badgeNode(entry.category);
                var count = document.createElement('span');
                count.className = 'hub-suggestion-count';
                count.textContent = '×' + history.clicks[id];
                badge.appendChild(count);
                optionNode(titleNode(entry.title), badge, entry.href, function () {
                    recordSearch(entry.title);
                });
            });
        }
        if (history.searches.length) {
            groupNode('Recherches récentes');
            history.searches.forEach(function (query) {
                optionNode(titleNode(query), badgeNode('Reprendre'), '', function () {
                    input.value = query;
                    renderMatches(applyFilter(query), query);
                });
            });
        }
        if (!list.children.length) {
            var empty = document.createElement('li');
            empty.className = 'hub-suggestion-empty';
            empty.setAttribute('role', 'presentation');
            empty.textContent = 'Tape un mot-clé : mat, coach, puzzle, Stockfish, tournois…';
            list.appendChild(empty);
        }
        openList();
    }

    function runSearch() {
        var query = input.value.trim();
        if (!query) {
            renderHistory();
            applyFilter('');
            return;
        }
        var matches = applyFilter(query);
        renderMatches(matches, query);
    }

    function focusInput() {
        if (!input) return;
        input.focus();
        if (typeof input.select === 'function') input.select();
    }

    function activateActive() {
        var items = Array.prototype.slice.call(list.querySelectorAll('.hub-suggestion'));
        if (!items.length) return false;
        var item = activeIndex >= 0 ? items[activeIndex] : items[0];
        var link = item.querySelector('a');
        if (link) {
            recordSearch(input.value.trim());
            window.location.href = link.getAttribute('href');
            return true;
        }
        item.click();
        return true;
    }

    function bindInput() {
        input.addEventListener('input', runSearch);
        input.addEventListener('focus', function () {
            if (!input.value.trim()) renderHistory();
            else runSearch();
        });
        input.addEventListener('change', function () {
            recordSearch(input.value.trim());
        });
        input.addEventListener('keydown', function (event) {
            var key = event.key;
            if (key === 'ArrowDown') {
                if (list.hidden) {
                    runSearch();
                    return;
                }
                event.preventDefault();
                setActive(activeIndex + 1);
                return;
            }
            if (key === 'ArrowUp') {
                if (list.hidden) {
                    runSearch();
                    return;
                }
                event.preventDefault();
                setActive(activeIndex - 1);
                return;
            }
            if (key === 'Enter') {
                if (!list.hidden && activateActive()) {
                    event.preventDefault();
                    recordSearch(input.value.trim());
                }
                return;
            }
            if (key === 'Escape') {
                if (!list.hidden) {
                    event.preventDefault();
                    closeList();
                }
                return;
            }
            if (key === 'Tab') {
                if (!list.hidden && activeIndex >= 0) {
                    var items = Array.prototype.slice.call(list.querySelectorAll('.hub-suggestion'));
                    var item = items[activeIndex];
                    var link = item && item.querySelector('a');
                    if (link) {
                        event.preventDefault();
                        link.focus();
                    }
                }
                return;
            }
        });
        list.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeList();
                focusInput();
            }
        });
        document.addEventListener('click', function (event) {
            var moduleNode = closest(event.target, '[data-hub-module]');
            if (moduleNode) recordClick(moduleNode.getAttribute('data-hub-module'));
            if (!closest(event.target, '#hub-search-bar')) {
                if (!list.hidden && !closest(event.target, '.hub-suggestion')) closeList();
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.defaultPrevented) return;
            var target = event.target;
            var tag = target && target.tagName ? target.tagName.toUpperCase() : '';
            var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable);
            if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                focusInput();
                return;
            }
            if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                focusInput();
            }
        });
        document.addEventListener('focusout', function (event) {
            if (!closest(event.target, '#hub-search-bar')) {
                window.setTimeout(function () {
                    if (!closest(document.activeElement, '#hub-search-bar')) closeList();
                }, 0);
            }
        });
    }

    function init() {
        input = document.getElementById('hub-search-input');
        counter = document.getElementById('hub-search-count');
        list = document.getElementById('hub-search-suggestions');
        if (!input || !list) return;
        collectEntries();
        bindInput();
        applyFilter('');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.SupachessHubSearch = {
        normalize: normalize,
        applyFilter: applyFilter,
        recordSearch: recordSearch,
        history: readHistory
    };
})();
