"""Debug: Check if brain is working"""
import chess
import json

with open("data/zup_knowledge_web.json", "r") as f:
    brain = json.load(f)

raw = brain.get("top_positions", {})

# Parse positions
valid = 0
invalid = 0
positions = {}

for key, eval_score in raw.items():
    if "_" in key:
        parts = key.rsplit("_", 1)
        fen = parts[0]
        move = parts[1]
        # Validate move format
        if len(move) >= 4 and len(move) <= 5:
            positions[fen] = {"best_move": move, "eval": eval_score}
            valid += 1
        else:
            invalid += 1
    else:
        invalid += 1

print(f"Valid positions: {valid:,}")
print(f"Invalid entries: {invalid:,}")

# Test if starting position has moves
board = chess.Board()
fen_key = board.fen().split()[0]
print(f"\nStarting position: {fen_key}")
print(f"In database: {fen_key in positions}")

# Check common openings
openings = [
    "e4", "d4", "Nf3", "c4"
]
for o in openings:
    b = chess.Board()
    b.push_san(o)
    fk = b.fen().split()[0]
    found = fk in positions
    print(f"After 1.{o}: {'FOUND' if found else 'missing'}")

# Show some random positions
print("\nSample positions:")
for i, (fen, data) in enumerate(list(positions.items())[:5]):
    print(f"  {fen[:40]}... -> {data['best_move']}")
