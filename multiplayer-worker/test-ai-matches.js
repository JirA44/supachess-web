// AIMIX AI Tournament - Test complet avec statistiques détaillées
// Temps par coup, winrate, stats par IA, etc.

const AI_TYPES = [
  { type: 'random', level: 5, name: 'Random Bot', elo: 800 },
  { type: 'aggressive', level: 10, name: 'Aggressive AI', elo: 1200 },
  { type: 'defensive', level: 10, name: 'Defensive AI', elo: 1100 },
  { type: 'positional', level: 10, name: 'Positional AI', elo: 1300 },
  { type: 'minimax', level: 5, name: 'Minimax Lv5', elo: 1400 },
  { type: 'minimax', level: 10, name: 'Minimax Lv10', elo: 1800 },
  { type: 'minimax', level: 15, name: 'Minimax Lv15', elo: 2200 },
  { type: 'minimax', level: 20, name: 'Minimax Pro', elo: 2600 }
];

const BASE_URL = 'http://127.0.0.1:8787';

// Statistiques globales
const globalStats = {
  totalGames: 0,
  totalMoves: 0,
  totalTime: 0,
  whiteWins: 0,
  blackWins: 0,
  draws: 0,
  errors: 0,
  shortestGame: Infinity,
  longestGame: 0,
  fastestGame: Infinity,
  slowestGame: 0
};

// Stats par IA
const aiStats = {};
AI_TYPES.forEach(ai => {
  aiStats[ai.name] = {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalMoves: 0,
    totalTime: 0,
    avgTimePerMove: 0,
    winRate: 0,
    asWhite: { games: 0, wins: 0 },
    asBlack: { games: 0, wins: 0 },
    opponents: {},
    elo: ai.elo,
    type: ai.type,
    level: ai.level
  };
});

