/* Page translations for the Stockfish game and puzzle generator.
   Exposes the hook used by shared/i18n.js and updates later generated text too. */
(function (root) {
  "use strict";

  var pairs = [
    ["Full mono-thread · réseau NNUE 38 Mo", "Full single-thread · 38 MB NNUE network"],
    ["Télécharger Stockfish 16 JS", "Download Stockfish 16 JS"],
    ["Télécharger Stockfish 16 WASM", "Download Stockfish 16 WASM"],
    ["Télécharger le réseau NNUE 16", "Download the SF16 NNUE network"],
    ["Télécharger Stockfish 17.1 Lite JS", "Download Stockfish 17.1 Lite JS"],
    ["Télécharger Stockfish 17.1 Lite WASM", "Download Stockfish 17.1 Lite WASM"],
    ["Sélectionne les fichiers JavaScript et WASM du même build Stockfish ", "Select the JavaScript and WASM files from the same Stockfish build "],
    [", sélectionne un fichier .js et son fichier .wasm.", ", select a .js file and its matching .wasm file."],
    ["Stockfish 16 requiert aussi le fichier réseau .nnue téléchargé ci-dessus.", "Stockfish 16 also requires the .nnue network file downloaded above."],
    ["Fichier incomplet ou altéré pour Stockfish ", "Incomplete or corrupted file for Stockfish "],
    ["Le fichier JS SF16 ne référence pas le réseau NNUE fourni.", "The SF16 JS file does not reference the provided NNUE network."],
    ["La version du moteur a changé.", "The engine version has changed."],
    ["La sélection du moteur a changé.", "The engine selection has changed."],
    ["Stockfish n’a pas répondu à ", "Stockfish did not respond to "],
    [" après ", " after "],
    ["Stockfish n’a pas pu démarrer. Vérifie les fichiers téléchargés et réessaie.", "Stockfish could not start. Check the downloaded files and try again."],
    [" démarre. Vérification de la réponse UCI…", " is starting. Checking the UCI response…"],
    ["Version moteur refusée : SF", "Engine version rejected: SF"],
    [" demandé, UCI annonce ", " requested, UCI reports "],
    ["un moteur non identifié", "an unidentified engine"],
    [" est prêt. Génération des parties candidates…", " is ready. Generating candidate games…"],
    ["Une recherche moteur est déjà en cours.", "An engine search is already running."],
    [" s écoulées · ≈ ", " elapsed · ≈ "],
    [" avant délai de réponse · ", " until timeout · "],
    [" % du délai écoulé (", "% of timeout elapsed ("],
    [" % restant) · génération estimée : ≈ ", "% remaining) · estimated generation time: ≈ "],
    ["Stockfish n’a pas répondu avant le délai de ", "Stockfish did not respond before the "],
    ["Échiquier validé", "Board validated"],
    ["aucun demi-coup joué", "no half-moves played"],
    ["Précision libre selon les Elo réglés", "Free play at the selected Elo settings"],
    [" sacrifice(s) candidat(s) · séquence max ", " candidate sacrifice(s) · longest line "],
    [" demi-coups générés · ", " half-moves generated · "],
    [" · Elo demandés ", " · requested Elo "],
    [" sacrifices tactiques candidats détectés ; meilleure séquence rapprochée : ", " candidate tactical sacrifice(s) found; best forcing line: "],
    [" · Elo demandés : Blancs ", " · requested Elo: White "],
    ["Aucun sacrifice candidat détecté.", "No candidate sacrifice found."],
    ["UCI demandé ", "UCI requested "],
    [" · progression des demi-coups planifiés ", " · planned half-moves "],
    [" % · temps estimé ≈ ", "% · estimated time ≈ "],
    [" top-1 à pleine puissance", " top-1 at full strength"],
    ["réglage Elo UCI demandé ", "requested UCI Elo setting "],
    [" (non mesuré)", " (not measured)"],
    ["Stockfish a renvoyé un coup illégal : ", "Stockfish returned an illegal move: "],
    ["Parties enregistrées en mémoire locale; exporte régulièrement la banque JSON.", "Games are saved in this browser; export the JSON library regularly."],
    ["La bibliothèque d’échecs ne s’est pas chargée.", "The chess library did not load."],
    ["Parties générées. Analyse automatique des positions tactiques pour créer des exercices…", "Games generated. Automatically analyzing tactical positions to create exercises…"],
    ["Génération interrompue après le demi-coup en cours. Les parties terminées restent enregistrées.", "Generation stopped after the current half-move. Completed games remain saved."],
    ["Génération terminée : les parties sont classées et enregistrées. Coche l’option pour créer aussi des puzzles automatiquement.", "Generation complete: games are ranked and saved. Check the option to create puzzles automatically too."],
    ["Puzzles créés, mais le navigateur n’a pas pu les conserver localement.", "Puzzles were created, but this browser could not save them locally."],
    ["Attaque à la découverte", "Discovered attack"],
    ["Mat étouffé", "Smothered mate"],
    ["Échec double", "Double check"],
    ["Combinaison avancée", "Advanced combination"],
    ["Défense tactique", "Tactical defense"],
    ["Aucun thème chargé.", "No themes loaded."],
    ["La cote minimum doit être inférieure ou égale à la cote maximum.", "The minimum rating must be less than or equal to the maximum rating."],
    [" puzzle(s) Stockfish généré(s) affichés séparément sans Elo de difficulté étalonné.", " Stockfish puzzle(s) generated and shown separately; their difficulty Elo is not calibrated."],
    [" Cote maximale enregistrée dans la banque : ", " Maximum rating stored in the library: "],
    [" · Elo puzzle estimé ", " · estimated puzzle Elo "],
    [". Entraînement libre, classement inchangé.", ". Free practice; ranking unchanged."],
    ["Première étape du parcours personnalisé", "First step in your personalized path"],
    ["Étape suivante du parcours personnalisé", "Next step in your personalized path"],
    [" puzzle(s) restauré(s), avec Elo estimé, depuis cet appareil.", " puzzle(s) restored from this device with estimated Elo."],
    [" problème(s) chargés · banque tactique SupaChess et puzzles Stockfish.", " problem(s) loaded · SupaChess tactical library and Stockfish puzzles."],
    ["La banque tactique n’a pas pu charger (", "The tactical library could not load ("],
    ["). Les puzzles Stockfish déjà créés restent disponibles.", "). Previously created Stockfish puzzles are still available."],
    ["Génère d’abord une partie avec Stockfish 16, 17, 18 ou 19.", "Generate a game with Stockfish 16, 17, 18, or 19 first."],
    ["Extraction des positions tactiques candidates… Les puzzles déjà créés sont conservés.", "Extracting candidate tactical positions… Existing puzzles will be kept."],
    [" puzzle(s) déjà enregistrés restent disponibles.", " previously saved puzzle(s) are still available."],
    ["Analyse des défenses Stockfish · puzzle ", "Analyzing Stockfish defenses · puzzle "],
    [" nouveau(x) puzzle(s) défensif(s) enregistré(s) · ", " new defensive puzzle(s) saved · "],
    ["Impossible d’analyser les positions : ", "Could not analyze the positions: "],
    [" · position après ", " · position after "],
    [" · Elo puzzle estimé : ", " · estimated puzzle Elo: "],
    [" coup(s) à trouver · ", " move(s) to find · "],
    ["Puzzles défensifs générés par Stockfish · ", "Defensive puzzles generated by Stockfish · "],
    ["Puzzle généré ", "Generated puzzle "],
    [" exercice(s) coté(s) dans les filtres", " rated exercise(s) in the filters"],
    ["Aucun puzzle ne correspond aux thèmes et à la cote sélectionnés.", "No puzzle matches the selected themes and rating."],
    ["Blancs défendent", "White to defend"],
    ["Noirs défendent", "Black to defend"],
    ["Trouve une défense active ou une contre-attaque. La séquence continue sur plusieurs demi-coups ; les réponses Stockfish sont jouées automatiquement.", "Find an active defense or counterattack. The line continues for several half-moves; Stockfish replies are played automatically."],
    ["À toi : joue le meilleur coup défensif de la ligne calculée par Stockfish.", "Your turn: play the best defensive move in Stockfish's calculated line."],
    ["Échiquier SVG interactif du puzzle", "Interactive SVG puzzle board"],
    ["Sélectionne une pièce de ton camp.", "Select a piece from your side."],
    ["Ce coup ne correspond pas à la ligne recommandée par Stockfish. Cherche une défense qui garde l’évaluation la plus favorable.", "This move does not match Stockfish's recommended line. Find a defense that keeps the evaluation as favorable as possible."],
    ["Coup illégal. Réessaie.", "Illegal move. Try again."],
    ["Bonne réponse : ", "Correct: "],
    ["Séquence défensive terminée. Ligne Stockfish : ", "Defensive line complete. Stockfish line: "],
    ["Bonne défense : ", "Good defense: "],
    ["Banque importée et conservée sur cet appareil : ", "Library imported and saved on this device: "],
    ["Ouvre une position de partie ou un puzzle avant l’export SVG.", "Open a game position or puzzle before exporting SVG."],
    ["Initialisation annulée.", "Initialization cancelled."],
    ["Annulation du démarrage Stockfish…", "Cancelling Stockfish startup…"],
    ["Arrêt demandé ; fin du demi-coup en cours…", "Stop requested; finishing the current half-move…"],
    ["Build ", "Build "],
    [" sélectionné. Télécharge puis choisis les deux fichiers correspondants.", " selected. Download and select the matching two files."],
    [" sélectionné. Télécharge et choisis les fichiers affichés avant de générer ou vérifier.", " selected. Download and select the displayed files before generating or verifying."],
    [" vérifiés par taille. Tu peux générer.", " verified by size. You can generate."],
    [" sélectionnés; l’identifiant UCI sera contrôlé au démarrage.", " selected; the UCI ID will be checked at startup."],
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
    if (document.documentElement.lang !== current) document.documentElement.lang = current;
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
