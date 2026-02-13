"""
SupaChess Hybrid Engine
=======================
Combines:
1. Stockfish for deep tactical calculation
2. Learned Q-table for opening and positional preferences
3. Personality system for different playing styles
"""

import json
import subprocess
import time
import random
from pathlib import Path

try:
    import chess
except ImportError:
    import os
    os.system("pip install python-chess")
    import chess

BASE_PATH = Path(r"C:\Users\Hugop\chessnova")
KNOWLEDGE_PATH = BASE_PATH / "data" / "zup_knowledge_web.json"
STOCKFISH_PATH = Path(r"C:\Users\Hugop\stockfish\stockfish.exe")


class SupaChessHybrid:
    """Hybrid engine using Stockfish + learned knowledge"""

    PERSONALITIES = {
        'aggressive': {'attack_bonus': 2.0, 'sacrifice_bonus': 1.5, 'defense_penalty': -0.5},
        'positional': {'center_bonus': 1.5, 'pawn_structure': 1.2, 'attack_bonus': 0.5},
        'tactical': {'tactics_bonus': 2.0, 'sacrifice_bonus': 2.0, 'attack_bonus': 1.0},
        'solid': {'defense_bonus': 1.5, 'trade_bonus': 1.0, 'risk_penalty': -1.0},
        'balanced': {'attack_bonus': 1.0, 'defense_bonus': 1.0, 'center_bonus': 1.0},
    }

    def __init__(self, skill_level=15, personality='balanced'):
        self.skill_level = skill_level  # 1-20
        self.personality = self.PERSONALITIES.get(personality, self.PERSONALITIES['balanced'])
        self.personality_name = personality

        # Load learned knowledge
        self.knowledge = self._load_knowledge()
        self.q_table = self.knowledge.get("top_positions", {})
        self.elo = self._calculate_elo(skill_level)

        # Stockfish process
        self.sf_process = None
        self._init_stockfish()

    def _calculate_elo(self, skill):
        """Estimate ELO from skill level"""
        # Skill 1 = ~800, Skill 20 = ~3550
        base_elo = 800
        elo_per_skill = (3550 - 800) / 19
        return int(base_elo + (skill - 1) * elo_per_skill)

    def _load_knowledge(self):
        if KNOWLEDGE_PATH.exists():
            try:
                with open(KNOWLEDGE_PATH, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {"top_positions": {}}

    def _init_stockfish(self):
        """Initialize Stockfish subprocess"""
        if not STOCKFISH_PATH.exists():
            print(f"[!] Stockfish not found at {STOCKFISH_PATH}")
            return

        self.sf_process = subprocess.Popen(
            [str(STOCKFISH_PATH)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

        self._sf_send("uci")
        self._sf_wait("uciok")
        self._sf_send(f"setoption name Skill Level value {self.skill_level}")
        self._sf_send("setoption name Threads value 2")
        self._sf_send("setoption name Hash value 128")
        self._sf_send("isready")
        self._sf_wait("readyok")

    def _sf_send(self, cmd):
        if self.sf_process:
            self.sf_process.stdin.write(cmd + "\n")
            self.sf_process.stdin.flush()

    def _sf_wait(self, token, timeout=5):
        if not self.sf_process:
            return None
        start = time.time()
        while time.time() - start < timeout:
            line = self.sf_process.stdout.readline().strip()
            if token in line:
                return line
        return None

    def get_move(self, board, time_limit_ms=2000):
        """Get best move combining Stockfish + knowledge + personality"""
        if not self.sf_process:
            return self._fallback_move(board)

        fen = board.fen()

        # Get Stockfish's top moves
        depth = min(12 + self.skill_level // 4, 18)
        top_moves = self._get_stockfish_moves(fen, depth, time_limit_ms, num_moves=5)

        if not top_moves:
            return self._fallback_move(board)

        # Score moves with personality and knowledge
        scored_moves = []
        for move_uci, sf_eval in top_moves:
            try:
                move = chess.Move.from_uci(move_uci)
                if move not in board.legal_moves:
                    continue

                # Base score from Stockfish
                score = sf_eval

                # Knowledge bonus
                fen_key = board.fen().split()[0]
                move_key = f"{fen_key}_{move_uci}"
                knowledge_bonus = self.q_table.get(move_key, 0) * 0.5
                score += knowledge_bonus

                # Personality adjustments
                score += self._personality_score(board, move)

                # Randomness based on skill level (less random = stronger)
                randomness = (21 - self.skill_level) / 20 * 0.5
                score += random.uniform(-randomness, randomness)

                scored_moves.append((move, score))
            except:
                continue

        if not scored_moves:
            return self._fallback_move(board)

        # Sort and pick best (or occasionally 2nd best for variety)
        scored_moves.sort(key=lambda x: x[1], reverse=True)

        if len(scored_moves) > 1 and random.random() < 0.1:  # 10% pick 2nd best
            return scored_moves[1][0]

        return scored_moves[0][0]

    def _get_stockfish_moves(self, fen, depth, time_ms, num_moves=5):
        """Get top N moves from Stockfish"""
        self._sf_send(f"setoption name MultiPV value {num_moves}")
        self._sf_send(f"position fen {fen}")
        self._sf_send(f"go depth {depth} movetime {time_ms}")

        moves = {}
        deadline = time.time() + (time_ms / 1000) + 2

        while time.time() < deadline:
            line = self.sf_process.stdout.readline().strip()

            if "multipv" in line and " pv " in line:
                try:
                    # Extract multipv number
                    mpv_idx = line.index("multipv") + 8
                    mpv_end = line.index(" ", mpv_idx)
                    mpv = int(line[mpv_idx:mpv_end])

                    # Extract move
                    pv_idx = line.index(" pv ") + 4
                    move = line[pv_idx:].split()[0]

                    # Extract evaluation
                    score = 0
                    if "score cp" in line:
                        cp_idx = line.index("score cp") + 9
                        cp_end = line.index(" ", cp_idx) if " " in line[cp_idx:] else len(line)
                        score = int(line[cp_idx:cp_end]) / 100
                    elif "score mate" in line:
                        mt_idx = line.index("score mate") + 11
                        mt_end = line.index(" ", mt_idx) if " " in line[mt_idx:] else len(line)
                        mate = int(line[mt_idx:mt_end])
                        score = 100 if mate > 0 else -100

                    moves[mpv] = (move, score)
                except:
                    pass

            if line.startswith("bestmove"):
                break

        self._sf_send("setoption name MultiPV value 1")
        return [(m, s) for mpv, (m, s) in sorted(moves.items())]

    def _personality_score(self, board, move):
        """Score move based on personality"""
        score = 0
        p = self.personality

        # Check if capture
        if board.is_capture(move):
            victim = board.piece_at(move.to_square)
            attacker = board.piece_at(move.from_square)
            if victim and attacker:
                victim_val = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                             chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}.get(victim.piece_type, 0)
                attacker_val = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                               chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}.get(attacker.piece_type, 0)

                # Sacrifice detection
                if attacker_val > victim_val:
                    score += p.get('sacrifice_bonus', 0)

                score += p.get('attack_bonus', 0) * 0.5

        # Center control
        if move.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
            score += p.get('center_bonus', 0) * 0.3

        # Check = attacking
        board.push(move)
        if board.is_check():
            score += p.get('attack_bonus', 0) * 0.5
            score += p.get('tactics_bonus', 0) * 0.3
        board.pop()

        # Piece development in opening
        if board.fullmove_number < 15:
            piece = board.piece_at(move.from_square)
            if piece and piece.piece_type in [chess.KNIGHT, chess.BISHOP]:
                from_rank = chess.square_rank(move.from_square)
                if (piece.color == chess.WHITE and from_rank == 0) or \
                   (piece.color == chess.BLACK and from_rank == 7):
                    score += 0.2  # Development bonus

        return score

    def _fallback_move(self, board):
        """Simple fallback when Stockfish unavailable"""
        moves = list(board.legal_moves)
        if not moves:
            return None

        # Prefer captures and checks
        best_move = None
        best_score = -100

        for move in moves:
            score = random.random()

            if board.is_capture(move):
                score += 3
            if board.gives_check(move):
                score += 2
            if move.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
                score += 1

            if score > best_score:
                best_score = score
                best_move = move

        return best_move

    def close(self):
        """Clean up Stockfish process"""
        if self.sf_process:
            self._sf_send("quit")
            self.sf_process.terminate()


def battle_engines(engine1_skill, engine2_skill, num_games=6, personality1='balanced', personality2='balanced'):
    """Battle two SupaChess configurations"""
    print("=" * 70)
    print(f"  ENGINE BATTLE: SupaChess Skill {engine1_skill} ({personality1})")
    print(f"                 vs SupaChess Skill {engine2_skill} ({personality2})")
    print("=" * 70)

    e1 = SupaChessHybrid(engine1_skill, personality1)
    e2 = SupaChessHybrid(engine2_skill, personality2)

    print(f"\n  Engine 1 ELO: ~{e1.elo}")
    print(f"  Engine 2 ELO: ~{e2.elo}")

    e1_score = 0
    e2_score = 0

    for game_num in range(num_games):
        board = chess.Board()
        e1_white = game_num % 2 == 0

        print(f"\n[Game {game_num + 1}/{num_games}] ", end="")
        print(f"{'E1' if e1_white else 'E2'} (White) vs {'E2' if e1_white else 'E1'} (Black)")

        move_count = 0
        while not board.is_game_over() and move_count < 200:
            is_e1_turn = (board.turn == chess.WHITE) == e1_white

            if is_e1_turn:
                move = e1.get_move(board, time_limit_ms=1000)
            else:
                move = e2.get_move(board, time_limit_ms=1000)

            if not move or move not in board.legal_moves:
                break

            board.push(move)
            move_count += 1

        # Result
        result = "draw"
        if board.is_checkmate():
            winner_white = board.turn == chess.BLACK
            if winner_white == e1_white:
                result = "e1"
            else:
                result = "e2"

        if result == "e1":
            e1_score += 1
            print(f"  🏆 Engine 1 wins! ({move_count} moves)")
        elif result == "e2":
            e2_score += 1
            print(f"  🏆 Engine 2 wins! ({move_count} moves)")
        else:
            e1_score += 0.5
            e2_score += 0.5
            print(f"  🤝 Draw ({move_count} moves)")

    e1.close()
    e2.close()

    print("\n" + "=" * 70)
    print(f"  FINAL SCORE: Engine 1 ({e1_score}) - Engine 2 ({e2_score})")
    winner = "Engine 1" if e1_score > e2_score else ("Engine 2" if e2_score > e1_score else "Draw")
    print(f"  WINNER: {winner}")
    print("=" * 70)

    return e1_score, e2_score


def test_vs_pure_stockfish(supachess_skill=15, stockfish_skill=15, num_games=4):
    """Test SupaChess hybrid against pure Stockfish"""
    print("=" * 70)
    print(f"  SupaChess Hybrid (Skill {supachess_skill}) vs Pure Stockfish (Skill {stockfish_skill})")
    print("=" * 70)

    engine = SupaChessHybrid(supachess_skill, 'tactical')

    # Direct Stockfish for opponent
    sf = subprocess.Popen(
        [str(STOCKFISH_PATH)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    sf.stdin.write("uci\n")
    sf.stdin.flush()
    time.sleep(0.5)
    sf.stdin.write(f"setoption name Skill Level value {stockfish_skill}\n")
    sf.stdin.write("isready\n")
    sf.stdin.flush()
    time.sleep(0.5)

    def get_sf_move(fen):
        sf.stdin.write(f"position fen {fen}\n")
        sf.stdin.write("go depth 12 movetime 1000\n")
        sf.stdin.flush()
        while True:
            line = sf.stdout.readline().strip()
            if line.startswith("bestmove"):
                return line.split()[1]

    zup_score = 0
    sf_score = 0

    for game_num in range(num_games):
        board = chess.Board()
        zup_white = game_num % 2 == 0

        print(f"\n[Game {game_num + 1}] ZUP plays {'White' if zup_white else 'Black'}")

        move_count = 0
        while not board.is_game_over() and move_count < 150:
            is_zup_turn = (board.turn == chess.WHITE) == zup_white

            if is_zup_turn:
                move = engine.get_move(board, time_limit_ms=1000)
            else:
                move_uci = get_sf_move(board.fen())
                try:
                    move = chess.Move.from_uci(move_uci)
                except:
                    move = None

            if not move or move not in board.legal_moves:
                break

            board.push(move)
            move_count += 1

        result = "draw"
        if board.is_checkmate():
            winner_white = board.turn == chess.BLACK
            if winner_white == zup_white:
                result = "win"
            else:
                result = "loss"

        if result == "win":
            zup_score += 1
            print(f"  🏆 SupaChess WINS! ({move_count} moves)")
        elif result == "loss":
            sf_score += 1
            print(f"  ❌ Stockfish wins ({move_count} moves)")
        else:
            zup_score += 0.5
            sf_score += 0.5
            print(f"  🤝 Draw ({move_count} moves)")

    sf.stdin.write("quit\n")
    sf.terminate()
    engine.close()

    print("\n" + "=" * 70)
    print(f"  RESULT: SupaChess {zup_score} - Stockfish {sf_score}")
    pct = zup_score / num_games * 100
    print(f"  SupaChess Score: {pct:.0f}%")
    print("=" * 70)

    return zup_score, sf_score


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "battle":
            s1 = int(sys.argv[2]) if len(sys.argv) > 2 else 15
            s2 = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            battle_engines(s1, s2)

        elif cmd == "test":
            zup_skill = int(sys.argv[2]) if len(sys.argv) > 2 else 15
            sf_skill = int(sys.argv[3]) if len(sys.argv) > 3 else 15
            test_vs_pure_stockfish(zup_skill, sf_skill)

    else:
        # Default: test SupaChess hybrid against Stockfish at same level
        print("\n[TEST 1] SupaChess Skill 10 vs Stockfish Skill 10")
        test_vs_pure_stockfish(10, 10, 4)

        print("\n[TEST 2] SupaChess Skill 15 vs Stockfish Skill 15")
        test_vs_pure_stockfish(15, 15, 4)
