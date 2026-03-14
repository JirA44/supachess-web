var Chess = require('./node_modules/chess.js');
if (Chess.Chess) Chess = Chess.Chess;

// After Qg7+ Kxg7, find a valid win:
// Position: FEN after Qg7+ Kxg7:
// Try: d7 Qe8 d8=Q Qxd8 Rxd8 ...and then the game continues
// The key: after Rxd8, can White force mate?

var c = new Chess();
var m = ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5','Ng3','Bg6','h4','h6','Nf3','Nd7','h5','Bh7','Bd3','Bxd3','Qxd3','e6','Bf4','Ngf6','O-O-O','Be7','Kb1','O-O','Ne5','c5','Qf3','Nxe5','dxe5','Nd7','Ne4','Qc7',
'Nd6','Bxd6','exd6','Qd8','Qe3','c4','Bxh6','gxh6','Qxh6','Nf6',
'Qg7+','Kxg7','d7','Qe8','d8=Q','Qxd8','Rxd8','Re8','Rxe8'];
for (var i=0;i<m.length;i++){
  var r=c.move(m[i],{sloppy:true});
  if(!r){
    console.log('FAILS at token',i,'move',m[i]);
    console.log('FEN:',c.fen());
    console.log('Legal:',c.moves().join(', '));
    break;
  }
  if(c.in_checkmate()){console.log('CHECKMATE at token',i,'(',c.history().length,'total)');}
}
console.log('Tokens:',c.history().length,'FEN:',c.fen());
console.log('White legal:',c.moves().join(', '));
