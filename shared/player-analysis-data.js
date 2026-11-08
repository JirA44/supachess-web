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
  const AID_OVERRIDE_KEY = "supachess_player_analysis_aid_overrides_v1";
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

  function normalizePlayerName(name) {
    return String(name || "").normalize("NFKC").trim().replace(/\\s+/g, " ").toLocaleLowerCase();
  }

  function normalizePlayerColor(color) {
    const value = String(color || "").trim().toLowerCase();
    if (["w", "white", "blanc", "blancs"].includes(value)) return "w";
    if (["b", "black", "noir", "noirs"].includes(value)) return "b";
    return null;
  }

  function resolveUserColor(game, headers) {
    const explicit = normalizePlayerColor(game && (game.userColor || game.playerColor || game.color));
    if (explicit) return explicit;
    const tagged = normalizePlayerColor(headers.SupaChessUserColor);
    if (tagged) return tagged;

    // Older saved games sometimes have playerName but no userColor. Recover the
    // side only when that name matches exactly one PGN player; never guess.
    const savedPlayerName = normalizePlayerName(game && (
      game.playerName || game.userName || game.profileName || game.accountName
    ));
    if (savedPlayerName) {
      const whiteMatches = savedPlayerName === normalizePlayerName(headers.White);
      const blackMatches = savedPlayerName === normalizePlayerName(headers.Black);
      if (whiteMatches !== blackMatches) return whiteMatches ? "w" : "b";
    }

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

  function classifyPhaseFromFen(fen, fullMoveNumber) {
    const fields = String(fen || "").split(" ");
    const placement = fields[0];
    if (!placement || !placement.includes("/")) return null;
    const pieces = placement.replace(/[1-8/]/g, "");
    const queens = (pieces.match(/[qQ]/g) || []).length;
    const rooksAndMinors = (pieces.match(/[rRnNbB]/g) || []).length;
    const moveNumber = Number(fields[5]) || Number(fullMoveNumber) || 0;
    // Conservatively call it an endgame only once queens are gone and few
    // rooks/minors remain; otherwise keep late, non-endgame play in the middlegame.
    if (moveNumber >= 12 && queens === 0 && rooksAndMinors <= 6) return "endgame";
    return moveNumber > 0 && moveNumber <= 12 ? "opening" : "middle";
  }

  function phasesFromParsedMoves(parsed, ChessClass, headers) {
    const ChessCtor = ChessClass || (typeof Chess === "function" ? Chess : null);
    if (!ChessCtor || !parsed || !Array.isArray(parsed.moves) || parsed.moves.length === 0) return [];
    try {
      const startFen = headers && headers.FEN;
      const replay = startFen ? new ChessCtor(startFen) : new ChessCtor();
      return parsed.moves.map((move, index) => {
        const fullMoveNumber = Math.floor(index / 2) + 1;
        const phase = classifyPhaseFromFen(replay.fen(), fullMoveNumber);
        let replayed = null;
        if (move && move.from && move.to) {
          try {
            replayed = replay.move({ from: move.from, to: move.to, promotion: move.promotion });
          } catch (_) {}
        }
        if (!replayed && move && move.san) {
          try { replayed = replay.move(move.san); } catch (_) {}
        }
        return phase;
      });
    } catch (_) {
      return [];
    }
  }

  function normalizePhase(phase) {
    const value = String(phase || "").trim().toLowerCase();
    if (["opening", "ouverture"].includes(value)) return "opening";
    if (["middle", "middlegame", "milieu", "milieu de jeu"].includes(value)) return "middle";
    if (["endgame", "finale", "end"].includes(value)) return "endgame";
    return null;
  }

  function resultForPlayer(result, color) {
    if (result === "1/2-1/2") return "draw";
    if (result !== "1-0" && result !== "0-1") return "unfinished";
    const whiteWon = result === "1-0";
    return (color === "w" ? whiteWon : !whiteWon) ? "win" : "loss";
  }

  function parseAidFlag(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number" && (value === 0 || value === 1)) return value === 1;
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui", "used", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "non", "unused", "inactive"].includes(normalized)) return false;
    return null;
  }

  function resolveTrainingAidsEvidence(raw, headers, grades) {
    const explicit = [
      raw && raw.trainingAidsUsed,
      headers && headers.SupaChessTrainingAidsUsed,
      headers && headers.TrainingAidsUsed,
    ];
    for (const value of explicit) {
      const parsed = parseAidFlag(value);
      if (parsed !== null) return { value: parsed, source: "Indication explicite de la partie" };
    }

    const unassisted = parseAidFlag(
      raw && raw.unassistedMode !== undefined ? raw.unassistedMode :
      headers && headers.SupaChessUnassistedMode
    );
    if (unassisted === true) return { value: false, source: "Mode sans aide enregistré" };

    const stats = raw && raw.stats && typeof raw.stats === "object" ? raw.stats : {};
    const aidInterventions = ["intercepts", "forced"].some((key) => Number(stats[key]) > 0);
    if (aidInterventions) return { value: true, source: "Intervention du coach enregistrée" };

    const gradeList = Array.from(grades.values());
    if (gradeList.some((grade) => grade && grade.noTrainingAids === false)) {
      return { value: true, source: "Aide détectée sur un demi-coup" };
    }
    if (gradeList.length > 0 && gradeList.length === grades.size &&
        gradeList.every((grade) => grade && grade.noTrainingAids === true)) {
      return { value: false, source: "Tous les demi-coups suivis sans aide" };
    }
    return { value: null, source: "Preuve insuffisante" };
  }

  function resolveTrainingAidsUsed(raw, headers, grades) {
    return resolveTrainingAidsEvidence(raw, headers, grades).value;
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
    const trainingAidsEvidence = resolveTrainingAidsEvidence(raw, headers, grades);
    const trainingAidsUsed = trainingAidsEvidence.value;
    const parsedPhases = phasesFromParsedMoves(parsed, ChessClass, headers);
    const movesFromStoredGrades = Array.from(grades.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ply, grade]) => {
        const category = categoryFor(grade);
        const rating = ratingFor(category);
        const side = grade.color === "w" || grade.color === "b"
          ? grade.color
          : (ply % 2 === 1 ? "w" : "b");
        return {
          ply,
          color: side,
          moveNum: Math.ceil(ply / 2),
          san: String(grade.san || "?"),
          rating,
          quality: GRADE_LABELS[category],
          category,
          rated: rating !== null,
          lossCp: Number.isFinite(Number(grade.lossCp)) ? Number(grade.lossCp) : null,
          tactical: [],
          phase: normalizePhase(grade.phase) || classifyPhaseFromFen(grade.fen || grade.beforeFen || grade.positionFen, Math.ceil(ply / 2)),
        };
      });
    const moves = parsed.moves.length
      ? parsed.moves.map((move, indexInGame) => {
          const ply = indexInGame + 1;
          const side = indexInGame % 2 === 0 ? "w" : "b";
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
            phase: parsedPhases[indexInGame] || normalizePhase(move && move.phase) || null,
          };
        }).filter(Boolean)
      : movesFromStoredGrades;
    const ratedMovesByColor = {
      w: moves.filter((move) => move.color === "w" && move.rated),
      b: moves.filter((move) => move.color === "b" && move.rated),
    };
    const averageRatingByColor = Object.fromEntries(["w", "b"].map((side) => {
      const sideMoves = ratedMovesByColor[side];
      return [side, sideMoves.length ? sideMoves.reduce((sum, move) => sum + move.rating, 0) / sideMoves.length : null];
    }));
    const ratedMoves = color ? ratedMovesByColor[color] : [];
    const averageRating = color ? averageRatingByColor[color] : null;
    const opponentColor = color === "w" ? "b" : color === "b" ? "w" : null;
    const opponent = raw.opponent || raw.engineName ||
      (opponentColor === "w" ? headers.White : opponentColor === "b" ? headers.Black : "") ||
      "Partie locale";
    const playerNameForSide = (side) => {
      if (color === side) return "Moi";
      const headerName = side === "w" ? headers.White : headers.Black;
      if (headerName && !/^(?:joueur|player)$/i.test(headerName)) return headerName;
      if (opponentColor === side) return opponent;
      return headerName || "";
    };
    const whitePlayer = playerNameForSide("w");
    const blackPlayer = playerNameForSide("b");
    const pgnResult = headers.Result || raw.result || "*";
    const accuracyByColor = {
      w: raw.accuracyW == null || raw.accuracyW === "" ? null : Number(raw.accuracyW),
      b: raw.accuracyB == null || raw.accuracyB === "" ? null : Number(raw.accuracyB),
    };
    const userAccuracy = color ? accuracyByColor[color] : null;
    const moveCount = parsed.moves.length || (Array.isArray(raw.moveGrades) ? raw.moveGrades.length : 0);
    return Object.assign({}, raw, {
      id: String(raw.id || "local-game-" + index),
      pgn,
      date: raw.date || raw.createdAt || "",
      result: resultForPlayer(pgnResult, color),
      pgnResult,
      userColor: color,
      trainingAidsUsed,
      trainingAidsEvidence: trainingAidsEvidence.source,
      whitePlayer,
      blackPlayer,
      opponent,
      moves: Math.ceil(moveCount / 2),
      avgRating: averageRating,
      avgRatingByColor: averageRatingByColor,
      accuracy: Number.isFinite(userAccuracy) ? userAccuracy : null,
      accuracyByColor: accuracyByColor,
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
    const color = resolveUserColor(raw, headers);
    const grades = new Map();
    (Array.isArray(raw.moveGrades) ? raw.moveGrades : []).forEach((grade) => {
      if (grade && Number.isFinite(Number(grade.ply))) grades.set(Number(grade.ply), grade);
    });
    const parsedPhases = phasesFromParsedMoves(parsed, ChessClass, headers);
    const history = parsed.moves.map((move, moveIndex) => {
      const ply = moveIndex + 1;
      const grade = grades.get(ply) || {};
      const category = categoryFor(grade);
      const rating = ratingFor(category);
      return {
        ply, color: move.color || (moveIndex % 2 === 0 ? "w" : "b"),
        moveNum: Math.floor(moveIndex / 2) + 1,
        san: move.san || String(grade.san || "?"),
        rating, quality: GRADE_LABELS[category], category, rated: rating !== null,
        lossCp: Number.isFinite(Number(grade.lossCp)) ? Number(grade.lossCp) : null,
        tactical: [], phase: normalizePhase(grade.phase) || parsedPhases[moveIndex] || null,
      };
    });
    const evidence = resolveTrainingAidsEvidence(raw, headers, grades);
    const whitePlayer = String(raw.white || headers.White || "Blancs");
    const blackPlayer = String(raw.black || headers.Black || "Noirs");
    return {
      ...raw,
      id: String(raw.id || "reviewed-pgn-" + index),
      pgn, userColor: color,
      whitePlayer, blackPlayer,
      date: raw.analyzedAt || raw.date || "",
      result: headers.Result || raw.result || "*",
      pgnResult: headers.Result || raw.result || "*",
      opponent: whitePlayer + " vs " + blackPlayer,
      moves: Math.ceil(parsed.moves.length / 2) || "?",
      avgRating: null, accuracy: null,
      history, moveGrades: Array.isArray(raw.moveGrades) ? raw.moveGrades : [],
      reviewedPGN: true,
      trainingAidsUsed: evidence.value,
      trainingAidsEvidence: evidence.source,
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
    const aidOverrides = (() => {
      try {
        const parsed = JSON.parse(store.getItem(AID_OVERRIDE_KEY) || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch (_) { return {}; }
    })();
    const localGames = playedRaw.map((game, index) => {
      const normalized = normalizePlayedGame(game, index, ChessClass);
      if (!normalized) return null;
      const override = aidOverrides[String(normalized.id)];
      if (override === true || override === false) {
        normalized.trainingAidsUsed = override;
        normalized.trainingAidsEvidence = "Statut confirmé par le joueur";
      }
      return normalized;
    }).filter(Boolean);
    const reviewedGames = readArray(store, REVIEWED_KEY)
      .map((game, index) => normalizeReviewedGame(game, index, ChessClass))
      .filter((game) => game && game.pgn);
    const reviewedByPgn = new Map(reviewedGames.map((game) => [normalizePgn(game.pgn), game]));
    localGames.forEach((game, index) => {
      const reviewed = reviewedByPgn.get(normalizePgn(game.pgn));
      const color = game.userColor;
      const localHasGrades = color && Array.isArray(game.history) &&
        game.history.some((move) => move.color === color && move.rated);
      const reviewedHasGrades = reviewed && Array.isArray(reviewed.moveGrades) &&
        reviewed.moveGrades.some((grade) => grade && ratingFor(categoryFor(grade)) !== null);
      if (!localHasGrades && reviewedHasGrades) {
        const enriched = normalizePlayedGame({
          ...game,
          moveGrades: reviewed.moveGrades,
          analysis: reviewed.analysis || game.analysis || null,
        }, index, ChessClass);
        if (enriched) {
          enriched.trainingAidsUsed = game.trainingAidsUsed;
          enriched.trainingAidsEvidence = game.trainingAidsEvidence;
          localGames[index] = enriched;
        }
      }
    });
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
    AID_OVERRIDE_KEY,
    GRADE_RATINGS,
    normalizePgn,
    parsePgnMoves,
    classifyPhaseFromFen,
    normalizePlayedGame,
    loadLocalAnalysis,
  };
});
