/* Read the SupaChess browser-local game history for PLAYER_ANALYSIS.html. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SupaPlayerAnalysisData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PLAYED_KEY = "supachess_games";
  const REVIEWED_KEY = "supachess_reviewed_pgns";
  const LEGACY_KEY = "chessnova_pro_data";
  const GRADE_RATINGS = {
    brilliant: 10,
    best: 9.5,
    "very-good": 10,
    good: 8,
    ok: 7,
    inaccuracy: 6,
    error: 3,
    mistake: 3,
    blunder: 1,
  };
  const GRADE_LABELS = {
    brilliant: "Brillant",
    best: "Meilleur coup",
    "very-good": "Très bon coup",
    good: "Bon coup",
    ok: "Coup OK",
    inaccuracy: "Imprécision",
    error: "Erreur",
    mistake: "Erreur",
    blunder: "Gaffe",
    unrated: "Non évalué",
  };

  function readArray(storage, key) {
    try {
      const parsed = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function readLegacyGames(storage) {
    try {
      const data = JSON.parse(storage.getItem(LEGACY_KEY) || "{}");
      return data && Array.isArray(data.allGamesHistory) ? data.allGamesHistory : [];
    } catch (_) {
      return [];
    }
  }

  function pgnHeaders(pgn) {
    const headers = {};
    String(pgn || "").replace(/^\s*\[([^\s]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm, (_, key, value) => {
      headers[key] = value.replace(/\\(["\\])/g, "$1");
      return "";
    });
    return headers;
  }

  function normalizePgn(pgn) {
    return String(pgn || "")
      .replace(/^\s*\[[^\]]*\]\s*$/gm, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/;[^\n]*/g, " ")
      .replace(/\([^()]*\)/g, " ")
      .replace(/\$\d+/g, " ")
      .replace(/\d+\.(?:\.\.)?/g, " ")
      .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function resolveUserColor(game, headers) {
    const explicit = game && game.userColor;
    if (explicit === "w" || explicit === "b") return explicit;
    const tagged = headers.SupaChessUserColor;
    if (tagged === "w" || tagged === "b") return tagged;
    if (/^(?:joueur|player)$/i.test(headers.White || "")) return "w";
    if (/^(?:joueur|player)$/i.test(headers.Black || "")) return "b";
    return null;
  }

  function categoryFor(grade) {
    const category = String(grade && (grade.category || grade.classification) || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(GRADE_RATINGS, category)) return category;
    const rawLoss = grade && grade.lossCp;
    if (rawLoss === null || rawLoss === undefined || rawLoss === "") return "unrated";
    const loss = Number(rawLoss);
    if (!Number.isFinite(loss)) return "unrated";
    if (loss >= 200) return "blunder";
    if (loss >= 60) return "mistake";
    if (loss >= 30) return "inaccuracy";
    if (loss <= 10 && grade && grade.bestMove) return "best";
    if (loss <= 10) return "very-good";
    if (loss <= 20) return "good";
    return "ok";
  }

  function ratingFor(category) {
    return Object.prototype.hasOwnProperty.call(GRADE_RATINGS, category) ? GRADE_RATINGS[category] : null;
  }

  function parsePgnMoves(pgn, ChessClass) {
    const ChessCtor = ChessClass || (typeof Chess === "function" ? Chess : null);
    if (!ChessCtor || !pgn) return { headers: pgnHeaders(pgn), moves: [] };
    try {
      const chess = new ChessCtor();
      const load = chess.load_pgn || chess.loadPgn;
      if (typeof load !== "function" || !load.call(chess, pgn, { sloppy: true })) {
        return { headers: pgnHeaders(pgn), moves: [] };
      }
      return {
        headers: typeof chess.header === "function" ? chess.header() : pgnHeaders(pgn),
        moves: chess.history({ verbose: true }) || [],
      };
    } catch (_) {
      return { headers: pgnHeaders(pgn), moves: [] };
    }
  }

  function resultForPlayer(result, color) {
    if (result === "1/2-1/2") return "draw";
    if (result !== "1-0" && result !== "0-1") return "unfinished";
    const whiteWon = result === "1-0";
    return (color === "w" ? whiteWon : !whiteWon) ? "win" : "loss";
  }

  function resolveTrainingAidsUsed(raw, headers, grades) {
    const values = [
      raw && raw.trainingAidsUsed,
      headers && headers.SupaChessTrainingAidsUsed,
      headers && headers.TrainingAidsUsed,
    ];
    for (const value of values) {
      if (typeof value === "boolean") return value;
      if (typeof value === "number" && (value === 0 || value === 1)) return value === 1;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "oui", "used", "active"].includes(normalized)) return true;
        if (["false", "0", "no", "non", "unused", "inactive"].includes(normalized)) return false;
      }
    }

    const aidTrackedGrades = Array.from(grades.values()).filter((grade) => typeof grade.noTrainingAids === "boolean");
    if (aidTrackedGrades.some((grade) => grade.noTrainingAids === false)) return true;
    if (aidTrackedGrades.length > 0 && aidTrackedGrades.length === grades.size &&
        aidTrackedGrades.every((grade) => grade.noTrainingAids === true)) return false;
    return null;
  }

  function normalizePlayedGame(raw, index, ChessClass) {
    if (!raw || typeof raw !== "object") return null;
    const pgn = String(raw.pgn || raw.PGN || "");
    const parsed = parsePgnMoves(pgn, ChessClass);
    const headers = Object.assign({}, parsed.headers, pgnHeaders(pgn));
    const color = resolveUserColor(raw, headers);
    const grades = new Map();
    (Array.isArray(raw.moveGrades) ? raw.moveGrades : []).forEach((grade) => {
      if (grade && Number.isFinite(Number(grade.ply))) grades.set(Number(grade.ply), grade);
    });
    const trainingAidsUsed = resolveTrainingAidsUsed(raw, headers, grades);
    const moves = parsed.moves.map((move, indexInGame) => {
      const ply = indexInGame + 1;
      const side = indexInGame % 2 === 0 ? "w" : "b";
      if (color && side !== color) return null;
      const grade = grades.get(ply) || {};
      const category = categoryFor(grade);
      const rating = ratingFor(category);
      return {
        ply,
        color: side,
        moveNum: Math.floor(indexInGame / 2) + 1,
        san: move && move.san ? move.san : String(grade.san || "?"),
        rating,
        quality: GRADE_LABELS[category],
        category,
        rated: rating !== null,
        lossCp: Number.isFinite(Number(grade.lossCp)) ? Number(grade.lossCp) : null,
        tactical: [],
      };
    }).filter(Boolean);
    const ratedMoves = moves.filter((move) => move.rated);
    const averageRating = ratedMoves.length
      ? ratedMoves.reduce((sum, move) => sum + move.rating, 0) / ratedMoves.length
      : null;
    const opponentColor = color === "w" ? "b" : color === "b" ? "w" : null;
    const opponent = raw.opponent || raw.engineName ||
      (opponentColor === "w" ? headers.White : opponentColor === "b" ? headers.Black : "") ||
      "Partie locale";
    const pgnResult = headers.Result || raw.result || "*";
    const accuracyValue = color === "w" ? raw.accuracyW : color === "b" ? raw.accuracyB : null;
    const userAccuracy = accuracyValue === null || accuracyValue === undefined || accuracyValue === "" ? null : Number(accuracyValue);
    const moveCount = parsed.moves.length || (Array.isArray(raw.moveGrades) ? raw.moveGrades.length : 0);
    return Object.assign({}, raw, {
      id: String(raw.id || "local-game-" + index),
      pgn,
      date: raw.date || raw.createdAt || "",
      result: resultForPlayer(pgnResult, color),
      pgnResult,
      userColor: color,
      trainingAidsUsed,
      opponent,
      moves: Math.ceil(moveCount / 2),
      avgRating: averageRating,
      accuracy: Number.isFinite(userAccuracy) ? userAccuracy : null,
      history: moves,
      detailedMoveCount: ratedMoves.length,
      sourceLabel: "Partie enregistrée sur cet appareil",
    });
  }

  function normalizeReviewedGame(raw, index, ChessClass) {
    if (!raw || typeof raw !== "object") return null;
    const pgn = String(raw.pgn || raw.PGN || "");
    const parsed = parsePgnMoves(pgn, ChessClass);
    const headers = Object.assign({}, parsed.headers, pgnHeaders(pgn));
    const playerNames = [raw.white || headers.White, raw.black || headers.Black].filter(Boolean);
    return {
      id: String(raw.id || "reviewed-pgn-" + index),
      pgn,
      date: raw.analyzedAt || raw.date || "",
      result: headers.Result || raw.result || "*",
      pgnResult: headers.Result || raw.result || "*",
      opponent: playerNames.length ? playerNames.join(" vs ") : "PGN analysé",
      moves: Math.ceil(parsed.moves.length / 2) || "?",
      avgRating: null,
      accuracy: null,
      history: null,
      reviewedPGN: true,
      analysis: raw.analysis || null,
      sourceLabel: "PGN analysé localement",
    };
  }

  function loadLocalAnalysis(storage, ChessClass) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store) {
      return { allGames: [], localGames: [], reviewedGames: [], playerMovesByGame: [], detailedMoveCount: 0, reviewedCount: 0 };
    }
    const currentPlayed = readArray(store, PLAYED_KEY);
    const playedRaw = currentPlayed.length ? currentPlayed : readLegacyGames(store);
    const localGames = playedRaw.map((game, index) => normalizePlayedGame(game, index, ChessClass)).filter(Boolean);
    const reviewedGames = readArray(store, REVIEWED_KEY)
      .map((game, index) => normalizeReviewedGame(game, index, ChessClass))
      .filter((game) => game && game.pgn);
    const seen = new Set(localGames.map((game) => normalizePgn(game.pgn)).filter(Boolean));
    const uniqueReviewed = reviewedGames.filter((game) => {
      const key = normalizePgn(game.pgn);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const playerMovesByGame = localGames.filter((game) => game.userColor === "w" || game.userColor === "b")
      .map((game) => game.history.filter((move) => move.color === game.userColor && move.rated))
      .filter((moves) => moves.length > 0);
    return {
      allGames: localGames.concat(uniqueReviewed),
      localGames,
      reviewedGames: uniqueReviewed,
      playerMovesByGame,
      detailedMoveCount: playerMovesByGame.reduce((sum, moves) => sum + moves.length, 0),
      detailedGameCount: playerMovesByGame.length,
      reviewedCount: uniqueReviewed.length,
    };
  }

  return {
    PLAYED_KEY,
    REVIEWED_KEY,
    GRADE_RATINGS,
    normalizePgn,
    parsePgnMoves,
    normalizePlayedGame,
    loadLocalAnalysis,
  };
});
