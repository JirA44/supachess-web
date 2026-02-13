"""Test SupaChess vs multiple Stockfish levels"""
import chess
import chess.engine
import json
import time

# Load brain
with open("data/zup_knowledge_web.json", "r") as f:
    brain = json.load(f)

raw = brain.get("top_positions", {})
positions = {}
for key, ev in raw.items():
    if "_" in key:
        parts = key.rsplit("_", 1)
        if 4 <= len(parts[1]) <= 5:
            positions[parts[0]] = {"best_move": parts[1], "eval": ev}

print(f"SupaChess Brain: {len(positions):,} positions")
print("="*55)

engine = chess.engine.SimpleEngine.popen_uci("C:/Users/Hugop/stockfish/stockfish.exe")

def get_fen_key(b):
    return b.fen().split()[0]

def get_move(board):
    fk = get_fen_key(board)
    if fk in positions:
        try:
            m = chess.Move.from_uci(positions[fk]["best_move"])
            if m in board.legal_moves:
                return m
        except:
            pass
    
    # Search
    best = None
    best_ev = -99999
    for m in board.legal_moves:
        board.push(m)
        ck = get_fen_key(board)
        ev = -positions.get(ck, {}).get("eval", 0) if ck in positions else 0
        for m2 in list(board.legal_moves)[:5]:
            board.push(m2)
            k2 = get_fen_key(board)
            if k2 in positions:
                ev = max(ev, positions[k2].get("eval", 0))
            board.pop()
        board.pop()
        if ev > best_ev:
            best_ev = ev
            best = m
    
    if best:
        return best
    legal = list(board.legal_moves)
    for m in legal:
        if board.is_capture(m):
            return m
    return legal[0]

def play(white, skill):
    engine.configure({"Skill Level": skill})
    board = chess.Board()
    moves = 0
    while not board.is_game_over() and moves < 150:
        if (board.turn == chess.WHITE) == white:
            m = get_move(board)
        else:
            r = engine.play(board, chess.engine.Limit(time=0.3))
            m = r.move
        board.push(m)
        moves += 1
    res = board.result()
    if res == "1-0":
        return 1 if white else 0
    elif res == "0-1":
        return 0 if white else 1
    return 0.5

for skill in [15, 17, 18, 19, 20]:
    elo_map = {15: 2830, 17: 3000, 18: 3100, 19: 3200, 20: 3300}
    elo = elo_map.get(skill, skill * 160)
    print(f"\nVS STOCKFISH SKILL {skill} (~{elo} ELO)")
    results = []
    for i in range(4):
        white = i < 2
        s = play(white, skill)
        results.append(s)
        sym = "+" if s == 1 else "=" if s == 0.5 else "-"
        print(f"  Game {i+1}: {sym}", end="", flush=True)
    total = sum(results)
    pct = total / 4 * 100
    print(f" | {total}/4 ({pct:.0f}%)")

engine.quit()
print("\n" + "="*55)
print("TEST COMPLETE")
