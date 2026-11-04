(function (global) {
  'use strict';
  var VERSION = '1.0.0';
  var FILES = 'abcdefgh';
  var RANKS = '12345678';
  var PIECES = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
  var errors = { NONE:0, BAD_FEN:1, BAD_KING:2, BAD_PAWNS:3, BAD_CASTLING:4, BAD_EP:5, BAD_CLOCK:6, KING_CHECK:7, BOARD_SIZE:8, BOARD_SQUARES:9, DUPLICATE_SQUARE:10, BROKEN_PIECE:11, ZERO_SIZE:12, NO_BOARD:13 };
  function fail(code, message) { return { valid:false, code:code, errors:[message], fen:null, pieces:0 }; }
  function parseFen(fen) {
    if (typeof fen !== 'string') return fail(errors.BAD_FEN, 'Position FEN absente ou non textuelle.');
    var fields = fen.trim().split(/\s+/);
    if (fields.length !== 6) return fail(errors.BAD_FEN, 'La FEN doit contenir exactement six champs.');
    var rows = fields[0].split('/');
    if (rows.length !== 8) return fail(errors.BAD_FEN, 'La FEN doit décrire huit rangées.');
    var board = [], pieceCounts = { K:0, k:0, P:0, p:0 }, total = 0;
    for (var r=0;r<8;r++) {
      var row=[], width=0, text=rows[r];
      for (var i=0;i<text.length;i++) {
        var ch=text[i];
        if (/^[1-8]$/.test(ch)) { var blanks=Number(ch); width+=blanks; for(var b=0;b<blanks;b++)row.push(null); }
        else if (PIECES[ch]) { row.push(ch); width++; total++; if(pieceCounts[ch]!==undefined)pieceCounts[ch]++; }
        else return fail(errors.BAD_FEN, 'Pièce ou chiffre invalide dans la FEN.');
        if(width>8)return fail(errors.BAD_FEN,'Une rangée dépasse huit cases.');
      }
      if(width!==8)return fail(errors.BAD_FEN,'Chaque rangée doit contenir exactement huit cases.');
      board.push(row);
    }
    if (fields[1] !== 'w' && fields[1] !== 'b') return fail(errors.BAD_FEN, 'Le trait doit être w ou b.');
    if(pieceCounts.K!==1||pieceCounts.k!==1)return fail(errors.BAD_KING,'La position doit contenir exactement un roi de chaque couleur.');
    if(pieceCounts.P>8||pieceCounts.p>8)return fail(errors.BAD_PAWNS,'Une couleur possède plus de huit pions.');
    if(board[0].some(function(p){return p==='P'||p==='p';})||board[7].some(function(p){return p==='P'||p==='p';}))return fail(errors.BAD_PAWNS,'Un pion ne peut pas se trouver sur la première ou la huitième rangée.');
    var castling=fields[2];
    if(castling!=='-'&&(!/^[KQkq]+$/.test(castling)||new Set(castling).size!==castling.length))return fail(errors.BAD_CASTLING,'Droits de roque invalides ou répétés.');
    var kingSquares={K:null,k:null};
    for(var y=0;y<8;y++)for(var x=0;x<8;x++)if(board[y][x]==='K')kingSquares.K={x:x,y:y};else if(board[y][x]==='k')kingSquares.k={x:x,y:y};
    if(castling.indexOf('K')>=0&&(board[7][4]!=='K'||board[7][7]!=='R'))return fail(errors.BAD_CASTLING,'Le roque blanc côté roi ne correspond pas aux pièces présentes.');
    if(castling.indexOf('Q')>=0&&(board[7][4]!=='K'||board[7][0]!=='R'))return fail(errors.BAD_CASTLING,'Le roque blanc côté dame ne correspond pas aux pièces présentes.');
    if(castling.indexOf('k')>=0&&(board[0][4]!=='k'||board[0][7]!=='r'))return fail(errors.BAD_CASTLING,'Le roque noir côté roi ne correspond pas aux pièces présentes.');
    if(castling.indexOf('q')>=0&&(board[0][4]!=='k'||board[0][0]!=='r'))return fail(errors.BAD_CASTLING,'Le roque noir côté dame ne correspond pas aux pièces présentes.');
    var ep=fields[3];
    if(ep!=='-') {
      if(!/^[a-h][36]$/.test(ep))return fail(errors.BAD_EP,'La case de prise en passant est invalide.');
      var ex=FILES.indexOf(ep[0]), ey=8-Number(ep[1]);
      if(fields[1]==='w'&&(ep[1]!=='6'||board[ey+1][ex]!=='p'||board[ey][ex]!==null))return fail(errors.BAD_EP,'La prise en passant ne correspond pas au dernier double pas noir.');
      if(fields[1]==='b'&&(ep[1]!=='3'||board[ey-1][ex]!=='P'||board[ey][ex]!==null))return fail(errors.BAD_EP,'La prise en passant ne correspond pas au dernier double pas blanc.');
    }
    if(!/^\d+$/.test(fields[4])||!/^\d+$/.test(fields[5])||Number(fields[5])<1)return fail(errors.BAD_CLOCK,'Les compteurs de demi-coups ou de coups sont invalides.');
    var wk=kingSquares.K,bk=kingSquares.k;
    if(Math.max(Math.abs(wk.x-bk.x),Math.abs(wk.y-bk.y))<=1)return fail(errors.KING_CHECK,'Les deux rois ne peuvent pas être adjacents.');
    function inside(x,y){return x>=0&&x<8&&y>=0&&y<8;}
    function attacked(targetX,targetY,byWhite){
      var pawnY=targetY+(byWhite?1:-1);
      for(var dx of [-1,1])if(inside(targetX+dx,pawnY)&&board[pawnY][targetX+dx]===(byWhite?'P':'p'))return true;
      var knights=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
      for(var n of knights)if(inside(targetX+n[0],targetY+n[1])&&board[targetY+n[1]][targetX+n[0]]===(byWhite?'N':'n'))return true;
      for(var kx=-1;kx<=1;kx++)for(var ky=-1;ky<=1;ky++)if((kx||ky)&&inside(targetX+kx,targetY+ky)&&board[targetY+ky][targetX+kx]===(byWhite?'K':'k'))return true;
      var rays=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for(var ri=0;ri<rays.length;ri++){
        var ray=rays[ri],x=targetX+ray[0],y=targetY+ray[1],distance=1;
        while(inside(x,y)){
          var piece=board[y][x];
          if(piece){
            var own=byWhite?/^[KQRBNP]$/.test(piece):/^[kqrbnp]$/.test(piece);
            if(own){
              var lower=piece.toLowerCase(),diagonal=ray[0]!==0&&ray[1]!==0;
              if(lower==='q'||(lower==='b'&&diagonal)||(lower==='r'&&!diagonal)||(distance===1&&lower==='k'))return true;
            }
            break;
          }
          x+=ray[0];y+=ray[1];distance++;
        }
      }
      return false;
    }
    var whiteChecked=attacked(wk.x,wk.y,false),blackChecked=attacked(bk.x,bk.y,true);
    if(whiteChecked&&blackChecked)return fail(errors.KING_CHECK,'Les deux rois sont simultanément en échec.');
    if(fields[1]==='w'&&blackChecked||fields[1]==='b'&&whiteChecked)return fail(errors.KING_CHECK,'Le joueur qui vient de jouer a laissé son roi en échec.');
    return { valid:true, code:errors.NONE, errors:[], fen:fields.join(' '), pieces:total, turn:fields[1], board:board };
  }
  function algebraic(x,y){return FILES[x]+RANKS[7-y];}
  function validateLine(fen,line,ChessConstructor) {
    var position=parseFen(fen);
    if(!position.valid)return {valid:false,phase:'position',errors:position.errors,plies:0};
    if(!Array.isArray(line)||!line.length)return {valid:false,phase:'ligne',errors:['La variante doit contenir au moins un demi-coup.'],plies:0};
    var Constructor=ChessConstructor||global.Chess;
    if(typeof Constructor!=='function')return {valid:false,phase:'moteur',errors:['Le moteur de règles chess.js est indisponible pour vérifier la variante.'],plies:0};
    var game;
    try{game=new Constructor(position.fen);}catch(_){return {valid:false,phase:'moteur',errors:['La position initiale a été refusée par le moteur de règles.'],plies:0};}
    for(var i=0;i<line.length;i++){
      var item=line[i],moveSpec;
      if(typeof item==='string'){
        if(!/^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/.test(item))return {valid:false,phase:'ligne',errors:['Notation UCI invalide au demi-coup '+(i+1)+'.'],plies:i};
        moveSpec={from:item.slice(0,2),to:item.slice(2,4)};
        if(item.length===5)moveSpec.promotion=item[4].toLowerCase();
      }else if(item&&typeof item.from==='string'&&typeof item.to==='string'){
        moveSpec={from:item.from,to:item.to};
        if(item.promotion)moveSpec.promotion=String(item.promotion).toLowerCase();
      }else return {valid:false,phase:'ligne',errors:['Demi-coup incomplet au rang '+(i+1)+'.'],plies:i};
      var played=null;
      try{played=game.move(moveSpec);}catch(_){}
      if(!played)return {valid:false,phase:'légalité',errors:['Demi-coup illégal au rang '+(i+1)+'.'],plies:i};
    }
    return {valid:true,phase:'variante validée',errors:[],plies:line.length,endingFen:game.fen()};
  }
  function createBoard(fen, options) {
    options=options||{};
    var position=parseFen(fen);
    if(!position.valid)throw new Error('Échiquier refusé : '+position.errors.join(' '));
    if(options.line){var lineCheck=validateLine(position.fen,options.line,options.Chess);if(!lineCheck.valid)throw new Error('Variante refusée : '+lineCheck.errors.join(' '));}
    var black=options.orientation==='b',root=document.createElement('div');
    root.className='supa-board-grid';
    root.setAttribute('role','grid');
    root.setAttribute('aria-label',options.label||'Échiquier d’échecs validé');
    root.setAttribute('data-chessboard','true');
    root.setAttribute('data-fen',position.fen);
    root.setAttribute('data-supa-board-status','constructed');
    root.setAttribute('data-supa-board-phase','construction');
    var styleId='supa-board-protocol-style';
    if(!document.getElementById(styleId)){
      var style=document.createElement('style');style.id=styleId;
      style.textContent='.supa-board-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));aspect-ratio:1;width:min(100%,640px);border:2px solid #26364d;box-sizing:border-box;touch-action:manipulation}.supa-board-square{display:grid;place-items:center;min-width:0;min-height:0;border:0;padding:0;font:clamp(1.25rem,6vw,3.5rem)/1 "Apple Symbols","Noto Sans Symbols 2","Segoe UI Symbol",serif;cursor:pointer;touch-action:manipulation}.supa-board-square.light{background:#f0d9b5}.supa-board-square.dark{background:#b58863}.supa-board-square:focus-visible{outline:3px solid #1685ff;outline-offset:-3px;z-index:1}.supa-board-square .supa-piece-white{color:#fff;-webkit-text-stroke:1px #172033;paint-order:stroke fill;text-shadow:0 1px 1px #172033}.supa-board-square .supa-piece-black{color:#171717;-webkit-text-stroke:1px #fff;paint-order:stroke fill;text-shadow:0 1px 1px #fff}';
      document.head.appendChild(style);
    }
    var orderY=black?[0,1,2,3,4,5,6,7]:[7,6,5,4,3,2,1,0],orderX=black?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
    orderY.forEach(function(y,viewY){orderX.forEach(function(x,viewX){
      var square=document.createElement('button'),name=algebraic(x,y),piece=position.board[y][x];
      square.type='button';square.className='supa-board-square '+((x+y)%2===0?'dark':'light');square.dataset.square=name;
      square.setAttribute('role','gridcell');square.setAttribute('aria-label',name+(piece?' · '+piece:' · vide'));
      square.style.gridColumn=String(viewX+1);square.style.gridRow=String(viewY+1);
      if(piece){var span=document.createElement('span');span.className=/[A-Z]/.test(piece)?'supa-piece-white':'supa-piece-black';span.textContent=PIECES[piece];span.setAttribute('aria-hidden','true');square.appendChild(span);}
      square.addEventListener('click',function(){if(typeof options.onSquareClick==='function')options.onSquareClick(name,piece,position.fen);});
      root.appendChild(square);
    });});
    var check=inspectBoard(root,{fen:position.fen,allowUnmeasured:true});
    if(!check.valid)throw new Error('Échiquier refusé au contrôle final : '+check.errors.join(' '));
    root.setAttribute('data-supa-board-status','ready');root.setAttribute('data-supa-board-phase','prêt');
    return root;
  }
  function inspectBoard(element, options) {
    options=options||{};
    var result={valid:false,pending:false,phase:'repérage',errors:[],warnings:[],fen:null};
    if(!element||!element.nodeType){result.errors.push('Échiquier introuvable.');return result;}
    result.phase='position';
    var fen=options.fen||element.getAttribute('data-fen')||element.getAttribute('data-position');
    if(!fen){
      var ancestor=element.closest&&element.closest('[data-fen],[data-position]');
      if(ancestor)fen=ancestor.getAttribute('data-fen')||ancestor.getAttribute('data-position');
      var candidates=[];
      try{if(global.game)candidates.push(global.game);if(global.chess)candidates.push(global.chess);if(global.tacticGame)candidates.push(global.tacticGame);}catch(_){}
      try{if(typeof game!=='undefined')candidates.push(game);if(typeof chess!=='undefined')candidates.push(chess);if(typeof tacticGame!=='undefined')candidates.push(tacticGame);}catch(_){}
      for(var i=0;!fen&&i<candidates.length;i++)try{if(candidates[i]&&typeof candidates[i].fen==='function')fen=candidates[i].fen();}catch(_){}
    }
    if(fen){var parsed=parseFen(fen);if(!parsed.valid){result.errors=result.errors.concat(parsed.errors);return result;}result.fen=parsed.fen;}
    else result.warnings.push('Aucune FEN accessible : structure contrôlée, position exacte non vérifiable.');
    result.phase='dimensions';
    var rect=element.getBoundingClientRect?element.getBoundingClientRect():{width:0,height:0};
    if(!options.allowUnmeasured&&(rect.width<140||rect.height<140)){
      result.pending=true;result.phase='attente du rendu';return result;
    }
    if(!options.allowUnmeasured&&Math.abs(rect.width-rect.height)/Math.max(rect.width,rect.height)>.08){result.errors.push('Le plateau n’est pas carré dans son rendu.');return result;}
    if(element.tagName&&element.tagName.toLowerCase()==='canvas'){
      if(element.width<64||element.height<64){result.errors.push('La surface canvas ne possède pas de dimensions utiles.');return result;}
      if(Math.abs(element.width-element.height)/Math.max(element.width,element.height)>.08){result.errors.push('Le canvas ne possède pas un rapport largeur/hauteur d’échiquier.');return result;}
    } else {
      result.phase='cases';
      var squares=element.querySelectorAll?Array.prototype.slice.call(element.querySelectorAll('[data-square],.square,[role="gridcell"]')):[];
      if(squares.length!==64){result.pending=true;result.phase='attente de 64 cases';result.warnings.push('Le plateau attend 64 cases ; cases trouvées : '+squares.length+'.');return result;}
      var names=squares.map(function(s){return (s.getAttribute('data-square')||s.getAttribute('data-square-name')||'').toLowerCase();}).filter(Boolean);
      if(names.length&&names.length!==64){result.errors.push('Les coordonnées de cases sont incomplètes.');return result;}
      if(names.length){
        if(names.some(function(name){return !/^[a-h][1-8]$/.test(name); })){result.errors.push('Une coordonnée de case est invalide.');return result;}
        if(new Set(names).size!==64){result.errors.push('Des coordonnées de cases sont dupliquées.');return result;}
      }
      var illegalImages=squares.reduce(function(list,s){return list.concat(Array.prototype.slice.call(s.querySelectorAll('img')));},[]).filter(function(img){return img.complete&&img.naturalWidth===0;});
      if(illegalImages.length){result.phase='pièces';result.errors.push('Une ou plusieurs images de pièces ne se sont pas chargées.');return result;}
    }
    result.phase='accessibilité';
    if(!element.hasAttribute('role'))result.warnings.push('Le plateau n’a pas de rôle ARIA explicite.');
    result.phase='validé';result.valid=true;
    return result;
  }
  function mountStatus(element,message) {
    if(element.__supaProtocolNotice){element.__supaProtocolNotice.textContent='Échiquier masqué par le protocole de validation : '+message;return;}
    var status=document.createElement('div');status.className='supa-board-protocol-error';status.setAttribute('role','alert');
    status.textContent='Échiquier masqué par le protocole de validation : '+message;
    status.style.cssText='margin:10px 0;padding:12px;border:2px solid #b42318;border-radius:8px;background:#fff1f0;color:#7a271a;font:600 14px/1.45 system-ui,sans-serif';
    if(element.parentNode)element.parentNode.insertBefore(status,element.nextSibling);
    element.__supaProtocolNotice=status;
  }
  function candidatesIn(root) {
    return Array.prototype.slice.call(root.querySelectorAll('#board,#chessboard,#lesson-board,[data-chessboard="true"],.chess-board,.board')).filter(function(element){
      if(element.matches('[data-chessboard="true"],#board,#chessboard,#lesson-board,.chess-board'))return true;
      return !!element.querySelector('[data-square],.square,[role="gridcell"]');
    });
  }
  function validateExisting(root) {
    var all=candidatesIn(root);
    all.forEach(function(element){
      if(!element.hasAttribute('data-supa-original-visibility'))element.setAttribute('data-supa-original-visibility',element.style.visibility||'');
      var attempts=Number(element.dataset.supaBoardAttempts||0)+1;element.dataset.supaBoardAttempts=String(attempts);
      var result=inspectBoard(element);
      element.dataset.supaBoardPhase=result.phase;
      if(result.valid){
        element.dataset.supaBoardStatus=result.warnings.length?'ready-with-warning':'ready';
        element.dataset.supaBoardWarnings=result.warnings.join(' | ');
        element.style.visibility=element.getAttribute('data-supa-original-visibility')||'';
        if(element.__supaProtocolNotice){element.__supaProtocolNotice.remove();element.__supaProtocolNotice=null;}
        return;
      }
      element.style.visibility='hidden';
      if(result.pending&&attempts<6){
        element.dataset.supaBoardStatus='pending';
        setTimeout(function(){validateExisting(element.parentNode||document);},350);
        return;
      }
      var reason=result.errors.length?result.errors.join(' '):'Le plateau n’a pas pu terminer ses contrôles de dimensions et de cases.';
      element.dataset.supaBoardStatus='rejected';
      mountStatus(element,reason);
    });
    return all.length;
  }
  function bootstrap(root) {
    root=root||document;
    validateExisting(root);
    if(root===document&&document.body&&global.MutationObserver){
      var pending=false;
      new MutationObserver(function(){if(pending)return;pending=true;setTimeout(function(){pending=false;validateExisting(document);},120);}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','data-fen','data-position']});
    }
  }
  global.SupaChessBoardProtocol={version:VERSION,phases:['position','variante','construction','dimensions','cases','pièces','accessibilité','validé'],errors:errors,validateFen:parseFen,validateLine:validateLine,inspect:inspectBoard,create:createBoard,bootstrap:bootstrap};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bootstrap(document);},{once:true});
  else bootstrap(document);
})(window);
