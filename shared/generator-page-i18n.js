/* Page translations for the Stockfish game and puzzle generator.
   Exposes the hook used by shared/i18n.js and updates later generated text too. */
(function (root) {
  "use strict";

  var pairs = [
    ["Générateur de parties brillantes 2800+ — SupaChess", "Brilliant Game Generator 2800+ — SupaChess"],
    ["Générateur de parties brillantes · Elo 2 800+", "Brilliant game generator · Elo 2,800+"],
    ["Générateur de parties brillantes", "Brilliant game generator"],
    ["← Retour aux parties brillantes", "← Back to brilliant games"],
    ["Fais jouer Stockfish 19 contre Stockfish 19 à 2 800 Elo ou plus par camp. Classe les parties générées, puis transforme leurs positions tactiques en puzzles : trouve la défense, la contre-attaque et la suite calculée par le moteur.", "Play Stockfish 19 against Stockfish 19 at 2,800 Elo or higher per side. Rank the generated games, then turn their tactical positions into puzzles: find the defense, counterattack, and engine-calculated continuation."],
    ["Réglage vérifiable :", "Verifiable setting:"],
    ["Stockfish reçoit le protocole UCI ", "Stockfish receives the UCI protocol "],
    [" et un Elo réglé à au moins 2 800 pour chaque camp.", " and an Elo setting of at least 2,800 for each side."],
    ["La cote UCI est un réglage moteur, pas une performance mesurée dans un tournoi humain.", "The UCI rating is an engine setting, not a performance measured in a human tournament."],
    ["Les sacrifices affichés sont des candidats détectés par une heuristique explicite, pas une étiquette officielle « brilliant » de Stockfish.", "Displayed sacrifices are candidates detected by an explicit heuristic, not an official Stockfish “brilliant” label."],
    ["Paramètres de génération", "Generation settings"],
    ["Blancs · Elo moteur (minimum 2 800)", "White · engine Elo (minimum 2,800)"],
    ["Noirs · Elo moteur (minimum 2 800)", "Black · engine Elo (minimum 2,800)"],
    ["Camp(s) P1/P2 à 100 % top‑1", "P1/P2 side(s) at 100% top-1"],
    ["Aucun · Elo UCI réglé", "None · UCI Elo setting"],
    ["P1 · Blancs", "P1 · White"],
    ["P2 · Noirs", "P2 · Black"],
    ["P1 et P2", "P1 and P2"],
    ["Le camp choisi joue le premier coup Stockfish à chaque position, en pleine puissance. « 100 % » signifie top‑1 au temps de calcul choisi; ce n’est pas une note standard d’analyse ni une garantie absolue.", "The selected side plays Stockfish's top move at every position, at full strength. “100%” means top-1 at the selected search time; it is not a standard analysis score or an absolute guarantee."],
    ["Parties candidates", "Candidate games"],
    ["1 partie", "1 game"],
    ["3 parties", "3 games"],
    ["5 parties", "5 games"],
    ["Temps de calcul par demi-coup", "Search time per half-move"],
    ["rapide", "fast"],
    ["équilibré", "balanced"],
    ["approfondi", "deep"],
    ["Longueur maximale", "Maximum length"],
    ["Choix du moteur :", "Engine selection:"],
    ["choisis Stockfish 16, 17, 18 ou 19 et télécharge les fichiers proposés.", "choose Stockfish 16, 17, 18, or 19 and download the provided files."],
    ["SF16 utilise le build complet et nécessite JS, WASM et réseau NNUE; SF17 utilise le build Lite mono-thread. SF18/19 proposent Lite ou Full. Le réglage Elo UCI ne mesure pas indépendamment la force réelle du build.", "SF16 uses the full build and requires JS, WASM, and an NNUE network; SF17 uses the Lite single-thread build. SF18/19 offer Lite or Full. The UCI Elo setting does not independently measure the build's actual strength."],
    ["Version Stockfish", "Stockfish version"],
    ["Build", "Build"],
    ["Lite mono-thread", "Lite single-thread"],
    ["Full mono-thread", "Full single-thread"],
    ["Fichier JavaScript", "JavaScript file"],
    ["Télécharger le fichier JS Lite", "Download the Lite JS file"],
    ["Réseau WASM", "WASM network"],
    ["Télécharger le réseau WASM Lite", "Download the Lite WASM network"],
    ["Réseau NNUE (SF16)", "NNUE network (SF16)"],
    ["Télécharger le réseau NNUE SF16", "Download the SF16 NNUE network"],
    ["SF18/19 : sélectionne le JS et le WASM du même build, vérifiés par nom et taille. SF17 : sélectionne le JS et le WASM Lite téléchargés. SF16 : sélectionne aussi le réseau NNUE. Les noms des fichiers 16/17 peuvent varier; l’identifiant UCI est contrôlé au démarrage.", "SF18/19: select the JS and WASM files from the same build; their names and sizes are checked. SF17: select the downloaded Lite JS and WASM files. SF16: also select the NNUE network. File names for versions 16/17 can vary; the UCI engine ID is checked at startup."],
    ["Générer parties et exercices", "Generate games and exercises"],
    ["Annuler après le demi-coup en cours", "Cancel after the current half-move"],
    ["Créer et enregistrer automatiquement des puzzles défensifs après les parties", "Automatically create and save defensive puzzles after the games"],
    ["Choisis SF16 à SF19. SF16 nécessite trois fichiers, dont le NNUE; SF17 nécessite le JS et le WASM Lite. L’identifiant UCI confirme la version au démarrage.", "Choose SF16 to SF19. SF16 requires three files, including NNUE; SF17 requires the Lite JS and WASM files. The UCI engine ID confirms the version at startup."],
    ["Classement des parties générées", "Generated game ranking"],
    ["Après la génération, crée aussi des puzzles défensifs calculés à partir des tactiques candidates.", "After generation, also create defensive puzzles calculated from candidate tactics."],
    ["Classement par nombre de sacrifices candidats, puis par longueur de la meilleure séquence rapprochée.", "Ranked by the number of candidate sacrifices, then by the length of the best forcing line."],
    ["Problèmes, puzzles, plans, tactiques et défenses", "Problems, puzzles, plans, tactics, and defenses"],
    ["Les parties et puzzles sont générés par la version Stockfish sélectionnée (Elo UCI réglé à 2 800 ou plus). Les lignes légales sont contrôlées et l’identifiant UCI de la version est vérifié. Tu joues le camp qui doit se défendre ; le moteur calcule une ligne de réponses et de contre-attaques avec les réglages Elo et le temps choisis. Ces lignes sont des recommandations du moteur pour cette analyse, pas des solutions universelles certifiées.", "Games and puzzles are generated by the selected Stockfish version (UCI Elo set to 2,800 or higher). Legal lines are checked and the version's UCI ID is verified. You play the side that must defend; the engine calculates a line of replies and counterattacks using the selected Elo and search time. These lines are engine recommendations for this analysis, not universally certified solutions."],
    ["Créer les puzzles défensifs", "Create defensive puzzles"],
    ["Exporter la banque réutilisable (JSON)", "Export reusable library (JSON)"],
    ["Importer une banque JSON", "Import a JSON library"],
    ["Exporter la position SVG", "Export position as SVG"],
    ["Génère d’abord au moins une partie contenant un sacrifice tactique candidat.", "First generate at least one game containing a candidate tactical sacrifice."],
    ["Problèmes personnalisés", "Custom problems"],
    ["Choisis une plage de cote d’exercice de 400 à 4 000 et les thèmes. Les cotes de la banque sont indicatives, pas un Elo FIDE. La banque tactique SupaChess et les puzzles défensifs créés avec Stockfish sont disponibles ici. Entraînement libre : ton classement ne bouge pas.", "Choose a puzzle rating range from 400 to 4,000 and select themes. Library ratings are indicative, not FIDE Elo. The SupaChess tactical library and defensive puzzles created with Stockfish are available here. Free practice: your ranking does not change."],
    ["Elo minimum", "Minimum Elo"],
    ["Elo maximum", "Maximum Elo"],
    ["Thèmes", "Themes"],
    ["Laisse tout décoché pour inclure tous les thèmes présents dans les exercices chargés.", "Leave all unchecked to include every theme in the loaded exercises."],
    ["Phases de jeu", "Game phases"],
    ["Les phases suivent l’ordre ouverture → milieu de partie → finale. Coche une phase pour filtrer les exercices personnalisés.", "Phases follow the order opening → middlegame → endgame. Select a phase to filter custom exercises."],
    ["C’est parti !", "Start!"],
    ["Chargement de la banque de puzzles tactiques…", "Loading the tactical puzzle library…"],
    ["Recommencer ce puzzle", "Restart this puzzle"],
    ["Puzzle suivant →", "Next puzzle →"],
    ["← Demi-coup précédent", "← Previous half-move"],
    ["Demi-coup suivant →", "Next half-move →"],
    ["Télécharger le PGN", "Download PGN"],
    ["Moteur :", "Engine:"],
    ["selon la version sélectionnée.", "depending on the selected version."],
    ["Le réglage UCI Elo ne certifie pas la force réelle du build ; la page ne prétend pas que son score de sacrifices est une classification officielle.", "The UCI Elo setting does not certify the build's actual strength; this page does not claim its sacrifice score is an official classification."],
    ["Version du site : ", "Site version: "],
    [" · Page : ", " · Page: "],
    [" · Révision GitHub main : ", " · GitHub main revision: "],
    ["récupération…", "loading…"],
    ["indisponible", "unavailable"],
    ["Apparence", "Appearance"],
    ["📊 Analyse", "📊 Analysis"],
    ["📊 Analysis", "📊 Analysis"],
    ["Choisir la langue du site", "Choose site language"],
    ["Réglages SupaChess", "SupaChess settings"],
    ["Fermer", "Close"],
    ["Ouvrir l’analyse de style SupaChess", "Open SupaChess player analysis"],
    ["Profil de Style", "Style profile"],
    ["Page précédente", "Previous page"],
    ["Style proche de", "Style similar to"]
  ];

  var originals = new WeakMap();
  var lastTranslated = new WeakMap();
  var originalAttributes = new WeakMap();
  var lastAttributes = new WeakMap();
  var current = "fr";
  var originalTitle = document.title;

  function translate(value, lang) {
    if (lang !== "en") return value;
    var output = value;
    for (var i = 0; i < pairs.length; i++) {
      if (output.indexOf(pairs[i][0]) !== -1) output = output.split(pairs[i][0]).join(pairs[i][1]);
    }
    output = output
      .replace(/Stockfish (\d+) ([^.]*) démarre\. Vérification de la réponse UCI…/g, "Stockfish $1 $2 is starting. Checking the UCI response…")
      .replace(/Stockfish (\d+) ([^.]*) est prêt\. Génération des parties candidates…/g, "Stockfish $1 $2 is ready. Generating candidate games…")
      .replace(/Partie (\d+)\/(\d+) · demi-coup (\d+)\/(\d+) · progression des demi-coups planifiés (\d+) % · reste (\d+) % · temps estimé ≈ (.+)/g, "Game $1/$2 · half-move $3/$4 · planned half-moves $5% complete · $6% remaining · estimated time ≈ $7")
      .replace(/Génération terminée : (\d+) partie\(s\) disponibles et (\d+) nouveau\(x\) puzzle\(s\) réutilisable\(s\) dans les exercices tactiques de ce navigateur\./g, "Generation complete: $1 game(s) available and $2 new reusable puzzle(s) in this browser's tactical exercises.")
      .replace(/(\d+) partie\(s\) générée\(s\) restaurée\(s\) depuis ce navigateur\. Elles restent jouables dans la page Parties brillantes\./g, "$1 generated game(s) restored from this browser. They can still be played on the Brilliant Games page.")
      .replace(/Erreur moteur : /g, "Engine error: ")
      .replace(/Téléchargement direct bloqué par le CDN \((.*)\)\. Le lien va s’ouvrir : utilise Ctrl\+S puis conserve le nom du fichier\./g, "Direct download blocked by the CDN ($1). The link will open: press Ctrl+S and keep the file name.")
      .replace(/Sélectionne les fichiers JS et WASM (.*)\./g, "Select the JS and WASM files for $1.")
      .replace(/Fichiers officiels Stockfish (.*) vérifiés par taille\. Tu peux générer\./g, "Official Stockfish $1 files verified by size. You can generate.")
      .replace(/Téléchargement de (.*)…/g, "Downloading $1…")
      .replace(/(.*) téléchargé\. Sélectionne-le ensuite dans le champ de fichier correspondant\./g, "$1 downloaded. Then select it in the matching file field.")
      .replace(/^(.*) est indisponible\.$/g, "$1 is unavailable.");
    return output;
  }

  function translateNode(node, lang, force) {
    var currentText = node.nodeValue;
    var previous = lastTranslated.get(node);
    var original = originals.get(node);
    if (original === undefined || (!force && previous !== undefined && currentText !== previous)) {
      original = currentText;
      originals.set(node, original);
    } else if (original === undefined) {
      original = currentText;
      originals.set(node, original);
    }
    var translated = translate(original, lang);
    if (currentText !== translated) {
      lastTranslated.set(node, translated);
      node.nodeValue = translated;
    } else {
      lastTranslated.set(node, currentText);
    }
  }

  function translateAttributes(element, lang) {
    ["title", "aria-label", "placeholder"].forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      var value = element.getAttribute(name);
      var prior = lastAttributes.get(element) || {};
      var source = originalAttributes.get(element) || {};
      if (source[name] === undefined || (prior[name] !== undefined && value !== prior[name])) source[name] = value;
      var translated = translate(source[name], lang);
      prior[name] = translated;
      originalAttributes.set(element, source);
      lastAttributes.set(element, prior);
      if (value !== translated) element.setAttribute(name, translated);
    });
  }

  function translateTree(rootNode, lang, force) {
    if (!rootNode) return;
    var container = rootNode.nodeType === 1 ? rootNode : rootNode.parentElement;
    if (rootNode.nodeType === 3) translateNode(rootNode, lang, force);
    else if (container) {
      translateAttributes(container, lang);
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) translateNode(node, lang, force);
      container.querySelectorAll("*").forEach(function (element) { translateAttributes(element, lang); });
    }
  }

  function applyLanguage(lang) {
    current = lang === "en" ? "en" : "fr";
    document.documentElement.lang = current;
    document.title = translate(originalTitle, current);
    translateTree(document.body, current, true);
  }

  root.ChessNovaPageTranslate = applyLanguage;
  var saved = (localStorage.getItem("chessnova_lang") || document.documentElement.lang || "fr").slice(0, 2).toLowerCase();
  current = saved === "en" ? "en" : "fr";
  document.documentElement.lang = current;

  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === "characterData") {
        var node = record.target;
        var last = lastTranslated.get(node);
        if (last !== undefined && node.nodeValue === last) return;
        originals.set(node, node.nodeValue);
        translateNode(node, current, true);
      } else if (record.type === "childList") {
        record.addedNodes.forEach(function (node) { translateTree(node, current, false); });
      } else if (record.type === "attributes" && record.attributeName === "lang") {
        var lang = document.documentElement.lang;
        if (lang === "fr" || lang === "en") applyLanguage(lang);
      }
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, characterDataOldValue: true, attributes: true, attributeFilter: ["lang"] });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { applyLanguage(current); }, { once: true });
  } else {
    applyLanguage(current);
  }
})(window);
