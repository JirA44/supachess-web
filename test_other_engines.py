"""
Test SupaChess against other engines via APIs
"""

import json
import subprocess
import time
import random
from pathlib import Path

try:
    import chess
    import requests
except ImportError:
    import os
    os.system("pip install python-chess requests")
    import chess
    import requests

from supachess_hybrid import SupaChessHybrid

STOCKFISH_PATH = Path(r"C:\Users\Hugop\stockfish\stockfish.exe")


class LichessEngine:
    """Use Lichess API for engine analysis (free tier)"""

    def __init__(self, level=8):
        self.level = level  # 1-8
        self.api_url = "https://lichess.org/api/cloud-eval"

    def get_move(self, fen, timeout=5):
        """Get move from Lichess cloud eval"""
        try:
            # Lichess cloud eval returns cached SF analysis
            resp = requests.get(
                self.api_url,
                params={"fen": fen, "multiPv": 3},
                timeout=timeout
            )
            if resp.status_code == 200:
                data = resp.json()
                if "pvs" in data and data["pvs"]:
                    # Get best move from PV
                    pv = data["pvs"][0].get("moves", "").split()
                    if pv:
                        return pv[0]
        except Exception as e:
            print(f"Lichess API error: {e}")
        return None


class RandomEngine:
    """Random move generator for baseline testing"""

    def __init__(self, prefer_captures=True):
        self.prefer_captures = prefer_captures

    def get_move(self, board):
        moves = list(board.legal_moves)
        if not moves:
            return None

        if self.prefer_captures:
            captures = [m for m in moves if board.is_capture(m)]
            if captures and random.random() < 0.7:
                return random.choice(captures)

        return random.choice(moves)


def test_vs_random(num_games=10, supachess_skill=10):
    """Test SupaChess against random player"""
    print("=" * 70)
    print(f"  SupaChess (Skill {supachess_skill}) vs Random Engine")
    print("=" * 70)

    engine = SupaChessHybrid(supachess_skill, 'aggressive')
    random_eng = RandomEngine()

    wins = draws = losses = 0

    for game_num in range(num_games):
        board = chess.Board()
        zup_white = game_num % 2 == 0

        print(f"[Game {game_num + 1}] ", end="")

        move_count = 0
        while not board.is_game_over() and move_count < 200:
            is_zup_turn = (board.turn == chess.WHITE) == zup_white

            if is_zup_turn:
                move = engine.get_move(board, time_limit_ms=500)
            else:
                move = random_eng.get_move(board)

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
            wins += 1
            print(f"WIN ({move_count} moves)")
        elif result == "loss":
            losses += 1
            print(f"LOSS ({move_count} moves)")
        else:
            draws += 1
            print(f"DRAW ({move_count} moves)")

    engine.close()

    print("\n" + "=" * 70)
    print(f"  RESULT: +{wins} ={draws} -{losses}")
    print(f"  Win Rate: {wins/num_games*100:.0f}%")
    print("=" * 70)

    return wins, draws, losses


def test_vs_stockfish_levels(supachess_skill=15):
    """Test SupaChess against various Stockfish skill levels"""
    print("=" * 70)
    print(f"  SupaChess (Skill {supachess_skill}) vs Stockfish Gauntlet")
    print("=" * 70)

    engine = SupaChessHybrid(supachess_skill, 'tactical')

    # Stockfish at different levels
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
    sf.stdin.write("isready\n")
    sf.stdin.flush()
    time.sleep(0.5)

    def sf_move(fen, skill, depth=10):
        sf.stdin.write(f"setoption name Skill Level value {skill}\n")
        sf.stdin.write(f"position fen {fen}\n")
        sf.stdin.write(f"go depth {depth} movetime 500\n")
        sf.stdin.flush()
        while True:
            line = sf.stdout.readline().strip()
            if line.startswith("bestmove"):
                return line.split()[1]

    results = {}

    for sf_skill in [1, 5, 10, 15, 20]:
        print(f"\n[vs Stockfish Skill {sf_skill}]")

        score = 0
        for game_num in range(2):  # 2 games each
            board = chess.Board()
            zup_white = game_num % 2 == 0

            move_count = 0
            while not board.is_game_over() and move_count < 150:
                is_zup_turn = (board.turn == chess.WHITE) == zup_white

                if is_zup_turn:
                    move = engine.get_move(board, time_limit_ms=500)
                else:
                    move_uci = sf_move(board.fen(), sf_skill)
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
                    score += 1
                else:
                    result = "loss"
            else:
                score += 0.5

            emoji = {"win": "W", "loss": "L", "draw": "D"}[result]
            print(f"  Game {game_num + 1}: {emoji}", end=" ")

        results[sf_skill] = score
        print(f"| Score: {score}/2")

    sf.stdin.write("quit\n")
    sf.terminate()
    engine.close()

    print("\n" + "=" * 70)
    print("  GAUNTLET RESULTS")
    print("=" * 70)
    for skill, score in results.items():
        elo_est = 800 + (skill - 1) * 145
        print(f"  vs SF Skill {skill:2d} (~{elo_est} ELO): {score}/2 ({score/2*100:.0f}%)")
    print("=" * 70)

    # Estimate SupaChess ELO based on results
    total_score = sum(results.values())
    max_score = len(results) * 2
    performance = total_score / max_score

    # Find level where SupaChess scores ~50%
    estimated_elo = 800
    for skill, score in results.items():
        if score >= 1:  # 50% or better
            estimated_elo = 800 + (skill - 1) * 145

    print(f"\n  Estimated SupaChess ELO: ~{estimated_elo}")
    print(f"  Overall Performance: {performance*100:.0f}%")

    return results


def test_vs_lichess_cloud(num_positions=5):
    """Test against Lichess cloud evaluation"""
    print("=" * 70)
    print("  Test vs Lichess Cloud Eval")
    print("=" * 70)

    engine = SupaChessHybrid(15, 'balanced')
    lichess = LichessEngine()

    # Test positions
    test_positions = [
        chess.STARTING_FEN,
        "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",  # Italian
        "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",  # Ruy Lopez
        "rnbqkb1r/pp2pppp/3p1n2/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4",  # Sicilian
        "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",  # QGD
    ]

    matches = 0
    total = 0

    for fen in test_positions:
        board = chess.Board(fen)

        zup_move = engine.get_move(board, time_limit_ms=1000)
        lichess_move = lichess.get_move(fen)

        if zup_move and lichess_move:
            total += 1
            match = zup_move.uci() == lichess_move
            if match:
                matches += 1

            print(f"Position: {fen[:30]}...")
            print(f"  SupaChess: {zup_move.uci()}")
            print(f"  Lichess:   {lichess_move}")
            print(f"  Match: {'Yes' if match else 'No'}")

    engine.close()

    if total > 0:
        print(f"\nMove agreement: {matches}/{total} ({matches/total*100:.0f}%)")

    return matches, total


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "random":
            test_vs_random(10)
        elif cmd == "gauntlet":
            skill = int(sys.argv[2]) if len(sys.argv) > 2 else 15
            test_vs_stockfish_levels(skill)
        elif cmd == "lichess":
            test_vs_lichess_cloud()
    else:
        # Run all tests
        print("\n[TEST 1] vs Random Engine")
        test_vs_random(6)

        print("\n[TEST 2] Stockfish Gauntlet")
        test_vs_stockfish_levels(15)
