import { Chess, type Piece } from 'chess.js';
import { PIECE_VALUES, getPSTValue, PieceType } from './pst.js';

export interface EvaluationResult {
  score: number;           // centipawns from the side to move's perspective
  whiteMaterial: number;
  blackMaterial: number;
  pieceCount: number;
  isEndgame: boolean;
  mobility: number;
  inCheck: boolean;
}

const ENDGAME_MATERIAL_THRESHOLD = 2600; // centipawns, kings excluded
const MOBILITY_PER_MOVE = 5;
const CHECK_PENALTY = 50;

interface Material {
  white: number;
  black: number;
  count: number;
}

function countMaterial(board: (Piece | null)[][]): Material {
  let white = 0, black = 0, count = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;
      count++;
      // Kings carry a nominal value that would dwarf every endgame threshold.
      if (piece.type === 'k') continue;
      const value = PIECE_VALUES[piece.type as PieceType] || 0;
      if (piece.color === 'w') white += value;
      else black += value;
    }
  }
  return { white, black, count };
}

/** White-relative material plus piece placement. */
function evaluateStatic(game: Chess, isEndgame: boolean): number {
  const board = game.board();
  let score = 0;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;

      // board() is indexed from rank 8 down, which matches the PST layout.
      const sq = rank * 8 + file;
      const isWhite = piece.color === 'w';
      const value = piece.type === 'k' ? 0 : PIECE_VALUES[piece.type as PieceType] || 0;
      const placement = getPSTValue(piece.type as PieceType, sq, isWhite, isEndgame);

      score += isWhite ? value + placement : -(value + placement);
    }
  }

  const inCheck = game.isCheck();
  if (inCheck) {
    score += game.turn() === 'w' ? -CHECK_PENALTY : CHECK_PENALTY;
  }

  return score;
}

/**
 * Mobility for the side not to move.
 *
 * chess.js only generates moves for the side to move, so the opponent's count
 * is approximated by the widest reply available to the side that is on move.
 * Averaging over the replies would need a full ply of move generation and buys
 * little: mobility only ever acts as a tie-breaker here.
 */
function opponentMobility(game: Chess, fallback: number): number {
  const replies = game.moves({ verbose: true });
  let widest = fallback;

  for (const move of replies) {
    game.move(move);
    const count = game.moves().length;
    game.undo();
    if (count > widest) widest = count;
  }

  return widest;
}

export function evaluatePosition(game: Chess, options: { mobility?: boolean } = {}): EvaluationResult {
  const useMobility = options.mobility !== false;
  const board = game.board();
  const { white: whiteMaterial, black: blackMaterial, count: pieceCount } = countMaterial(board);
  const isEndgame = whiteMaterial + blackMaterial < ENDGAME_MATERIAL_THRESHOLD;

  let score = evaluateStatic(game, isEndgame);
  let mobility = 0;

  if (useMobility) {
    // A raw bonus would hand ~100cp to whoever moves first, so mobility is
    // scored as a difference between the two sides.
    const own = game.moves().length;
    const theirs = opponentMobility(game, own);
    mobility = (own - theirs) * MOBILITY_PER_MOVE;
    score += game.turn() === 'w' ? mobility : -mobility;
  }

  const inCheck = game.isCheck();

  return {
    score: game.turn() === 'w' ? score : -score,
    whiteMaterial,
    blackMaterial,
    pieceCount,
    isEndgame,
    mobility,
    inCheck
  };
}

/**
 * Cheap static evaluation for the search. It skips mobility, which would cost
 * an extra ply of move generation at every node.
 */
export function evaluatePositionRaw(game: Chess): number {
  const board = game.board();
  const { white, black } = countMaterial(board);
  const isEndgame = white + black < ENDGAME_MATERIAL_THRESHOLD;
  const score = evaluateStatic(game, isEndgame);
  return game.turn() === 'w' ? score : -score;
}