/* Stockfish.js 19 full single-thread browser worker loader.
 * GPL-3.0 engine package: https://www.npmjs.com/package/stockfish
 * The full WASM payload is fetched on demand from the pinned jsDelivr release. */
postMessage({ type: "engine-loading", message: "Chargement de Stockfish 19 full (environ 94 Mo)..." });
var engineBase = "https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/";
self.Module = self.Module || {};
self.Module.locateFile = function (path) {
  return new URL(path, engineBase).href;
};
importScripts(engineBase + "stockfish-19-single.js");
