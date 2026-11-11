(function (global) {
  'use strict';
  var VERSION = '1.1.3';
  var FILES = 'abcdefgh';
  var RANKS = '12345678';
  var PIECES = { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟︎', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟︎' };
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
    var BoardUI=global.SupaChessBoardUI;
    if(typeof BoardUI!=='function')throw new Error('Composant d’échiquier SupaChess indisponible.');
    var black=options.orientation==='b',root=document.createElement('div');
    root.className='supa-board-grid board';
    root.setAttribute('role','grid');
    root.setAttribute('aria-label',options.label||'Échiquier SupaChess vérifié');
    root.setAttribute('data-chessboard','true');
    root.setAttribute('data-fen',position.fen);
    root.setAttribute('data-supa-board-status','constructed');
    root.setAttribute('data-supa-board-phase','construction');
    var styleId='supa-board-protocol-style';
    if(!document.getElementById(styleId)){
      var style=document.createElement('style');style.id=styleId;
      style.textContent='.supa-board-grid.supa-board-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));aspect-ratio:1;width:min(100%,640px);border:3px solid #3a4060;border-radius:8px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.45);box-sizing:border-box;touch-action:manipulation;user-select:none}.supa-board-grid .supa-board-square,.supa-board-grid .sq{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;border:0;border-radius:0;padding:0;font:inherit;cursor:pointer;touch-action:none}.supa-board-grid .supa-board-square.light,.supa-board-grid .sq.light{background:#b8c0d8}.supa-board-grid .supa-board-square.dark,.supa-board-grid .sq.dark{background:#5a6486}.supa-board-grid .supa-board-square:focus-visible,.supa-board-grid .sq:focus-visible{outline:3px solid #f0b35c;outline-offset:-3px;z-index:1}.supa-board-grid .supa-board-square .piece,.supa-board-grid .sq .piece{font-family:"DejaVu Sans","Segoe UI Symbol",serif;font-variant-emoji:text;font-size:clamp(25px,9vw,58px);line-height:1;z-index:2;paint-order:stroke fill;pointer-events:none;-webkit-user-drag:none}.supa-board-grid .supa-board-square .piece.w,.supa-board-grid .sq .piece.w{color:#fff;-webkit-text-fill-color:#fff;-webkit-text-stroke:2.8px #050608;text-shadow:0 1px 2px rgba(0,0,0,.72)}.supa-board-grid .supa-board-square .piece.b,.supa-board-grid .sq .piece.b{color:#16181f;-webkit-text-fill-color:#16181f;-webkit-text-stroke:2.6px #fff;text-shadow:0 1px 1px rgba(0,0,0,.55)}.supa-board-grid .sq.selected{outline:3px solid #f0b35c;outline-offset:-3px}.supa-board-grid .sq .coord{position:absolute;z-index:5;font-size:clamp(.82rem,1.7vw,1rem);font-weight:900;color:#111722;line-height:1;text-shadow:0 0 2px rgba(255,255,255,.95),0 1px 2px rgba(255,255,255,.9);pointer-events:none}.supa-board-grid .sq .coord.file{right:3px;bottom:2px}.supa-board-grid .sq .coord.rank{left:3px;top:2px}';
      document.head.appendChild(style);
    }
    var boardData=position.board.map(function(row){return row.map(function(piece){return piece?{color:/[A-Z]/.test(piece)?'w':'b',type:piece.toLowerCase()}:null;});});
    var boardUI=new BoardUI(root,typeof options.onSquareClick==='function'?options.onSquareClick:function(){});
    boardUI.setFlipped(black);boardUI.showDots=false;boardUI.showMoveDots=false;boardUI.render({board:function(){return boardData;}});
    root.__supaBoardUI=boardUI;
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
    if(element.classList&&element.classList.contains('chess-diagram')){
      var lines=String(element.textContent||'').replace(/\u00a0/g,' ').split(/\r?\n/),rows=[];
      lines.forEach(function(line){
        var match=line.match(/^\s*([1-8])\s+(.+)$/);if(!match)return;
        rows.push({rank:Number(match[1]),tokens:match[2].trim().split(/\s+/).slice(0,8)});
      });
      if(rows.length!==8){result.phase='cases';result.errors.push('Le diagramme doit contenir exactement huit rangées de huit cases.');return result;}
      var placement=[];
      for(var ri=0;ri<8;ri++){
        if(rows[ri].rank!==8-ri||rows[ri].tokens.length!==8||rows[ri].tokens.some(function(token){return !/^[.prnbqkPRNBQK]$/.test(token);})){result.phase='cases';result.errors.push('La notation du diagramme doit décrire huit rangées complètes de cases.');return result;}
        var rankFen='',empty=0;
        rows[ri].tokens.forEach(function(token){if(token==='.')empty++;else{if(empty){rankFen+=String(empty);empty=0;}rankFen+=token;}});
        if(empty)rankFen+=String(empty);
        placement.push(rankFen);
      }
      var asciiFen=placement.join('/')+' w - - 0 1',asciiCheck=parseFen(asciiFen);
      if(!asciiCheck.valid){result.phase='position';result.errors=result.errors.concat(asciiCheck.errors);return result;}
      result.fen=asciiCheck.fen;result.phase='validé';result.valid=true;
      result.warnings.push('Diagramme textuel contrôlé : huit rangées et 64 cases.');
      return result;
    }
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
    return Array.prototype.slice.call(root.querySelectorAll('#board,#chessboard,#lesson-board,#analysisBoard,#complexBoard,[data-chessboard="true"],.chess-board,.board,.analysis-board,.complex-board,.chess-diagram')).filter(function(element){
      if(element.hasAttribute('data-supa-board-ignore'))return false;
      if(element.matches('[data-chessboard="true"],#board,#chessboard,#lesson-board,#analysisBoard,#complexBoard,.chess-board,.analysis-board,.complex-board,.chess-diagram'))return true;
      return !!element.querySelector('[data-square],.square,[role="gridcell"]');
    });
  }
  function validateExisting(root) {
    var all=candidatesIn(root);
    all.forEach(function(element){
      if(!element.hasAttribute('data-supa-original-visibility'))element.setAttribute('data-supa-original-visibility',element.style.visibility||'');
      var attempts=Number(element.dataset.supaBoardAttempts||0)+1;element.dataset.supaBoardAttempts=String(attempts);
      ensureEvaluationBar(element);
      var result=inspectBoard(element);
      element.dataset.supaBoardPhase=result.phase;
      if(result.valid){
        var certificate=certifyBoard(element,result);
        element.dataset.supaBoardStatus=certificate.certified?(result.warnings.length?'ready-with-warning':'ready'):'rejected';
        if(certificate.certified)element.dataset.supaBoardCertificate=certificate.protocolVersion+' · '+certificate.checks.join(', ');
        else {mountStatus(element,(certificate.errors||[]).join(' '));return;}
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
  function ensureEvaluationBar(board) {
    if(!board||!board.parentNode)return null;
    var wrapper=board.closest&&board.closest('.supa-board-certified-layout');
    var legacyLayout=board.closest&&board.closest('.supachess-eval-layout');
    if(legacyLayout){
      var legacyRail=legacyLayout.querySelector('.supachess-eval-rail'),legacyPanel=legacyLayout.querySelector('.supachess-eval-panel');
      if(legacyRail&&legacyPanel){
        legacyLayout.classList.add('supa-board-certified-layout');legacyRail.setAttribute('data-supa-evaluation-bar','true');
        legacyRail.setAttribute('role','group');legacyRail.setAttribute('aria-label','Barre d’évaluation latérale');
        var legacyToggle=legacyRail.querySelector('.supachess-eval-toggle');if(legacyToggle)legacyToggle.remove();
        legacyPanel.hidden=false;legacyPanel.style.cssText+=';display:block!important;width:100%;max-width:none;margin:0;padding:6px;box-sizing:border-box';
        var legacyTrack=legacyPanel.querySelector('.supachess-eval-track'),legacyFill=legacyPanel.querySelector('.supachess-eval-white');
        if(legacyTrack)legacyTrack.style.cssText='position:relative;width:18px;height:100%;min-height:100px;margin:auto;overflow:hidden;border:1px solid #64748b;border-radius:4px;background:#111';
        if(legacyFill)legacyFill.style.cssText='position:absolute;left:0;right:0;bottom:0;width:100%;height:50%;background:#f8fafc;transition:height .18s ease';
        return legacyRail;
      }
    }
    if(!wrapper){
      wrapper=document.createElement('div');wrapper.className='supa-board-certified-layout';
      wrapper.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:10px;align-items:stretch;width:100%;max-width:100%;';
      board.parentNode.insertBefore(wrapper,board);wrapper.appendChild(board);
      board.style.setProperty('width','100%','important');board.style.setProperty('max-width','100%','important');
      board.style.setProperty('height','auto','important');board.style.setProperty('aspect-ratio','1 / 1','important');
    }
    var rail=wrapper.querySelector('[data-supa-evaluation-bar]');
    if(!rail){
      rail=document.createElement('aside');rail.setAttribute('data-supa-evaluation-bar','true');
      rail.setAttribute('role','img');rail.setAttribute('aria-label','Barre d’évaluation : données moteur non disponibles');
      rail.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:6px;min-width:30px;min-height:140px;padding:6px 4px;border:1px solid #64748b;border-radius:9px;background:#111827;color:#f8fafc;font:600 11px/1.2 system-ui,sans-serif;';
      var score=document.createElement('span');score.setAttribute('data-supa-eval-score','');score.textContent='—';
      var track=document.createElement('span');track.setAttribute('data-supa-eval-track','');track.style.cssText='position:relative;display:block;flex:1;width:18px;min-height:100px;overflow:hidden;border:1px solid #64748b;border-radius:4px;background:#111;';
      var white=document.createElement('span');white.setAttribute('data-supa-eval-white','');white.style.cssText='position:absolute;left:0;right:0;bottom:0;height:50%;background:#f8fafc;transition:height .18s ease;';
      track.appendChild(white);rail.appendChild(score);rail.appendChild(track);
      var caption=document.createElement('span');caption.textContent='Éval.';caption.setAttribute('aria-hidden','true');rail.appendChild(caption);
      wrapper.appendChild(rail);
    }
    return rail;
  }
  function updateEvaluation(board, centipawns, perspective) {
    var rail=ensureEvaluationBar(board);
    if(!rail)return {valid:false,error:'Échiquier non monté dans le document.'};
    if(typeof centipawns!=='number'||!isFinite(centipawns))return {valid:false,error:'Évaluation moteur invalide.'};
    var whiteScore=perspective==='b'?-centipawns:centipawns;
    var clamped=Math.max(-1000,Math.min(1000,whiteScore));
    var whitePercent=Math.max(5,Math.min(95,50+clamped/20));
    var score=rail.querySelector('[data-supa-eval-score],.supachess-eval-track span'),fill=rail.querySelector('[data-supa-eval-white],.supachess-eval-white');
    var display=(whiteScore>0?'+':'')+(whiteScore/100).toFixed(1);
    score.textContent=display;fill.style.height=whitePercent+'%';
    rail.setAttribute('aria-label','Barre d’évaluation, avantage blancs '+display+' pion(s)');
    board.setAttribute('data-supa-evaluation-cp',String(whiteScore));
    return {valid:true,centipawns:whiteScore,display:display};
  }
  function certifyBoard(board, inspection) {
    var checked=inspection||inspectBoard(board);
    if(!checked.valid)return {certified:false,phase:checked.phase,errors:checked.errors||[]};
    var rail=board&&board.closest&&board.closest('.supa-board-certified-layout');
    if(!rail||!rail.querySelector('[data-supa-evaluation-bar]'))return {certified:false,phase:'évaluation',errors:['Barre d’évaluation latérale absente.']};
    var certificate={certified:true,protocolVersion:VERSION,issuedAt:new Date().toISOString(),phase:'certifié',fen:checked.fen||board.getAttribute('data-fen')||null,checks:['position','géométrie','64 cases','pièces','accessibilité','barre latérale']};
    board.setAttribute('data-supa-board-certificate','SupaChessBoardProtocol/'+VERSION);
    board.setAttribute('data-supa-board-phase','certifié');
    board.setAttribute('data-supa-board-certified-at',certificate.issuedAt);
    return certificate;
  }
  global.SupaChessBoardProtocol={version:VERSION,updateEvaluation:updateEvaluation,ensureEvaluationBar:ensureEvaluationBar,certify:certifyBoard,phases:['position','variante','construction','dimensions','cases','pièces','accessibilité','validé'],errors:errors,validateFen:parseFen,validateLine:validateLine,inspect:inspectBoard,create:createBoard,bootstrap:bootstrap};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bootstrap(document);},{once:true});
  else bootstrap(document);
})(window);
