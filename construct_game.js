var Chess = require('./node_modules/chess.js');
if (Chess.Chess) Chess = Chess.Chess;

// After Rxf7+ (token 50), try Kh6 and then find checkmate:
var c = new Chess('r3qr2/pp3Rk1/4p3/7P/2p5/8/PPP2PP1/1K5R b - - 0 26');

// After Kh6 (king moves away):
var c2 = new Chess(c.fen());
c2.move('Kh6', {sloppy:true});
console.log('After Kh6:', c2.fen());
console.log('White legal:', c2.moves().join(', '));
// White has Rf7 (on f7) and Rh1. King on h6. h5 pawn on h5.
// h5+1=h6? No: h5 pawn is White. h5→h6: pawn push. Is that check to king on h6? YES!!
// h6 IS occupied by Black king! So pawn can't push to h6 (king is there).
// White can play: Rf6+ (Rf7→f6, checking king on h6? f6 adjacent to h6? f6 and h6: same rank 6! YES! Rf6 checks king on h6.
// Or Rxe7: rook takes pawn on e7? e7 is empty. Hmm.
// Let me see all legal white moves:

var c3 = new Chess(c2.fen());
// Try Rf6+ (rook f7→f6, checking king on h6):
c3.move('Rf6+', {sloppy:true});
console.log('After Rf6+:', c3.fen());
console.log('Black legal:', c3.moves().join(', '));
