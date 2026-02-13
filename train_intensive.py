"""
SupaChess Intensive Training
============================
Multiple training strategies to maximize learning.
"""

import json
import subprocess
import time
import random
from pathlib import Path
from datetime import datetime

try:
    import chess
except ImportError:
    import os
    os.system("pip install python-chess")
    import chess

BASE_PATH = Path(r"C:\Users\Hugop\chessnova")
KNOWLEDGE_PATH = BASE_PATH / "data" / "zup_knowledge_web.json"
STOCKFISH_PATH = Path(r"C:\Users\Hugop\stockfish\stockfish.exe")


class StockfishAnalyzer:
    def __init__(self):
        self.process = subprocess.Popen(
            [str(STOCKFISH_PATH)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self._send("uci")
        self._wait("uciok")
        self._send("setoption name Threads value 4")
        self._send("setoption name Hash value 512")
        self._send("setoption name Skill Level value 20")
        self._send("isready")
        self._wait("readyok")

    def _send(self, cmd):
        self.process.stdin.write(cmd + "\n")
        self.process.stdin.flush()

    def _wait(self, token, timeout=10):
        start = time.time()
        while time.time() - start < timeout:
            line = self.process.stdout.readline().strip()
            if token in line:
                return line
        return None

    def analyze(self, fen, depth=15):
        self._send(f"position fen {fen}")
        self._send(f"go depth {depth}")

        best_move = None
        evaluation = 0

        while True:
            line = self.process.stdout.readline().strip()
            if "score cp" in line:
                try:
                    idx = line.index("score cp") + 9
                    end = line.index(" ", idx) if " " in line[idx:] else len(line)
                    evaluation = int(line[idx:end]) / 100
                except:
                    pass
            elif "score mate" in line:
                try:
                    idx = line.index("score mate") + 11
                    end = line.index(" ", idx) if " " in line[idx:] else len(line)
                    mate = int(line[idx:end])
                    evaluation = 100 if mate > 0 else -100
                except:
                    pass
            if line.startswith("bestmove"):
                parts = line.split()
                if len(parts) >= 2:
                    best_move = parts[1]
                break

        return best_move, evaluation

    def get_top_moves(self, fen, n=5, depth=12):
        self._send(f"setoption name MultiPV value {n}")
        self._send(f"position fen {fen}")
        self._send(f"go depth {depth}")

        moves = {}
        while True:
            line = self.process.stdout.readline().strip()
            if "multipv" in line and " pv " in line:
                try:
                    mpv_idx = line.index("multipv") + 8
                    mpv_end = line.index(" ", mpv_idx)
                    mpv = int(line[mpv_idx:mpv_end])

                    pv_idx = line.index(" pv ") + 4
                    move = line[pv_idx:].split()[0]

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

        self._send("setoption name MultiPV value 1")
        return [(m, s) for mpv, (m, s) in sorted(moves.items())]

    def close(self):
        self._send("quit")
        self.process.terminate()


class KnowledgeBase:
    def __init__(self):
        self.path = KNOWLEDGE_PATH
        self.data = self._load()
        self.q_table = self.data.get("top_positions", {})
        self.elo = self.data.get("current_elo", 3200)

    def _load(self):
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding='utf-8'))
            except:
                pass
        return {"top_positions": {}, "current_elo": 3200}

    def save(self):
        # Keep top 200k positions by significance
        if len(self.q_table) > 200000:
            sorted_pos = sorted(self.q_table.items(), key=lambda x: abs(x[1]), reverse=True)
            self.q_table = dict(sorted_pos[:200000])

        self.data["top_positions"] = self.q_table
        self.data["current_elo"] = self.elo
        self.data["last_training"] = datetime.now().isoformat()
        self.data["positions_count"] = len(self.q_table)

        # Backup
        if self.path.exists():
            backup = self.path.with_suffix('.backup.json')
            if backup.exists():
                backup.unlink()
            try:
                self.path.rename(backup)
            except:
                pass

        self.path.write_text(json.dumps(self.data), encoding='utf-8')
        print(f"[SAVE] {len(self.q_table)} positions, ELO: {self.elo}")

    def learn(self, fen, value, move=None):
        key = fen.split()[0]
        if move:
            key = f"{key}_{move}"

        old = self.q_table.get(key, 0)
        new = old + 0.25 * (value - old)
        self.q_table[key] = round(new, 3)


