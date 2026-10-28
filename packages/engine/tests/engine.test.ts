import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { PST, PIECE_VALUES, flipSquare, getPSTValue } from '../src/pst.js';
import { evaluatePosition, evaluatePositionRaw } from '../src/evaluate.js';
import { findBestMove } from '../src/search.js';
import { auditMove, isAuditError } from '../src/audit.js';

describe('pst', () => {
  it('exposes a 64-entry table for every piece type', () => {
    for (const piece of ['p', 'n', 'b', 'r', 'q'] as const) {
      expect(PST[piece]).toHaveLength(64);
    }
    expect(PST.k_mg).toHaveLength(64);
    expect(PST.k_eg).toHaveLength(64);
  });

  it('assigns a positive value to every piece type', () => {
    for (const value of Object.values(PIECE_VALUES)) {
      expect(value).toBeGreaterThan(0);
    }
    expect(PIECE_VALUES.q).toBeGreaterThan(PIECE_VALUES.r);
    expect(PIECE_VALUES.r).toBeGreaterThan(PIECE_VALUES.n);
    expect(PIECE_VALUES.n).toBeGreaterThan(PIECE_VALUES.p);
  });

  it('mirrors squares across the board', () => {
    expect(flipSquare(0)).toBe(56);
    expect(flipSquare(56)).toBe(0);
    expect(flipSquare(63)).toBe(7);
    expect(flipSquare(27)).toBe(35);
    expect(flipSquare(35)).toBe(27);
  });

  it('reads the table directly for White and mirrored for Black', () => {
    // sq 8 is a7: a pawn there is nearly promoting for White, still home for Black.
    expect(getPSTValue('p', 8, true, false)).toBe(PST.p[8]);
    expect(getPSTValue('p', 8, false, false)).toBe(PST.p[48]);
    expect(getPSTValue('p', 8, true, false)).not.toBe(getPSTValue('p', 8, false, false));
  });

  it('centralises white pawns', () => {
    expect(getPSTValue('p', 36, true, false)).toBeGreaterThan(getPSTValue('p', 0, true, false));
  });

  it('activates the king on an endgame table', () => {
    const mid = getPSTValue('k', 56, true, false);
    const end = getPSTValue('k', 56, true, true);
    expect(end).not.toBe(mid);
    expect(getPSTValue('k', 56, true, true)).toBe(PST.k_eg[56]);
  });
});

