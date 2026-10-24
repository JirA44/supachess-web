// SUPA SF18 vs SF19 Match Runner (adaptateurs unifiés)
// Usage: node sf_match.js [nbGames] [movetimeMs]
"use strict";

const fs = require("fs");
const path = require("path");

const N_GAMES = parseInt(process.argv[2]) || 4;
const MOVETIME = parseInt(process.argv[3]) || 300;
const MAX_PLIES = 200;

const ENGINES = {
  sf18: path.join(__dirname, "..", "js", "sf18", "package", "bin", "stockfish-18-lite-single.js"),
  sf19: path.join(__dirname, "..", "js", "sf19", "package", "bin", "stockfish-19-lite-single.js"),
};

const handlers = {}; // name -> fn(line)

function onLine(name, line) {
  if (handlers[name]) handlers[name](line);
}

function makeEngine(name, bin) {
  return new Promise((resolve, reject) => {
    const pkgIndex = path.join(path.dirname(path.dirname(bin)), "index.js");
    const index = require(pkgIndex);
    if (name === "sf18") {
      index(bin, (err, engine) => {
        if (err) return reject(err);
        engine.print = (line) => onLine(name, String(line));
        engine.printErr = () => {};
        const waitReady = () => {
          if (typeof engine.sendCommand === "function") {
            resolve({ name, send: (cmd) => engine.sendCommand(cmd) });
          } else setTimeout(waitReady, 50);
        };
        waitReady();
      });
    } else {
      const engine = index(bin, (line) => onLine(name, String(line)));
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (typeof engine.processCommand === "function") {
          clearInterval(iv);
          resolve({ name, send: (cmd) => engine.processCommand(cmd) });
        } else if (Date.now() - t0 > 20000) {
          clearInterval(iv);
          reject(new Error("sf19 init timeout"));
        }
      }, 50);
    }
  });
}

function bestmove(eng, moves) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => { handlers[eng.name] = null; reject(new Error("timeout")); }, MOVETIME * 5 + 10000);
    handlers[eng.name] = (line) => {
      if (line.startsWith("bestmove")) {
        clearTimeout(to);
        handlers[eng.name] = null;
        resolve(line.split(/\s+/)[1]);
      }
    };
    eng.send(`position startpos moves${moves.length ? " " + moves.join(" ") : ""}`);
    eng.send(`go movetime ${MOVETIME}`);
  });
}

async function playGame(id, sf18Plays) {
  const moves = [];
  const e18 = await makeEngine("sf18", ENGINES.sf18);
  const e19 = await makeEngine("sf19", ENGINES.sf19);
  e18.send("uci"); e19.send("uci");
  e18.send("isready"); e19.send("isready");
  await new Promise((r) => setTimeout(r, 1200));
  let result = "1/2-1/2";
  for (let ply = 0; ply < MAX_PLIES; ply++) {
    const white = ply % 2 === 0;
    const mover = (white ? sf18Plays : !sf18Plays) ? e18 : e19;
    let mv;
    try {
      mv = await bestmove(mover, moves);
    } catch {
      result = `* (timeout ${mover.name})`;
      break;
    }
    if (!mv || mv === "(none)" || mv === "0000" || mv === "a1a1") {
      result = (mover === e18) ? "0-1" : "1-0"; // le camp qui ne peut plus bouger perd
      break;
    }
    moves.push(mv);
  }
  try { e18.send("quit"); e19.send("quit"); } catch {}
  return { game: id, sf18: sf18Plays ? "white" : "black", moves, result };
}

async function main() {
  const games = [];
  for (let g = 0; g < N_GAMES; g++) {
    const sf18Plays = g % 2 === 0;
    console.log(`Partie ${g + 1}/${N_GAMES} — sf18 aux ${sf18Plays ? "blancs" : "noirs"}`);
    const res = await playGame(g + 1, sf18Plays);
    console.log(`  -> ${res.result} (${res.moves.length} demi-coups)`);
    games.push(res);
  }
  const score = { sf18: 0, sf19: 0 };
  for (const g of games) {
    if (g.result === "1-0") score[g.sf18 === "white" ? "sf18" : "sf19"] += 1;
    else if (g.result === "0-1") score[g.sf18 === "white" ? "sf19" : "sf18"] += 1;
    else { score.sf18 += 0.5; score.sf19 += 0.5; }
  }
  const out = { ts: new Date().toISOString(), movetime: MOVETIME, games, score };
  const outDir = "D:\\Code\\supa\\data";
  fs.mkdirSync(outDir, { recursive: true });
  const p = path.join(outDir, `sf_match_${Date.now()}.json`);
  fs.writeFileSync(p, JSON.stringify(out, null, 1));
  console.log(`Score final: SF18 ${score.sf18} — ${score.sf19} SF19`);
  console.log("-> " + p);
}

main().catch((e) => { console.error("MATCH CRASH:", e.message); process.exit(1); });
