/* ============================================
   ChessNova Community System
   - Firebase init (safe re-init)
   - Auth UI (email + Google)
   - Footer with live stats
   - Visitor tracking
   - Section click tracking
   - Site stats section
   - Chat widget (chat / suggestions / FAQ)
   - Auto-responses
   ============================================ */
(function () {
    'use strict';

    // --- Firebase Config ---
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyA8duVGo5Vgzn7VXyDTJcdkvThVElYmTss",
        authDomain: "chessnova.firebaseapp.com",
        projectId: "chessnova",
        storageBucket: "chessnova.firebasestorage.app",
        messagingSenderId: "260734552934",
        appId: "1:260734552934:web:c2bf0995c1dd72d87896a7"
    };

    var db = null;
    var auth = null;
    var currentUser = null;
    var chatUnsubscribe = null;
    var panelOpen = false;

    // Presence + Players panel state
    var playersOpen = false;
    var presenceInterval = null;
    var challengesUnsubscribe = null;
    var myStatus = 'dispo'; // dispo | occupe | invisible
    var pendingChallenges = [];
    var currentChallengePopup = null;

    // --- Auto-response keywords ---
    var AUTO_RESPONSES = [
        {
            keywords: ['comment jouer', 'how to play', 'how do i play', 'commencer', 'start playing'],
            responseKey: 'autoresponse_how_to_play'
        },
        {
            keywords: ['supachess', 'c\'est quoi', 'what is', 'qu\'est-ce'],
            responseKey: 'autoresponse_what_is_supachess'
        },
        {
            keywords: ['analyser', 'analyze', 'analyse', 'pgn', 'lichess'],
            responseKey: 'autoresponse_analyze'
        },
        {
            keywords: ['elo', 'rating', 'classement', 'progression'],
            responseKey: 'autoresponse_elo'
        },
        {
            keywords: ['niveau', 'level', 'difficulte', 'difficulty', 'debutant', 'beginner'],
            responseKey: 'autoresponse_levels'
        }
    ];

    // --- Firebase Init (safe) ---
    function initFirebase() {
        try {
            if (typeof firebase !== 'undefined') {
                try {
                    firebase.app();
                    auth = firebase.auth();
                } catch (e) {
                    firebase.initializeApp(FIREBASE_CONFIG);
                    auth = firebase.auth();
                }

                // Authentication must remain available even on pages that do not
                // load Firestore. The hub only needs Firebase Auth for Google sign-in.
                if (firebase.firestore) {
                    try { db = firebase.firestore(); }
                    catch (firestoreError) { console.warn('[Community] Firestore unavailable:', firestoreError.message); }
                }

                // Test Firestore connectivity
                db.collection('community_chat').limit(1).get().then(function() {
                    console.log('[Community] Firestore connected OK');
                }).catch(function(err) {
                    console.error('[Community] Firestore connection test FAILED:', err.code, err.message);
                    if (err.code === 'permission-denied') {
                        console.error('[Community] REGLES FIRESTORE: Les regles de securite bloquent l\'acces. Allez dans Firebase Console > Firestore > Rules et ajoutez des regles permettant la lecture/ecriture aux utilisateurs authentifies.');
                    }
                });

                // Force persistence locale (survit aux redémarrages navigateur)
                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});

                auth.onAuthStateChanged(function (user) {
                    currentUser = user;
                    window.dispatchEvent(new CustomEvent('chessnova:auth-state', { detail: { user: user } }));
                    if (user && window.ChessNovaProgress && window.ChessNovaProgress.syncWithCloud) {
                        window.ChessNovaProgress.syncWithCloud(user);
                    }
                    updateChatAuth();
                    updateAuthBar();
                    if (user) {
                        console.log('[Community] Auth OK:', user.email || user.displayName);
                        startPresence(user);
                        listenForChallenges(user.uid);
                    } else {
                        console.log('[Community] Pas connecte');
                        stopPresence();
                        stopChallengesListener();
                    }
                });
                return true;
            } else {
                console.error('[Community] Firebase SDK non charge! Verifiez les scripts Firebase dans le HTML.');
            }
        } catch (e) {
            console.error('[Community] Firebase init failed:', e.message);
        }
        return false;
    }

    // --- Auth Bar ---
    function injectAuthBar() {
        var bar = document.createElement('div');
        bar.className = 'cn-auth-bar';
        bar.id = 'cn-auth-bar';
        bar.innerHTML =
            '<button class="cn-auth-bar-btn" id="cn-auth-bar-login" data-i18n="auth_login">' + t('auth_login') + '</button>';
        document.body.appendChild(bar);

        var loginBtn = document.getElementById('cn-auth-bar-login');
        if (loginBtn) {
            loginBtn.addEventListener('click', openAuthModal);
        }
    }

    function updateAuthBar() {
        var bar = document.getElementById('cn-auth-bar');
        if (!bar) return;

        if (currentUser) {
            var name = currentUser.displayName || currentUser.email || 'User';
            var initials = name.charAt(0).toUpperCase();
            if (name.indexOf(' ') > 0) {
                initials += name.split(' ')[1].charAt(0).toUpperCase();
            }

            var badgeHtml = pendingChallenges.length > 0
                ? '<div class="cn-challenge-badge">' + pendingChallenges.length + '</div>'
                : '';

            bar.className = 'cn-auth-bar cn-auth-bar--clickable';
            bar.innerHTML =
                '<div class="cn-auth-bar-avatar">' + escapeHTML(initials) + '</div>' +
                '<span class="cn-auth-bar-name">' + escapeHTML(name) + '</span>' +
                badgeHtml +
                '<button class="cn-auth-bar-btn cn-auth-bar-btn--logout" id="cn-auth-bar-logout" data-i18n="auth_logout">' + t('auth_logout') + '</button>';

            var logoutBtn = document.getElementById('cn-auth-bar-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    setPresenceStatus('offline').then(function () {
                        auth.signOut();
                    }).catch(function () {
                        auth.signOut();
                    });
                });
            }

            // Bar click → open players panel
            bar.onclick = function (e) {
                if (e.target.id === 'cn-auth-bar-logout') return;
                togglePlayersPanel();
            };

        } else {
            bar.className = 'cn-auth-bar';
            bar.onclick = null;
            bar.innerHTML =
                '<button class="cn-auth-bar-btn" id="cn-auth-bar-login" data-i18n="auth_login">' + t('auth_login') + '</button>';

            var loginBtn = document.getElementById('cn-auth-bar-login');
            if (loginBtn) {
                loginBtn.addEventListener('click', openAuthModal);
            }
        }
    }

    // --- Auth Modal ---
    function injectAuthModal() {
        var overlay = document.createElement('div');
        overlay.className = 'cn-auth-overlay';
        overlay.id = 'cn-auth-overlay';
        overlay.innerHTML =
            '<div class="cn-auth-modal">' +
                '<div class="cn-auth-modal-header">' +
                    '<h3 data-i18n="auth_login">' + t('auth_login') + '</h3>' +
                    '<button class="cn-auth-modal-close" id="cn-auth-close">&times;</button>' +
                '</div>' +
                '<div class="cn-auth-tabs">' +
                    '<button class="cn-auth-tab cn-auth-tab--active" data-auth-tab="login" data-i18n="auth_tab_login">' + t('auth_tab_login') + '</button>' +
                    '<button class="cn-auth-tab" data-auth-tab="signup" data-i18n="auth_tab_signup">' + t('auth_tab_signup') + '</button>' +
                '</div>' +
                // Login form
                '<div class="cn-auth-form cn-auth-form--active" data-auth-form="login">' +
                    '<input type="email" class="cn-auth-input" id="cn-login-email" data-i18n="auth_email" data-i18n-attr="placeholder" placeholder="' + t('auth_email') + '">' +
                    '<input type="password" class="cn-auth-input" id="cn-login-password" data-i18n="auth_password" data-i18n-attr="placeholder" placeholder="' + t('auth_password') + '">' +
                    '<div class="cn-auth-error" id="cn-login-error"></div>' +
                    '<button class="cn-auth-btn-primary" id="cn-login-submit" data-i18n="auth_btn_login">' + t('auth_btn_login') + '</button>' +
                    '<div class="cn-auth-divider"><span data-i18n="auth_or">' + t('auth_or') + '</span></div>' +
                    '<button class="cn-google-btn" id="cn-google-login">' +
                        '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
                        '<span data-i18n="auth_google">' + t('auth_google') + '</span>' +
                    '</button>' +
                '</div>' +
                // Signup form
                '<div class="cn-auth-form" data-auth-form="signup">' +
                    '<input type="email" class="cn-auth-input" id="cn-signup-email" data-i18n="auth_email" data-i18n-attr="placeholder" placeholder="' + t('auth_email') + '">' +
                    '<input type="password" class="cn-auth-input" id="cn-signup-password" data-i18n="auth_password" data-i18n-attr="placeholder" placeholder="' + t('auth_password') + '">' +
                    '<input type="password" class="cn-auth-input" id="cn-signup-password2" data-i18n="auth_password_confirm" data-i18n-attr="placeholder" placeholder="' + t('auth_password_confirm') + '">' +
                    '<div class="cn-auth-error" id="cn-signup-error"></div>' +
                    '<button class="cn-auth-btn-primary" id="cn-signup-submit" data-i18n="auth_btn_signup">' + t('auth_btn_signup') + '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        // Close handlers
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeAuthModal();
        });
        document.getElementById('cn-auth-close').addEventListener('click', closeAuthModal);

        // Tab switching
        var tabs = overlay.querySelectorAll('.cn-auth-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function () {
                var tabName = this.getAttribute('data-auth-tab');
                var allTabs = overlay.querySelectorAll('.cn-auth-tab');
                var allForms = overlay.querySelectorAll('.cn-auth-form');
                for (var j = 0; j < allTabs.length; j++) {
                    allTabs[j].classList.toggle('cn-auth-tab--active', allTabs[j].getAttribute('data-auth-tab') === tabName);
                }
                for (var k = 0; k < allForms.length; k++) {
                    allForms[k].classList.toggle('cn-auth-form--active', allForms[k].getAttribute('data-auth-form') === tabName);
                }
            });
        }

        // Email login
        document.getElementById('cn-login-submit').addEventListener('click', handleEmailLogin);
        document.getElementById('cn-login-password').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleEmailLogin();
        });

        // Email signup
        document.getElementById('cn-signup-submit').addEventListener('click', handleEmailSignup);
        document.getElementById('cn-signup-password2').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleEmailSignup();
        });

        // Google login
        document.getElementById('cn-google-login').addEventListener('click', handleGoogleLogin);
    }

    function openAuthModal() {
        var overlay = document.getElementById('cn-auth-overlay');
        if (overlay) overlay.classList.add('cn-auth-overlay--open');
    }

    function closeAuthModal() {
        var overlay = document.getElementById('cn-auth-overlay');
        if (overlay) overlay.classList.remove('cn-auth-overlay--open');
        // Clear errors
        var loginErr = document.getElementById('cn-login-error');
        var signupErr = document.getElementById('cn-signup-error');
        if (loginErr) loginErr.textContent = '';
        if (signupErr) signupErr.textContent = '';
    }

    function handleEmailLogin() {
        if (!auth) return;
        var email = document.getElementById('cn-login-email').value.trim();
        var password = document.getElementById('cn-login-password').value;
        var errorEl = document.getElementById('cn-login-error');
        var btn = document.getElementById('cn-login-submit');
        if (!email || !password) return;

        btn.disabled = true;
        errorEl.textContent = '';

        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function () {
            return auth.signInWithEmailAndPassword(email, password);
        }).then(function () {
            showToast(t('auth_success_login'), false);
            closeAuthModal();
            btn.disabled = false;
        }).catch(function (err) {
            btn.disabled = false;
            var msg = t('auth_error_generic');
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                msg = t('auth_error_wrong_password');
            } else if (err.code === 'auth/invalid-email') {
                msg = t('auth_error_invalid_email');
            }
            errorEl.textContent = msg;
        });
    }

    function handleEmailSignup() {
        if (!auth) return;
        var email = document.getElementById('cn-signup-email').value.trim();
        var password = document.getElementById('cn-signup-password').value;
        var password2 = document.getElementById('cn-signup-password2').value;
        var errorEl = document.getElementById('cn-signup-error');
        var btn = document.getElementById('cn-signup-submit');
        if (!email || !password) return;

        if (password !== password2) {
            errorEl.textContent = t('auth_error_password_mismatch');
            return;
        }
        if (password.length < 6) {
            errorEl.textContent = t('auth_error_weak_password');
            return;
        }

        btn.disabled = true;
        errorEl.textContent = '';

        auth.createUserWithEmailAndPassword(email, password).then(function () {
            // Increment registered_users counter
            if (db) {
                db.collection('site_stats').doc('counters').set({
                    registered_users: firebase.firestore.FieldValue.increment(1)
                }, { merge: true }).catch(function () { });
            }
            showToast(t('auth_success_signup'), false);
            closeAuthModal();
            btn.disabled = false;
        }).catch(function (err) {
            btn.disabled = false;
            var msg = t('auth_error_generic');
            if (err.code === 'auth/email-already-in-use') {
                msg = t('auth_error_email_in_use');
            } else if (err.code === 'auth/invalid-email') {
                msg = t('auth_error_invalid_email');
            } else if (err.code === 'auth/weak-password') {
                msg = t('auth_error_weak_password');
            }
            errorEl.textContent = msg;
        });
    }

    function handleGoogleLogin() {
        if (!auth) {
            showToast('Connexion Google indisponible : Firebase Auth n’a pas démarré. Recharge la page.', true);
            return;
        }
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function () {
            return auth.signInWithPopup(provider);
        }).then(function (result) {
            // Check if new user
            if (result.additionalUserInfo && result.additionalUserInfo.isNewUser && db) {
                db.collection('site_stats').doc('counters').set({
                    registered_users: firebase.firestore.FieldValue.increment(1)
                }, { merge: true }).catch(function () { });
            }
            showToast(t('auth_success_login'), false);
            closeAuthModal();
        }).catch(function (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                var messages = {
                    'auth/unauthorized-domain': 'Domaine non autorisé par Firebase. Autorise jira44.github.io dans Authentication > Settings > Authorized domains.',
                    'auth/operation-not-allowed': 'La connexion Google n’est pas activée dans Firebase Authentication.',
                    'auth/popup-blocked': 'La fenêtre Google a été bloquée. Autorise les popups pour ce site et réessaie.',
                    'auth/network-request-failed': 'Connexion réseau impossible pendant la connexion Google. Réessaie.',
                    'auth/too-many-requests': 'Trop de tentatives. Réessaie un peu plus tard.'
                };
                console.error('[Community] Google sign-in failed:', err.code, err.message);
                showToast(messages[err.code] || (t('auth_error_generic') + ' (' + (err.code || 'auth/error') + ')'), true);
            }
        });
    }

    // --- Visitor Tracking ---
    function trackVisit() {
        if (!db) return;

        if (sessionStorage.getItem('cn_visit_tracked')) return;
        sessionStorage.setItem('cn_visit_tracked', '1');

        var raw = [
            navigator.userAgent || '',
            screen.width + 'x' + screen.height,
            Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            navigator.language || ''
        ].join('|');

        var hash = 0;
        for (var i = 0; i < raw.length; i++) {
            var c = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + c;
            hash |= 0;
        }
        var fingerprint = 'v_' + Math.abs(hash).toString(36);

        var countersRef = db.collection('site_stats').doc('counters');
        countersRef.set({
            total_visits: firebase.firestore.FieldValue.increment(1)
        }, { merge: true }).catch(function () { });

        var visitorRef = db.collection('visitors').doc(fingerprint);
        visitorRef.get().then(function (doc) {
            if (doc.exists) {
                visitorRef.update({
                    last_visit: firebase.firestore.FieldValue.serverTimestamp(),
                    visit_count: firebase.firestore.FieldValue.increment(1)
                }).catch(function () { });
            } else {
                visitorRef.set({
                    first_visit: firebase.firestore.FieldValue.serverTimestamp(),
                    last_visit: firebase.firestore.FieldValue.serverTimestamp(),
                    visit_count: 1
                }).catch(function () { });
                countersRef.set({
                    unique_visitors: firebase.firestore.FieldValue.increment(1)
                }, { merge: true }).catch(function () { });
            }
        }).catch(function () { });
    }

    // --- Section Click Tracking ---
    function initSectionTracking() {
        document.addEventListener('click', function (e) {
            var card = e.target.closest('[data-section]');
            if (!card) return;
            var sectionId = card.getAttribute('data-section');
            if (!sectionId || !db) return;

            db.collection('section_clicks').doc(sectionId).set({
                clicks: firebase.firestore.FieldValue.increment(1),
                name: sectionId,
                last_clicked: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function () { });
        });
    }

    // --- Site Stats Section ---
    function injectStatsSection() {
        // Find the container to insert before the quick-actions or status-bar
        var container = document.querySelector('.container');
        if (!container) return;
        var statusBar = container.querySelector('.status-bar');
        if (!statusBar) return;

        var section = document.createElement('div');
        section.className = 'cn-stats-section';
        section.innerHTML =
            '<h2 class="cn-stats-title" data-i18n="stats_title">' + t('stats_title') + '</h2>' +
            '<div class="cn-stats-grid">' +
                '<div class="cn-stats-card">' +
                    '<div class="cn-stats-card-icon">\uD83D\uDC41</div>' +
                    '<div class="cn-stats-card-value" id="cn-stat-visits">-</div>' +
                    '<div class="cn-stats-card-label" data-i18n="stats_total_visits">' + t('stats_total_visits') + '</div>' +
                '</div>' +
                '<div class="cn-stats-card">' +
                    '<div class="cn-stats-card-icon">\uD83D\uDC65</div>' +
                    '<div class="cn-stats-card-value" id="cn-stat-unique">-</div>' +
                    '<div class="cn-stats-card-label" data-i18n="stats_unique_visitors">' + t('stats_unique_visitors') + '</div>' +
                '</div>' +
                '<div class="cn-stats-card">' +
                    '<div class="cn-stats-card-icon">\uD83D\uDC64</div>' +
                    '<div class="cn-stats-card-value" id="cn-stat-members">-</div>' +
                    '<div class="cn-stats-card-label" data-i18n="stats_registered_users">' + t('stats_registered_users') + '</div>' +
                '</div>' +
                '<div class="cn-stats-card">' +
                    '<div class="cn-stats-card-icon">\uD83D\uDFE2</div>' +
                    '<div class="cn-stats-card-value" id="cn-stat-online">-</div>' +
                    '<div class="cn-stats-card-label" data-i18n="stats_online_now">' + t('stats_online_now') + '</div>' +
                '</div>' +
                '<div class="cn-stats-card">' +
                    '<div class="cn-stats-card-icon">\u2B50</div>' +
                    '<div class="cn-stats-card-value" id="cn-stat-popular" style="font-size:1rem;">-</div>' +
                    '<div class="cn-stats-card-label" data-i18n="stats_most_popular">' + t('stats_most_popular') + '</div>' +
                '</div>' +
                '<div class="cn-stats-card">' +
                    '<div class="cn-stats-card-icon">\uD83D\uDCCB</div>' +
                    '<div class="cn-stats-card-value" id="cn-stat-sections">-</div>' +
                    '<div class="cn-stats-card-label" data-i18n="stats_total_sections">' + t('stats_total_sections') + '</div>' +
                '</div>' +
            '</div>';

        // Insert after status-bar
        statusBar.parentNode.insertBefore(section, statusBar.nextSibling);

        // Count sections
        var sectionCount = document.querySelectorAll('.menu-card').length;
        var sectionsEl = document.getElementById('cn-stat-sections');
        if (sectionsEl) sectionsEl.textContent = String(sectionCount);

        // Load stats
        loadSiteStats();
    }

    function loadSiteStats() {
        if (!db) return;

        // Listen to counters
        db.collection('site_stats').doc('counters').onSnapshot(function (doc) {
            if (!doc.exists) return;
            var data = doc.data();
            var visitsEl = document.getElementById('cn-stat-visits');
            var uniqueEl = document.getElementById('cn-stat-unique');
            var membersEl = document.getElementById('cn-stat-members');
            if (visitsEl) visitsEl.textContent = formatNumber(data.total_visits || 0);
            if (uniqueEl) uniqueEl.textContent = formatNumber(data.unique_visitors || 0);
            if (membersEl) membersEl.textContent = formatNumber(data.registered_users || 0);
        }, function () { });

        // Estimate online: visitors with last_visit < 5 min ago
        var fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        db.collection('visitors')
            .where('last_visit', '>', fiveMinAgo)
            .get()
            .then(function (snapshot) {
                var onlineEl = document.getElementById('cn-stat-online');
                if (onlineEl) onlineEl.textContent = String(Math.max(1, snapshot.size));
            }).catch(function () {
                var onlineEl = document.getElementById('cn-stat-online');
                if (onlineEl) onlineEl.textContent = '1';
            });

        // Top popular section
        db.collection('section_clicks')
            .orderBy('clicks', 'desc')
            .limit(1)
            .get()
            .then(function (snapshot) {
                var popularEl = document.getElementById('cn-stat-popular');
                if (!popularEl) return;
                if (snapshot.empty) {
                    popularEl.textContent = '-';
                } else {
                    var topDoc = snapshot.docs[0].data();
                    popularEl.textContent = topDoc.name || snapshot.docs[0].id;
                }
            }).catch(function () { });
    }

    // --- Footer ---
    function injectFooter() {
        var footer = document.createElement('div');
        footer.className = 'cn-footer';
        footer.innerHTML =
            '<span class="cn-footer-stat">' +
                '<span class="cn-stat-icon">\uD83D\uDC41</span> ' +
                '<span data-i18n="footer_visitors">' + t('footer_visitors') + '</span>: ' +
                '<span class="cn-stat-value" id="cn-visitors-count">-</span>' +
            '</span>' +
            '<span class="cn-footer-stat">' +
                '<span class="cn-stat-icon">\uD83D\uDC65</span> ' +
                '<span data-i18n="footer_members">' + t('footer_members') + '</span>: ' +
                '<span class="cn-stat-value" id="cn-members-count">-</span>' +
            '</span>' +
            '<span class="cn-footer-brand" data-i18n="footer_brand">' + t('footer_brand') + '</span>';
        document.body.appendChild(footer);

        if (db) {
            db.collection('site_stats').doc('counters').onSnapshot(function (doc) {
                if (doc.exists) {
                    var data = doc.data();
                    var visitors = document.getElementById('cn-visitors-count');
                    var members = document.getElementById('cn-members-count');
                    if (visitors) visitors.textContent = formatNumber(data.total_visits || 0);
                    if (members) members.textContent = formatNumber(data.registered_users || 0);
                }
            }, function () { });
        }
    }

    function formatNumber(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }

    // --- Toast ---
    function showToast(msg, isError) {
        var existing = document.querySelector('.cn-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'cn-toast' + (isError ? ' cn-toast--error' : '');
        toast.textContent = msg;
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('cn-toast--visible');
        });

        setTimeout(function () {
            toast.classList.remove('cn-toast--visible');
            setTimeout(function () { toast.remove(); }, 300);
        }, 2500);
    }

    // --- Chat Widget ---
    function injectChatWidget() {
        var fab = document.createElement('button');
        fab.className = 'cn-fab';
        fab.setAttribute('aria-label', 'Community');
        fab.innerHTML = '\uD83D\uDCAC';
        fab.addEventListener('click', togglePanel);
        document.body.appendChild(fab);

        var panel = document.createElement('div');
        panel.className = 'cn-panel';
        panel.id = 'cn-panel';
        panel.innerHTML = buildPanelHTML();
        document.body.appendChild(panel);

        var tabs = panel.querySelectorAll('.cn-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', handleTabClick);
        }

        var sendBtn = panel.querySelector('#cn-chat-send');
        var chatInput = panel.querySelector('#cn-chat-input');
        if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
        if (chatInput) {
            chatInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                }
            });
        }

        var suggestBtn = panel.querySelector('#cn-suggest-submit');
        if (suggestBtn) suggestBtn.addEventListener('click', submitSuggestion);

        panel.addEventListener('click', function (e) {
            var q = e.target.closest('.cn-faq-q');
            if (q) {
                var item = q.parentElement;
                item.classList.toggle('cn-faq-item--open');
            }
        });

        loadFAQ();
    }

    function buildPanelHTML() {
        return '' +
            '<div class="cn-panel-header">' +
                '<h3 data-i18n="panel_title">' + t('panel_title') + '</h3>' +
            '</div>' +
            '<div class="cn-tabs">' +
                '<button class="cn-tab cn-tab--active" data-tab="chat" data-i18n="tab_chat">' + t('tab_chat') + '</button>' +
                '<button class="cn-tab" data-tab="suggest" data-i18n="tab_suggestions">' + t('tab_suggestions') + '</button>' +
                '<button class="cn-tab" data-tab="faq" data-i18n="tab_faq">' + t('tab_faq') + '</button>' +
            '</div>' +
            '<div class="cn-tab-content cn-tab-content--active" data-content="chat">' +
                '<div class="cn-chat-messages" id="cn-chat-messages">' +
                    '<div class="cn-chat-empty" data-i18n="chat_empty">' + t('chat_empty') + '</div>' +
                '</div>' +
                '<div class="cn-chat-input" id="cn-chat-input-area" style="display:none;">' +
                    '<input type="text" id="cn-chat-input" maxlength="500" data-i18n="chat_placeholder" data-i18n-attr="placeholder" placeholder="' + t('chat_placeholder') + '">' +
                    '<button id="cn-chat-send">\u27A4</button>' +
                '</div>' +
                '<div class="cn-auth-notice" id="cn-auth-notice">' +
                    '<span class="cn-auth-icon">\uD83D\uDD12</span>' +
                    '<span data-i18n="chat_login_required">' + t('chat_login_required') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="cn-tab-content" data-content="suggest">' +
                '<div class="cn-suggest-form" id="cn-suggest-form">' +
                    '<label data-i18n="suggest_category_label">' + t('suggest_category_label') + '</label>' +
                    '<select id="cn-suggest-cat">' +
                        '<option value="bug" data-i18n="suggest_category_bug">' + t('suggest_category_bug') + '</option>' +
                        '<option value="feature" data-i18n="suggest_category_feature">' + t('suggest_category_feature') + '</option>' +
                        '<option value="ui" data-i18n="suggest_category_ui">' + t('suggest_category_ui') + '</option>' +
                        '<option value="content" data-i18n="suggest_category_content">' + t('suggest_category_content') + '</option>' +
                        '<option value="other" data-i18n="suggest_category_other">' + t('suggest_category_other') + '</option>' +
                    '</select>' +
                    '<label data-i18n="suggest_rating_label">' + t('suggest_rating_label') + '</label>' +
                    '<div class="cn-stars">' +
                        '<input type="radio" name="cn-rating" id="cn-r5" value="5"><label for="cn-r5">\u2605</label>' +
                        '<input type="radio" name="cn-rating" id="cn-r4" value="4"><label for="cn-r4">\u2605</label>' +
                        '<input type="radio" name="cn-rating" id="cn-r3" value="3" checked><label for="cn-r3">\u2605</label>' +
                        '<input type="radio" name="cn-rating" id="cn-r2" value="2"><label for="cn-r2">\u2605</label>' +
                        '<input type="radio" name="cn-rating" id="cn-r1" value="1"><label for="cn-r1">\u2605</label>' +
                    '</div>' +
                    '<label data-i18n="suggest_message_label">' + t('suggest_message_label') + '</label>' +
                    '<textarea id="cn-suggest-msg" rows="3" maxlength="1000" data-i18n="suggest_message_placeholder" data-i18n-attr="placeholder" placeholder="' + t('suggest_message_placeholder') + '"></textarea>' +
                    '<button class="cn-btn-submit" id="cn-suggest-submit" data-i18n="suggest_submit">' + t('suggest_submit') + '</button>' +
                '</div>' +
            '</div>' +
            '<div class="cn-tab-content" data-content="faq">' +
                '<div class="cn-faq-list" id="cn-faq-list">' +
                    '<div class="cn-faq-empty" data-i18n="faq_empty">' + t('faq_empty') + '</div>' +
                '</div>' +
            '</div>';
    }

    function togglePanel() {
        panelOpen = !panelOpen;
        var panel = document.getElementById('cn-panel');
        var fab = document.querySelector('.cn-fab');
        if (panel) panel.classList.toggle('cn-panel--open', panelOpen);
        if (fab) fab.classList.toggle('cn-fab--open', panelOpen);

        if (panelOpen && !chatUnsubscribe) {
            subscribeChatMessages();
        }
    }

    function handleTabClick(e) {
        var tabName = e.target.getAttribute('data-tab');
        var panel = document.getElementById('cn-panel');
        if (!panel) return;

        var tabs = panel.querySelectorAll('.cn-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('cn-tab--active', tabs[i].getAttribute('data-tab') === tabName);
        }

        var contents = panel.querySelectorAll('.cn-tab-content');
        for (var j = 0; j < contents.length; j++) {
            contents[j].classList.toggle('cn-tab-content--active', contents[j].getAttribute('data-content') === tabName);
        }
    }

    // --- Auth UI update ---
    function updateChatAuth() {
        var inputArea = document.getElementById('cn-chat-input-area');
        var authNotice = document.getElementById('cn-auth-notice');
        if (currentUser) {
            if (inputArea) inputArea.style.display = 'flex';
            if (authNotice) authNotice.style.display = 'none';
        } else {
            if (inputArea) inputArea.style.display = 'none';
            if (authNotice) authNotice.style.display = 'flex';
        }
    }

    // --- Chat ---
    function subscribeChatMessages() {
        if (!db) return;
        chatUnsubscribe = db.collection('community_chat')
            .orderBy('created_at', 'asc')
            .limitToLast(50)
            .onSnapshot(function (snapshot) {
                renderChatMessages(snapshot.docs);
            }, function (err) {
                console.warn('[Community] Chat listener error:', err);
            });
    }

    function renderChatMessages(docs) {
        var container = document.getElementById('cn-chat-messages');
        if (!container) return;

        if (docs.length === 0) {
            container.innerHTML = '<div class="cn-chat-empty" data-i18n="chat_empty">' + t('chat_empty') + '</div>';
            return;
        }

        var html = '';
        var myUid = currentUser ? currentUser.uid : null;
        for (var i = 0; i < docs.length; i++) {
            var d = docs[i].data();
            var isSelf = myUid && d.author_uid === myUid;
            var isBot = d.type === 'bot';
            var timeStr = d.created_at ? formatTime(d.created_at.toDate()) : '';
            var msgClass = isBot ? 'cn-msg cn-msg--bot' : (isSelf ? 'cn-msg cn-msg--self' : 'cn-msg cn-msg--other');
            html +=
                '<div class="' + msgClass + '">' +
                    (!isSelf ? '<div class="cn-msg-author">' + escapeHTML(d.author_name || 'Anon') + '</div>' : '') +
                    '<div>' + escapeHTML(d.message || '') + '</div>' +
                    '<div class="cn-msg-time">' + timeStr + '</div>' +
                '</div>';
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    function sendChatMessage() {
        if (!currentUser || !db) return;
        var input = document.getElementById('cn-chat-input');
        if (!input) return;
        var msg = input.value.trim();
        if (!msg) return;

        input.value = '';

        db.collection('community_chat').add({
            author_uid: currentUser.uid,
            author_name: currentUser.displayName || currentUser.email || 'User',
            message: msg,
            type: 'message',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
            // Check for auto-response
            handleAutoResponse(msg);
        }).catch(function (err) {
            console.error('[Community] Chat send error:', err.code, err.message);
            if (err.code === 'permission-denied') {
                showToast('Acces refuse. Verifiez les regles Firestore.', true);
            } else if (err.code === 'unavailable') {
                showToast('Firebase indisponible. Verifiez votre connexion.', true);
            } else {
                showToast(t('toast_error') + ' (' + (err.code || 'unknown') + ')', true);
            }
        });
    }

    // --- Auto-Responses ---
    function handleAutoResponse(message) {
        if (!db) return;
        var msgLower = message.toLowerCase();

        // Check if it looks like a question
        var isQuestion = msgLower.indexOf('?') !== -1 ||
            msgLower.indexOf('comment') === 0 ||
            msgLower.indexOf('how') === 0 ||
            msgLower.indexOf('what') === 0 ||
            msgLower.indexOf('qu\'est') === 0 ||
            msgLower.indexOf('c\'est quoi') !== -1 ||
            msgLower.indexOf('where') === 0 ||
            msgLower.indexOf('ou ') === 0;

        if (!isQuestion) return;

        for (var i = 0; i < AUTO_RESPONSES.length; i++) {
            var rule = AUTO_RESPONSES[i];
            for (var j = 0; j < rule.keywords.length; j++) {
                if (msgLower.indexOf(rule.keywords[j]) !== -1) {
                    var response = t(rule.responseKey);
                    // Post bot response with small delay
                    setTimeout(function (resp) {
                        db.collection('community_chat').add({
                            author_uid: 'bot',
                            author_name: 'SupaChess Bot',
                            message: resp,
                            type: 'bot',
                            created_at: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(function () { });
                    }, 800, response);
                    return;
                }
            }
        }
    }

    // --- Suggestions ---
    function submitSuggestion() {
        if (!db) return;
        var catEl = document.getElementById('cn-suggest-cat');
        var msgEl = document.getElementById('cn-suggest-msg');
        var btn = document.getElementById('cn-suggest-submit');
        if (!catEl || !msgEl || !btn) return;

        var msg = msgEl.value.trim();
        if (!msg) return;

        var rating = 3;
        var checked = document.querySelector('input[name="cn-rating"]:checked');
        if (checked) rating = parseInt(checked.value, 10);

        btn.disabled = true;
        btn.textContent = t('suggest_sending');

        db.collection('suggestions').add({
            author_uid: currentUser ? currentUser.uid : null,
            author_name: currentUser ? (currentUser.displayName || currentUser.email) : 'Anonymous',
            category: catEl.value,
            message: msg,
            rating: rating,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
            showToast(t('toast_feedback_sent'), false);
            msgEl.value = '';
            btn.disabled = false;
            btn.textContent = t('suggest_submit');
            var r3 = document.getElementById('cn-r3');
            if (r3) r3.checked = true;
        }).catch(function (err) {
            console.error('[Community] Suggestion send error:', err.code, err.message);
            if (err.code === 'permission-denied') {
                showToast('Acces refuse. Connectez-vous ou verifiez les regles Firestore.', true);
            } else if (err.code === 'unavailable') {
                showToast('Firebase indisponible. Verifiez votre connexion.', true);
            } else {
                showToast(t('toast_error') + ' (' + (err.code || 'unknown') + ')', true);
            }
            btn.disabled = false;
            btn.textContent = t('suggest_submit');
        });
    }

    // --- FAQ ---
    function loadFAQ() {
        if (!db) {
            renderLocalFAQ();
            return;
        }
        db.collection('faq').orderBy('order', 'asc').get().then(function (snapshot) {
            var list = document.getElementById('cn-faq-list');
            if (!list) return;
            if (snapshot.empty) {
                // Fallback to local FAQ
                renderLocalFAQ();
                return;
            }
            var lang = (window.ChessNovaI18n && window.ChessNovaI18n.getLang()) || 'en';
            var html = '';
            snapshot.forEach(function (doc) {
                var d = doc.data();
                var q = lang === 'fr' ? (d.question_fr || d.question_en) : (d.question_en || d.question_fr);
                var a = lang === 'fr' ? (d.answer_fr || d.answer_en) : (d.answer_en || d.answer_fr);
                html +=
                    '<div class="cn-faq-item">' +
                        '<div class="cn-faq-q">' + escapeHTML(q || '') + '</div>' +
                        '<div class="cn-faq-a">' + escapeHTML(a || '') + '</div>' +
                    '</div>';
            });
            list.innerHTML = html;
        }).catch(function () {
            renderLocalFAQ();
        });
    }

    function renderLocalFAQ() {
        var list = document.getElementById('cn-faq-list');
        if (!list) return;
        var html = '';
        for (var i = 1; i <= 5; i++) {
            var q = t('faq_local_' + i + '_q');
            var a = t('faq_local_' + i + '_a');
            if (q && q !== 'faq_local_' + i + '_q') {
                html +=
                    '<div class="cn-faq-item">' +
                        '<div class="cn-faq-q">' + escapeHTML(q) + '</div>' +
                        '<div class="cn-faq-a">' + escapeHTML(a) + '</div>' +
                    '</div>';
            }
        }
        if (html) {
            list.innerHTML = html;
        }
    }

    // --- Helpers ---
    function t(key) {
        if (window.ChessNovaI18n && window.ChessNovaI18n.t) {
            return window.ChessNovaI18n.t(key);
        }
        return key;
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatTime(date) {
        if (!date) return '';
        var now = new Date();
        var diff = now - date;
        if (diff < 60000) return '<1m';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
        return date.toLocaleDateString();
    }

    // ============================================================
    // --- Presence ---
    // ============================================================

    function startPresence(user) {
        if (!db) return;
        myStatus = 'dispo';
        writePresence(user, myStatus);

        // Heartbeat every 60s
        if (presenceInterval) clearInterval(presenceInterval);
        presenceInterval = setInterval(function () {
            if (currentUser && myStatus !== 'invisible') {
                db.collection('presence').doc(currentUser.uid).set({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(function () {});
            }
        }, 60000);

        // Set offline on page unload
        window.addEventListener('beforeunload', handleBeforeUnload);
    }

    function handleBeforeUnload() {
        if (currentUser && db) {
            // Use synchronous-compatible approach (navigator.sendBeacon not available for Firestore)
            // Best effort — may not always fire
            setPresenceStatus('offline');
        }
    }

    function stopPresence() {
        if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
        window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    function writePresence(user, status) {
        if (!db || !user) return Promise.resolve();
        var data = {
            uid: user.uid,
            displayName: user.displayName || user.email || 'User',
            status: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            page: window.location.pathname
        };
        return db.collection('presence').doc(user.uid).set(data, { merge: true }).catch(function () {});
    }

    function setPresenceStatus(status) {
        if (!db || !currentUser) return Promise.resolve();
        myStatus = status;
        return db.collection('presence').doc(currentUser.uid).set({
            status: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function () {});
    }

    // ============================================================
    // --- Online Players Panel ---
    // ============================================================

    function injectPlayersPanel() {
        var panel = document.createElement('div');
        panel.className = 'cn-players-panel';
        panel.id = 'cn-players-panel';
        panel.innerHTML =
            '<div class="cn-players-panel-header">' +
                '<span style="color:#eee;font-size:13px;font-weight:600;">Joueurs en ligne</span>' +
                '<span id="cn-players-count">0</span>' +
            '</div>' +
            '<div class="cn-status-btns" id="cn-status-btns">' +
                '<button class="cn-status-btn cn-status-btn--active" data-status="dispo">&#x1F7E2; Dispo</button>' +
                '<button class="cn-status-btn" data-status="occupe">&#x1F7E1; Occup&eacute;</button>' +
                '<button class="cn-status-btn" data-status="invisible">&#x26AB; Invisible</button>' +
            '</div>' +
            '<div class="cn-players-list" id="cn-players-list">' +
                '<div class="cn-players-empty">Chargement...</div>' +
            '</div>';

        document.body.appendChild(panel);

        // Status button clicks
        var btns = panel.querySelectorAll('.cn-status-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', handleStatusBtnClick);
        }

        // Close when clicking outside
        document.addEventListener('click', function (e) {
            if (!playersOpen) return;
            var panel = document.getElementById('cn-players-panel');
            var bar = document.getElementById('cn-auth-bar');
            if (panel && !panel.contains(e.target) && bar && !bar.contains(e.target)) {
                closePlayersPanel();
            }
        });
    }

    function handleStatusBtnClick(e) {
        var status = e.target.getAttribute('data-status');
        if (!status) return;

        // Update active button
        var btns = document.querySelectorAll('#cn-status-btns .cn-status-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('cn-status-btn--active', btns[i].getAttribute('data-status') === status);
        }

        setPresenceStatus(status).then(function () {
            if (status !== 'invisible') {
                loadOnlinePlayers(); // Refresh list
            } else {
                var list = document.getElementById('cn-players-list');
                if (list) list.innerHTML = '<div class="cn-players-empty">Mode invisible actif</div>';
            }
        });
    }

    function togglePlayersPanel() {
        playersOpen = !playersOpen;
        var panel = document.getElementById('cn-players-panel');
        if (panel) panel.classList.toggle('cn-players-panel--open', playersOpen);
        if (playersOpen) loadOnlinePlayers();
    }

    function closePlayersPanel() {
        playersOpen = false;
        var panel = document.getElementById('cn-players-panel');
        if (panel) panel.classList.remove('cn-players-panel--open');
    }

    function loadOnlinePlayers() {
        if (!db) return;
        var fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        db.collection('presence')
            .where('lastSeen', '>', fiveMinAgo)
            .get()
            .then(function (snapshot) {
                var list = document.getElementById('cn-players-list');
                var countEl = document.getElementById('cn-players-count');
                if (!list) return;

                var players = [];
                snapshot.forEach(function (doc) {
                    var d = doc.data();
                    if (d.status !== 'invisible') {
                        players.push(d);
                    }
                });

                if (countEl) countEl.textContent = players.length;

                if (players.length === 0) {
                    list.innerHTML = '<div class="cn-players-empty">Aucun joueur en ligne</div>';
                    return;
                }

                var html = '';
                for (var i = 0; i < players.length; i++) {
                    var p = players[i];
                    var dotClass = p.status === 'occupe' ? 'cn-status-dot--occupe' : 'cn-status-dot--dispo';
                    var isSelf = currentUser && p.uid === currentUser.uid;
                    html +=
                        '<div class="cn-player-row" data-uid="' + escapeHTML(p.uid || '') + '" data-name="' + escapeHTML(p.displayName || '') + '">' +
                            '<div class="cn-status-dot ' + dotClass + '"></div>' +
                            '<span class="cn-player-row-name">' + escapeHTML(p.displayName || 'Joueur') + (isSelf ? ' (moi)' : '') + '</span>' +
                        '</div>';
                }
                list.innerHTML = html;

                // Right-click context menus on player rows
                var rows = list.querySelectorAll('.cn-player-row');
                for (var j = 0; j < rows.length; j++) {
                    (function (row) {
                        var uid = row.getAttribute('data-uid');
                        var name = row.getAttribute('data-name');
                        // Don't allow challenging yourself
                        if (currentUser && uid === currentUser.uid) return;
                        row.addEventListener('contextmenu', function (e) {
                            e.preventDefault();
                            showContextMenu(e.clientX, e.clientY, uid, name);
                        });
                    })(rows[j]);
                }
            }).catch(function (err) {
                console.warn('[Community] loadOnlinePlayers error:', err);
                var list = document.getElementById('cn-players-list');
                if (list) list.innerHTML = '<div class="cn-players-empty">Erreur de chargement</div>';
            });
    }

    // ============================================================
    // --- Context Menu ---
    // ============================================================

    function showContextMenu(x, y, targetUid, targetName) {
        removeContextMenu();

        var menu = document.createElement('div');
        menu.className = 'cn-context-menu';
        menu.id = 'cn-context-menu';

        var options = [
            { label: '&#x1F3AF; D\u00e9fier en Bullet (1+0)', tc: '1+0' },
            { label: '&#x26A1; D\u00e9fier en Blitz (3+2)',   tc: '3+2' },
            { label: '&#x1F550; 5 min',                        tc: '5+0' },
            { label: '&#x1F551; 10 min',                       tc: '10+0' }
        ];

        var html = '';
        for (var i = 0; i < options.length; i++) {
            html += '<button class="cn-context-menu-item" data-tc="' + options[i].tc + '">' + options[i].label + '</button>';
        }
        menu.innerHTML = html;

        // Position near cursor, keep on screen
        menu.style.left = Math.min(x, window.innerWidth - 210) + 'px';
        menu.style.top  = Math.min(y, window.innerHeight - 180) + 'px';

        document.body.appendChild(menu);

        var items = menu.querySelectorAll('.cn-context-menu-item');
        for (var j = 0; j < items.length; j++) {
            (function (item) {
                item.addEventListener('click', function () {
                    var tc = item.getAttribute('data-tc');
                    sendChallenge(targetUid, targetName, tc);
                    removeContextMenu();
                });
            })(items[j]);
        }

        // Close on next click/escape
        setTimeout(function () {
            document.addEventListener('click', removeContextMenu, { once: true });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') removeContextMenu();
            }, { once: true });
        }, 50);
    }

    function removeContextMenu() {
        var m = document.getElementById('cn-context-menu');
        if (m) m.remove();
    }

    // ============================================================
    // --- Challenges ---
    // ============================================================

    function sendChallenge(targetUid, targetName, timeControl) {
        if (!db || !currentUser) return;
        db.collection('challenges').add({
            from: currentUser.uid,
            fromName: currentUser.displayName || currentUser.email || 'User',
            to: targetUid,
            toName: targetName,
            timeControl: timeControl,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
            showToast('D\u00e9fi envoy\u00e9 \u00e0 ' + targetName + '!', false);
        }).catch(function (err) {
            console.error('[Community] sendChallenge error:', err);
            showToast('Erreur lors de l\'envoi du d\u00e9fi', true);
        });
    }

    function listenForChallenges(uid) {
        if (!db) return;
        stopChallengesListener();
        challengesUnsubscribe = db.collection('challenges')
            .where('to', '==', uid)
            .where('status', '==', 'pending')
            .onSnapshot(function (snapshot) {
                pendingChallenges = [];
                snapshot.forEach(function (doc) {
                    pendingChallenges.push({ id: doc.id, data: doc.data() });
                });
                updateAuthBar();
                if (pendingChallenges.length > 0 && !currentChallengePopup) {
                    showChallengePopup(pendingChallenges[0]);
                }
            }, function (err) {
                console.warn('[Community] challenges listener error:', err);
            });
    }

    function stopChallengesListener() {
        if (challengesUnsubscribe) { challengesUnsubscribe(); challengesUnsubscribe = null; }
        pendingChallenges = [];
    }

    function showChallengePopup(challenge) {
        removeChallengePopup();

        var d = challenge.data;
        var popup = document.createElement('div');
        popup.className = 'cn-challenge-popup';
        popup.id = 'cn-challenge-popup';
        popup.innerHTML =
            '<div class="cn-challenge-popup-title">&#x1F3AF; D\u00e9fi re\u00e7u !</div>' +
            '<div class="cn-challenge-popup-body">' +
                '<strong>' + escapeHTML(d.fromName || 'Quelqu\'un') + '</strong> vous d\u00e9fie en <strong>' + escapeHTML(d.timeControl || '?') + '</strong>' +
            '</div>' +
            '<div class="cn-challenge-popup-btns">' +
                '<button class="cn-challenge-accept" id="cn-challenge-accept">Accepter</button>' +
                '<button class="cn-challenge-decline" id="cn-challenge-decline">D\u00e9cliner</button>' +
            '</div>';

        document.body.appendChild(popup);
        currentChallengePopup = challenge.id;

        requestAnimationFrame(function () {
            popup.classList.add('cn-challenge-popup--open');
        });

        document.getElementById('cn-challenge-accept').addEventListener('click', function () {
            respondChallenge(challenge.id, 'accepted');
        });
        document.getElementById('cn-challenge-decline').addEventListener('click', function () {
            respondChallenge(challenge.id, 'declined');
        });
    }

    function removeChallengePopup() {
        var p = document.getElementById('cn-challenge-popup');
        if (p) p.remove();
        currentChallengePopup = null;
    }

    function respondChallenge(challengeId, response) {
        if (!db) return;
        db.collection('challenges').doc(challengeId).set({
            status: response
        }, { merge: true }).catch(function () {});

        removeChallengePopup();

        if (response === 'accepted') {
            showToast('D\u00e9fi accept\u00e9 !', false);
        } else {
            showToast('D\u00e9fi d\u00e9clin\u00e9.', false);
        }

        // Show next challenge if any
        var remaining = pendingChallenges.filter(function (c) { return c.id !== challengeId; });
        if (remaining.length > 0) {
            setTimeout(function () { showChallengePopup(remaining[0]); }, 400);
        }
    }

    // --- Init ---
    function init() {
        // The shared tracker is loaded after community.js on some legacy pages.
        // Loading it here keeps usage and practice counts available site-wide.
        if (!window.ChessNovaProgress && !document.querySelector('script[data-chessnova-progress]')) {
            var progressScript = document.createElement('script');
            progressScript.src = 'shared/progress.js';
            progressScript.dataset.chessnovaProgress = 'true';
            document.body.appendChild(progressScript);
        }
        var firebaseReady = initFirebase();
        if (firebaseReady) {
            trackVisit();
        }
        injectAuthBar();
        injectAuthModal();
        injectPlayersPanel();
        injectStatsSection();
        initSectionTracking();
        injectFooter();
        injectChatWidget();
        updateChatAuth();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
