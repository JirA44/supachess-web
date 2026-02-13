"""
SupaChess Training with Stockfish Teacher
==========================================
Learn by observing Stockfish's best moves and copying them.
Much more effective than pure Q-learning.
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

class StockfishTeacher:
    """Use Stockfish to teach SupaChess good moves"""

    def __init__(self, path):
        self.path = path
        self.process = None

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
        self._send("setoption name Hash value 256")
        self._send("setoption name Skill Level value 20")
        self._send("isready")
        self._wait_for("readyok")
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

    def analyze(self, fen, depth=15, movetime=500):
        """Get best move and evaluation from Stockfish"""
        if not self.process:
            return None, 0

        self._send(f"position fen {fen}")
        self._send(f"go depth {depth} movetime {movetime}")

        best_move = None
        evaluation = 0

        while True:
            line = self.process.stdout.readline().strip()

            # Parse evaluation
            if "score cp" in line:
                try:
                    idx = line.index("score cp") + 9
                    end = line.index(" ", idx) if " " in line[idx:] else len(line)
                    evaluation = int(line[idx:end]) / 100  # Convert centipawns to pawns
                except:
                    pass
            elif "score mate" in line:
                try:
                    idx = line.index("score mate") + 11
                    end = line.index(" ", idx) if " " in line[idx:] else len(line)
                    mate_in = int(line[idx:end])
                    evaluation = 100 if mate_in > 0 else -100
                except:
                    pass

            if line.startswith("bestmove"):
                parts = line.split()
                if len(parts) >= 2:
                    best_move = parts[1]
                break

        return best_move, evaluation

    def get_top_moves(self, fen, num_moves=3, depth=12):
        """Get top N moves with evaluations"""
        if not self.process:
            return []

        self._send(f"setoption name MultiPV value {num_moves}")
        self._send(f"position fen {fen}")
        self._send(f"go depth {depth}")

        moves = {}
        while True:
            line = self.process.stdout.readline().strip()

            if "multipv" in line and "pv" in line:
                try:
                    # Extract multipv number
                    mpv_idx = line.index("multipv") + 8
                    mpv_end = line.index(" ", mpv_idx)
                    mpv = int(line[mpv_idx:mpv_end])

                    # Extract move
                    pv_idx = line.index(" pv ") + 4
                    move = line[pv_idx:].split()[0]

                    # Extract score
                    score = 0
                    if "score cp" in line:
                        cp_idx = line.index("score cp") + 9
                        cp_end = line.index(" ", cp_idx)
                        score = int(line[cp_idx:cp_end]) / 100
                    elif "score mate" in line:
                        mt_idx = line.index("score mate") + 11
                        mt_end = line.index(" ", mt_idx)
                        mate = int(line[mt_idx:mt_end])
                        score = 100 if mate > 0 else -100

                    moves[mpv] = (move, score)
                except:
                    pass

            if line.startswith("bestmove"):
                break

        self._send("setoption name MultiPV value 1")  # Reset
        return [(m, s) for mpv, (m, s) in sorted(moves.items())]

    def stop(self):
        if self.process:
            self._send("quit")
            self.process.terminate()


class SupaChessLearner:
    """SupaChess engine that learns from Stockfish"""

    def __init__(self, knowledge_path):
        self.knowledge_path = knowledge_path
        self.knowledge = self._load_knowledge()
        self.q_table = self.knowledge.get("top_positions", {})
        self.elo = self.knowledge.get("current_elo", 800)
        self.games_played = self.knowledge.get("games_played", 0)
        self.wins = self.knowledge.get("total_wins", 0)

    def _load_knowledge(self):
        if self.knowledge_path.exists():
            try:
                with open(self.knowledge_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if "top_positions" not in data:
                        data["top_positions"] = {}
                    return data
            except:
                pass
        return {"top_positions": {}, "current_elo": 800, "games_played": 0, "total_wins": 0}

    def save_knowledge(self):
        # Keep only best 200k positions
        if len(self.q_table) > 200000:
            # Sort by absolute value (most significant positions)
            sorted_positions = sorted(self.q_table.items(), key=lambda x: abs(x[1]), reverse=True)
            self.q_table = dict(sorted_positions[:200000])

        self.knowledge["top_positions"] = self.q_table
        self.knowledge["current_elo"] = self.elo
        self.knowledge["games_played"] = self.games_played
        self.knowledge["total_wins"] = self.wins
        self.knowledge["last_training"] = datetime.now().isoformat()
        self.knowledge["positions_count"] = len(self.q_table)

        # Backup
        if self.knowledge_path.exists():
            backup = self.knowledge_path.with_suffix('.backup.json')
            if backup.exists():
                backup.unlink()
            try:
                self.knowledge_path.rename(backup)
            except:
                pass

        with open(self.knowledge_path, 'w', encoding='utf-8') as f:
            json.dump(self.knowledge, f)
        print(f"[ZUP] Saved: {len(self.q_table)} positions, ELO: {self.elo}")

    def learn_position(self, fen, evaluation, best_move=None):
        """Learn evaluation for a position"""
        fen_key = fen.split()[0]  # Just the board part

        # Update Q-value with momentum
        old_value = self.q_table.get(fen_key, 0)
        learning_rate = 0.3
        new_value = old_value + learning_rate * (evaluation - old_value)
        self.q_table[fen_key] = round(new_value, 3)

    def learn_move_quality(self, fen_before, move, is_best_move, eval_delta):
        """Learn if a move is good or bad"""
        fen_key = fen_before.split()[0]
        move_key = f"{fen_key}_{move}"

        if is_best_move:
            reward = 5.0 + max(0, eval_delta)  # Bonus for good moves
        else:
            reward = -2.0 + min(0, eval_delta)  # Penalty for bad moves

        old_value = self.q_table.get(move_key, 0)
        new_value = old_value + 0.2 * (reward - old_value)
        self.q_table[move_key] = round(new_value, 3)

    def get_best_move(self, board):
        """Get best move using learned knowledge"""
        moves = list(board.legal_moves)
        if not moves:
            return None

        fen_key = board.fen().split()[0]
        best_move = None
        best_score = float('-inf')

        for move in moves:
            move_key = f"{fen_key}_{move.uci()}"

            # Check if we learned this specific move
            move_score = self.q_table.get(move_key, 0)

            # Also check resulting position
            board.push(move)
            result_key = board.fen().split()[0]
            position_score = self.q_table.get(result_key, 0)
            board.pop()

            # Combine scores + basic evaluation
            score = move_score * 0.5 + position_score * 0.3 + self._quick_eval(board, move) * 0.2

            # Small random factor for variety
            score += random.uniform(-0.1, 0.1)

            if score > best_score:
                best_score = score
                best_move = move

        return best_move

    def _quick_eval(self, board, move):
        """Quick move evaluation heuristics"""
        score = 0

        # Captures
        if board.is_capture(move):
            victim = board.piece_at(move.to_square)
            if victim:
                values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                         chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
                score += values.get(victim.piece_type, 0)

        # Center control
        if move.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
            score += 0.5

        # Check
        board.push(move)
        if board.is_check():
            score += 1
        board.pop()

        return score


def train_by_observation(num_games=50, depth=12):
    """Train SupaChess by observing Stockfish games"""
    print("=" * 70)
    print("  SUPACHESS TRAINING BY OBSERVATION")
    print("  Learning from Stockfish analysis")
    print("=" * 70)

    teacher = StockfishTeacher(STOCKFISH_PATH)
    if not teacher.start():
        print("[ERROR] Cannot start Stockfish!")
        return

    learner = SupaChessLearner(KNOWLEDGE_PATH)
    print(f"\n[ZUP] Starting with {len(learner.q_table)} positions")

    positions_learned = 0

    for game_num in range(num_games):
        board = chess.Board()
        game_positions = 0

        print(f"\n[Game {game_num + 1}/{num_games}]")

        while not board.is_game_over() and board.fullmove_number < 60:
            fen = board.fen()

            # Get Stockfish analysis
            best_move, evaluation = teacher.analyze(fen, depth=depth)

            if not best_move:
                break

            # Adjust evaluation for black's perspective
            if board.turn == chess.BLACK:
                evaluation = -evaluation

            # Learn this position's evaluation
            learner.learn_position(fen, evaluation)
            positions_learned += 1
            game_positions += 1

            # Also learn top moves
            top_moves = teacher.get_top_moves(fen, num_moves=3, depth=8)
            for i, (move_uci, move_eval) in enumerate(top_moves):
                is_best = (i == 0)
                if board.turn == chess.BLACK:
                    move_eval = -move_eval
                learner.learn_move_quality(fen, move_uci, is_best, move_eval - evaluation)

            # Play the best move
            try:
                move = chess.Move.from_uci(best_move)
                if move in board.legal_moves:
                    board.push(move)
                else:
                    break
            except:
                break

        print(f"  Learned {game_positions} positions (total: {positions_learned})")

        # Save every 10 games
        if (game_num + 1) % 10 == 0:
            learner.save_knowledge()

    teacher.stop()
    learner.save_knowledge()

    print("\n" + "=" * 70)
    print("  OBSERVATION TRAINING COMPLETE")
    print("=" * 70)
    print(f"  Games analyzed: {num_games}")
    print(f"  Positions learned: {positions_learned}")
    print(f"  Total knowledge: {len(learner.q_table)} positions")
    print("=" * 70)


def train_self_play_with_guidance(num_games=20, teacher_assist_rate=0.5):
    """Train through self-play with occasional Stockfish guidance"""
    print("=" * 70)
    print("  SUPACHESS GUIDED SELF-PLAY TRAINING")
    print("=" * 70)

    teacher = StockfishTeacher(STOCKFISH_PATH)
    if not teacher.start():
        print("[ERROR] Cannot start Stockfish!")
        return

    learner = SupaChessLearner(KNOWLEDGE_PATH)
    print(f"\n[ZUP] Starting with {len(learner.q_table)} positions")

    for game_num in range(num_games):
        board = chess.Board()
        moves_played = []
        positions = []

        print(f"\n[Game {game_num + 1}/{num_games}]", end=" ")

        while not board.is_game_over() and board.fullmove_number < 80:
            fen = board.fen()

            # Decide if teacher helps
            use_teacher = random.random() < teacher_assist_rate

            if use_teacher:
                best_move_uci, evaluation = teacher.analyze(fen, depth=10, movetime=200)
                if best_move_uci:
                    try:
                        move = chess.Move.from_uci(best_move_uci)
                        if move not in board.legal_moves:
                            move = learner.get_best_move(board)
                    except:
                        move = learner.get_best_move(board)
                else:
                    move = learner.get_best_move(board)
            else:
                move = learner.get_best_move(board)

            if not move or move not in board.legal_moves:
                break

            # Store for learning
            positions.append((fen, board.turn))
            moves_played.append(move)
            board.push(move)

        # Determine result
        result = "draw"
        if board.is_checkmate():
            result = "white" if board.turn == chess.BLACK else "black"
        elif board.fullmove_number >= 80:
            # Evaluate final position
            _, final_eval = teacher.analyze(board.fen(), depth=12)
            if final_eval > 2:
                result = "white"
            elif final_eval < -2:
                result = "black"

        # Learn from game
        final_reward = {"white": 1.0, "black": -1.0, "draw": 0.0}[result]

        reward = final_reward
        for fen, turn in reversed(positions):
            # Adjust for perspective
            perspective_reward = reward if turn == chess.WHITE else -reward
            learner.learn_position(fen, perspective_reward * 5)  # Scale up
            reward *= 0.95  # Decay

        learner.games_played += 1

        emoji = {"white": "⚪", "black": "⚫", "draw": "🤝"}[result]
        print(f"{emoji} {result} ({len(moves_played)} moves)")

        # Save every 5 games
        if (game_num + 1) % 5 == 0:
            learner.save_knowledge()

    teacher.stop()
    learner.save_knowledge()

    print("\n" + "=" * 70)
    print("  GUIDED SELF-PLAY COMPLETE")
    print(f"  Total knowledge: {len(learner.q_table)} positions")
    print("=" * 70)


def test_against_stockfish(num_games=4, stockfish_skill=5):
    """Test current SupaChess level against Stockfish"""
    print("=" * 70)
    print(f"  TEST: SupaChess vs Stockfish (Skill {stockfish_skill})")
    print("=" * 70)

    teacher = StockfishTeacher(STOCKFISH_PATH)
    if not teacher.start():
        print("[ERROR] Cannot start Stockfish!")
        return

    learner = SupaChessLearner(KNOWLEDGE_PATH)
    print(f"\n[ZUP] Knowledge: {len(learner.q_table)} positions")

    teacher._send(f"setoption name Skill Level value {stockfish_skill}")

    wins = draws = losses = 0

    for game_num in range(num_games):
        board = chess.Board()
        zup_is_white = game_num % 2 == 0

        print(f"\n[Game {game_num + 1}] ZUP plays {'White' if zup_is_white else 'Black'}")

        while not board.is_game_over() and board.fullmove_number < 100:
            is_zup_turn = (board.turn == chess.WHITE) == zup_is_white

            if is_zup_turn:
                move = learner.get_best_move(board)
            else:
                best_uci, _ = teacher.analyze(board.fen(), depth=10, movetime=500)
                try:
                    move = chess.Move.from_uci(best_uci) if best_uci else None
                except:
                    move = None

            if not move or move not in board.legal_moves:
                break

            board.push(move)

        # Result
        result = "draw"
        if board.is_checkmate():
            winner_is_white = board.turn == chess.BLACK
            if winner_is_white == zup_is_white:
                result = "win"
            else:
                result = "loss"

        if result == "win":
            wins += 1
            print(f"  🏆 WIN! ({board.fullmove_number} moves)")
        elif result == "loss":
            losses += 1
            print(f"  ❌ Loss ({board.fullmove_number} moves)")
        else:
            draws += 1
            print(f"  🤝 Draw ({board.fullmove_number} moves)")

    teacher.stop()

    print("\n" + "=" * 70)
    print(f"  RESULT: +{wins} ={draws} -{losses}")
    score_pct = (wins + draws * 0.5) / num_games * 100
    print(f"  Score: {score_pct:.0f}%")
    print("=" * 70)

    return wins, draws, losses


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        mode = sys.argv[1]
        if mode == "observe":
            num = int(sys.argv[2]) if len(sys.argv) > 2 else 50
            train_by_observation(num)
        elif mode == "selfplay":
            num = int(sys.argv[2]) if len(sys.argv) > 2 else 20
            train_self_play_with_guidance(num)
        elif mode == "test":
            skill = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            test_against_stockfish(4, skill)
    else:
        # Default: observation training then test
        print("\n[PHASE 1] Learning from Stockfish analysis...")
        train_by_observation(30)

        print("\n[PHASE 2] Guided self-play...")
        train_self_play_with_guidance(15)

        print("\n[PHASE 3] Testing against Stockfish Skill 5...")
        test_against_stockfish(4, 5)
