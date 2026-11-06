(function (root) {
  "use strict";

  const section = () => document.getElementById("puzzle-elo-ranking");
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function getLocalStats() {
    try {
      const value = typeof root.getSupaPuzzleRankStats === "function"
        ? root.getSupaPuzzleRankStats() : null;
      return value && typeof value === "object"
        ? value : { puzzlesSolved: 0, puzzleElo: 0, topPuzzles: [] };
    } catch (_) {
      return { puzzlesSolved: 0, puzzleElo: 0, topPuzzles: [] };
    }
  }

  function renderDiscoveredPuzzles() {
    const target = document.getElementById("puzzle-discovered-ranking");
    if (!target) return;
    const data = getLocalStats();
    const puzzles = (Array.isArray(data.topPuzzles) ? data.topPuzzles.slice() : [])
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)
        || String(a.title || "").localeCompare(String(b.title || ""), "fr"))
      .slice(0, 10);
    if (!puzzles.length) {
      target.innerHTML = '<p class="empty">Résous un puzzle pour commencer ton classement personnel.</p>';
      return;
    }
    target.innerHTML = '<ol class="puzzle-elo-list">' + puzzles.map((puzzle) => {
      const rating = Number.isSafeInteger(Number(puzzle.rating)) ? Number(puzzle.rating) : null;
      const title = escapeHtml(puzzle.title || ("Puzzle " + puzzle.id));
      const difficulty = rating === null ? "Cote indisponible"
        : (puzzle.estimated ? "Estimation " : "Cote puzzle ") + rating;
      const phase = escapeHtml(puzzle.phase || puzzle.theme || "");
      const url = "TRAINING_TACTICS.html?puzzle=" + encodeURIComponent(String(puzzle.id || ""));
      return '<li><a href="' + url + '">' + title + '</a><span class="puzzle-elo-meta"><strong>' +
        escapeHtml(difficulty) + '</strong>' + (phase ? " · " + phase : "") + '</span></li>';
    }).join("") + "</ol>";
  }

  function cleanName(value) {
    const name = String(value || "").replace(/[@<>]/g, "").replace(/[\r\n\t]/g, " ").trim().slice(0, 40);
    return name || "Joueur";
  }

  function renderPlayers(records) {
    const target = document.getElementById("puzzle-player-ranking");
    if (!target) return;
    const rows = (Array.isArray(records) ? records : [])
      .filter((row) => row && Number.isSafeInteger(Number(row.puzzleElo)) && Number(row.puzzleElo) >= 400)
      .sort((a, b) => Number(b.puzzleElo) - Number(a.puzzleElo)
        || Number(b.puzzlesSolved || 0) - Number(a.puzzlesSolved || 0)
        || String(a.displayName || "").localeCompare(String(b.displayName || ""), "fr"));
    if (!rows.length) {
      target.innerHTML = '<p class="empty">Aucun compte n’a encore enregistré de puzzle résolu avec une cote.</p>';
      return;
    }
    target.innerHTML = '<ol class="puzzle-player-list">' + rows.slice(0, 10).map((row) =>
      '<li><strong>' + escapeHtml(cleanName(row.displayName)) + '</strong>' +
      '<span><b>' + Number(row.puzzleElo) + '</b> cote maximale résolue · ' +
      Number(row.puzzlesSolved || 0) + ' puzzle(s)</span></li>'
    ).join("") + "</ol>";
  }

  async function syncCurrentPlayer(db, user) {
    if (!user || !db || !user.uid) return;
    const local = getLocalStats();
    const playerRef = db.collection("puzzle_leaderboard").doc(user.uid);
    const input = document.getElementById("challenge-player-name");
    const typedName = input && input.value && input.value.trim() !== "Joueur" ? input.value : "";
    const displayName = cleanName(typedName || user.displayName);
    const localRating = Number(local.puzzleElo) || 0;
    const localSolved = Number(local.puzzlesSolved) || 0;
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(playerRef);
      const previous = snapshot.exists ? (snapshot.data() || {}) : {};
      const bestRating = Math.max(Number(previous.puzzleElo) || 0, localRating);
      const puzzlesSolved = Math.max(Number(previous.puzzlesSolved) || 0, localSolved);
      if (!bestRating || !puzzlesSolved) return;
      const changed = !snapshot.exists
        || Number(previous.puzzleElo) !== Math.round(bestRating)
        || Number(previous.puzzlesSolved) !== Math.floor(puzzlesSolved)
        || cleanName(previous.displayName) !== displayName;
      if (!changed) return;
      transaction.set(playerRef, {
        displayName,
        puzzleElo: Math.round(bestRating),
        puzzlesSolved: Math.floor(puzzlesSolved),
        updatedAt: root.firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  async function loadPlayers(db) {
    const target = document.getElementById("puzzle-player-ranking");
    if (!target) return;
    target.setAttribute("aria-busy", "true");
    target.innerHTML = '<p class="empty">Chargement du classement communautaire…</p>';
    try {
      const snapshot = await db.collection("puzzle_leaderboard")
        .orderBy("puzzleElo", "desc").limit(100).get();
      renderPlayers(snapshot.docs.map((doc) => doc.data()));
    } catch (_) {
      target.innerHTML = '<p class="empty">Classement communautaire indisponible pour le moment. Les puzzles réussis restent visibles dans le classement personnel.</p>';
    } finally {
      target.removeAttribute("aria-busy");
    }
  }

  function showSignInMessage() {
    const target = document.getElementById("puzzle-player-ranking");
    if (target) target.innerHTML = '<p class="empty">Connecte-toi à ton compte pour consulter le classement communautaire. Le classement de tes puzzles reste disponible localement.</p>';
  }

  function init() {
    if (!section()) return;
    renderDiscoveredPuzzles();
    const firebase = root.firebase;
    if (!firebase || !firebase.auth || !firebase.firestore) {
      showSignInMessage();
      return;
    }
    try {
      const db = firebase.firestore();
      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          showSignInMessage();
          return;
        }
        try { await syncCurrentPlayer(db, user); } catch (_) {}
        await loadPlayers(db);
      });
      root.addEventListener("supa:puzzle-solved", async () => {
        renderDiscoveredPuzzles();
        const user = firebase.auth().currentUser;
        if (!user) return;
        try { await syncCurrentPlayer(db, user); } catch (_) {}
        await loadPlayers(db);
      });
      const nameInput = document.getElementById("challenge-player-name");
      if (nameInput) nameInput.addEventListener("change", async () => {
        const user = firebase.auth().currentUser;
        if (!user) return;
        try { await syncCurrentPlayer(db, user); } catch (_) {}
        await loadPlayers(db);
      });
    } catch (_) {
      showSignInMessage();
    }
  }

  root.SupaChessPuzzleEloRanking = { renderDiscoveredPuzzles, renderPlayers };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
