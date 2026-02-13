var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-2S523S/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.js
var ChessGame = class {
  static {
    __name(this, "ChessGame");
  }
  constructor(fen) {
    this.SQUARES = {
      a8: 0,
      b8: 1,
      c8: 2,
      d8: 3,
      e8: 4,
      f8: 5,
      g8: 6,
      h8: 7,
      a7: 16,
      b7: 17,
      c7: 18,
      d7: 19,
      e7: 20,
      f7: 21,
      g7: 22,
      h7: 23,
      a6: 32,
      b6: 33,
      c6: 34,
      d6: 35,
      e6: 36,
      f6: 37,
      g6: 38,
      h6: 39,
      a5: 48,
      b5: 49,
      c5: 50,
      d5: 51,
      e5: 52,
      f5: 53,
      g5: 54,
      h5: 55,
      a4: 64,
      b4: 65,
      c4: 66,
      d4: 67,
      e4: 68,
      f4: 69,
      g4: 70,
      h4: 71,
      a3: 80,
      b3: 81,
      c3: 82,
      d3: 83,
      e3: 84,
      f3: 85,
      g3: 86,
      h3: 87,
      a2: 96,
      b2: 97,
      c2: 98,
      d2: 99,
      e2: 100,
      f2: 101,
      g2: 102,
      h2: 103,
      a1: 112,
      b1: 113,
      c1: 114,
      d1: 115,
      e1: 116,
      f1: 117,
      g1: 118,
      h1: 119
    };
    this.board = new Array(128);
    this.turn = "w";
    this.castling = { w: 0, b: 0 };
    this.ep_square = -1;
    this.half_moves = 0;
    this.move_number = 1;
    this.history = [];
    this.load(fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  }
  load(fen) {
    const tokens = fen.split(/\s+/);
    const position = tokens[0];
    let square = 0;
    this.board = new Array(128);
    for (let i = 0; i < position.length; i++) {
      const piece = position.charAt(i);
      if (piece === "/") {
        square += 8;
      } else if ("12345678".indexOf(piece) !== -1) {
        square += parseInt(piece, 10);
      } else {
        const color = piece < "a" ? "w" : "b";
        this.board[square] = { type: piece.toLowerCase(), color };
        square++;
      }
    }
    this.turn = tokens[1];
    this.castling = { w: 0, b: 0 };
    if (tokens[2].indexOf("K") > -1) this.castling.w |= 1;
    if (tokens[2].indexOf("Q") > -1) this.castling.w |= 2;
    if (tokens[2].indexOf("k") > -1) this.castling.b |= 1;
    if (tokens[2].indexOf("q") > -1) this.castling.b |= 2;
    this.ep_square = tokens[3] === "-" ? -1 : this.SQUARES[tokens[3]];
    this.half_moves = parseInt(tokens[4], 10);
    this.move_number = parseInt(tokens[5], 10);
  }
  fen() {
    let empty = 0;
    let fen = "";
    for (let i = 0; i < 128; i++) {
      if (i & 136) {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        if (i < 119) fen += "/";
        i += 7;
        continue;
      }
      const piece = this.board[i];
      if (piece) {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        fen += piece.color === "w" ? piece.type.toUpperCase() : piece.type;
      } else {
        empty++;
      }
    }
    if (empty > 0) fen += empty;
    let castling = "";
    if (this.castling.w & 1) castling += "K";
    if (this.castling.w & 2) castling += "Q";
    if (this.castling.b & 1) castling += "k";
    if (this.castling.b & 2) castling += "q";
    const ep = this.ep_square === -1 ? "-" : this.algebraic(this.ep_square);
    return [fen, this.turn, castling || "-", ep, this.half_moves, this.move_number].join(" ");
  }
  algebraic(i) {
    const f = i & 15;
    const r = i >> 4;
    return "abcdefgh".charAt(f) + "87654321".charAt(r);
  }
  rank(i) {
    return i >> 4;
  }
  file(i) {
    return i & 15;
  }
  moves(options = {}) {
    const moves = [];
    const us = this.turn;
    const them = us === "w" ? "b" : "w";
    const PAWN_OFFSETS = {
      b: [16, 32, 17, 15],
      w: [-16, -32, -17, -15]
    };
    const PIECE_OFFSETS = {
      n: [-18, -33, -31, -14, 18, 33, 31, 14],
      b: [-17, -15, 17, 15],
      r: [-16, 1, 16, -1],
      q: [-17, -16, -15, 1, 17, 16, 15, -1],
      k: [-17, -16, -15, 1, 17, 16, 15, -1]
    };
    for (let i = 0; i < 128; i++) {
      if (i & 136) continue;
      const piece = this.board[i];
      if (!piece || piece.color !== us) continue;
      if (piece.type === "p") {
        const square = i + PAWN_OFFSETS[us][0];
        if (!this.board[square]) {
          moves.push(this.buildMove(i, square, piece));
          const square2 = i + PAWN_OFFSETS[us][1];
          if (us === "w" && this.rank(i) === 6 || us === "b" && this.rank(i) === 1) {
            if (!this.board[square2]) {
              moves.push(this.buildMove(i, square2, piece, { flags: "b" }));
            }
          }
        }
        for (let j = 2; j < 4; j++) {
          const sq = i + PAWN_OFFSETS[us][j];
          if (sq & 136) continue;
          if (this.board[sq] && this.board[sq].color === them) {
            moves.push(this.buildMove(i, sq, piece, { captured: this.board[sq] }));
          } else if (sq === this.ep_square) {
            moves.push(this.buildMove(i, sq, piece, { flags: "e" }));
          }
        }
      } else {
        const offsets = PIECE_OFFSETS[piece.type];
        for (let j = 0; j < offsets.length; j++) {
          let square = i;
          while (true) {
            square += offsets[j];
            if (square & 136) break;
            if (!this.board[square]) {
              moves.push(this.buildMove(i, square, piece));
            } else {
              if (this.board[square].color === them) {
                moves.push(this.buildMove(i, square, piece, { captured: this.board[square] }));
              }
              break;
            }
            if (piece.type === "n" || piece.type === "k") break;
          }
        }
      }
    }
    if (us === "w") {
      if (this.castling.w & 1 && !this.board[117] && !this.board[118]) {
        moves.push(this.buildMove(116, 118, { type: "k", color: "w" }, { flags: "k" }));
      }
      if (this.castling.w & 2 && !this.board[113] && !this.board[114] && !this.board[115]) {
        moves.push(this.buildMove(116, 114, { type: "k", color: "w" }, { flags: "q" }));
      }
    } else {
      if (this.castling.b & 1 && !this.board[5] && !this.board[6]) {
        moves.push(this.buildMove(4, 6, { type: "k", color: "b" }, { flags: "k" }));
      }
      if (this.castling.b & 2 && !this.board[1] && !this.board[2] && !this.board[3]) {
        moves.push(this.buildMove(4, 2, { type: "k", color: "b" }, { flags: "q" }));
      }
    }
    const legalMoves = moves.filter((move) => {
      const backup = this.makeMove(move);
      const legal = !this.inCheck(us);
      this.undoMove(backup);
      return legal;
    });
    return legalMoves;
  }
  buildMove(from, to, piece, extras = {}) {
    return {
      from: this.algebraic(from),
      to: this.algebraic(to),
      piece: piece.type,
      color: piece.color,
      san: this.makeSAN(from, to, piece, extras),
      ...extras,
      _from: from,
      _to: to
    };
  }
  makeSAN(from, to, piece, extras) {
    if (extras.flags === "k") return "O-O";
    if (extras.flags === "q") return "O-O-O";
    let san = "";
    if (piece.type !== "p") {
      san += piece.type.toUpperCase();
    }
    if (extras.captured || piece.type === "p") {
      if (piece.type === "p" && extras.captured) {
        san += "abcdefgh".charAt(from & 15);
      }
      if (extras.captured) san += "x";
    }
    san += this.algebraic(to);
    if (piece.type === "p" && (this.rank(to) === 0 || this.rank(to) === 7)) {
      san += "=Q";
    }
    return san;
  }
  makeMove(move) {
    const backup = {
      board: [...this.board],
      turn: this.turn,
      castling: { ...this.castling },
      ep_square: this.ep_square,
      half_moves: this.half_moves,
      move_number: this.move_number
    };
    const from = move._from;
    const to = move._to;
    const piece = this.board[from];
    this.board[to] = piece;
    this.board[from] = null;
    if (move.flags === "k") {
      this.board[to - 1] = this.board[to + 1];
      this.board[to + 1] = null;
    } else if (move.flags === "q") {
      this.board[to + 1] = this.board[to - 2];
      this.board[to - 2] = null;
    }
    if (move.flags === "e") {
      const captured_sq = this.turn === "w" ? to + 16 : to - 16;
      this.board[captured_sq] = null;
    }
    if (piece.type === "p" && (this.rank(to) === 0 || this.rank(to) === 7)) {
      this.board[to] = { type: "q", color: piece.color };
    }
    if (piece.type === "k") {
      this.castling[piece.color] = 0;
    }
    if (from === 112 || to === 112) this.castling.w &= ~2;
    if (from === 119 || to === 119) this.castling.w &= ~1;
    if (from === 0 || to === 0) this.castling.b &= ~2;
    if (from === 7 || to === 7) this.castling.b &= ~1;
    if (piece.type === "p" && Math.abs(from - to) === 32) {
      this.ep_square = (from + to) / 2;
    } else {
      this.ep_square = -1;
    }
    this.turn = this.turn === "w" ? "b" : "w";
    if (this.turn === "w") this.move_number++;
    if (piece.type === "p" || move.captured) {
      this.half_moves = 0;
    } else {
      this.half_moves++;
    }
    return backup;
  }
  undoMove(backup) {
    this.board = backup.board;
    this.turn = backup.turn;
    this.castling = backup.castling;
    this.ep_square = backup.ep_square;
    this.half_moves = backup.half_moves;
    this.move_number = backup.move_number;
  }
  move(moveObj) {
    const legalMoves = this.moves();
    const move = legalMoves.find((m) => m.from === moveObj.from && m.to === moveObj.to);
    if (!move) return null;
    this.makeMove(move);
    this.history.push(move);
    return move;
  }
  findKing(color) {
    for (let i = 0; i < 128; i++) {
      if (i & 136) continue;
      const piece = this.board[i];
      if (piece && piece.type === "k" && piece.color === color) {
        return i;
      }
    }
    return -1;
  }
  inCheck(color) {
    const kingSquare = this.findKing(color);
    if (kingSquare === -1) return false;
    return this.isAttacked(kingSquare, color === "w" ? "b" : "w");
  }
  isAttacked(square, byColor) {
    for (let i = 0; i < 128; i++) {
      if (i & 136) continue;
      const piece = this.board[i];
      if (!piece || piece.color !== byColor) continue;
      const dx = (square & 15) - (i & 15);
      const dy = (square >> 4) - (i >> 4);
      if (piece.type === "p") {
        const dir = byColor === "w" ? -1 : 1;
        if (dy === dir && Math.abs(dx) === 1) return true;
      } else if (piece.type === "n") {
        if (Math.abs(dx) === 2 && Math.abs(dy) === 1 || Math.abs(dx) === 1 && Math.abs(dy) === 2) {
          return true;
        }
      } else if (piece.type === "k") {
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
      } else if (piece.type === "b" || piece.type === "q") {
        if (Math.abs(dx) === Math.abs(dy)) {
          if (this.pathClear(i, square)) return true;
        }
      }
      if (piece.type === "r" || piece.type === "q") {
        if (dx === 0 || dy === 0) {
          if (this.pathClear(i, square)) return true;
        }
      }
    }
    return false;
  }
  pathClear(from, to) {
    const dx = Math.sign((to & 15) - (from & 15));
    const dy = Math.sign((to >> 4) - (from >> 4));
    const step = dy * 16 + dx;
    let current = from + step;
    while (current !== to) {
      if (this.board[current]) return false;
      current += step;
    }
    return true;
  }
  isCheckmate() {
    return this.inCheck(this.turn) && this.moves().length === 0;
  }
  isStalemate() {
    return !this.inCheck(this.turn) && this.moves().length === 0;
  }
  isDraw() {
    return this.isStalemate() || this.half_moves >= 100;
  }
  isGameOver() {
    return this.isCheckmate() || this.isDraw();
  }
};
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/api/create-room") {
      const roomId = generateRoomId();
      return jsonResponse({ roomId, success: true }, corsHeaders);
    }
    if (url.pathname === "/api/rooms") {
      const id = env.GAME_ROOM.idFromName("lobby");
      const stub = env.GAME_ROOM.get(id);
      const response = await stub.fetch(new Request("http://internal/list-rooms"));
      const rooms = await response.json();
      return jsonResponse(rooms, corsHeaders);
    }
    if (url.pathname === "/api/ai-match" && request.method === "POST") {
      const body = await request.json();
      const { white, black, roomId } = body;
      const room = roomId || generateRoomId();
      const id = env.GAME_ROOM.idFromName(room);
      const stub = env.GAME_ROOM.get(id);
      const response = await stub.fetch(new Request("http://internal/start-ai-match", {
        method: "POST",
        body: JSON.stringify({
          white: white || { type: "stockfish", level: 10, name: "Stockfish Lv10" },
          black: black || { type: "stockfish", level: 5, name: "Stockfish Lv5" }
        })
      }));
      const result = await response.json();
      return jsonResponse({ roomId: room, ...result }, corsHeaders);
    }
    if (url.pathname === "/api/tournament" && request.method === "POST") {
      const body = await request.json();
      const { participants, rounds } = body;
      const tournamentId = "T-" + generateRoomId();
      const id = env.GAME_ROOM.idFromName(tournamentId);
      const stub = env.GAME_ROOM.get(id);
      const response = await stub.fetch(new Request("http://internal/start-tournament", {
        method: "POST",
        body: JSON.stringify({ participants, rounds: rounds || 1 })
      }));
      const result = await response.json();
      return jsonResponse({ tournamentId, ...result }, corsHeaders);
    }
    if (url.pathname.startsWith("/api/game/")) {
      const roomId = url.pathname.split("/api/game/")[1];
      const id = env.GAME_ROOM.idFromName(roomId);
      const stub = env.GAME_ROOM.get(id);
      const response = await stub.fetch(new Request("http://internal/status"));
      const status = await response.json();
      return jsonResponse(status, corsHeaders);
    }
    if (url.pathname.startsWith("/ws/")) {
      const roomId = url.pathname.split("/ws/")[1];
      if (!roomId) {
        return new Response("Room ID required", { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(roomId);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }
    return new Response(`
AIMIX Multiplayer & Tournament Server v2.0
==========================================

API Endpoints:
- POST /api/create-room          \u2192 Cr\xE9er une room
- GET  /api/rooms                \u2192 Lister les rooms
- POST /api/ai-match             \u2192 Lancer IA vs IA
- POST /api/tournament           \u2192 Lancer un tournoi
- GET  /api/game/{roomId}        \u2192 Statut d'une partie
- WS   /ws/{roomId}              \u2192 WebSocket (observer/jouer)

Exemple IA vs IA:
POST /api/ai-match
{
  "white": { "type": "minimax", "level": 15, "name": "Minimax Pro" },
  "black": { "type": "random", "level": 5, "name": "Random Bot" }
}

Types d'IA disponibles: minimax, random, defensive, aggressive, positional
    `, { headers: corsHeaders });
  }
};
function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
__name(generateRoomId, "generateRoomId");
function jsonResponse(data, corsHeaders) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
var GameRoom = class {
  static {
    __name(this, "GameRoom");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = /* @__PURE__ */ new Map();
    this.gameState = null;
    this.aiPlayers = { white: null, black: null };
    this.chess = null;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (!this.gameState) {
      this.gameState = await this.state.storage.get("gameState") || this.createInitialState();
    }
    if (url.pathname === "/status") {
      return new Response(JSON.stringify(this.gameState));
    }
    if (url.pathname === "/list-rooms") {
      return new Response(JSON.stringify({
        roomId: this.state.id.toString(),
        players: this.gameState.players,
        status: this.gameState.status,
        moveCount: this.gameState.moves?.length || 0,
        spectators: this.sessions.size
      }));
    }
    if (url.pathname === "/start-ai-match" && request.method === "POST") {
      const body = await request.json();
      return new Response(JSON.stringify(await this.startAIMatch(body.white, body.black)));
    }
    if (url.pathname === "/start-tournament" && request.method === "POST") {
      const body = await request.json();
      return new Response(JSON.stringify(await this.startTournament(body.participants, body.rounds)));
    }
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      await this.handleSession(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Expected WebSocket", { status: 400 });
  }
  createInitialState() {
    return {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: [],
      players: { white: null, black: null },
      status: "waiting",
      result: null,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
  }
  async startAIMatch(whiteConfig, blackConfig) {
    this.gameState = this.createInitialState();
    this.gameState.status = "playing";
    this.gameState.players = {
      white: { name: whiteConfig.name, type: "ai", config: whiteConfig },
      black: { name: blackConfig.name, type: "ai", config: blackConfig }
    };
    this.aiPlayers = { white: whiteConfig, black: blackConfig };
    this.chess = new ChessGame();
    this.broadcast({
      type: "game_started",
      data: { gameState: this.gameState }
    });
    await this.runAIGame();
    return { success: true, message: "AI match completed", gameState: this.gameState };
  }
  async runAIGame() {
    const MAX_MOVES = 200;
    let moveCount = 0;
    while (this.gameState.status === "playing" && moveCount < MAX_MOVES) {
      const isWhiteTurn = moveCount % 2 === 0;
      const currentAI = isWhiteTurn ? this.aiPlayers.white : this.aiPlayers.black;
      const color = isWhiteTurn ? "white" : "black";
      try {
        const legalMoves = this.chess.moves();
        if (legalMoves.length === 0) {
          if (this.chess.isCheckmate()) {
            this.gameState.status = "finished";
            this.gameState.result = isWhiteTurn ? "0-1" : "1-0";
          } else {
            this.gameState.status = "finished";
            this.gameState.result = "1/2-1/2";
          }
          break;
        }
        const selectedMove = this.selectAIMove(currentAI, legalMoves);
        this.chess.move(selectedMove);
        const newFen = this.chess.fen();
        this.gameState.moves.push({
          from: selectedMove.from,
          to: selectedMove.to,
          san: selectedMove.san,
          fen: newFen,
          player: this.gameState.players[color].name,
          timestamp: Date.now(),
          moveNumber: Math.floor(moveCount / 2) + 1
        });
        this.gameState.fen = newFen;
        this.gameState.lastActivity = Date.now();
        this.broadcast({
          type: "move",
          data: {
            from: selectedMove.from,
            to: selectedMove.to,
            san: selectedMove.san,
            fen: newFen,
            player: this.gameState.players[color].name,
            moveNumber: Math.floor(moveCount / 2) + 1
          }
        });
        if (this.chess.isGameOver()) {
          this.gameState.status = "finished";
          if (this.chess.isCheckmate()) {
            this.gameState.result = isWhiteTurn ? "1-0" : "0-1";
          } else {
            this.gameState.result = "1/2-1/2";
          }
          break;
        }
        moveCount++;
        await this.delay(50);
      } catch (error) {
        console.error("AI move error:", error);
        this.gameState.status = "error";
        this.gameState.error = error.message;
        break;
      }
    }
    if (moveCount >= MAX_MOVES) {
      this.gameState.status = "finished";
      this.gameState.result = "1/2-1/2";
    }
    await this.state.storage.put("gameState", this.gameState);
    this.broadcast({
      type: "game_over",
      data: {
        result: this.gameState.result,
        moves: this.gameState.moves.length,
        gameState: this.gameState
      }
    });
    return this.gameState;
  }
  selectAIMove(aiConfig, legalMoves) {
    const type = aiConfig.type || "random";
    const level = aiConfig.level || 5;
    switch (type) {
      case "random":
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      case "aggressive":
        const captures = legalMoves.filter((m) => m.captured);
        if (captures.length > 0 && Math.random() < 0.7) {
          return captures[Math.floor(Math.random() * captures.length)];
        }
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      case "defensive":
        const safe = legalMoves.filter((m) => !m.captured);
        if (safe.length > 0 && Math.random() < 0.6) {
          return safe[Math.floor(Math.random() * safe.length)];
        }
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      case "positional":
        const centerMoves = legalMoves.filter((m) => {
          const to = m.to;
          return ["d4", "d5", "e4", "e5", "c4", "c5", "f4", "f5"].includes(to);
        });
        if (centerMoves.length > 0 && Math.random() < 0.5) {
          return centerMoves[Math.floor(Math.random() * centerMoves.length)];
        }
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      case "minimax":
      default:
        const scored = legalMoves.map((move) => {
          let score = Math.random() * 10;
          if (move.captured) {
            const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
            score += (pieceValues[move.captured.type] || 0) * 10;
          }
          if (["d4", "d5", "e4", "e5"].includes(move.to)) {
            score += 2;
          }
          if (move.piece === "n" || move.piece === "b") {
            score += 1;
          }
          score = score * (level / 10) + Math.random() * (20 - level);
          return { move, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const topN = Math.max(1, Math.floor(legalMoves.length * (1 - level / 25)));
        const idx = Math.floor(Math.random() * topN);
        return scored[idx].move;
    }
  }
  async startTournament(participants, rounds) {
    const matches = [];
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          matches.push({ round: r + 1, white: participants[i], black: participants[j], status: "pending" });
          matches.push({ round: r + 1, white: participants[j], black: participants[i], status: "pending" });
        }
      }
    }
    this.gameState = {
      type: "tournament",
      participants,
      rounds,
      matches,
      results: {},
      status: "in_progress",
      createdAt: Date.now()
    };
    participants.forEach((p) => {
      this.gameState.results[p.name] = { wins: 0, losses: 0, draws: 0, points: 0 };
    });
    await this.state.storage.put("gameState", this.gameState);
    return { success: true, totalMatches: matches.length, tournament: this.gameState };
  }
  async handleSession(webSocket) {
    webSocket.accept();
    const sessionId = crypto.randomUUID();
    const session = { id: sessionId, ws: webSocket, role: "spectator" };
    this.sessions.set(sessionId, session);
    this.send(webSocket, { type: "game_state", data: this.gameState });
    webSocket.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(session, message);
      } catch (e) {
        console.error("Message error:", e);
      }
    });
    webSocket.addEventListener("close", () => {
      this.sessions.delete(sessionId);
      this.broadcast({ type: "spectator_left", data: { count: this.sessions.size } });
    });
  }
  async handleMessage(session, message) {
    switch (message.type) {
      case "join":
        session.name = message.data.name;
        this.broadcast({ type: "spectator_joined", data: { name: session.name, count: this.sessions.size } });
        break;
      case "chat":
        this.broadcast({ type: "chat", data: { from: session.name || "Spectator", message: message.data.message } });
        break;
    }
  }
  send(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch (e) {
    }
  }
  broadcast(message) {
    const json = JSON.stringify(message);
    for (const session of this.sessions.values()) {
      try {
        session.ws.send(json);
      } catch (e) {
      }
    }
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-2S523S/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-2S523S/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  GameRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