def train_master_games(kb, sf, num_games=50):
    """Train by playing through master-level games"""
    print(f"\n[MASTER GAMES] Training {num_games} games...")

    positions_learned = 0

    for i in range(num_games):
        board = chess.Board()
        game_positions = 0

        # Play until game over or 60 moves
        while not board.is_game_over() and board.fullmove_number < 60:
            fen = board.fen()
            best_move, eval_score = sf.analyze(fen, depth=14)

            if not best_move:
                break

            # Adjust for perspective
            if board.turn == chess.BLACK:
                eval_score = -eval_score

            # Learn position
            kb.learn(fen, eval_score)
            positions_learned += 1
            game_positions += 1

            # Learn top moves
            top_moves = sf.get_top_moves(fen, n=3, depth=10)
            for j, (move_uci, move_eval) in enumerate(top_moves):
                if board.turn == chess.BLACK:
                    move_eval = -move_eval
                bonus = 3.0 if j == 0 else 1.0
                kb.learn(fen, move_eval + bonus, move_uci)

            # Play move
            try:
                move = chess.Move.from_uci(best_move)
                if move in board.legal_moves:
                    board.push(move)
                else:
                    break
            except:
                break

        print(f"  Game {i+1}/{num_games}: {game_positions} positions")

        if (i + 1) % 10 == 0:
            kb.save()

    return positions_learned


def train_tactical_positions(kb, sf, num_positions=200):
    """Train on tactical positions (forks, pins, skewers)"""
    print(f"\n[TACTICS] Training {num_positions} tactical positions...")

    # Generate random positions with tactical themes
    positions_learned = 0

    for i in range(num_positions):
        board = chess.Board()

        # Play random opening moves
        for _ in range(random.randint(10, 25)):
            moves = list(board.legal_moves)
            if not moves:
                break
            board.push(random.choice(moves))

        if board.is_game_over():
            continue

        fen = board.fen()

        # Deep analysis for tactics
        best_move, eval_before = sf.analyze(fen, depth=16)

        if not best_move:
            continue

        # Check if tactical (large eval swing)
        try:
            move = chess.Move.from_uci(best_move)
            board.push(move)
            _, eval_after = sf.analyze(board.fen(), depth=12)
            board.pop()

            eval_delta = abs(eval_after - eval_before)

            # Tactical position if big swing
            if eval_delta > 1.0:
                # High value position
                kb.learn(fen, eval_before * 2, best_move)
                positions_learned += 1

                if (i + 1) % 50 == 0:
                    print(f"  Tactical {i+1}/{num_positions}: {positions_learned} learned")
        except:
            pass

    return positions_learned


def train_endgames(kb, sf, num_positions=100):
    """Train on endgame positions"""
    print(f"\n[ENDGAMES] Training {num_positions} endgame positions...")

    positions_learned = 0

    # Common endgame setups
    endgame_templates = [
        "8/8/8/8/8/8/4K3/4R3 w - - 0 1",  # K+R vs K
        "8/8/8/8/8/8/4K3/3Q4 w - - 0 1",   # K+Q vs K
        "8/4P3/8/8/8/8/4K3/8 w - - 0 1",   # K+P vs K
        "8/8/8/8/8/4k3/4r3/4K3 w - - 0 1", # K vs K+R
    ]

    for i in range(num_positions):
        # Create random endgame
        board = chess.Board()
        board.clear()

        # Place kings
        white_king_sq = random.choice(range(64))
        board.set_piece_at(white_king_sq, chess.Piece(chess.KING, chess.WHITE))

        black_king_sq = random.choice([s for s in range(64) if chess.square_distance(s, white_king_sq) >= 2])
        board.set_piece_at(black_king_sq, chess.Piece(chess.KING, chess.BLACK))

        # Add 1-3 pieces
        for _ in range(random.randint(1, 3)):
            piece_type = random.choice([chess.ROOK, chess.QUEEN, chess.PAWN, chess.BISHOP])
            color = random.choice([chess.WHITE, chess.BLACK])
            empty_squares = [s for s in range(64) if not board.piece_at(s)]
            if empty_squares:
                sq = random.choice(empty_squares)
                if piece_type == chess.PAWN and chess.square_rank(sq) in [0, 7]:
                    continue
                board.set_piece_at(sq, chess.Piece(piece_type, color))

        board.turn = random.choice([chess.WHITE, chess.BLACK])

        if not board.is_valid():
            continue

        fen = board.fen()
        best_move, evaluation = sf.analyze(fen, depth=18)

        if best_move:
            kb.learn(fen, evaluation * 1.5)  # Extra weight for endgames
            kb.learn(fen, evaluation * 2, best_move)
            positions_learned += 1

        if (i + 1) % 25 == 0:
            print(f"  Endgame {i+1}/{num_positions}: {positions_learned} learned")

    return positions_learned


