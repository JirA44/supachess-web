/**
 * ChessNova Progress System - Shared XP/Badge/Level Module
 * Used across all pages: CHESSNOVA.html, TACTICAL_PUZZLES, TRAINING_*, DAILY_CHALLENGE
 */
(function() {
    'use strict';

    const BASE_RANKS = [
        { level: 1, name: 'Debutant', minXP: 0 },
        { level: 2, name: 'Apprenti', minXP: 100 },
        { level: 3, name: 'Joueur', minXP: 250 },
        { level: 4, name: 'Competiteur', minXP: 500 },
        { level: 5, name: 'Challenger', minXP: 800 },
        { level: 6, name: 'Expert', minXP: 1200 },
        { level: 7, name: 'Maitre', minXP: 1800 },
        { level: 8, name: 'Grand Maitre', minXP: 2500 },
        { level: 9, name: 'Champion', minXP: 3500 },
        { level: 10, name: 'Legende', minXP: 5000 }
    ];

    const ALL_BADGES = {
        // === Existing 20 badges ===
        'first-game':     { id: 'ach-first-game',     xp: 10,  name: 'Premiere Partie',       cat: 'basic' },
        'first-win':      { id: 'ach-first-win',      xp: 25,  name: 'Premiere Victoire',     cat: 'basic' },
        'brilliant':      { id: 'ach-brilliant',       xp: 50,  name: 'Coup Brillant',         cat: 'basic' },
        'perfect':        { id: 'ach-perfect',         xp: 100, name: 'Partie Parfaite',       cat: 'basic' },
        'streak3':        { id: 'ach-streak3',         xp: 30,  name: '3 Winstreak',           cat: 'streak' },
        'streak5':        { id: 'ach-streak5',         xp: 75,  name: '5 Winstreak',           cat: 'streak' },
        'streak10':       { id: 'ach-streak10',        xp: 200, name: '10 Winstreak',          cat: 'streak' },
        'streak20':       { id: 'ach-streak20',        xp: 500, name: '20 Winstreak',          cat: 'streak' },
        '10games':        { id: 'ach-10games',         xp: 20,  name: '10 Parties',            cat: 'games' },
        '50games':        { id: 'ach-50games',         xp: 100, name: '50 Parties',            cat: 'games' },
        '100games':       { id: 'ach-100games',        xp: 250, name: '100 Parties',           cat: 'games' },
        'tactician':      { id: 'ach-tactician',       xp: 40,  name: 'Tacticien',             cat: 'games' },
        'beat-inter':     { id: 'ach-beat-inter',      xp: 50,  name: 'Battez Intermediaire',  cat: 'opponent' },
        'beat-advanced':  { id: 'ach-beat-advanced',   xp: 100, name: 'Battez Avance',         cat: 'opponent' },
        'beat-expert':    { id: 'ach-beat-expert',     xp: 150, name: 'Battez Expert',         cat: 'opponent' },
        'beat-stockfish': { id: 'ach-beat-stockfish',  xp: 500, name: 'Tueur de Machines',     cat: 'opponent' },
        'elo1400':        { id: 'ach-elo1400',         xp: 60,  name: 'Bronze 1400',           cat: 'elo' },
        'elo1600':        { id: 'ach-elo1600',         xp: 120, name: 'Argent 1600',           cat: 'elo' },
        'elo1800':        { id: 'ach-elo1800',         xp: 200, name: 'Or 1800',               cat: 'elo' },
        'elo2000':        { id: 'ach-elo2000',         xp: 400, name: 'Diamant 2000',          cat: 'elo' },
        // === 18 new badges ===
        'puzzle-10':          { id: 'ach-puzzle-10',          xp: 20,  name: '10 Puzzles',            cat: 'puzzles' },
        'puzzle-50':          { id: 'ach-puzzle-50',          xp: 80,  name: '50 Puzzles',            cat: 'puzzles' },
        'puzzle-100':         { id: 'ach-puzzle-100',         xp: 200, name: '100 Puzzles',           cat: 'puzzles' },
        'puzzle-elo-1400':    { id: 'ach-puzzle-elo-1400',    xp: 60,  name: 'Puzzle Bronze 1400',    cat: 'puzzles' },
        'puzzle-elo-1600':    { id: 'ach-puzzle-elo-1600',    xp: 120, name: 'Puzzle Argent 1600',    cat: 'puzzles' },
        'puzzle-elo-1800':    { id: 'ach-puzzle-elo-1800',    xp: 200, name: 'Puzzle Or 1800',        cat: 'puzzles' },
        'perfect-streak-5':   { id: 'ach-perfect-streak-5',   xp: 75,  name: '5 Puzzles Parfaits',    cat: 'puzzles' },
        'opening-scholar':    { id: 'ach-opening-scholar',    xp: 100, name: 'Erudit Ouvertures',     cat: 'training' },
        'endgame-specialist': { id: 'ach-endgame-specialist', xp: 100, name: 'Specialiste Finales',   cat: 'training' },
        'tactics-master':     { id: 'ach-tactics-master',     xp: 100, name: 'Maitre Tactique',       cat: 'training' },
        'training-complete-1':{ id: 'ach-training-complete-1',xp: 50,  name: '1 Programme',           cat: 'training' },
        'training-complete-5':{ id: 'ach-training-complete-5',xp: 150, name: '5 Programmes',          cat: 'training' },
        'daily-7':            { id: 'ach-daily-7',            xp: 50,  name: '7 Jours Defi',          cat: 'daily' },
        'daily-30':           { id: 'ach-daily-30',           xp: 200, name: '30 Jours Defi',         cat: 'daily' },
        'daily-100':          { id: 'ach-daily-100',          xp: 500, name: '100 Jours Defi',        cat: 'daily' },
        'prestige-1':         { id: 'ach-prestige-1',         xp: 0,   name: 'Prestige I',            cat: 'prestige' },
        'prestige-5':         { id: 'ach-prestige-5',         xp: 0,   name: 'Prestige V',            cat: 'prestige' },
        'prestige-10':        { id: 'ach-prestige-10',        xp: 0,   name: 'Prestige X',            cat: 'prestige' }
    };

    // Infinite leveling: XP thresholds beyond level 10
    function getPrestigeXP(level) {
        if (level <= 10) {
            var r = BASE_RANKS.find(function(r) { return r.level === level; });
            return r ? r.minXP : 0;
        }
        // XP_n = 5000 + sum(2000 * 1.3^(i-1)) for i=1 to (n-10)
        var total = 5000;
        for (var i = 1; i <= level - 10; i++) {
            total += Math.floor(2000 * Math.pow(1.3, i - 1));
        }
        return total;
    }

    function getLevelForXP(xp) {
        // Check prestige levels (11+)
        var level = 10;
        while (getPrestigeXP(level + 1) <= xp) {
            level++;
            if (level > 100) break; // safety cap
        }
        // Check base levels
        if (xp < 5000) {
            for (var i = BASE_RANKS.length - 1; i >= 0; i--) {
                if (xp >= BASE_RANKS[i].minXP) {
                    return BASE_RANKS[i].level;
                }
            }
            return 1;
        }
        return level;
    }

    function getRankName(level) {
        if (level <= 10) {
            var r = BASE_RANKS.find(function(r) { return r.level === level; });
            return r ? r.name : 'Debutant';
        }
        var stars = level - 10;
        if (stars <= 5) {
            var starStr = '';
            for (var i = 0; i < stars; i++) starStr += '\u2605';
            return 'Legende ' + starStr;
        }
        return 'Legende \u2605\u2605\u2605\u2605\u2605 +' + (stars - 5);
    }

    function getXPProgress(xp) {
        var level = getLevelForXP(xp);
        var currentMin = getPrestigeXP(level);
        var nextMin = getPrestigeXP(level + 1);
        if (nextMin <= currentMin) return 100;
        return Math.min(((xp - currentMin) / (nextMin - currentMin)) * 100, 100);
    }

    // Load/save progress from localStorage
    var cloudUser = null;
    var cloudDb = null;
    var cloudSaveTimer = null;

    function defaultProgress() {
        return {
            xp: 0, level: 1, currentStreak: 0, bestStreak: 0,
            totalWins: 0, totalGames: 0, badges: [], recentRewards: [],
            puzzlesSolved: 0, puzzlePerfectStreak: 0
        };
    }

    function normalize(progress) {
        var result = Object.assign(defaultProgress(), progress || {});
        result.xp = Math.max(0, Number(result.xp) || 0);
        result.level = getLevelForXP(result.xp);
        result.currentStreak = Math.max(0, Number(result.currentStreak) || 0);
        result.bestStreak = Math.max(result.currentStreak, Number(result.bestStreak) || 0);
        result.totalWins = Math.max(0, Number(result.totalWins) || 0);
        result.totalGames = Math.max(result.totalWins, Number(result.totalGames) || 0);
        result.puzzlesSolved = Math.max(0, Number(result.puzzlesSolved) || 0);
        result.puzzlePerfectStreak = Math.max(0, Number(result.puzzlePerfectStreak) || 0);
        result.badges = Array.isArray(result.badges) ? Array.from(new Set(result.badges)) : [];
        result.recentRewards = Array.isArray(result.recentRewards) ? result.recentRewards.slice(0, 10) : [];
        return result;
    }

    function mergeProgress(local, cloud) {
        var a = normalize(local);
        var b = normalize(cloud);
        return normalize({
            xp: Math.max(a.xp, b.xp),
            currentStreak: Math.max(a.currentStreak, b.currentStreak),
            bestStreak: Math.max(a.bestStreak, b.bestStreak),
            totalWins: Math.max(a.totalWins, b.totalWins),
            totalGames: Math.max(a.totalGames, b.totalGames),
            puzzlesSolved: Math.max(a.puzzlesSolved, b.puzzlesSolved),
            puzzlePerfectStreak: Math.max(a.puzzlePerfectStreak, b.puzzlePerfectStreak),
            badges: a.badges.concat(b.badges),
            recentRewards: a.recentRewards.concat(b.recentRewards)
                .sort(function(x, y) { return (y.time || 0) - (x.time || 0); })
                .slice(0, 10)
        });
    }

    function queueCloudSave() {
        if (!cloudUser || !cloudDb || cloudSaveTimer) return;
        cloudSaveTimer = setTimeout(function() {
            cloudSaveTimer = null;
            var progress = load();
            cloudDb.collection('users').doc(cloudUser.uid).set({
                progress: progress,
                xp: progress.xp,
                level: progress.level,
                currentStreak: progress.currentStreak,
                bestStreak: progress.bestStreak,
                totalWins: progress.totalWins,
                totalGames: progress.totalGames,
                progressUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function(err) {
                console.warn('[Progress] Cloud save failed:', err.code || err.message);
            });
        }, 500);
    }

    async function syncWithCloud(user) {
        if (!user || typeof firebase === 'undefined') return load();
        cloudUser = user;
        cloudDb = firebase.firestore();
        try {
            var doc = await cloudDb.collection('users').doc(user.uid).get();
            var data = doc.exists ? doc.data() : {};
            var cloudProgress = data.progress || data;
            var merged = mergeProgress(load(), cloudProgress);
            localStorage.setItem('chessnova_progress', JSON.stringify(merged));
            queueCloudSave();
            window.dispatchEvent(new CustomEvent('chessnova:progress-synced', { detail: merged }));
            return merged;
        } catch (err) {
            console.warn('[Progress] Cloud sync failed:', err.code || err.message);
            return load();
        }
    }

    function load() {
        try {
            var data = JSON.parse(localStorage.getItem('chessnova_progress'));
            if (data) return normalize(data);
        } catch(e) {}
        return defaultProgress();
    }

    function save(progress) {
        localStorage.setItem('chessnova_progress', JSON.stringify(normalize(progress)));
        queueCloudSave();
    }

    // Toast notification
    function showRewardToast(text, xp) {
        var existing = document.getElementById('cnp-toast-container');
        if (!existing) {
            existing = document.createElement('div');
            existing.id = 'cnp-toast-container';
            existing.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
            document.body.appendChild(existing);
        }
        var toast = document.createElement('div');
        toast.style.cssText = 'background:linear-gradient(135deg,rgba(168,85,247,0.95),rgba(236,72,153,0.95));color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(168,85,247,0.4);transform:translateX(120%);transition:transform 0.3s ease;pointer-events:auto;';
        toast.innerHTML = (xp ? '<span style="color:#fbbf24;">+' + xp + ' XP</span> ' : '') + text;
        existing.appendChild(toast);
        requestAnimationFrame(function() {
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(function() {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    // Add XP and recalculate level
    function addXP(amount, reason) {
        var progress = load();
        progress.xp += amount;
        var oldLevel = progress.level;
        progress.level = getLevelForXP(progress.xp);

        if (progress.level > oldLevel) {
            showRewardToast('LEVEL UP! Niveau ' + progress.level + ' - ' + getRankName(progress.level), 0);
            // Check prestige badges
            if (progress.level >= 11) unlockBadge('prestige-1');
            if (progress.level >= 15) unlockBadge('prestige-5');
            if (progress.level >= 20) unlockBadge('prestige-10');
        }

        progress.recentRewards.unshift({ text: '+' + amount + ' XP: ' + reason, time: Date.now() });
        if (progress.recentRewards.length > 10) progress.recentRewards.pop();

        save(progress);
        showRewardToast(reason, amount);
        return progress;
    }

    // Unlock a badge
    function unlockBadge(badgeKey) {
        var progress = load();
        if (progress.badges.indexOf(badgeKey) !== -1) return false;
        var badge = ALL_BADGES[badgeKey];
        if (!badge) return false;

        progress.badges.push(badgeKey);
        save(progress);

        // Animate badge element if on page
        var el = document.getElementById(badge.id);
        if (el) {
            el.classList.add('unlocked');
            el.style.animation = 'none';
            setTimeout(function() { el.style.animation = 'unlock 0.5s ease-out'; }, 10);
        }

        if (badge.xp > 0) {
            addXP(badge.xp, 'Badge: ' + badge.name);
        } else {
            showRewardToast('Badge: ' + badge.name, 0);
        }
        return true;
    }

    // Check training completion badges
    function checkTrainingBadges() {
        var completed = 0;
        try {
            if (localStorage.getItem('chessnova_training_openings')) {
                var d = JSON.parse(localStorage.getItem('chessnova_training_openings'));
                if (d && d.completed && d.completed.length >= 8) { unlockBadge('opening-scholar'); completed++; }
                else if (d && d.completed && d.completed.length > 0) completed++;
            }
        } catch(e) {}
        try {
            if (localStorage.getItem('chessnova_training_endgames')) {
                var d = JSON.parse(localStorage.getItem('chessnova_training_endgames'));
                if (d && d.completed && d.completed.length >= 10) { unlockBadge('endgame-specialist'); completed++; }
                else if (d && d.completed && d.completed.length > 0) completed++;
            }
        } catch(e) {}
        try {
            if (localStorage.getItem('chessnova_training_tactics')) {
                var d = JSON.parse(localStorage.getItem('chessnova_training_tactics'));
                if (d && d.completedCategories && d.completedCategories.length >= 3) { unlockBadge('tactics-master'); completed++; }
                else if (d && d.completedCategories && d.completedCategories.length > 0) completed++;
            }
        } catch(e) {}
        try {
            if (localStorage.getItem('chessnova_daily_challenges')) {
                var d = JSON.parse(localStorage.getItem('chessnova_daily_challenges'));
                if (d && d.completedDays && d.completedDays.length > 0) completed++;
            }
        } catch(e) {}
        if (completed >= 1) unlockBadge('training-complete-1');
        if (completed >= 5) unlockBadge('training-complete-5');
    }

    // Render a reusable progress bar
    function renderProgressBar(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var progress = load();
        var pct = getXPProgress(progress.xp);
        var nextXP = getPrestigeXP(progress.level + 1);
        var rankName = getRankName(progress.level);
        var gradient = progress.level > 10
            ? 'linear-gradient(90deg, #f59e0b 0%, #a855f7 50%, #ec4899 100%)'
            : 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)';

        container.innerHTML =
            '<div style="background:linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.2));padding:12px 16px;border-radius:12px;border:1px solid rgba(168,85,247,0.3);">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<span style="font-size:1.5em;">' + (progress.level > 10 ? '\u2B50' : '\uD83C\uDF96\uFE0F') + '</span>' +
                        '<div>' +
                            '<div style="color:#a855f7;font-weight:bold;">Niv. ' + progress.level + '</div>' +
                            '<div style="color:#888;font-size:0.8em;">' + rankName + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align:right;">' +
                        '<div style="color:#f59e0b;font-weight:bold;">' + progress.xp + ' XP</div>' +
                        '<div style="color:#888;font-size:0.75em;">Prochain: ' + nextXP + ' XP</div>' +
                    '</div>' +
                '</div>' +
                '<div style="background:rgba(0,0,0,0.3);border-radius:10px;height:10px;overflow:hidden;">' +
                    '<div style="background:' + gradient + ';height:100%;width:' + pct + '%;transition:width 0.5s;border-radius:10px;"></div>' +
                '</div>' +
            '</div>';
    }

    // Expose global API
    window.ChessNovaProgress = {
        BASE_RANKS: BASE_RANKS,
        ALL_BADGES: ALL_BADGES,
        load: load,
        save: save,
        addXP: addXP,
        unlockBadge: unlockBadge,
        getRankName: getRankName,
        getLevelForXP: getLevelForXP,
        getPrestigeXP: getPrestigeXP,
        getXPProgress: getXPProgress,
        showRewardToast: showRewardToast,
        renderProgressBar: renderProgressBar,
        checkTrainingBadges: checkTrainingBadges,
        syncWithCloud: syncWithCloud
    };
})();
