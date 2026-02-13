"""
SupaChess Progressive Training System
=====================================
Train progressively from weaker to stronger opponents.
"""

import json
import subprocess
import time
import os
import random
from pathlib import Path
from datetime import datetime

try:
    import chess
    import chess.pgn
except ImportError:
    os.system("pip install python-chess")
    import chess
    import chess.pgn

# Paths
BASE_PATH = Path(r"C:\Users\Hugop\chessnova")
KNOWLEDGE_PATH = BASE_PATH / "data" / "zup_knowledge_web.json"
STOCKFISH_PATH = Path(r"C:\Users\Hugop\stockfish\stockfish.exe")
GAMES_PATH = BASE_PATH / "training_games"
GAMES_PATH.mkdir(exist_ok=True)

# Training levels - progressive difficulty
TRAINING_LEVELS = [
    {"name": "Beginner", "skill": 1, "depth": 5, "elo": 800, "games": 5},
    {"name": "Easy", "skill": 5, "depth": 8, "elo": 1200, "games": 5},
    {"name": "Medium", "skill": 10, "depth": 10, "elo": 1800, "games": 5},
    {"name": "Hard", "skill": 15, "depth": 12, "elo": 2500, "games": 5},
    {"name": "Expert", "skill": 18, "depth": 15, "elo": 3200, "games": 5},
    {"name": "Master", "skill": 20, "depth": 18, "elo": 3550, "games": 10},
]


class StockfishEngine:
    def __init__(self, path):
        self.path = path
        self.process = None
        self.skill = 10
        self.depth = 10

    def start(self):
        if not self.path.exists():
            print(f"[!] Stockfish not found at {self.path}")
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
        self._send("setoption name Threads value 2")
        self._send("setoption name Hash value 128")
        self._send("isready")
        self._wait_for("readyok")
        return True

    def set_level(self, skill, depth):
        self.skill = skill
        self.depth = depth
        self._send(f"setoption name Skill Level value {skill}")

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

    def get_best_move(self, fen, movetime=1000):
        if not self.process:
            return None

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

    def stop(self):
        if self.process:
            self._send("quit")
            self.process.terminate()