def train_openings_deep(kb, sf, depth=20):
    """Deep training on opening positions"""
    print(f"\n[OPENINGS] Deep training on openings...")

    openings = [
        # e4 openings
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],  # Ruy Lopez
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4"],  # Sicilian
        ["e2e4", "e7e6", "d2d4", "d7d5"],          # French
        ["e2e4", "c7c6", "d2d4", "d7d5"],          # Caro-Kann
        # d4 openings
        ["d2d4", "d7d5", "c2c4", "e7e6"],          # QGD
        ["d2d4", "g8f6", "c2c4", "g7g6"],          # King's Indian
        ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],  # Nimzo-Indian
        ["c2c4", "e7e5"],  # English
        ["g1f3", "d7d5", "g2g3"],  # Reti
    ]

    positions_learned = 0

    for opening in openings:
        board = chess.Board()

        for move_uci in opening:
            try:
                move = chess.Move.from_uci(move_uci)
                if move in board.legal_moves:
                    board.push(move)
            except:
                break

        # Analyze this position deeply
        fen = board.fen()
        _, evaluation = sf.analyze(fen, depth=depth)

        if board.turn == chess.BLACK:
            evaluation = -evaluation

        kb.learn(fen, evaluation)

        # Get all good moves from here
        top_moves = sf.get_top_moves(fen, n=5, depth=16)
        for move_uci, move_eval in top_moves:
            if board.turn == chess.BLACK:
                move_eval = -move_eval
            kb.learn(fen, move_eval + 2, move_uci)
            positions_learned += 1

        # Continue for 10 more moves
        for _ in range(10):
            best_move, eval_score = sf.analyze(board.fen(), depth=14)
            if not best_move:
                break

            fen = board.fen()
            if board.turn == chess.BLACK:
                eval_score = -eval_score

            kb.learn(fen, eval_score)
            kb.learn(fen, eval_score + 2, best_move)
            positions_learned += 1

            try:
                move = chess.Move.from_uci(best_move)
                board.push(move)
            except:
                break

    print(f"  Learned {positions_learned} opening positions")
    return positions_learned


def run_intensive_training():
    print("=" * 70)
    print("  SUPACHESS INTENSIVE TRAINING")
    print("=" * 70)

    sf = StockfishAnalyzer()
    kb = KnowledgeBase()

    print(f"\n[START] {len(kb.q_table)} positions, ELO: {kb.elo}")

    total_learned = 0

    # Phase 1: Opening training
    total_learned += train_openings_deep(kb, sf)
    kb.save()

    # Phase 2: Master games
    total_learned += train_master_games(kb, sf, num_games=40)
    kb.save()

    # Phase 3: Tactical training
    total_learned += train_tactical_positions(kb, sf, num_positions=150)
    kb.save()

    # Phase 4: Endgame training
    total_learned += train_endgames(kb, sf, num_positions=80)
    kb.save()

    # Phase 5: More master games
    total_learned += train_master_games(kb, sf, num_games=30)
    kb.save()

    sf.close()

    print("\n" + "=" * 70)
    print("  INTENSIVE TRAINING COMPLETE")
    print("=" * 70)
    print(f"  New positions learned: {total_learned}")
    print(f"  Total knowledge: {len(kb.q_table)} positions")
    print("=" * 70)


if __name__ == "__main__":
    run_intensive_training()
