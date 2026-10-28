import { Chess, type Move } from 'chess.js';

export interface AuditResult {
  move: string;
  fenBefore: string;
  fenAfter: string;
  opponentLegalMoves: number;
  refutationCandidates: string[];
  surpriseRisk: number;
  note: string;
}

export interface AuditError {
  error: string;
  fen: string;
}

export type AuditOutcome = AuditResult | AuditError;

const MAX_REFUTATIONS = 12;
const RISK_PER_FORCING_MOVE = 10;
const WIDE_MOBILITY_MOVES = 35;
const WIDE_MOBILITY_BONUS = 20;

function isForcing(move: Move): boolean {
  return move.san.includes('+') || move.san.includes('#') || move.isCapture();
}

/**
 * Heuristic anti-surprise audit for a single candidate move.
 * The game is left in its original position; a higher-order engine stays authoritative.
 */
export function auditMove(game: Chess, move: string): AuditOutcome {
  const fenBefore = game.fen();
  const legal = game.moves({ verbose: true });
  const selected = legal.find(
    (candidate) => candidate.san === move || `${candidate.from}${candidate.to}` === move
  );

  if (!selected) {
    return { error: 'Coup illegal ou introuvable', fen: fenBefore };
  }

  game.move(selected);
  const replies = game.moves({ verbose: true });
  const forcing = replies.filter(isForcing);
  const result: AuditResult = {
    move: selected.san,
    fenBefore,
    fenAfter: game.fen(),
    opponentLegalMoves: replies.length,
    refutationCandidates: forcing.slice(0, MAX_REFUTATIONS).map((candidate) => candidate.san),
    surpriseRisk: Math.min(
      100,
      forcing.length * RISK_PER_FORCING_MOVE + (replies.length > WIDE_MOBILITY_MOVES ? WIDE_MOBILITY_BONUS : 0)
    ),
    note: 'Audit heuristique: verifier avec Stockfish avant de conclure.'
  };
  game.undo();

  return result;
}

export function isAuditError(outcome: AuditOutcome): outcome is AuditError {
  return 'error' in outcome;
}