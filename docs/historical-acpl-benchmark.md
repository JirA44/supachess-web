# Historical ACPL benchmark (experimental)

This CLI calculates average centipawn loss for players in a PGN sample using a **single UCI engine** and fixed search depth. It does **not** claim to establish an all-time definitive ranking.

## Installation
```bash
python -m pip install python-chess
```
Install Stockfish separately and pass the path to the executable.

## Run
```bash
python tools/historical_acpl.py data/world_championships.pgn --engine /path/to/stockfish --depth 16 --skip-plies 12 --output results/acpl.json
```
On Windows, `--engine "C:\\stockfish\\stockfish.exe"` is an example path; use the path on your own machine.

## Protocol
- Analyze the original position before each eligible move.
- Compare engine's best unrestricted evaluation to the evaluation with the played move forced, at the same nominal search depth.
- Express both scores from the side-to-move's perspective.
- Loss per move = `max(0, best_cp - played_cp)`; ACPL = arithmetic average of these losses.
- Skip first 12 half-moves by default and **omit positions involving mate scores** from the ACPL denominator.
- Group by the PGN White/Black headers. Different spellings are treated as different players.
- Save provenance (engine identifier, depth, thread/hash configuration, number of games and positions) in JSON.
- `accuracy_percent` and `best_move_rate` are null, intentionally. There is no universal conversion from ACPL to the precision of Chess.com or Lichess.

## Caveats
- Same search depth does not ensure equally reliable evaluations. `root_moves` changes the search; results are sensitive to engine version and hardware/search configuration.
- This score is **not the same** as published historical scores using another methodology (e.g. game-ending evaluation, win-probability accuracy, or different move exclusions).
- A player's opening selection, game length, opponents, event and era influence the ranking. For fair comparisons, report game counts and split by time controls, years, phases and result.
- Training games, blitz, rapid and classical should be **separate input datasets**.
- Very deep analyses of large PGN collections are computationally expensive.
- Do not label this output as a measured accuracy percentage or publish uncomputed values.
- No front-end integration or live deployment is included in this first CLI version.

## Acceptance criteria for later integration
1. Test on a known two-player mini PGN and assert two rows and a finite ACPL.
2. Assert all move losses are nonnegative and mate-scored positions are omitted.
3. Confirm results reproducibly on a frozen Stockfish binary with recorded depth/configuration.
4. Add optional phase/time control filters, PGN name normalization and engine-evaluation caching.
5. Add a UI for loading the produced JSON and displaying sample sizes and parameters next to the ranking.
