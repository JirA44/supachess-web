// Script Node.js pour vérifier les coups des parties légendaires
// Usage: node verify_games.js

const { Chess } = require('chess.js');

const games = {
    'Fischer - Game of Century': [
        'd4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O',
        'Be3', 'Nbd7', 'Qd2', 'c5', 'd5', 'Ne5', 'Bxc5', 'dxc5',
        'h3', 'e6', 'dxe6', 'fxe6', 'Bd3', 'Qa5', 'Ne2', 'b5', 'cxb5', 'Nd5',
        'exd5', 'exd5', 'O-O', 'Re8', 'Rfc1', 'Nf3+', 'gxf3', 'Qxd2',
        'Nxd2', 'Bxa1', 'Rxa1', 'Be6', 'Kf2', 'Rab8', 'a4', 'Rb6',
        'a5', 'Rb2', 'axb6', 'axb6', 'Ra2', 'Rxa2', 'Nxa2', 'c4',
        'Bxc4', 'dxc4', 'Nc3', 'Rd8', 'Nd1', 'b5', 'Ne3', 'Rd2+',
        'Ke1', 'Rxb2', 'Kd1', 'Rb1+', 'Kc2', 'Rb2+', 'Kc1', 'Rb1+',
        'Kc2', 'Rb2+', 'Kc1'
    ],
    'Kasparov Immortal 1999': [
        'e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'Qd2', 'c6',
        'f3', 'b5', 'Nge2', 'Nbd7', 'Bh6', 'Bxh6', 'Qxh6', 'Bb7',
        'a3', 'e5', 'O-O-O', 'Qe7', 'Kb1', 'a6', 'Nc1', 'O-O-O',
        'Nb3', 'exd4', 'Rxd4', 'c5', 'Rd1', 'Nb6', 'g3', 'Kb8',
        'Na5', 'Ba8', 'Bh3', 'd5', 'Qf4+', 'Ka7', 'Rhe1', 'd4',
        'Nd5', 'Nbxd5', 'exd5', 'Qd6', 'Rxd4', 'cxd4', 'Re7+', 'Kb6',
        'Qxd4+', 'Kxa5', 'b4+', 'Ka4', 'Qc3', 'Qxd5', 'Ra7', 'Bb7', 'Rxb7'
    ],
    'Deep Blue vs Kasparov 1997': [
        'e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Ng5', 'Ngf6',
        'Bd3', 'e6', 'N1f3', 'h6', 'Nxe6', 'Qe7', 'O-O', 'fxe6',
        'Bg6+', 'Kd8', 'Bf4', 'b5', 'a4', 'Bb7', 'Re1', 'Nd5',
        'Bg3', 'Kc8', 'axb5', 'cxb5', 'Qd3', 'Bc6', 'Bf5', 'exf5', 'Rxe7', 'Bxe7', 'c4'
    ],
    'AlphaZero vs Stockfish Game 10': [
        'Nf3', 'd5', 'g3', 'g6', 'c4', 'd4', 'b4', 'Bg7', 'd3', 'c5',
        'bxc5', 'Nd7', 'Bb2', 'Nxc5', 'Bg2', 'Rb8', 'O-O', 'b6',
        'a4', 'a5', 'Na3', 'Bb7', 'Qc2', 'Bxf3', 'Bxf3', 'Nf6',
        'Nb5', 'O-O', 'Rfb1', 'Ne8', 'e3', 'dxe3', 'fxe3', 'Nd6',
        'Nxd6', 'Qxd6', 'Rd1', 'Rfc8', 'Qb3', 'Na6', 'Bg2', 'Nc7',
        'Be4', 'Bf8', 'Bc6', 'Qd8', 'Qf3', 'Ne6', 'e4', 'Bd6',
        'Bf2', 'Nc5', 'Bb5', 'Bc7', 'Rab1', 'e6', 'Qf4', 'Bxf4',
        'gxf4', 'Qe7', 'Kg2', 'Rd8', 'Rdc1', 'Rd4', 'Bc6', 'Rbd8',
        'Bb5', 'Qd6', 'Bc6', 'R8d7', 'Rc4', 'Kf8', 'Rbc1', 'h5',
        'h3', 'Ke7', 'e5', 'Qd8', 'Bb5', 'Rd5', 'Bc6', 'R5d6',
        'Rxd4', 'Rxd4', 'Bb5', 'f6', 'exf6+', 'Qxf6', 'Rc3', 'Rd6',
        'Kf3', 'Ne4', 'Rc7+', 'Kd8', 'Ra7', 'Rd1', 'Rxa5', 'Nc3',
        'Ra8+', 'Kc7', 'Ra7+', 'Kc8', 'Bf1', 'bxa5', 'Bh6', 'Nd5',
        'Bf8', 'a4', 'Ke4', 'a3', 'Bc5', 'Nb4', 'Bxb4', 'a2',
        'Bc3', 'Qf5+', 'Kd4', 'Rd3+', 'Kc4', 'a1=Q', 'Bxa1', 'Qe4',
        'Be5', 'Ra3', 'Bb2', 'Ra4+', 'Kb5', 'Qb7+', 'Bb4', 'Qc7'
    ],
    'Tal Masterpiece 1958': [
        'e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
        'Bg5', 'e6', 'f4', 'Be7', 'Qf3', 'Qc7', 'O-O-O', 'Nbd7',
        'g4', 'b5', 'Bxf6', 'Nxf6', 'g5', 'Nd7', 'f5', 'Bxg5+',
        'Kb1', 'Ne5', 'Qh5', 'Qb6', 'fxe6', 'fxe6', 'Nxe6', 'Bxe6',
        'Qxe5', 'O-O', 'Bd3', 'Bf5', 'Qxg5', 'Bxd3', 'cxd3', 'Qxb2+',
        'Nxb2', 'Rxf2'
    ],
    'Karpov Positional 1978': [
        'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7',
        'd3', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'Nbd2', 'Na5', 'Bc2', 'c5',
        'Re1', 'Nc6', 'Nf1', 'h6', 'Ne3', 'Be6', 'Nd5', 'Bxd5', 'exd5', 'Nb8',
        'Nf1', 'Nbd7', 'Ng3', 'g6', 'Be3', 'Nh7', 'Qd2', 'Kh8', 'a4', 'Nhf6',
        'axb5', 'axb5', 'Rxa8', 'Qxa8', 'Ra1', 'Qb7', 'h3', 'Ra8', 'Rxa8+', 'Qxa8'
    ],
    'Carlsen Brilliancy 2013': [
        'Nf3', 'd5', 'g3', 'g6', 'Bg2', 'Bg7', 'd3', 'e5', 'O-O', 'Ne7',
        'e4', 'O-O', 'exd5', 'Nxd5', 'Re1', 'Nc6', 'Nc3', 'Nxc3', 'bxc3', 'f6',
        'd4', 'e4', 'Nd2', 'f5', 'Nb3', 'Be6', 'Qe2', 'Qd7', 'Nd2', 'Rad8',
        'c4', 'Bf7', 'Rb1', 'b6', 'Nb3', 'g5', 'd5', 'Ne5', 'c5', 'Nf3+', 'Bxf3', 'exf3',
        'Qxe7', 'Qxe7', 'Rxe7', 'Bxa1', 'Rxa7', 'Bd4', 'Na1', 'Ra8', 'Rxa8', 'Rxa8',
        'cxb6', 'cxb6', 'Nc2', 'Bc5', 'Ne3', 'Bxe3', 'fxe3', 'b5'
    ],
    'Leela vs Stockfish 2019': [
        'e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
        'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O', 'Nbd7',
        'g4', 'b5', 'g5', 'Nh5', 'Kb1', 'Nb6', 'Na5', 'Rc8', 'Nd5', 'Bxd5',
        'exd5', 'Rc7', 'Rg1', 'Qc8', 'Qf2', 'Nc4', 'Bxc4', 'bxc4', 'Ka1', 'Bd8',
        'Nc6', 'Rb7', 'b3', 'cxb3', 'axb3', 'Rxb3', 'cxb3', 'Qxc6', 'Rc1', 'Qa8'
    ],
    'AlphaZero vs Stockfish Game 2': [
        'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6',
        'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8', 'Nc3', 'Bd7', 'h3', 'b6',
        'b3', 'h5', 'Bb2', 'Kc8', 'Rad1', 'c5', 'Rfe1', 'Be7', 'Nd5', 'Be6',
        'Nxe7+', 'Nxe7', 'c4', 'Nc6', 'Nd2', 'Kb7', 'Ne4', 'f6', 'exf6', 'gxf6',
        'Nd6+', 'cxd6', 'Rxe6', 'Rag8', 'Kf1', 'Rhg8', 'Ree1', 'Nd4', 'Bxd4', 'cxd4',
        'Re7+', 'Ka6', 'Rxa7+', 'Kxa7', 'Rxd4', 'Rg5', 'Ke2', 'Rb5', 'Kd3', 'Rb4',
        'Rxb4', 'Kxb4'
    ],
    'Stockfish vs Komodo 2018': [
        'd4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7',
        'e3', 'O-O', 'Bd3', 'Nbd7', 'Nf3', 'Re8', 'O-O', 'c6', 'Qc2', 'Nf8',
        'Rab1', 'Ng6', 'b4', 'a6', 'a4', 'Bd6', 'Bxf6', 'Qxf6', 'b5', 'Bd7',
        'bxc6', 'bxc6', 'Rb6', 'Rab8', 'Rfb1', 'Rxb6', 'Rxb6', 'Be7', 'Ne2', 'Bc8',
        'Ng3', 'h6', 'Nh5', 'Qd8', 'Qc5', 'Be6', 'a5', 'Ra8', 'Rb7', 'Qc8', 'Rb1', 'Qd8'
    ],
    'AlphaZero Sacrificial Masterpiece': [
        'e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O',
        'Re1', 'd6', 'c3', 'Na5', 'Bb5', 'c6', 'Ba4', 'Bg4', 'h3', 'Bh5',
        'd4', 'Nd7', 'Be3', 'Nb6', 'Bb3', 'Nxb3', 'axb3', 'a5', 'Nbd2', 'f6',
        'g4', 'Bf7', 'Kg2', 'Qc8', 'Rh1', 'Qe6', 'Qe2', 'Rfe8', 'd5', 'cxd5',
        'exd5', 'Qf5', 'c4', 'e4', 'Nd4', 'Qg6', 'N2f3', 'Nc8', 'Rae1', 'Bd8',
        'Nh4', 'Qf7', 'Qf1', 'Nd6', 'f3', 'exf3+', 'Kxf3', 'Re4', 'Nxe4', 'Nxe4',
        'Rxe4', 'Bxh4', 'Bf4', 'Re8', 'Rxe8+', 'Qxe8', 'Qd3', 'Bg5', 'Bxg5', 'fxg5'
    ]
};

console.log('\\n=== VERIFICATION DES PARTIES LEGENDAIRES ===\\n');

let totalErrors = 0;

for (const [name, moves] of Object.entries(games)) {
    const chess = new Chess();
    let errors = [];
    let lastValidMove = 0;

    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        try {
            const result = chess.move(move, { sloppy: true });
            if (!result) {
                errors.push({ index: i+1, move: move, fen: chess.fen() });
            } else {
                lastValidMove = i+1;
            }
        } catch (e) {
            errors.push({ index: i+1, move: move, error: e.message, fen: chess.fen() });
        }
    }

    if (errors.length === 0) {
        console.log(`✅ ${name}: ${moves.length} coups OK`);
    } else {
        console.log(`\\n❌ ${name}: ERREURS`);
        console.log(`   Coups: ${moves.length} | Dernier valide: ${lastValidMove}`);
        errors.forEach(e => {
            console.log(`   Coup ${e.index}: "${e.move}" INVALIDE`);
            console.log(`   FEN: ${e.fen}`);
        });
        totalErrors += errors.length;
    }
}

console.log(`\\n=== RESULTAT: ${totalErrors === 0 ? 'TOUS OK' : totalErrors + ' ERREURS'} ===\\n`);
