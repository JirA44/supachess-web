"""
SupaChess Training with Minimax Search
======================================
Train by running actual search and learning from results.
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
        if len(self.q_table) > 200000:
            sorted_pos = sorted(self.q_table.items(), key=lambda x: abs(x[1]), reverse=True)
            self.q_table = dict(sorted_pos[:200000])

        self.data["top_positions"] = self.q_table
        self.data["current_elo"] = self.elo
        self.data["last_training"] = datetime.now().isoformat()
        self.data["positions_count"] = len(self.q_table)

        if self.path.exists():
            backup = self.path.with_suffix('.backup.json')
            if backup.exists():
                backup.unlink()
            try:
                self.path.rename(backup)
            except:
                pass

        self.path.write_text(json.dumps(self.data), encoding='utf-8')
        print(f"[SAVE] {len(self.q_table)} positions")

    def get(self, fen):
        return self.q_table.get(fen.split()[0], None)

    def learn(self, fen, value, move=None):
        key = fen.split()[0]
        if move:
            key = f"{key}_{move}"
        old = self.q_table.get(key, 0)
        new = old + 0.3 * (value - old)
        self.q_table[key] = round(new, 3)


# Piece values for evaluation
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

# Piece-square tables
PST_PAWN = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
]

PST_KNIGHT = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
]


def evaluate(board, kb):
    """Evaluate position using material + PST + knowledge"""
    if board.is_checkmate():
        return -10000 if board.turn else 10000
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    score = 0

    # Material and PST
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece:
            value = PIECE_VALUES.get(piece.piece_type, 0)

            # PST bonus
            if piece.piece_type == chess.PAWN:
                pst_sq = sq if piece.color == chess.WHITE else chess.square_mirror(sq)
                value += PST_PAWN[pst_sq]
            elif piece.piece_type == chess.KNIGHT:
                pst_sq = sq if piece.color == chess.WHITE else chess.square_mirror(sq)
                value += PST_KNIGHT[pst_sq]

            if piece.color == chess.WHITE:
                score += value
            else:
                score -= value

    # Mobility
    score += len(list(board.legal_moves)) * 5

    # Knowledge bonus
    kb_score = kb.get(board.fen())
    if kb_score:
        score += kb_score * 50

    return score if board.turn == chess.WHITE else -score


def minimax(board, kb, depth, alpha, beta, maximizing):
    """Minimax with alpha-beta pruning"""
    if depth == 0 or board.is_game_over():
        return evaluate(board, kb), None

    best_move = None

    if maximizing:
        max_eval = float('-inf')
        for move in board.legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, kb, depth - 1, alpha, beta, False)
            board.pop()

            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move

            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break

        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, kb, depth - 1, alpha, beta, True)
            board.pop()

            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move

            beta = min(beta, eval_score)
            if beta <= alpha:
                break

        return min_eval, best_move


def train_with_search(kb, num_games=30, search_depth=3):
    """Train by playing games with minimax search"""
    print(f"\n[SEARCH TRAINING] {num_games} games at depth {search_depth}")

    wins = draws = losses = 0

    for game_num in range(num_games):
        board = chess.Board()
        positions = []
        move_count = 0

        while not board.is_game_over() and move_count < 100:
            fen = board.fen()
            positions.append((fen, board.turn))

            # Use minimax to find best move
            _, best_move = minimax(board, kb, search_depth, float('-inf'), float('inf'), board.turn == chess.WHITE)

            if best_move:
                board.push(best_move)
            else:
                break

            move_count += 1

        # Determine result
        result = 0  # draw
        if board.is_checkmate():
            result = 1 if board.turn == chess.BLACK else -1

        # Learn from game
        reward = result * 10
        for fen, turn in reversed(positions):
            perspective_reward = reward if turn == chess.WHITE else -reward
            kb.learn(fen, perspective_reward)
            reward *= 0.95

        if result > 0:
            wins += 1
            emoji = "W"
        elif result < 0:
            losses += 1
            emoji = "L"
        else:
            draws += 1
            emoji = "D"

        print(f"  Game {game_num+1}: {emoji} ({move_count} moves)")

        if (game_num + 1) % 10 == 0:
            kb.save()

    return wins, draws, losses


def train_vs_stockfish_learn(kb, num_games=20, sf_skill=10):
    """Play vs Stockfish and learn from games"""
    print(f"\n[VS STOCKFISH] {num_games} games vs Skill {sf_skill}")

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
    sf.stdin.write(f"setoption name Skill Level value {sf_skill}\n")
    sf.stdin.write("setoption name Threads value 2\n")
    sf.stdin.write("isready\n")
    sf.stdin.flush()
    time.sleep(0.5)

    def get_sf_move(fen):
        sf.stdin.write(f"position fen {fen}\n")
        sf.stdin.write("go depth 10 movetime 500\n")
        sf.stdin.flush()
        while True:
            line = sf.stdout.readline().strip()
            if line.startswith("bestmove"):
                return line.split()[1]

    def get_sf_eval(fen):
        sf.stdin.write(f"position fen {fen}\n")
        sf.stdin.write("go depth 12\n")
        sf.stdin.flush()
        evaluation = 0
        while True:
            line = sf.stdout.readline().strip()
            if "score cp" in line:
                try:
                    idx = line.index("score cp") + 9
                    end = line.index(" ", idx) if " " in line[idx:] else len(line)
                    evaluation = int(line[idx:end]) / 100
                except:
                    pass
            if line.startswith("bestmove"):
                break
        return evaluation

    wins = draws = losses = 0

    for game_num in range(num_games):
        board = chess.Board()
        zup_white = game_num % 2 == 0
        positions = []
        move_count = 0

        while not board.is_game_over() and move_count < 100:
            fen = board.fen()
            is_zup_turn = (board.turn == chess.WHITE) == zup_white

            if is_zup_turn:
                # ZUP move with minimax
                _, move = minimax(board, kb, 3, float('-inf'), float('inf'), board.turn == chess.WHITE)
                if move:
                    # Learn from Stockfish's evaluation
                    sf_eval = get_sf_eval(fen)
                    if board.turn == chess.BLACK:
                        sf_eval = -sf_eval
                    kb.learn(fen, sf_eval)
                    kb.learn(fen, sf_eval + 1, move.uci())
            else:
                # Stockfish move
                move_uci = get_sf_move(fen)
                try:
                    move = chess.Move.from_uci(move_uci)
                except:
                    move = None

            if move and move in board.legal_moves:
                positions.append((fen, board.turn))
                board.push(move)
            else:
                break

            move_count += 1

        # Result
        result = "draw"
        if board.is_checkmate():
            winner_white = board.turn == chess.BLACK
            if winner_white == zup_white:
                result = "win"
                wins += 1
            else:
                result = "loss"
                losses += 1
        else:
            draws += 1

        emoji = {"win": "W", "loss": "L", "draw": "D"}[result]
        print(f"  Game {game_num+1}: {emoji} ({move_count} moves)")

        if (game_num + 1) % 5 == 0:
            kb.save()

    sf.stdin.write("quit\n")
    sf.terminate()

    return wins, draws, losses


def run_search_training():
    print("=" * 70)
    print("  SUPACHESS SEARCH-BASED TRAINING")
    print("=" * 70)

    kb = KnowledgeBase()
    print(f"\n[START] {len(kb.q_table)} positions")

    # Phase 1: Self-play with search
    print("\n[PHASE 1] Self-play with minimax")
    train_with_search(kb, num_games=20, search_depth=3)
    kb.save()

    # Phase 2: Play vs Stockfish Skill 5 and learn
    print("\n[PHASE 2] Learn from Stockfish Skill 5")
    train_vs_stockfish_learn(kb, num_games=15, sf_skill=5)
    kb.save()

    # Phase 3: Play vs Stockfish Skill 10
    print("\n[PHASE 3] Learn from Stockfish Skill 10")
    train_vs_stockfish_learn(kb, num_games=15, sf_skill=10)
    kb.save()

    # Phase 4: More self-play at higher depth
    print("\n[PHASE 4] Self-play depth 4")
    train_with_search(kb, num_games=15, search_depth=4)
    kb.save()

    print("\n" + "=" * 70)
    print(f"  TRAINING COMPLETE: {len(kb.q_table)} positions")
    print("=" * 70)


if __name__ == "__main__":
    run_search_training()
