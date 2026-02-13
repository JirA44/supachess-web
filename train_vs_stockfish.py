"""
SupaChess Training System - VS Stockfish 3550
==============================================
Train SupaChess engine by playing against Stockfish MAX and learning from games.
"""

import json
import subprocess
import time
import os
import random
from pathlib import Path
from datetime import datetime

# Paths
BASE_PATH = Path(r"C:\Users\Hugop\chessnova")
KNOWLEDGE_PATH = BASE_PATH / "data" / "zup_knowledge_web.json"
STOCKFISH_PATH = Path(r"C:\Users\Hugop\stockfish\stockfish.exe")
GAMES_PATH = BASE_PATH / "training_games"
GAMES_PATH.mkdir(exist_ok=True)

# Training config
STOCKFISH_ELO = 3550
STOCKFISH_DEPTH = 18
STOCKFISH_SKILL = 20
SUPACHESS_ELO = 2800  # Starting ELO

class StockfishEngine:
    def __init__(self, path, skill_level=20, depth=18):
        self.path = path
        self.skill_level = skill_level
        self.depth = depth
        self.process = None

    def start(self):
        if not self.path.exists():
            print(f"[!] Stockfish not found at {self.path}")
            print("[!] Using simulated Stockfish (weaker)")
            return False

        self.process = subprocess.Popen(
            [str(self.path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

        self._send("uci")
        self._wait_for("uciok")
        self._send(f"setoption name Skill Level value {self.skill_level}")
        self._send("setoption name Threads value 2")
        self._send("setoption name Hash value 256")
        self._send("isready")
        self._wait_for("readyok")
        print(f"[SF] Stockfish initialized (Skill {self.skill_level}, Depth {self.depth})")
        return True

    def _send(self, cmd):
        if self.process:
            self.process.stdin.write(cmd + "\n")
            self.process.stdin.flush()

    def _wait_for(self, token, timeout=10):
        if not self.process:
            return None
        start = time.time()
        while time.time() - start < timeout:
            line = self.process.stdout.readline().strip()
            if token in line:
                return line
        return None

    def get_best_move(self, fen, movetime=2000):
        if not self.process:
            return self._simulate_move(fen)

        self._send(f"position fen {fen}")
        self._send(f"go depth {self.depth} movetime {movetime}")

        best_move = None
        while True:
            line = self.process.stdout.readline().strip()
            if line.startswith("bestmove"):
                parts = line.split()
                if len(parts) >= 2:
                    best_move = parts[1]
                break
        return best_move

    def _simulate_move(self, fen):
        """Fallback when Stockfish not available"""
        import chess
        board = chess.Board(fen)
        moves = list(board.legal_moves)
        if not moves:
            return None
        # Prefer captures and center moves
        scored = []
        for m in moves:
            score = random.random()
            if board.is_capture(m):
                score += 3
            if m.to_square in [27, 28, 35, 36]:  # Center squares
                score += 1
            scored.append((m, score))
        scored.sort(key=lambda x: -x[1])
        return scored[0][0].uci()

    def stop(self):
        if self.process:
            self._send("quit")
            self.process.terminate()


class SupaChessEngine:
    def __init__(self, knowledge_path):
        self.knowledge_path = knowledge_path
        self.knowledge = self._load_knowledge()
        self.q_table = self.knowledge.get("top_positions", {})
        self.elo = self.knowledge.get("current_elo", SUPACHESS_ELO)
        self.games_played = self.knowledge.get("games_played", 0)
        self.learning_rate = 0.15
        self.discount = 0.95

    def _load_knowledge(self):
        if self.knowledge_path.exists():
            with open(self.knowledge_path, 'r') as f:
                return json.load(f)
        return {"top_positions": {}, "current_elo": SUPACHESS_ELO, "games_played": 0}

    def save_knowledge(self):
        self.knowledge["top_positions"] = self.q_table
        self.knowledge["current_elo"] = self.elo
        self.knowledge["games_played"] = self.games_played
        self.knowledge["last_training"] = datetime.now().isoformat()

        with open(self.knowledge_path, 'w') as f:
            json.dump(self.knowledge, f, indent=2)
        print(f"[ZUP] Knowledge saved ({len(self.q_table)} positions, ELO: {self.elo})")

    def get_best_move(self, board):
        """Get best move using Q-table + evaluation"""
        import chess

        moves = list(board.legal_moves)
        if not moves:
            return None

        best_move = None
        best_score = float('-inf')

        for move in moves:
            board.push(move)
            fen_key = board.fen().split()[0]

            # Q-value from table
            q_value = self.q_table.get(fen_key, 0)

            # Position evaluation
            eval_score = self._evaluate_position(board)

            # Combined score
            score = q_value * 0.7 + eval_score * 0.3

            # Add exploration noise
            score += random.uniform(-0.1, 0.1)

            board.pop()

            if score > best_score:
                best_score = score
                best_move = move

        return best_move

    def _evaluate_position(self, board):
        """Simple position evaluation"""
        import chess

        if board.is_checkmate():
            return -100 if board.turn else 100
        if board.is_stalemate():
            return 0

        # Material count
        piece_values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                       chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}

        score = 0
        for piece_type in piece_values:
            score += len(board.pieces(piece_type, chess.WHITE)) * piece_values[piece_type]
            score -= len(board.pieces(piece_type, chess.BLACK)) * piece_values[piece_type]

        # Mobility
        mobility = len(list(board.legal_moves))
        board.push(chess.Move.null())
        opp_mobility = len(list(board.legal_moves))
        board.pop()
        score += (mobility - opp_mobility) * 0.1

        # Center control
        center = [chess.D4, chess.D5, chess.E4, chess.E5]
        for sq in center:
            if board.is_attacked_by(chess.WHITE, sq):
                score += 0.1
            if board.is_attacked_by(chess.BLACK, sq):
                score -= 0.1

        return score if board.turn == chess.WHITE else -score

    def learn_from_game(self, moves, result, was_white):
        """Update Q-table based on game result"""
        import chess

        board = chess.Board()
        positions = []

        # Collect all positions
        for move in moves:
            fen_key = board.fen().split()[0]
            is_our_move = (board.turn == chess.WHITE) == was_white
            positions.append((fen_key, is_our_move))
            board.push(move)

        # Calculate reward
        if result == "win":
            final_reward = 1.0
        elif result == "loss":
            final_reward = -1.0
        else:
            final_reward = 0.0

        # Reverse iterate and update Q-values
        reward = final_reward
        for fen_key, is_our_move in reversed(positions):
            if is_our_move:
                old_q = self.q_table.get(fen_key, 0)
                new_q = old_q + self.learning_rate * (reward - old_q)
                self.q_table[fen_key] = round(new_q, 4)
            reward *= self.discount

    def update_elo(self, opponent_elo, result):
        """Update ELO rating"""
        K = 32
        expected = 1 / (1 + 10 ** ((opponent_elo - self.elo) / 400))

        if result == "win":
            score = 1
        elif result == "loss":
            score = 0
        else:
            score = 0.5

        self.elo = round(self.elo + K * (score - expected))
        return self.elo


def play_game(supachess, stockfish, supachess_is_white):
    """Play a single game"""
    import chess

    board = chess.Board()
    moves = []
    move_count = 0
    max_moves = 200

    print(f"  [Game] {'SupaChess' if supachess_is_white else 'Stockfish'} (White) vs {'Stockfish' if supachess_is_white else 'SupaChess'} (Black)")

    while not board.is_game_over() and move_count < max_moves:
        is_supachess_turn = (board.turn == chess.WHITE) == supachess_is_white

        if is_supachess_turn:
            move = supachess.get_best_move(board)
        else:
            sf_move = stockfish.get_best_move(board.fen())
            if sf_move:
                try:
                    move = chess.Move.from_uci(sf_move)
                except:
                    move = None
            else:
                move = None

        if move and move in board.legal_moves:
            board.push(move)
            moves.append(move)
        else:
            break

        move_count += 1

        # Progress indicator every 20 moves
        if move_count % 20 == 0:
            print(f"    Move {move_count}...")

    # Determine result
    result = "draw"
    if board.is_checkmate():
        winner_is_white = not board.turn
        if winner_is_white == supachess_is_white:
            result = "win"
        else:
            result = "loss"
    elif board.is_stalemate() or board.is_insufficient_material():
        result = "draw"
    elif move_count >= max_moves:
        # Evaluate final position
        eval_score = supachess._evaluate_position(board)
        if supachess_is_white:
            if eval_score > 2:
                result = "win"
            elif eval_score < -2:
                result = "loss"
        else:
            if eval_score < -2:
                result = "win"
            elif eval_score > 2:
                result = "loss"

    return moves, result, board.fen()


def run_training(num_games=10):
    """Run training session"""
    print("=" * 60)
    print("  SUPACHESS TRAINING vs STOCKFISH 3550")
    print("=" * 60)

    try:
        import chess
    except ImportError:
        print("[!] Installing python-chess...")
        os.system("pip install python-chess")
        import chess

    # Initialize engines
    stockfish = StockfishEngine(STOCKFISH_PATH, STOCKFISH_SKILL, STOCKFISH_DEPTH)
    sf_available = stockfish.start()

    supachess = SupaChessEngine(KNOWLEDGE_PATH)
    print(f"[ZUP] SupaChess loaded (ELO: {supachess.elo}, Positions: {len(supachess.q_table)})")

    # Stats
    wins = losses = draws = 0
    start_elo = supachess.elo

    print(f"\n[Training] Starting {num_games} games against Stockfish {STOCKFISH_ELO}\n")

    for i in range(num_games):
        supachess_is_white = i % 2 == 0
        print(f"\n--- Game {i+1}/{num_games} ---")

        moves, result, final_fen = play_game(supachess, stockfish, supachess_is_white)

        # Learn from game
        supachess.learn_from_game(moves, result, supachess_is_white)
        new_elo = supachess.update_elo(STOCKFISH_ELO, result)
        supachess.games_played += 1

        # Update stats
        if result == "win":
            wins += 1
            emoji = "🏆"
        elif result == "loss":
            losses += 1
            emoji = "❌"
        else:
            draws += 1
            emoji = "🤝"

        print(f"  {emoji} Result: {result.upper()} ({len(moves)} moves)")
        print(f"  📊 ELO: {new_elo} | Score: +{wins} ={draws} -{losses}")

        # Save PGN
        pgn_path = GAMES_PATH / f"game_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pgn"
        with open(pgn_path, 'w') as f:
            import chess.pgn
            game = chess.pgn.Game()
            game.headers["Event"] = "SupaChess Training"
            game.headers["White"] = "SupaChess" if supachess_is_white else "Stockfish"
            game.headers["Black"] = "Stockfish" if supachess_is_white else "SupaChess"
            game.headers["Result"] = "1-0" if (result == "win" and supachess_is_white) or (result == "loss" and not supachess_is_white) else "0-1" if (result == "loss" and supachess_is_white) or (result == "win" and not supachess_is_white) else "1/2-1/2"

            node = game
            board = chess.Board()
            for move in moves:
                node = node.add_variation(move)
            f.write(str(game))

        # Save knowledge every 2 games
        if (i + 1) % 2 == 0:
            supachess.save_knowledge()

    # Final save
    supachess.save_knowledge()
    stockfish.stop()

    # Summary
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE")
    print("=" * 60)
    print(f"  Games: {num_games}")
    print(f"  Score: +{wins} ={draws} -{losses} ({(wins + draws*0.5)/num_games*100:.1f}%)")
    print(f"  ELO: {start_elo} → {supachess.elo} ({supachess.elo - start_elo:+d})")
    print(f"  Positions learned: {len(supachess.q_table)}")
    print("=" * 60)

    return {
        "games": num_games,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "start_elo": start_elo,
        "final_elo": supachess.elo,
        "positions": len(supachess.q_table)
    }


if __name__ == "__main__":
    import sys
    num_games = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    run_training(num_games)
