(function(root){
  'use strict';
  function readPosition(fen){
    const fields=String(fen||'').trim().split(/\s+/);
    const placement=fields[0]||'';
    const moveNumber=Math.max(1,Number(fields[5])||1);
    const pieces=placement.match(/[pnbrqk]/gi)||[];
    let phaseMaterial=0;
    for(const piece of pieces){
      switch(piece.toLowerCase()){
        case 'q': phaseMaterial+=4; break;
        case 'r': phaseMaterial+=2; break;
        case 'b':
        case 'n': phaseMaterial+=1; break;
      }
    }
    return {placement,moveNumber,pieceCount:pieces.length,phaseMaterial};
  }
  function classifyPhase(fen){
    const position=readPosition(fen);
    if(position.phaseMaterial<=10)return 'endgame';
    if(position.moveNumber<=12&&position.pieceCount>=24&&position.phaseMaterial>=20)return 'opening';
    return 'middlegame';
  }
  function phaseLabel(phase){
    return ({opening:'Ouverture',middlegame:'Milieu de partie',endgame:'Finale'})[phase]||'Phase non déterminée';
  }
  function phaseMoveNumber(fen){
    return readPosition(fen).moveNumber;
  }
  function estimateElo(fen,line,userColor){
    const ChessCtor=root&&root.Chess;
    if(typeof ChessCtor!=='function')return 1200;
    let game;
    try{game=new ChessCtor(fen);}catch(_error){return 1200;}
    const startMoves=game.moves().length;
    const pieceCount=readPosition(fen).pieceCount;
    const color=userColor==='b'?'b':'w';
    let userMoves=0,forcing=0;
    for(const step of (Array.isArray(line)?line:[]).slice(0,12)){
      if(!step)break;
      let move;
      try{
        move=typeof step==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(step)
          ?game.move({from:step.slice(0,2),to:step.slice(2,4),promotion:step[4]||'q'})
          :game.move({from:step.from,to:step.to,promotion:step.promotion||'q'});
      }catch(_error){move=null;}
      if(!move)break;
      if(move.color===color){
        userMoves++;
        if(move.captured||/[+#]/.test(move.san))forcing++;
      }
    }
    const raw=800+Math.max(0,userMoves-1)*160+Math.max(0,Math.min(32,startMoves)-8)*22+Math.max(0,pieceCount-10)*8+forcing*70;
    return Math.round(Math.max(800,Math.min(2800,raw))/50)*50;
  }
  const api={classifyPhase,phaseLabel,phaseMoveNumber,estimateElo};
  if(root)root.SupaPuzzleRating=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
