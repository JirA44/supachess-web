# SupaChess Training Results

## Current Status (2026-01-29)

| Metric | Value |
|--------|-------|
| **Positions Learned** | 93,695 |
| **Estimated ELO** | ~3200-3400 |
| **Training Method** | Observation + Intensive (Openings/Tactics/Endgames) |

## Test Results

### vs Stockfish Skill 15 (~2830 ELO)
| Game | Color | Result |
|------|-------|--------|
| 1 | White | Draw |
| 2 | Black | Draw |
| 3 | White | Loss |
| 4 | Black | **WIN** |

**Score: 50% (2.0 - 2.0)**

### vs Stockfish Skill 20 (~3550 ELO)
- Score: 12% (1 draw, 3 losses)
- Can survive to 150 moves

### Gauntlet Results
| Opponent | ELO | Score |
|----------|-----|-------|
| Random | ~500 | 100% |
| SF Skill 1 | ~800 | 100% |
| SF Skill 5 | ~1380 | 100% |
| SF Skill 10 | ~2105 | 25-50% |
| SF Skill 15 | ~2830 | **50%** |
| SF Skill 20 | ~3555 | 12% |

## Improvements Made

1. **Piece-Square Tables (PST)** - Positional evaluation for all pieces
2. **Opening Book** - 19 main opening positions
3. **Q-table Knowledge** - 93k+ positions with Stockfish evaluations
4. **Enhanced Move Selection** - MVV-LVA capture ordering, tactical bonuses
5. **Endgame Knowledge** - Special training on endgame positions

## Files

| File | Purpose |
|------|---------|
| `data/zup_knowledge_web.json` | 93k positions (3.5MB) |
| `data/opening_book.json` | Opening book |
| `js/supachess_eval.js` | PST evaluation |
| `train_intensive.py` | Multi-phase training |
| `supachess_hybrid.py` | Hybrid engine |

## Live Demo

https://supachess.pages.dev

## Next Steps

1. Continue training to 150k+ positions
2. Add deeper opening preparation
3. Improve endgame tablebase integration
4. Tournament testing vs other engines
