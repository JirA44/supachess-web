"""Test SupaChess vs Leela Chess Zero (Top 2 World)"""
import chess
import chess.engine
import json
import time
import os

# Load SupaChess brain
with open("data/zup_knowledge_web.json", "r") as f:
    brain = json.load(f)

raw_positions = brain.get("top_positions", {})
positions = {}
for key, eval_score in raw_positions.items():
    if "_" in key:
        parts = key.rsplit("_", 1)
        fen_short = parts[0]
        best_move = parts[1]
        positions[fen_short] = {"best_move": best_move, "eval": eval_score}

print(f"SupaChess: {len(positions):,} positions")
print("="*60)
print("TEST VS LEELA CHESS ZERO (Top 2 World, Neural Network)")
print("="*60)

# Initialize LC0
lc0_dir = "C:/Users/Hugop/engines/lc0"
engine = chess.engine.SimpleEngine.popen_uci(
    f"{lc0_dir}/lc0.exe",
    cwd=lc0_dir
)

def get_fen_key(board):
    return board.fen().split()[0]

def get_supachess_move(board):
    fen_key = get_fen_key(board)
    
    if fen_key in positions:
        data = positions[fen_key]
        try:
            move = chess.Move.from_uci(data["best_move"])
            if move in board.legal_moves:
                return move, data.get("eval", 0)
        except:
            pass
    
    best_move = None
    best_eval = -99999
    
    for move in board.legal_moves:
        board.push(move)
        child_key = get_fen_key(board)
        
        eval_score = 0
        if child_key in positions:
            eval_score = -positions[child_key].get("eval", 0)
        
        for move2 in list(board.legal_moves)[:8]:
            board.push(move2)
            key2 = get_fen_key(board)
            if key2 in positions:
                eval_score = max(eval_score, positions[key2].get("eval", 0))
            board.pop()
        
        board.pop()
        
        if eval_score > best_eval:
            best_eval = eval_score
            best_move = move
    
    if best_move:
        return best_move, best_eval
    
    legal = list(board.legal_moves)
    for m in legal:
        if board.is_capture(m):
            return m, 0
    return legal[0], 0

def play_game(supachess_white):
    board = chess.Board()
    moves = 0
    
    while not board.is_game_over() and moves < 150:
        if (board.turn == chess.WHITE) == supachess_white:
            move, _ = get_supachess_move(board)
        else:
            # LC0 with 1 second thinking time
            result = engine.play(board, chess.engine.Limit(time=1.0))
            move = result.move
        
        board.push(move)
        moves += 1
    
    result = board.result()
    if result == "1-0":
        return 1 if supachess_white else 0
    elif result == "0-1":
        return 0 if supachess_white else 1
    else:
        return 0.5

print("\nPlaying 4 games (2 as white, 2 as black)...")
print("LC0: 1s/move with 791k network")
print()

results = []
for i in range(4):
    as_white = i < 2
    color = "WHITE" if as_white else "BLACK"
    print(f"Game {i+1}/4 - SupaChess as {color}...", end=" ", flush=True)
    
    start = time.time()
    score = play_game(as_white)
    elapsed = time.time() - start
    
    results.append(score)
    
    if score == 1:
        print(f"WIN! ({elapsed:.0f}s)")
    elif score == 0:
        print(f"Loss ({elapsed:.0f}s)")
    else:
        print(f"DRAW! ({elapsed:.0f}s)")

engine.quit()

total = sum(results)
pct = total / len(results) * 100

print()
print("="*60)
print(f"FINAL vs LC0: {total}/{len(results)} points ({pct:.0f}%)")
print(f"Wins: {results.count(1)}, Draws: {results.count(0.5)}, Losses: {results.count(0)}")
print("="*60)