class SupaChessEngine:
    def __init__(self, knowledge_path):
        self.knowledge_path = knowledge_path
        self.knowledge = self._load_knowledge()
        self.q_table = self.knowledge.get("top_positions", {})
        self.elo = self.knowledge.get("current_elo", 800)
        self.games_played = self.knowledge.get("games_played", 0)
        self.wins = self.knowledge.get("total_wins", 0)
        self.learning_rate = 0.2
        self.discount = 0.95
        self.exploration = 0.1  # 10% random moves for exploration

    def _load_knowledge(self):
        if self.knowledge_path.exists():
            try:
                with open(self.knowledge_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Ensure we have all required fields
                    if "top_positions" not in data:
                        data["top_positions"] = {}
                    return data
            except:
                pass
        return {"top_positions": {}, "current_elo": 800, "games_played": 0, "total_wins": 0}

    def save_knowledge(self):
        self.knowledge["top_positions"] = dict(list(self.q_table.items())[-50000:])  # Keep top 50k
        self.knowledge["current_elo"] = self.elo
        self.knowledge["games_played"] = self.games_played
        self.knowledge["total_wins"] = self.wins
        self.knowledge["last_training"] = datetime.now().isoformat()
        self.knowledge["positions_count"] = len(self.q_table)

        # Backup old knowledge
        if self.knowledge_path.exists():
            backup = self.knowledge_path.with_suffix('.backup.json')
            if backup.exists():
                backup.unlink()  # Remove old backup
            try:
                self.knowledge_path.rename(backup)
            except:
                pass  # Continue if backup fails

        with open(self.knowledge_path, 'w', encoding='utf-8') as f:
            json.dump(self.knowledge, f)
        print(f"[ZUP] Saved: {len(self.q_table)} positions, ELO: {self.elo}")

    def get_best_move(self, board):
        """Get best move using Q-table + evaluation + exploration"""
        moves = list(board.legal_moves)
        if not moves:
            return None

        # Exploration: sometimes make random move
        if random.random() < self.exploration:
            return random.choice(moves)

        best_move = None
        best_score = float('-inf')

        for move in moves:
            board.push(move)
            fen_key = board.fen().split()[0]

            # Q-value from table
            q_value = self.q_table.get(fen_key, 0)

            # Position evaluation
            eval_score = self._evaluate_position(board)

            # Combine with weights
            score = q_value * 0.6 + eval_score * 0.4

            board.pop()

            if score > best_score:
                best_score = score
                best_move = move

        return best_move

    def _evaluate_position(self, board):
        """Enhanced position evaluation"""
        if board.is_checkmate():
            return -1000 if board.turn else 1000
        if board.is_stalemate() or board.is_insufficient_material():
            return 0

        score = 0

        # Material
        piece_values = {chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
                       chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0}

        for piece_type in piece_values:
            score += len(board.pieces(piece_type, chess.WHITE)) * piece_values[piece_type]
            score -= len(board.pieces(piece_type, chess.BLACK)) * piece_values[piece_type]

        # Piece-square tables (simplified)
        pawn_table = [
            0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
            5,  5, 10, 25, 25, 10,  5,  5,
            0,  0,  0, 20, 20,  0,  0,  0,
            5, -5,-10,  0,  0,-10, -5,  5,
            5, 10, 10,-20,-20, 10, 10,  5,
            0,  0,  0,  0,  0,  0,  0,  0
        ]

        for sq in board.pieces(chess.PAWN, chess.WHITE):
            score += pawn_table[sq]
        for sq in board.pieces(chess.PAWN, chess.BLACK):
            score -= pawn_table[63 - sq]

        # Mobility
        mobility = len(list(board.legal_moves))
        score += mobility * 5

        # King safety (simplified)
        white_king_sq = board.king(chess.WHITE)
        black_king_sq = board.king(chess.BLACK)

        if white_king_sq:
            if chess.square_file(white_king_sq) in [0, 1, 6, 7]:
                score += 30  # Castled bonus

        if black_king_sq:
            if chess.square_file(black_king_sq) in [0, 1, 6, 7]:
                score -= 30

        # Center control
        center = [chess.D4, chess.D5, chess.E4, chess.E5]
        for sq in center:
            if board.piece_at(sq):
                piece = board.piece_at(sq)
                if piece.color == chess.WHITE:
                    score += 10
                else:
                    score -= 10

        return score / 100  # Normalize to pawn units

    def learn_from_game(self, moves, result, was_white):
        """Update Q-table based on game result"""
        board = chess.Board()
        positions = []

        for move in moves:
            fen_key = board.fen().split()[0]
            is_our_move = (board.turn == chess.WHITE) == was_white
            positions.append((fen_key, is_our_move))
            board.push(move)

        # Calculate reward
        if result == "win":
            final_reward = 10.0
        elif result == "loss":
            final_reward = -5.0
        else:
            final_reward = 1.0

        # Backward pass - update Q-values
        reward = final_reward
        for i, (fen_key, is_our_move) in enumerate(reversed(positions)):
            if is_our_move:
                old_q = self.q_table.get(fen_key, 0)
                # TD learning update
                new_q = old_q + self.learning_rate * (reward - old_q)
                self.q_table[fen_key] = round(new_q, 3)
            reward *= self.discount

    def update_elo(self, opponent_elo, result):
        """Update ELO rating with proper K-factor"""
        # K-factor based on games played
        if self.games_played < 30:
            K = 40
        elif self.elo < 2400:
            K = 32
        else:
            K = 16

        expected = 1 / (1 + 10 ** ((opponent_elo - self.elo) / 400))

        if result == "win":
            score = 1
            self.wins += 1
        elif result == "loss":
            score = 0
        else:
            score = 0.5

        elo_change = K * (score - expected)
        self.elo = max(100, round(self.elo + elo_change))
        self.games_played += 1

        return self.elo, round(elo_change)


def play_game(supachess, stockfish, supachess_is_white, movetime=1000):
    """Play a single game"""
    board = chess.Board()
    moves = []
    move_count = 0
    max_moves = 150

    while not board.is_game_over() and move_count < max_moves:
        is_supachess_turn = (board.turn == chess.WHITE) == supachess_is_white

        if is_supachess_turn:
            move = supachess.get_best_move(board)
        else:
            sf_move = stockfish.get_best_move(board.fen(), movetime)
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

    # Determine result
    result = "draw"
    if board.is_checkmate():
        winner_is_white = not board.turn
        if winner_is_white == supachess_is_white:
            result = "win"
        else:
            result = "loss"
    elif move_count >= max_moves:
        # Evaluate final position to determine winner
        eval_score = supachess._evaluate_position(board)
        if supachess_is_white:
            if eval_score > 3:
                result = "win"
            elif eval_score < -3:
                result = "loss"
        else:
            if eval_score < -3:
                result = "win"
            elif eval_score > 3:
                result = "loss"

    return moves, result


def run_progressive_training():
    """Run progressive training through all levels"""
    print("=" * 70)
    print("  SUPACHESS PROGRESSIVE TRAINING SYSTEM")
    print("  Target: Beat Stockfish 3550 ELO")
    print("=" * 70)

    # Initialize
    stockfish = StockfishEngine(STOCKFISH_PATH)
    if not stockfish.start():
        print("[ERROR] Cannot start Stockfish!")
        return

    supachess = SupaChessEngine(KNOWLEDGE_PATH)
    print(f"\n[ZUP] Starting ELO: {supachess.elo}")
    print(f"[ZUP] Known positions: {len(supachess.q_table)}")

    total_stats = {"wins": 0, "draws": 0, "losses": 0}
    start_elo = supachess.elo

    for level in TRAINING_LEVELS:
        print(f"\n{'='*70}")
        print(f"  LEVEL: {level['name']} (SF Skill {level['skill']}, ELO ~{level['elo']})")
        print(f"{'='*70}")

        stockfish.set_level(level['skill'], level['depth'])
        level_stats = {"wins": 0, "draws": 0, "losses": 0}

        for i in range(level['games']):
            supachess_is_white = i % 2 == 0
            color = "White" if supachess_is_white else "Black"

            moves, result = play_game(supachess, stockfish, supachess_is_white, movetime=800)

            # Learn and update ELO
            supachess.learn_from_game(moves, result, supachess_is_white)
            new_elo, elo_change = supachess.update_elo(level['elo'], result)

            # Stats
            level_stats[result + "s"] = level_stats.get(result + "s", 0) + 1
            total_stats[result + "s"] = total_stats.get(result + "s", 0) + 1

            emoji = {"win": "🏆", "loss": "❌", "draw": "🤝"}[result]
            sign = "+" if elo_change >= 0 else ""
            print(f"  Game {i+1}/{level['games']} ({color}): {emoji} {result.upper():4} | "
                  f"{len(moves):3} moves | ELO: {new_elo} ({sign}{elo_change})")

        # Level summary
        w, d, l = level_stats["wins"], level_stats["draws"], level_stats["losses"]
        score_pct = (w + d * 0.5) / level['games'] * 100
        print(f"\n  Level Score: +{w} ={d} -{l} ({score_pct:.0f}%)")

        # Save progress
        supachess.save_knowledge()

        # Check if ready for next level (need 50%+ score)
        if score_pct < 30 and level['skill'] > 5:
            print(f"\n  [!] Struggling at this level. More training needed.")
            # Repeat level with more games
            supachess.exploration = min(0.2, supachess.exploration + 0.02)

    stockfish.stop()

    # Final summary
    print("\n" + "=" * 70)
    print("  TRAINING COMPLETE!")
    print("=" * 70)
    print(f"  Total Games: {sum(total_stats.values())}")
    print(f"  Score: +{total_stats['wins']} ={total_stats['draws']} -{total_stats['losses']}")
    print(f"  Win Rate: {total_stats['wins']/sum(total_stats.values())*100:.1f}%")
    print(f"  ELO Progress: {start_elo} → {supachess.elo} ({supachess.elo - start_elo:+d})")
    print(f"  Positions Learned: {len(supachess.q_table)}")
    print("=" * 70)


if __name__ == "__main__":
    run_progressive_training()