async function testAIMatch(white, black) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/ai-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ white, black })
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    const endTime = Date.now();
    const gameDuration = endTime - startTime;

    if (result.success) {
      const moves = result.gameState?.moves?.length || 0;
      const gameResult = result.gameState?.result || 'N/A';

      return {
        success: true,
        moves,
        result: gameResult,
        duration: gameDuration,
        avgTimePerMove: moves > 0 ? gameDuration / moves : 0,
        white: white.name,
        black: black.name
      };
    } else {
      return { success: false, error: result.message };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateStats(matchResult, white, black) {
  if (!matchResult.success) {
    globalStats.errors++;
    return;
  }

  globalStats.totalGames++;
  globalStats.totalMoves += matchResult.moves;
  globalStats.totalTime += matchResult.duration;

  // Update shortest/longest
  if (matchResult.moves < globalStats.shortestGame) globalStats.shortestGame = matchResult.moves;
  if (matchResult.moves > globalStats.longestGame) globalStats.longestGame = matchResult.moves;
  if (matchResult.duration < globalStats.fastestGame) globalStats.fastestGame = matchResult.duration;
  if (matchResult.duration > globalStats.slowestGame) globalStats.slowestGame = matchResult.duration;

  // Result parsing
  const whiteWon = matchResult.result === '1-0';
  const blackWon = matchResult.result === '0-1';
  const draw = matchResult.result === '1/2-1/2';

  if (whiteWon) globalStats.whiteWins++;
  else if (blackWon) globalStats.blackWins++;
  else if (draw) globalStats.draws++;

  // Update per-AI stats
  const updateAI = (ai, isWhite, won, lost, drew, moves, time) => {
    const stats = aiStats[ai.name];
    stats.games++;
    stats.totalMoves += moves;
    stats.totalTime += time;

    if (won) stats.wins++;
    else if (lost) stats.losses++;
    else if (drew) stats.draws++;

    if (isWhite) {
      stats.asWhite.games++;
      if (won) stats.asWhite.wins++;
    } else {
      stats.asBlack.games++;
      if (won) stats.asBlack.wins++;
    }

    // Track vs opponent
    const oppName = isWhite ? black.name : white.name;
    if (!stats.opponents[oppName]) {
      stats.opponents[oppName] = { games: 0, wins: 0, losses: 0, draws: 0 };
    }
    stats.opponents[oppName].games++;
    if (won) stats.opponents[oppName].wins++;
    else if (lost) stats.opponents[oppName].losses++;
    else if (drew) stats.opponents[oppName].draws++;
  };

  updateAI(white, true, whiteWon, blackWon, draw, matchResult.moves, matchResult.duration);
  updateAI(black, false, blackWon, whiteWon, draw, matchResult.moves, matchResult.duration);
}

function calculateFinalStats() {
  Object.values(aiStats).forEach(stats => {
    if (stats.games > 0) {
      stats.avgTimePerMove = Math.round(stats.totalTime / stats.totalMoves);
      stats.winRate = Math.round((stats.wins / stats.games) * 100);
      stats.drawRate = Math.round((stats.draws / stats.games) * 100);
    }
  });
}

function printSeparator(char = '═', length = 80) {
  console.log(char.repeat(length));
}

function printHeader(title) {
  console.log('\n');
  printSeparator();
  console.log(`  ${title}`);
  printSeparator();
}

function padRight(str, len) {
  return String(str).padEnd(len);
}

function padLeft(str, len) {
  return String(str).padStart(len);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function runTournament() {
  console.log('\n');
  printSeparator('█');
  console.log('█  🏆 AIMIX AI TOURNAMENT - STATISTIQUES COMPLÈTES  █');
  printSeparator('█');

  // Print available AIs
  printHeader('🤖 IAs DISPONIBLES');
  console.log('');
  console.log('  ' + padRight('Nom', 20) + padRight('Type', 15) + padRight('Level', 8) + padRight('ELO', 8));
  console.log('  ' + '-'.repeat(51));
  AI_TYPES.forEach(ai => {
    console.log('  ' + padRight(ai.name, 20) + padRight(ai.type, 15) + padRight(ai.level, 8) + padRight(ai.elo, 8));
  });

  printHeader('🎮 TOURNOI EN COURS');
  console.log(`  Participants: ${AI_TYPES.length} IAs`);
  console.log(`  Total matchs: ${AI_TYPES.length * (AI_TYPES.length - 1) / 2}`);
  console.log('');

  let matchNum = 0;
  const totalMatches = AI_TYPES.length * (AI_TYPES.length - 1) / 2;

  // Round-robin tournament
  for (let i = 0; i < AI_TYPES.length; i++) {
    for (let j = i + 1; j < AI_TYPES.length; j++) {
      matchNum++;
      const white = AI_TYPES[i];
      const black = AI_TYPES[j];

      process.stdout.write(`  [${matchNum}/${totalMatches}] ${padRight(white.name, 15)} vs ${padRight(black.name, 15)} ... `);

      const result = await testAIMatch(white, black);
      updateStats(result, white, black);

      if (result.success) {
        const icon = result.result === '1-0' ? '⚪' : result.result === '0-1' ? '⚫' : '🤝';
        console.log(`${icon} ${result.result} (${result.moves} coups, ${formatTime(result.duration)})`);
      } else {
        console.log(`❌ ERREUR: ${result.error}`);
      }

      await new Promise(r => setTimeout(r, 200));
    }
  }

  calculateFinalStats();

  // ============ GLOBAL STATS ============
  printHeader('📊 STATISTIQUES GLOBALES');
  console.log('');
  console.log(`  Total parties jouées ........ ${globalStats.totalGames}`);
  console.log(`  Total coups joués ........... ${globalStats.totalMoves}`);
  console.log(`  Temps total ................. ${formatTime(globalStats.totalTime)}`);
  console.log('');
  console.log(`  Victoires Blancs ............ ${globalStats.whiteWins} (${Math.round(globalStats.whiteWins / globalStats.totalGames * 100)}%)`);
  console.log(`  Victoires Noirs ............. ${globalStats.blackWins} (${Math.round(globalStats.blackWins / globalStats.totalGames * 100)}%)`);
  console.log(`  Nulles ...................... ${globalStats.draws} (${Math.round(globalStats.draws / globalStats.totalGames * 100)}%)`);
  console.log(`  Erreurs ..................... ${globalStats.errors}`);
  console.log('');
  console.log(`  Partie la + courte .......... ${globalStats.shortestGame} coups`);
  console.log(`  Partie la + longue .......... ${globalStats.longestGame} coups`);
  console.log(`  Partie la + rapide .......... ${formatTime(globalStats.fastestGame)}`);
  console.log(`  Partie la + lente ........... ${formatTime(globalStats.slowestGame)}`);
  console.log(`  Moyenne coups/partie ........ ${Math.round(globalStats.totalMoves / globalStats.totalGames)}`);
  console.log(`  Temps moyen par coup ........ ${formatTime(Math.round(globalStats.totalTime / globalStats.totalMoves))}`);

  // ============ PER-AI STATS TABLE ============
  printHeader('📈 CLASSEMENT DES IAs');
  console.log('');

  // Sort by win rate then by wins
  const sortedAIs = Object.entries(aiStats)
    .sort((a, b) => {
      if (b[1].winRate !== a[1].winRate) return b[1].winRate - a[1].winRate;
      return b[1].wins - a[1].wins;
    });

  console.log('  ' + padRight('Rang', 5) + padRight('IA', 18) + padRight('V', 5) + padRight('N', 5) + padRight('D', 5) + padRight('Win%', 7) + padRight('Moy.coups', 10) + padRight('Temps/coup', 12));
  console.log('  ' + '-'.repeat(67));

  sortedAIs.forEach(([name, stats], idx) => {
    const avgMoves = stats.games > 0 ? Math.round(stats.totalMoves / stats.games) : 0;
    const timePerMove = stats.avgTimePerMove || 0;
    console.log('  ' +
      padRight(`#${idx + 1}`, 5) +
      padRight(name, 18) +
      padRight(stats.wins, 5) +
      padRight(stats.draws, 5) +
      padRight(stats.losses, 5) +
      padRight(`${stats.winRate}%`, 7) +
      padRight(avgMoves, 10) +
      padRight(formatTime(timePerMove), 12)
    );
  });

  // ============ DETAILED AI STATS ============
  printHeader('🔍 DÉTAILS PAR IA');

  sortedAIs.forEach(([name, stats]) => {
    console.log('');
    console.log(`  ┌─ ${name} ──────────────────────────────────`);
    console.log(`  │  Type: ${stats.type} | Level: ${stats.level} | ELO estimé: ${stats.elo}`);
    console.log(`  │`);
    console.log(`  │  Parties: ${stats.games} | V: ${stats.wins} | N: ${stats.draws} | D: ${stats.losses}`);
    console.log(`  │  Win Rate: ${stats.winRate}% | Draw Rate: ${stats.drawRate}%`);
    console.log(`  │`);
    console.log(`  │  Comme Blancs: ${stats.asWhite.games} parties, ${stats.asWhite.wins} victoires (${stats.asWhite.games > 0 ? Math.round(stats.asWhite.wins / stats.asWhite.games * 100) : 0}%)`);
    console.log(`  │  Comme Noirs:  ${stats.asBlack.games} parties, ${stats.asBlack.wins} victoires (${stats.asBlack.games > 0 ? Math.round(stats.asBlack.wins / stats.asBlack.games * 100) : 0}%)`);
    console.log(`  │`);
    console.log(`  │  Temps moyen/coup: ${formatTime(stats.avgTimePerMove)}`);
    console.log(`  │  Total coups joués: ${stats.totalMoves}`);
    console.log(`  │`);
    console.log(`  │  Résultats vs adversaires:`);

    Object.entries(stats.opponents)
      .sort((a, b) => b[1].wins - a[1].wins)
      .forEach(([opp, oppStats]) => {
        const score = `${oppStats.wins}V-${oppStats.draws}N-${oppStats.losses}D`;
        console.log(`  │    vs ${padRight(opp, 18)} ${score}`);
      });

    console.log(`  └${'─'.repeat(45)}`);
  });

  // ============ HEAD TO HEAD MATRIX ============
  printHeader('⚔️ MATRICE HEAD-TO-HEAD');
  console.log('');

  const names = AI_TYPES.map(a => a.name.substring(0, 8));
  console.log('  ' + padRight('', 18) + names.map(n => padRight(n, 10)).join(''));
  console.log('  ' + '-'.repeat(18 + names.length * 10));

  AI_TYPES.forEach(ai => {
    const row = [padRight(ai.name, 18)];
    AI_TYPES.forEach(opp => {
      if (ai.name === opp.name) {
        row.push(padRight('-', 10));
      } else {
        const stats = aiStats[ai.name].opponents[opp.name];
        if (stats) {
          row.push(padRight(`${stats.wins}/${stats.draws}/${stats.losses}`, 10));
        } else {
          row.push(padRight('N/A', 10));
        }
      }
    });
    console.log('  ' + row.join(''));
  });
  console.log('  (Format: Victoires/Nulles/Défaites)');

  // ============ FINAL ============
  printHeader('✅ TOURNOI TERMINÉ');
  console.log('');
  console.log(`  Meilleure IA: ${sortedAIs[0][0]} (${sortedAIs[0][1].winRate}% win rate)`);
  console.log(`  Pire IA: ${sortedAIs[sortedAIs.length - 1][0]} (${sortedAIs[sortedAIs.length - 1][1].winRate}% win rate)`);
  console.log('');
  printSeparator('█');
}

// Export stats as JSON
function exportStats() {
  return {
    global: globalStats,
    perAI: aiStats,
    availableAIs: AI_TYPES,
    timestamp: new Date().toISOString()
  };
}

// Run
runTournament().then(() => {
  // Optionally save stats to file
  const fs = require('fs');
  fs.writeFileSync('tournament-stats.json', JSON.stringify(exportStats(), null, 2));
  console.log('\n  📁 Stats exportées dans tournament-stats.json\n');
});
