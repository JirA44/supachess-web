#!/usr/bin/env python3
"""Reproducible historical chess ACPL benchmark (not Chess.com accuracy).

Requires: pip install python-chess
Example:
 python tools/historical_acpl.py games.pgn --engine /path/to/stockfish --depth 16 --skip-plies 12 --output results.json
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

import chess
import chess.engine
import chess.pgn


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pgn", type=Path, help="PGN file with one or more games")
    ap.add_argument("--engine", required=True, help="Stockfish/UCI executable path")
    ap.add_argument("--depth", type=int, default=16)
    ap.add_argument("--skip-plies", type=int, default=12, help="Opening plies excluded per game")
    ap.add_argument("--max-games", type=int, default=0, help="0 means all games")
    ap.add_argument("--output", type=Path, default=Path("historical_acpl.json"))
    ap.add_argument("--threads", type=int, default=1)
    ap.add_argument("--hash-mb", type=int, default=128)
    args = ap.parse_args()
    if args.depth < 1 or args.skip_plies < 0 or args.threads < 1 or args.hash_mb < 1:
        ap.error("depth, threads and hash-mb must be positive; skip-plies must be nonnegative")

    stats = defaultdict(lambda: {"losses_cp": [], "games": set(), "excluded_mates": 0})
    processed = 0
    rejected = 0
    limit = chess.engine.Limit(depth=args.depth)
    with chess.engine.SimpleEngine.popen_uci(str(args.engine)) as engine:
        available = engine.options
        config = {}
        if "Threads" in available:
            config["Threads"] = args.threads
        if "Hash" in available:
            config["Hash"] = args.hash_mb
        if config:
            engine.configure(config)
        engine_id = dict(engine.id)
        with args.pgn.open("r", encoding="utf-8-sig", errors="replace") as fh:
            while args.max_games == 0 or processed < args.max_games:
                game = chess.pgn.read_game(fh)
                if game is None:
                    break
                if game.errors:
                    rejected += 1
                    continue
                white = game.headers.get("White", "Unknown (White)").strip()
                black = game.headers.get("Black", "Unknown (Black)").strip()
                board = game.board()
                processed += 1
                for ply, move in enumerate(game.mainline_moves()):
                    if move not in board.legal_moves:
                        rejected += 1
                        break
                    if ply >= args.skip_plies:
                        player = white if board.turn == chess.WHITE else black
                        item = stats[player]
                        item["games"].add(processed)
                        # Both searches begin at the SAME position and same depth.
                        # This measures engine-evaluation loss, not playing strength directly.
                        best = engine.analyse(board, limit, info=chess.engine.INFO_SCORE)
                        forced = engine.analyse(
                            board, limit, root_moves=[move], info=chess.engine.INFO_SCORE
                        )
                        best_score = best["score"].pov(board.turn)
                        played_score = forced["score"].pov(board.turn)
                        if best_score.is_mate() or played_score.is_mate():
                            item["excluded_mates"] += 1
                        else:
                            loss = max(0, best_score.score() - played_score.score())
                            item["losses_cp"].append(loss)
                    board.push(move)

    rows = []
    for name, item in stats.items():
        losses = item["losses_cp"]
        rows.append({
            "player": name,
            "games_sampled": len(item["games"]),
            "plies_scored": len(losses),
            "excluded_mate_positions": item["excluded_mates"],
            "acpl": round(sum(losses) / len(losses), 3) if losses else None,
            "median_cp_loss": sorted(losses)[len(losses)//2] if len(losses)%2 else (
                (sorted(losses)[len(losses)//2-1] + sorted(losses)[len(losses)//2])/2 if losses else None
            ),
            "best_move_rate": None,
            "accuracy_percent": None
        })
    rows.sort(key=lambda x: (x["acpl"] is None, x["acpl"] if x["acpl"] is not None else float("inf"), x["player"]))
    output = {
        "method": "same-position UCI best-vs-forced evaluation; mate positions omitted",
        "disclaimer": "ACPL is not accuracy %. Results depend on PGN sample, depth and engine.",
        "engine_id": engine_id,
        "depth": args.depth,
        "skip_plies": args.skip_plies,
        "threads": args.threads,
        "hash_mb": args.hash_mb,
        "games_parsed": processed,
        "games_rejected": rejected,
        "ranking": rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{processed} games processed; {rejected} rejected; {len(rows)} players -> {args.output}")
    for i, row in enumerate(rows[:20], 1):
        print(f"{i:>2}. {row['player']:<32} ACPL {row['acpl']} ({row['plies_scored']} plies)")


if __name__ == "__main__":
    main()
