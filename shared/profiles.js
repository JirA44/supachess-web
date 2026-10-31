(function(){
'use strict';
var db=null, auth=null;
var GAME_TYPES = {
  puzzle: {label:'Puzzle', icon:'🧩', defaultRating:1200},
  classic3s: {label:'Classic 3s/coup', icon:'⚡', defaultRating:1200},
  classic5s: {label:'Classic 5s/coup', icon:'⏱️', defaultRating:1200}
};
function init(a,d){ auth=a; db=d; }
function ensureUserProfile(user){
  if(!db||!user||!user.uid) return Promise.resolve();
  var ref=db.collection('users').doc(user.uid);
  return ref.get().then(function(doc){
    if(doc.exists) return;
    var data={
      uid:user.uid,
      email:user.email||'',
      displayName:user.displayName|| (user.email? user.email.split('@')[0] : profileText('profile_guest','Player')),
      photoURL:user.photoURL||'',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      stats:{
        puzzle:{rating:1200, wins:0, losses:0, draws:0, played:0},
        classic3s:{rating:1200, wins:0, losses:0, draws:0, played:0},
        classic5s:{rating:1200, wins:0, losses:0, draws:0, played:0}
      },
      totalGames:0
    };
    return ref.set(data);
  }).catch(function(){});
}
function updateStats(uid, gameType, result, delta){
  if(!db||!uid||!GAME_TYPES[gameType]) return;
  var ref=db.collection('users').doc(uid);
  var map={win:'wins', loss:'losses', draw:'draws'};
  var field='stats.'+gameType;
  var upd={};
  upd[field+'.played']=firebase.firestore.FieldValue.increment(1);
  upd['totalGames']=firebase.firestore.FieldValue.increment(1);
  if(map[result]) upd[field+'.'+map[result]]=firebase.firestore.FieldValue.increment(1);
  if(delta) upd[field+'.rating']=firebase.firestore.FieldValue.increment(delta);
  ref.set(upd,{merge:true});
}
function searchUsers(query, limit){
  limit=limit||8;
  if(!db||!query) return Promise.resolve([]);
  query=query.trim().toLowerCase();
  // Firestore can't do case-insensitive contains, so we fetch and filter client-side for small set
  return db.collection('users').limit(50).get().then(function(snap){
    var out=[];
    snap.forEach(function(doc){
      var d=doc.data();
      var name=(d.displayName||'').toLowerCase();
      var email=(d.email||'').toLowerCase();
      if(name.indexOf(query)!==-1 || email.indexOf(query)!==-1){
        out.push({uid:doc.id, displayName:d.displayName, email:d.email, photoURL:d.photoURL, stats:d.stats});
      }
    });
    return out.slice(0,limit);
  });
}
function getTopRanking(gameType, limit){
  limit=limit||10;
  if(!db||!GAME_TYPES[gameType]) return Promise.resolve([]);
  return db.collection('users').orderBy('stats.'+gameType+'.rating','desc').limit(limit).get().then(function(snap){
    var out=[];
    snap.forEach(function(doc){
      var d=doc.data();
      out.push({uid:doc.id, displayName:d.displayName, rating:(d.stats&&d.stats[gameType]&&d.stats[gameType].rating)||1200, stats:d.stats});
    });
    return out;
  }).catch(function(){ return []; });
}
function getProfile(uid){
  if(!db||!uid) return Promise.resolve(null);
  return db.collection('users').doc(uid).get().then(function(doc){
    if(!doc.exists) return null;
    var data=doc.data();
    if(!data.uid) data.uid=uid;
    return data;
  });
}
// UI helpers
function escapeProfileText(value){
  return String(value==null?'':value).replace(/[&<>\"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch];});
}
function readLocalLearningProgress(data){
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'');}catch(_e){return fallback;}}
  function completedCount(record,key){
    var value=record&&record[key];
    if(Array.isArray(value))return value.length;
    if(value&&typeof value==='object')return Object.keys(value).filter(function(id){return !!value[id];}).length;
    return Math.max(0,Number(record&&record[key+'Count'])||0);
  }
  var lessons=read('supachess-book-lessons-v1',{});
  var games=read('supachess_reviewed_pgns',[]);
  var localProgress=read('chessnova_progress',{});
  var cloudProgress=data&&data.progress&&typeof data.progress==='object'?data.progress:{};
  if(!lessons||typeof lessons!=='object'||Array.isArray(lessons))lessons={};
  if(!Array.isArray(games))games=[];
  var records=Object.keys(lessons).map(function(id){return {id:id,progress:lessons[id]};}).filter(function(item){return item.progress&&typeof item.progress==='object';});
  var completed=records.filter(function(item){return item.progress.completed;});
  var attempted=records.filter(function(item){return Number(item.progress.attempts)>0||item.progress.completed;});
  var moveExercises=games.reduce(function(sum,game){return sum+(Array.isArray(game.correctionExercises)?game.correctionExercises.length:0);},0);
  var latest=games.find(function(game){return Array.isArray(game.correctionExercises)&&game.correctionExercises.length;})||games[0]||null;
  var categoryCounts={};
  games.forEach(function(game){(Array.isArray(game.correctionExercises)?game.correctionExercises:[]).forEach(function(exercise){
    var type=exercise.classification||'unrated';categoryCounts[type]=(categoryCounts[type]||0)+1;
  });});
  var xp=Math.max(0,Number(localProgress.xp)||0,Number(cloudProgress.xp)||0,Number(data&&data.xp)||0);
  var progressApi=window.ChessNovaProgress;
  var level=progressApi&&typeof progressApi.getLevelForXP==='function'?progressApi.getLevelForXP(xp):Math.max(1,Number(cloudProgress.level)||Number(localProgress.level)||1);
  var streak=Math.max(Number(localProgress.currentStreak)||0,Number(cloudProgress.currentStreak)||0);
  var practiceSessions=Math.max(Number(localProgress.practice&&localProgress.practice.sessions)||0,Number(cloudProgress.practice&&cloudProgress.practice.sessions)||0);
  var puzzleElo=Math.max(0,Number(localStorage.getItem('puzzle_elo'))||Number(cloudProgress.puzzleElo)||0);
  var accuracyGames=games.map(function(game){
    var value=Number(game&&game.accuracy);
    if(!Number.isFinite(value))return null;
    if(value>=0&&value<=1)value*=100;
    return Math.max(0,Math.min(100,value));
  }).filter(function(value){return value!==null;}).slice(-12);
  var openings=read('chessnova_training_openings',{});
  var endgames=read('chessnova_training_endgames',{});
  var tactics=read('chessnova_training_tactics',{});
  return {
    completed:completed,attempted:attempted,games:games,moveExercises:moveExercises,latest:latest,
    categoryCounts:categoryCounts,xp:xp,level:level,streak:streak,practiceSessions:practiceSessions,
    puzzlesSolved:Math.max(Number(localProgress.puzzlesSolved)||0,Number(cloudProgress.puzzlesSolved)||0),
    puzzleElo:puzzleElo,
    openingMastered:completedCount(openings,'completed'),
    endgameMastered:completedCount(endgames,'completed'),
    tacticMastered:completedCount(tactics,'completedCategories'),
    accuracyGames:accuracyGames
  };
}
function profileText(key,fallback){
  var value=window.ChessNovaI18n&&window.ChessNovaI18n.t?window.ChessNovaI18n.t(key):key;
  return !value||value===key?fallback:value;
}
function profileRankName(level){
  var ranks=['profile_rank_beginner','profile_rank_apprentice','profile_rank_player','profile_rank_competitor','profile_rank_challenger','profile_rank_expert','profile_rank_master','profile_rank_grand_master','profile_rank_champion','profile_rank_legend'];
  if(level>10)return profileText('profile_rank_legend','Legend')+' ★'+(level-10);
  return profileText(ranks[Math.max(0,Math.min(9,level-1))],'Level '+level);
}
function profileXPProgress(xp,level){
  var api=window.ChessNovaProgress;
  if(api&&typeof api.getXPProgress==='function')return Math.max(0,Math.min(100,Number(api.getXPProgress(xp))||0));
  var thresholds=[0,100,250,500,800,1200,1800,2500,3500,5000];
  var current=thresholds[Math.max(0,Math.min(9,level-1))]||0;
  var next=thresholds[Math.min(9,level)]||current;
  return next>current?Math.max(0,Math.min(100,(xp-current)/(next-current)*100)):0;
}
function renderLocalLearningPanel(data){
  var local=readLocalLearningProgress(data);
  var labels={brilliant:profileText('profile_category_brilliant','Brilliant'),best:profileText('profile_category_best','Best moves'),'very-good':profileText('profile_category_very_good','Very good'),good:profileText('profile_category_good','Good moves'),ok:profileText('profile_category_ok','OK moves'),inaccuracy:profileText('profile_category_inaccuracy','Inaccuracies'),mistake:profileText('profile_category_mistake','Mistakes'),blunder:profileText('profile_category_blunder','Blunders'),unrated:profileText('profile_category_unrated','Unrated')};
  var weaknesses=Object.keys(local.categoryCounts).filter(function(key){return key==='inaccuracy'||key==='mistake'||key==='blunder';}).sort(function(a,b){return local.categoryCounts[b]-local.categoryCounts[a];});
  var exercisesUrl=local.latest
    ? 'https://jira44.github.io/supachess/index.html?resume-exercises='+encodeURIComponent(local.latest.id)
    : 'https://jira44.github.io/supachess/index.html?open-review=1';
  var mastered=local.completed.length;
  var xpApi=window.ChessNovaProgress;
  var nextXP=xpApi&&typeof xpApi.getPrestigeXP==='function'?xpApi.getPrestigeXP(local.level+1):null;
  var xpPercent=profileXPProgress(local.xp,local.level);
  var training=[
    {label:profileText('profile_mastered_lessons','Lessons mastered'),value:mastered,href:'https://jira44.github.io/supachess/book-lessons.html'},
    {label:profileText('profile_openings_mastered','Opening fundamentals'),value:local.openingMastered,href:'https://jira44.github.io/supachess-web/TRAINING_OPENINGS.html'},
    {label:profileText('profile_endgames_mastered','Endgame fundamentals'),value:local.endgameMastered,href:'https://jira44.github.io/supachess-web/TRAINING_ENDGAMES.html'},
    {label:profileText('profile_tactics_mastered','Tactical themes mastered'),value:local.tacticMastered,href:'https://jira44.github.io/supachess-web/TRAINING_TACTICS.html'},
    {label:profileText('profile_puzzles_solved','Puzzles solved'),value:local.puzzlesSolved,href:'https://jira44.github.io/supachess-web/TRAINING_TACTICS.html'}
  ];
  var html='<section class="profile-learning" aria-labelledby="profile-learning-title"><h3 id="profile-learning-title">'+profileText('profile_learning_title','My learning')+'</h3>'+
    '<div class="profile-xp-card"><div class="profile-xp-heading"><div><strong>'+profileText('profile_level','Level')+' '+local.level+'</strong><span>'+escapeProfileText(profileRankName(local.level))+'</span></div><strong>'+local.xp+' '+profileText('profile_xp','XP')+'</strong></div>'+
    '<div class="profile-xp-track" role="progressbar" aria-label="'+profileText('profile_xp_progress','XP progress')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(xpPercent)+'"><span style="width:'+xpPercent.toFixed(1)+'%"></span></div>'+
    '<small>'+escapeProfileText(profileText('profile_xp_to_next','Progress to next level'))+': '+Math.round(xpPercent)+'%'+(nextXP!==null?' · '+profileText('profile_next_level_at','next level at')+' '+nextXP+' XP':'')+'</small></div>'+
    '<div class="profile-learning-stats"><div><strong>'+local.completed.length+' / '+local.attempted.length+'</strong><span>'+profileText('profile_lessons_mastered_attempted','lessons mastered / attempted')+'</span></div><div><strong>'+local.moveExercises+'</strong><span>'+profileText('profile_correction_moves','half-moves to review')+'</span></div><div><strong>'+local.puzzlesSolved+'</strong><span>'+profileText('profile_puzzles_solved','puzzles solved')+'</span></div><div><strong>'+local.practiceSessions+'</strong><span>'+profileText('profile_practice_sessions','practice sessions')+'</span></div></div>'+
    '<h4>'+profileText('profile_mastery_title','Mastery and progress')+'</h4><ul class="profile-mastery-list">'+training.map(function(item){return '<li><a href="'+item.href+'" aria-label="'+escapeProfileText(item.label+': '+item.value)+'"><span>'+escapeProfileText(item.label)+'</span><strong>'+item.value+'</strong></a></li>';}).join('')+'</ul>'+
    '<div class="profile-learning-actions"><a href="'+exercisesUrl+'">'+profileText('profile_resume_exercises','Resume my exercises')+'</a><a href="https://jira44.github.io/supachess/book-lessons.html?next=1">'+profileText('profile_resume_lessons','Resume my lessons')+'</a><a href="https://jira44.github.io/supachess-web/TRAINING_OPENINGS.html">'+profileText('profile_resume_mastery','Resume mastery training')+'</a></div>';
  if(weaknesses.length){
    html+='<h4>'+profileText('profile_work_on','Work on in your games')+'</h4><ul class="profile-learning-list">'+weaknesses.slice(0,3).map(function(key){return '<li>'+escapeProfileText(labels[key]||key)+' : '+local.categoryCounts[key]+'</li>';}).join('')+'</ul>';
  }else if(local.moveExercises){html+='<p class="profile-learning-note">'+profileText('profile_no_recorded_errors','No inaccuracies, mistakes, or blunders recorded in the available exercises.')+'</p>';}
  var points=local.completed.map(function(item){return item.progress.completedAt?new Date(item.progress.completedAt).getTime():null;}).filter(function(time){return Number.isFinite(time);}).sort(function(a,b){return a-b;});
  if(points.length>1){
    var coords=points.map(function(_time,index){var x=8+index*164/(points.length-1);var y=54-(index+1)*44/points.length;return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    html+='<h4>'+profileText('profile_lesson_progress','Lesson progress')+'</h4><svg class="profile-learning-chart" viewBox="0 0 180 64" role="img" aria-label="'+profileText('profile_lesson_chart_alt','Cumulative lessons mastered')+'"><polyline points="8,56 '+coords+'" fill="none" stroke="#65d6a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>';
  }else{html+='<p class="profile-learning-note">'+profileText('profile_chart_empty','Complete several lessons to see your progress chart.')+'</p>';}
  if(local.accuracyGames.length>1){
    var accuracyCoords=local.accuracyGames.map(function(value,index){var x=8+index*164/(local.accuracyGames.length-1);var y=56-value*.48;return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    html+='<h4>'+profileText('profile_accuracy_progress','Recent game accuracy')+'</h4><svg class="profile-learning-chart" viewBox="0 0 180 64" role="img" aria-label="'+profileText('profile_accuracy_chart_alt','Accuracy by recent game')+'"><polyline points="'+accuracyCoords+'" fill="none" stroke="#68b5ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>';
  }else{html+='<p class="profile-learning-note">'+profileText('profile_accuracy_empty','Save two or more analyzed games to see your accuracy chart.')+'</p>';}
  return html+'</section>';
}
function renderProfileModal(data){
  var overlay=document.getElementById('profile-modal');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='profile-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;overflow:auto;';
    overlay.innerHTML='<div id="profile-box" style="background:#1a1f2e;border:1px solid #4facfe;border-radius:16px;padding:24px;width:min(680px,100%);max-height:90vh;overflow:auto;position:relative;"><button id="profile-close" type="button" style="position:absolute;top:8px;right:12px;background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;" aria-label="'+profileText('profile_close','Close profile')+'">×</button><div id="profile-content"></div></div>';
    overlay.querySelector("#profile-close").addEventListener('click', function(){ overlay.remove(); });
    overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  var box=document.getElementById('profile-content');
  if(!data){ box.innerHTML='<p style="color:#f66">'+profileText('profile_not_found','Profile not found')+'</p>'; return; }
  var name=escapeProfileText(data.displayName||profileText('profile_guest','Player')), email=escapeProfileText(data.email||'');
  var photo=escapeProfileText(data.photoURL||'https://ui-avatars.com/api/?name='+encodeURIComponent(data.displayName||'?'));
  var html='<div style="text-align:center"><img src="'+photo+'" alt="" style="width:64px;height:64px;border-radius:50%"><h3 style="margin:8px 0 4px">'+name+'</h3><p style="opacity:.6;font-size:.85em">'+email+'</p></div>';
  html+='<div style="margin-top:16px;display:grid;gap:10px">';
  Object.keys(GAME_TYPES).forEach(function(k){
    var st=data.stats&&data.stats[k]||null;
    var label=profileText('profile_game_'+k,GAME_TYPES[k].label);
    var games=Number(st&&st.played)||0;
    var summary=games?'<b>'+Number(st.rating||1200)+'</b> ELO · '+games+' '+profileText('profile_games','games')+' ('+Number(st.wins||0)+' '+profileText('profile_wins','wins')+' / '+Number(st.losses||0)+' '+profileText('profile_losses','losses')+' / '+Number(st.draws||0)+' '+profileText('profile_draws','draws')+')':profileText('profile_no_game_data','No game data yet');
    html+='<div style="background:rgba(255,255,255,.06);padding:10px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>'+GAME_TYPES[k].icon+' '+escapeProfileText(label)+'</span><span>'+summary+'</span></div>';
  });
  html+='</div>';
  if(auth&&auth.currentUser&&auth.currentUser.uid===data.uid)html+=renderLocalLearningPanel(data);
  box.innerHTML=html;
}
function renderOwnProfileFallback(user){
  if(!user||!user.uid)return;
  renderProfileModal({uid:user.uid,displayName:user.displayName||user.email&&user.email.split('@')[0]||profileText('profile_guest','Player'),email:user.email||'',photoURL:user.photoURL||'',stats:{}});
}
var siteSearchIndex = null;
var siteSearchIndexPromise = null;
function normalizeSiteSearch(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+#.-]+/g, ' ').trim();
}
function loadSiteSearchIndex() {
  if (siteSearchIndex) return Promise.resolve(siteSearchIndex);
  if (siteSearchIndexPromise) return siteSearchIndexPromise;
  var script = document.querySelector('script[src*="shared/profiles.js"]');
  var indexUrl = script ? new URL('../site-search-index.json?v=20261031', script.src).href : new URL('./site-search-index.json?v=20261031', location.href).href;
  siteSearchIndexPromise = fetch(indexUrl).then(function(response) {
    if (!response.ok) throw new Error('Index de recherche indisponible');
    return response.json();
  }).then(function(data) {
    siteSearchIndex = Array.isArray(data.entries) ? data.entries : [];
    return siteSearchIndex;
  }).catch(function(error) {
    siteSearchIndexPromise = null;
    throw error;
  });
  return siteSearchIndexPromise;
}
function searchSiteContent(query, entries, limit) {
  var normalized = normalizeSiteSearch(query);
  var tokens = normalized.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return entries.map(function(entry) {
    var title = normalizeSiteSearch(entry.title);
    var haystack = normalizeSiteSearch(entry.text);
    if (!tokens.every(function(token){ return (title + ' ' + haystack).indexOf(token) !== -1; })) return null;
    var score = title.indexOf(normalized) !== -1 ? 80 : 0;
    if (title.indexOf(normalized) === 0) score += 35;
    tokens.forEach(function(token){ if(title.indexOf(token)!==-1) score+=12; });
    if (haystack.indexOf(normalized) !== -1) score += 8;
    return { entry:entry, score:score };
  }).filter(Boolean).sort(function(a,b){ return b.score-a.score || a.entry.title.localeCompare(b.entry.title); }).slice(0,limit||8).map(function(item){return item.entry;});
}
function siteSearchHref(entry) {
  var localWeb = location.hostname === 'jira44.github.io' ? '/supachess-web/' : '/';
  var path = String(entry.path || '').replace(/^\/+/, '');
  var base = entry.repo === 'supachess' ? (location.hostname === 'jira44.github.io' ? '/supachess/' : 'https://jira44.github.io/supachess/') : localWeb;
  return base + path;
}
function initSearchBar(){
  var header=document.querySelector('.header');
  if(!header||document.getElementById('user-search-wrap')) return;
  var wrap=document.createElement('div');
  wrap.id='user-search-wrap';
  wrap.style.cssText='max-width:760px;margin:16px auto 0;position:relative;text-align:left;';
  wrap.innerHTML='<input id="user-search" type="search" autocomplete="off" aria-label="Rechercher sur tout SupaChess" aria-controls="user-search-results" aria-expanded="false" placeholder="🔍 Rechercher partout : pages, leçons, exercices, parties ou joueurs" style="width:100%;padding:12px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.28);background:rgba(0,0,0,.42);color:#fff;outline:none;font:inherit;"><div id="user-search-results" role="listbox" aria-label="Résultats de recherche" style="position:absolute;top:calc(100% + 6px);left:0;right:0;background:#101827;border:1px solid #52617a;border-radius:12px;display:none;max-height:min(70vh,460px);overflow-y:auto;overscroll-behavior:contain;z-index:1000;box-shadow:0 14px 36px rgba(0,0,0,.45);"></div>';
  header.appendChild(wrap);
  var inp=document.getElementById('user-search'), res=document.getElementById('user-search-results');
  var timer=null, generation=0;
  function rowTitle(entry) {
    var type=document.createElement('span'); type.textContent=entry.type||'Page';
    type.style.cssText='display:block;color:#a8c7ff;font-size:.76rem;font-weight:700;margin-bottom:3px;';
    return type;
  }
  function addGroup(label) {
    var group=document.createElement('div');group.textContent=label;
    group.style.cssText='padding:8px 12px 5px;color:#fbbf24;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;';
    res.appendChild(group);
  }
  function addSiteResult(entry, query) {
    var link=document.createElement('a');link.href=siteSearchHref(entry);link.setAttribute('role','option');
    link.style.cssText='display:block;padding:10px 12px;color:#f5f7fb;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.08);overflow-wrap:anywhere;';
    link.addEventListener('mouseenter',function(){link.style.background='#243148';});
    link.addEventListener('mouseleave',function(){link.style.background='transparent';});
    link.appendChild(rowTitle(entry));
    var title=document.createElement('strong');title.textContent=entry.title;link.appendChild(title);
    var snippet=document.createElement('span');snippet.style.cssText='display:block;margin-top:4px;color:#d1d8e4;font-size:.88rem;line-height:1.35;';
    var text=String(entry.text||'');var at=text.toLowerCase().indexOf(String(query).toLowerCase());
    if(at<0){var token=String(query).trim().split(/\s+/).find(Boolean)||'';at=text.toLowerCase().indexOf(token.toLowerCase());}
    var start=at<0?0:Math.max(0,at-65);snippet.textContent=(start?'…':'')+text.slice(start,start+170)+(start+170<text.length?'…':'');
    link.appendChild(snippet);res.appendChild(link);
  }
  function addPlayerResult(user) {
    var button=document.createElement('button');button.type='button';button.setAttribute('role','option');
    button.style.cssText='width:100%;padding:9px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent;color:#fff;text-align:left;font:inherit;';
    var photo=document.createElement('span');photo.setAttribute('aria-hidden','true');photo.textContent='♟';photo.style.cssText='width:30px;height:30px;display:grid;place-items:center;background:#34445d;border-radius:50%;';
    if(user.photoURL && /^https:\/\//i.test(user.photoURL)){photo.textContent='';var img=document.createElement('img');img.src=user.photoURL;img.alt='';img.width=30;img.height=30;img.style.borderRadius='50%';photo.appendChild(img);}
    var name=document.createElement('span');name.textContent=user.displayName||'Joueur';
    var email=document.createElement('small');email.textContent=user.email||'';email.style.cssText='opacity:.72;margin-left:auto;';
    button.append(photo,name,email);button.addEventListener('click',function(){res.style.display='none';inp.setAttribute('aria-expanded','false');getProfile(user.uid).then(renderProfileModal).catch(function(){});});
    res.appendChild(button);
  }
  function render(q, sites, users, failed) {
    res.replaceChildren();
    if(sites.length){addGroup('Pages, leçons, exercices et parties');sites.forEach(function(entry){addSiteResult(entry,q);});}
    if(users.length){addGroup('Joueurs');users.forEach(addPlayerResult);}
    if(!sites.length&&!users.length){var none=document.createElement('div');none.textContent=failed?'Recherche du site indisponible pour le moment.':'Aucun résultat. Essaie un autre terme.';none.style.cssText='padding:12px;color:#e5e7eb;';res.appendChild(none);}
    res.style.display='block';inp.setAttribute('aria-expanded','true');
  }
  inp.addEventListener('input',function(){
    clearTimeout(timer);var q=inp.value.trim(),run=++generation;
    if(!q){res.style.display='none';inp.setAttribute('aria-expanded','false');return;}
    res.textContent='Recherche dans le site…';res.style.display='block';inp.setAttribute('aria-expanded','true');
    timer=setTimeout(function(){
      var indexTask=loadSiteSearchIndex().then(function(entries){return {entries:entries,failed:false};}).catch(function(){return {entries:[],failed:true};});
      var usersTask=typeof searchUsers==='function'?searchUsers(q,5).catch(function(){return [];}):Promise.resolve([]);
      Promise.all([indexTask,usersTask]).then(function(results){
        if(run!==generation)return;
        var state=results[0],sites=state.failed?[]:searchSiteContent(q,state.entries,8);
        render(q,sites,results[1],state.failed);
      });
    },140);
  });
  inp.addEventListener('keydown',function(event){
    if(event.key==='Escape'){res.style.display='none';inp.setAttribute('aria-expanded','false');return;}
    if(event.key==='ArrowDown'){var first=res.querySelector('a[role="option"],button[role="option"]');if(first){event.preventDefault();first.focus();}}
  });
  document.addEventListener('click',function(event){if(!wrap.contains(event.target)){res.style.display='none';inp.setAttribute('aria-expanded','false');}});
}
function initRankingSection(){
  if(document.getElementById('ranking-section')) return;
  var container=document.querySelector('.container');
  if(!container) return;
  var sec=document.createElement('section');
  sec.id='ranking-section';
  sec.style.cssText='margin:40px 0;padding:24px;background:rgba(0,0,0,.35);border-radius:16px;border:1px solid rgba(255,255,255,.1)';
  sec.innerHTML='<h2 style="text-align:center;color:#ffd700;margin-bottom:16px">🏆 Classements Top — par type de jeu</h2><div style="display:flex;justify-content:center;gap:10px;margin-bottom:16px"><button class="rank-tab" data-type="puzzle" style="padding:8px 16px;border-radius:20px;border:1px solid #4facfe;background:#4facfe;color:#fff;cursor:pointer">🧩 Puzzle</button><button class="rank-tab" data-type="classic3s" style="padding:8px 16px;border-radius:20px;border:1px solid #666;background:transparent;color:#fff;cursor:pointer">⚡ Classic 3s</button><button class="rank-tab" data-type="classic5s" style="padding:8px 16px;border-radius:20px;border:1px solid #666;background:transparent;color:#fff;cursor:pointer">⏱️ Classic 5s</button></div><div id="ranking-list" style="display:grid;gap:8px"></div>';
  var footer=document.querySelector('.footer');
  if(footer) container.insertBefore(sec, footer);
  else container.appendChild(sec);
  function load(type){
    sec.querySelectorAll('.rank-tab').forEach(function(b){ b.style.background=b.getAttribute('data-type')===type?'#4facfe':'transparent'; b.style.borderColor=b.getAttribute('data-type')===type?'#4facfe':'#666'; });
    var list=document.getElementById('ranking-list');
    list.innerHTML='<div style="text-align:center;opacity:.6">Chargement...</div>';
    getTopRanking(type,10).then(function(top){
      if(!top.length){ list.innerHTML='<div style="text-align:center;opacity:.6">Aucun classement — jouez pour apparaître !</div>'; return; }
      list.innerHTML=top.map(function(u,i){
        var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1+'.');
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,255,255,.06);border-radius:10px;cursor:pointer" data-uid="'+u.uid+'" class="rank-row"><span style="width:28px;text-align:center">'+medal+'</span><span style="flex:1">'+u.displayName+'</span><span style="font-weight:bold;color:#ffd700">'+u.rating+' ELO</span></div>';
      }).join('');
      list.querySelectorAll('.rank-row').forEach(function(el){ el.addEventListener('click', function(){ getProfile(el.getAttribute('data-uid')).then(renderProfileModal); }); });
    });
  }
  sec.querySelectorAll('.rank-tab').forEach(function(b){ b.addEventListener('click', function(){ load(b.getAttribute('data-type')); }); });
  load('puzzle');
}
window.SupaProfiles={init:init, ensureUserProfile:ensureUserProfile, updateStats:updateStats, searchUsers:searchUsers, getTopRanking:getTopRanking, getProfile:getProfile, renderProfileModal:renderProfileModal, readLocalLearningProgress:readLocalLearningProgress, renderLocalLearningPanel:renderLocalLearningPanel, renderOwnProfileFallback:renderOwnProfileFallback, initSearchBar:initSearchBar, initRankingSection:initRankingSection, GAME_TYPES:GAME_TYPES};
})();
