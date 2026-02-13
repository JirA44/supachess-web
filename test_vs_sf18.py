"""Test SupaChess vs Stockfish Skill 18 (~3100 ELO)"""
import chess
import chess.engine
import json
import time

# Load SupaChess brain
with open("data/zup_knowledge_web.json", "r") as f:
    brain = json.load(f)

raw_positions = brain.get("top_positions", {})
positions = {}
for key, eval_score in raw_positions.items():
    if "_" in key:
        parts = key.rsplit("_", 1)
        positions[parts[0]] = {"best_move": parts[1], "eval": eval_score}

print(f"SupaChess: {len(positions):,} positions")
print("="*50)
print("TEST VS STOCKFISH SKILL 18 (~3100 ELO)")
print("="*50)

engine = chess.engine.SimpleEngine.popen_uci("C:/Users/Hugop/stockfish/stockfish.exe")
engine.configure({"Skill Level": 18})

def get_fen_key(board):
    return board.fen().split()[0]

def get_supachess_move(board):
    fen_key = get_fen_key(board)
    
    if fen_key in positions:
        data = positions[fen_key]
        try:
            move = chess.Move.from_uci(data["best_move"])
            if move in board.legal_moves:
                return move
        except:
            pass
    
    best_move = None
    best_eval = -99999
    
    for move in board.legal_moves:
        board.push(move)
        child_key = get_fen_key(board)
        eval_score = -positions.get(child_key, {}).get("eval", 0) if child_key in positions else 0
        
        for move2 in list(board.legal_moves)[:6]:
            board.push(move2)
            k2 = get_fen_key(board)
            if k2 in positions:
                eval_score = max(eval_score, positions[k2].get("eval", 0))
            board.pop()
        
        board.pop()
        
        if eval_score > best_eval:
            best_eval = eval_score
            best_move = move
    
    if best_move:
        return best_move
    
    legal = list(board.legal_moves)
    for m in legal:
        if board.is_capture(m):
            return m
    return legal[0]

def play_game(supachess_white):
    board = chess.Board()
    moves = 0
    
    while not board.is_game_over() and moves < 150:
        if (board.turn == chess.WHITE) == supachess_white:
            move = get_supachess_move(board)
        else:
            result = engine.play(board, chess.engine.Limit(time=0.5))
            move = result.move
        board.push(move)
        moves += 1
    
    result = board.result()
    if result == "1-0":
        return 1 if supachess_white else 0
    elif result == "0-1":
        return 0 if supachess_white else 1
    return 0.5

print("\nPlaying 6 games...")
results = []
for i in range(6):
    as_white = i < 3
    color = "W" if as_white else "B"
    print(f"Game {i+1}/6 ({color})...", end=" ", flush=True)
    score = play_game(as_white)
    results.append(score)
    print("WIN!" if score == 1 else "Draw" if score == 0.5 else "Loss")

engine.quit()

total = sum(results)
pct = total / len(results) * 100
print(f"\nFINAL: {total}/{len(results)} ({pct:.0f}%) - Wins: {results.count(1)}, Draws: {results.count(0.5)}, Losses: {results.count(0)}")
