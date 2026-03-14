var fs = require('fs');
var Chess = require('./node_modules/chess.js');
if (Chess.Chess) Chess = Chess.Chess;
var html = fs.readFileSync('./CHESS_COACH.html', 'utf8');

function cleanPGN(pgn) {
    pgn = pgn.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    pgn = pgn.replace(/\u00A0/g, ' ').replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '').replace(/\([^()]*\)/g, '');
    pgn = pgn.split('\n').map(function(l) { return l.replace(/  +/g, ' ').trim(); }).join('\n');
    pgn = pgn.replace(/(\])\n([^\[])/g, '$1\n\n$2');
    return pgn.trim();
}

var idRe = /id: '([^']+)'/g;
var pgnRe = /pgn: `([\s\S]*?)`/g;
var ids = [], pgns = [], m;
while ((m = idRe.exec(html)) !== null) ids.push(m[1]);
while ((m = pgnRe.exec(html)) !== null) pgns.push(m[1]);

var failing = ['carlsen-ernst-2004','carlsen-anand-2013-g6','leela-stockfish-2019','alekhine-reti-1925','ivanchuk-yusupov-1991'];

failing.forEach(function(targetId) {
    var i = ids.indexOf(targetId);
    if (i < 0) { console.log('NOT FOUND: ' + targetId); return; }
    var pgn = cleanPGN(pgns[i]);
    // Try move by move
    var lines = pgn.split('\n');
    var moveLine = lines.filter(function(l) { return !l.startsWith('[') && l.trim(); }).join(' ');
    var tokens = moveLine.split(/\s+/).filter(function(t) { return t && !t.match(/^\d+\./) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/); });
    var c = new Chess();
    // Apply headers
    var headerPart = lines.filter(function(l) { return l.startsWith('['); }).join('\n');
    var c2 = new Chess();
    c2.load_pgn(headerPart + '\n\n' + tokens.slice(0, tokens.length - 1).join(' ') + ' *');
    var lastOk = c2.history().length;
    var c3 = new Chess();
    c3.load_pgn(pgn);
    console.log(targetId + ': total_tokens=' + tokens.length + ' loaded=' + c3.history().length + ' last_working=' + lastOk);
    if (c3.history().length < tokens.length) {
        var failTok = tokens[c3.history().length];
        console.log('  -> fails at token index ' + c3.history().length + ': "' + failTok + '"');
    }
});
