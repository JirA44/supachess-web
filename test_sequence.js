var Chess = require('./node_modules/chess.js');
if (Chess.Chess) Chess = Chess.Chess;

// After Qxf6+ Kh7 (king moves to h7): White has queen on f6, Rh1.
// FEN: r2r4/pp3p1k/4pQ2/7P/2p5/8/PPP2PP1/1K5R w - - 1 28
// White legal includes: Qxd8, Qg7+, Qh8+, Qg6+, Qh6+
// Let's try Qh8+: queen f6→h8? That's a diagonal move f6→g7→h8 = Δfile=+2, Δrank=+2. Valid!
// After Qh8+: king on h7 is in check (h8→h7 is adjacent)?? Queen on h8 attacks h7 (same file). YES! Check.
// Black king on h7: must move. King can go to: g7 (if queen on h8 doesn't cover g7)?
// g7 from h8: h8→g7 is diagonal. Queen on h8 DOES attack g7. So king can't go g7.
// h6: from h8, queen attacks h6 (same file). King can't go h6.
// g6: from h8, does queen attack g6? h8→g6: Δ=(-2,-1) not same rank/file/diagonal. Queen doesn't attack g6! So king CAN go g6.
// But wait: is g6 covered by other White pieces? h5 pawn covers g6 (white pawn on h5 attacks g6). YES!
// So g6 is covered by h5 pawn. King can't go g6.
// King's only option: Kg6 (covered by h5 pawn), Kh6 (covered by Qh8), Kg7 (covered by Qh8 diag), Kg8 (covered by Qh8 rank).
// Is Kh7→Kg8 covered? Queen on h8: h8→g8 same rank. YES. So king can't go to g8.
// All squares covered: BLACK KING IN ZUGZWANG CHECKMATE??
// Wait, let me just check:

var c = new Chess('r2r4/pp3p1k/4pQ2/7P/2p5/8/PPP2PP1/1K5R w - - 1 28');
c.move('Qh8+', {sloppy:true});
console.log('After Qh8+:', c.fen());
console.log('In check:', c.in_check(), 'Checkmate:', c.in_checkmate());
console.log('Black legal:', c.moves().join(', '));
