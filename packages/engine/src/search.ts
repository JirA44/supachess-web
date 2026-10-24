import { Chess, type Move } from 'chess.js';
import { evaluatePositionRaw } from './evaluate.js';
import { PIECE_VALUES, type PieceType } from './pst.js';

export interface SearchOptions {
  depth: number;
  timeLimitMs?: number;
  onProgress?: (info: SearchInfo) => void;
}

export interface SearchInfo {
  depth: number;
  score: number;
  nodes: number;
  timeMs: number;
  pv: string[];
}

export interface SearchResult {
  bestMove: string | null;
  bestMoveSan: string | null;
  score: number;
  nodes: number;
  timeMs: number;
  pv: string[];
  depth: number;
  stopped: boolean;
}

const MATE_SCORE = 100000;
const DEFAULT_TIME_LIMIT_MS = 30000;

interface RootMove {
  move: Move;
  score: number;
  pv: string[];
}

/**
 * Iterative-deepening alpha-beta.
 *
 * Depth 1 only scores the replies, so every ply has to be walked before a
 * checkmate can be recognised. Terminal positions are therefore tested before
 * the depth cutoff, otherwise mate in one is never seen.
 */
export function findBestMove(game: Chess, options: SearchOptions): SearchResult {
  const { depth, timeLimitMs = DEFAULT_TIME_LIMIT_MS, onProgress } = options;
  const maxDepth = Math.max(1, Math.min(depth, 64));
  const startTime = Date.now();
  const rootMoves = game.moves({ verbose: true });

  if (rootMoves.length === 0) {
    return {
      bestMove: null,
      bestMoveSan: null,
      score: evaluatePositionRaw(game),
      nodes: 0,
      timeMs: 0,
      pv: [],
      depth: 0,
      stopped: false
    };
  }

  let nodes = 0;
  let stopped = false;
  let completedDepth = 0;
  let best: RootMove | null = null;

  const outOfTime = () => Date.now() - startTime > timeLimitMs;

  for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
    let roundBest: RootMove | null = null;

    for (const move of orderMoves(rootMoves)) {
      if (stopped || outOfTime()) {
        stopped = true;
        break;
      }

      game.move(move);
      const child = alphaBeta(game, currentDepth - 1, -Infinity, Infinity, 0, () => {
        stopped = true;
      });
      game.undo();
      nodes++;

      if (child.aborted) {
        stopped = true;
        break;
      }

      // The child is scored from its own side to move, i.e. the opponent.
      const candidate: RootMove = { move, score: -child.score, pv: [move.san, ...child.pv] };
      if (!roundBest || candidate.score > roundBest.score) {
        roundBest = candidate;
      }

      onProgress?.({
        depth: currentDepth,
        score: candidate.score,
        nodes,
        timeMs: Date.now() - startTime,
        pv: candidate.pv
      });
    }

    // A partial iteration must not overwrite a fully searched shallower one.
    if (!roundBest) break;
    best = roundBest;
    completedDepth = currentDepth;
    if (stopped || game.isGameOver()) break;
  }

  const chosen = best ?? { move: rootMoves[0], score: evaluatePositionRaw(game), pv: [rootMoves[0].san] };

  return {
    bestMove: `${chosen.move.from}${chosen.move.to}${chosen.move.promotion ?? ''}`,
    bestMoveSan: chosen.move.san,
    score: chosen.score,
    nodes,
    timeMs: Date.now() - startTime,
    pv: chosen.pv,
    depth: completedDepth,
    stopped
  };
}

interface LineResult {
  score: number;
  pv: string[];
  aborted: boolean;
}

function alphaBeta(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  abort: () => void
): LineResult {
  const legal = game.moves({ verbose: true });

  // Terminal nodes first: a mate score has to outrank any material score.
  if (legal.length === 0) {
    return {
      score: game.isCheck() ? -(MATE_SCORE - ply) : 0,
      pv: [],
      aborted: false
    };
  }

  if (depth <= 0) {
    return { score: evaluatePositionRaw(game), pv: [], aborted: false };
  }

  if (ply >= 96) {
    abort();
    return { score: evaluatePositionRaw(game), pv: [], aborted: true };
  }

  let bestScore = -Infinity;
  let bestPv: string[] = [];

  for (const move of orderMoves(legal)) {
    game.move(move);
    const child = alphaBeta(game, depth - 1, -beta, -alpha, ply + 1, abort);
    game.undo();

    if (child.aborted) {
      return { score: child.score, pv: [move.san, ...child.pv], aborted: true };
    }

    const score = -child.score;
    if (score > bestScore) {
      bestScore = score;
      bestPv = [move.san, ...child.pv];
      if (score > alpha) alpha = score;
    }

    if (alpha >= beta) break;
  }

  return { score: bestScore, pv: bestPv, aborted: false };
}

/** Promotions, then captures by MVV-LVA, then checks, then quiet moves. */
function orderMoves(moves: Move[]): Move[] {
  const promotions: Move[] = [];
  const captures: Move[] = [];
  const checks: Move[] = [];
  const quiet: Move[] = [];

  for (const move of moves) {
    if (move.isPromotion()) promotions.push(move);
    else if (move.isCapture()) captures.push(move);
    else if (isCheck(move)) checks.push(move);
    else quiet.push(move);
  }

  captures.sort((a, b) => captureScore(b) - captureScore(a));

  return [...promotions, ...captures, ...checks, ...quiet];
}

function isCheck(move: Move): boolean {
  return move.san.includes('+') || move.san.includes('#');
}

/** Most Valuable Victim: captured piece minus a tenth of the attacker. */
function captureScore(move: Move): number {
  const victim = move.captured ? PIECE_VALUES[move.captured as PieceType] : 0;
  const attacker = PIECE_VALUES[move.piece as PieceType];
  return victim - attacker / 10;
}