describe('evaluatePosition', () => {
  it('rates the starting position balanced', () => {
    const game = new Chess();
    const result = evaluatePosition(game);
    expect(result.pieceCount).toBe(32);
    expect(result.whiteMaterial).toBe(result.blackMaterial);
    expect(result.isEndgame).toBe(false);
    expect(Math.abs(result.score)).toBeLessThan(60);
  });

  it('flips the score sign when the side to move changes', () => {
    const game = new Chess();
    game.load('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    const whiteToMove = evaluatePosition(game).score;

    game.move('e4');
    const blackToMove = evaluatePosition(game).score;

    expect(whiteToMove).toBeGreaterThan(0);
    expect(blackToMove).toBeLessThan(0);
  });

  it('keeps the static evaluation exactly symmetric across turns', () => {
    const game = new Chess();
    game.load('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    const fen = game.fen();
    const asWhite = evaluatePosition(game, { mobility: false }).score;

    game.load(fen.replace(' w ', ' b '));
    const asBlack = evaluatePosition(game, { mobility: false }).score;

    // Same pieces, opposite side to move: the score must negate exactly.
    expect(asWhite).toBe(-asBlack);
  });

  it('detects an endgame by low material', () => {
    const game = new Chess();
    // White: K+Q+R vs K
    game.load('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
    expect(evaluatePosition(game).isEndgame).toBe(true);
  });

  it('penalises the side that is in check', () => {
    const game = new Chess();
    game.load('k7/8/8/8/8/8/8/R3K3 b - - 0 1');
    expect(evaluatePosition(game).inCheck).toBe(true);
  });

  it('grows material as white gains a piece', () => {
    const before = new Chess();
    const after = new Chess();
    after.load('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
    expect(evaluatePositionRaw(after)).toBeGreaterThan(evaluatePositionRaw(before));
  });
});

describe('findBestMove', () => {
  it('delivers mate in one', () => {
    const game = new Chess();
    game.load('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const result = findBestMove(game, { depth: 2, timeLimitMs: 3000 });
    expect(result.bestMoveSan).toBe('Ra8#');
    expect(result.stopped).toBe(false);
  });

  it('finds the free queen', () => {
    const game = new Chess();
    game.load('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1');
    const result = findBestMove(game, { depth: 3, timeLimitMs: 3000 });
    expect(result.bestMoveSan).toBe('exd5');
  });

  it('returns no move on a finished game', () => {
    const game = new Chess();
    game.load('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const result = findBestMove(game, { depth: 2, timeLimitMs: 1000 });
    expect(result.bestMove).toBeNull();
    expect(result.bestMoveSan).toBeNull();
  });

  it('reports progress and leaves the position untouched', () => {
    const game = new Chess();
    const fenBefore = game.fen();
    const seen: number[] = [];
    const result = findBestMove(game, {
      depth: 2,
      timeLimitMs: 3000,
      onProgress: (info) => seen.push(info.depth)
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(game.fen()).toBe(fenBefore);
    expect(result.nodes).toBeGreaterThan(0);
    expect(result.pv.length).toBeGreaterThan(0);
  });

  it('stops on the time limit', () => {
    const game = new Chess();
    const result = findBestMove(game, { depth: 63, timeLimitMs: 1 });
    expect(result.stopped).toBe(true);
  });
});

describe('auditMove', () => {
  it('rejects an illegal move and leaves the position alone', () => {
    const game = new Chess();
    const outcome = auditMove(game, 'e5');
    expect(isAuditError(outcome)).toBe(true);
    expect(game.fen()).toBe(new Chess().fen());
  });

  it('describes the replies available after a quiet opening move', () => {
    const game = new Chess();
    const outcome = auditMove(game, 'e4');
    expect(isAuditError(outcome)).toBe(false);
    if (!isAuditError(outcome)) {
      expect(outcome.move).toBe('e4');
      expect(outcome.opponentLegalMoves).toBe(20);
      expect(outcome.fenAfter).not.toBe(outcome.fenBefore);
      expect(outcome.surpriseRisk).toBeGreaterThanOrEqual(0);
    }
  });

  it('flags forcing replies as refutation candidates', () => {
    const game = new Chess();
    // After e4 the black queen simply wins the pawn.
    game.load('4k3/8/8/3q4/8/8/4P3/4K3 w - - 0 1');
    const outcome = auditMove(game, 'e4');
    expect(isAuditError(outcome)).toBe(false);
    if (!isAuditError(outcome)) {
      expect(outcome.refutationCandidates).toContain('Qxe4+');
      expect(outcome.surpriseRisk).toBeGreaterThan(0);
    }
  });

  it('reports no forcing reply when none exists', () => {
    const game = new Chess();
    const outcome = auditMove(game, 'e4');
    expect(isAuditError(outcome)).toBe(false);
    if (!isAuditError(outcome)) {
      expect(outcome.refutationCandidates).toHaveLength(0);
      expect(outcome.surpriseRisk).toBe(0);
    }
  });

  it('undoes its own move', () => {
    const game = new Chess();
    const fenBefore = game.fen();
    auditMove(game, 'd4');
    expect(game.fen()).toBe(fenBefore);
  });

  it('accepts UCI notation as well as SAN', () => {
    const game = new Chess();
    const outcome = auditMove(game, 'e2e4');
    expect(isAuditError(outcome)).toBe(false);
  });
});