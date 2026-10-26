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
      displayName:user.displayName|| (user.email? user.email.split('@')[0] : 'Anon'),
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
function readLocalLearningProgress(){
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'');}catch(_e){return fallback;}}
  var lessons=read('supachess-book-lessons-v1',{});
  var games=read('supachess_reviewed_pgns',[]);
  if(!lessons||typeof lessons!=='object'||Array.isArray(lessons))lessons={};
  if(!Array.isArray(games))games=[];
  var completed=Object.keys(lessons).map(function(id){return {id:id,progress:lessons[id]};}).filter(function(item){return item.progress&&item.progress.completed;});
  var moveExercises=games.reduce(function(sum,game){return sum+(Array.isArray(game.correctionExercises)?game.correctionExercises.length:0);},0);
  var latest=games.find(function(game){return Array.isArray(game.correctionExercises)&&game.correctionExercises.length;})||games[0]||null;
  var categoryCounts={};
  games.forEach(function(game){(Array.isArray(game.correctionExercises)?game.correctionExercises:[]).forEach(function(exercise){
    var type=exercise.classification||'unrated';categoryCounts[type]=(categoryCounts[type]||0)+1;
  });});
  return {completed:completed,games:games,moveExercises:moveExercises,latest:latest,categoryCounts:categoryCounts};
}
function profileText(key,fallback){
  var value=window.ChessNovaI18n&&window.ChessNovaI18n.t?window.ChessNovaI18n.t(key):key;
  return !value||value===key?fallback:value;
}
function renderLocalLearningPanel(data){
  var local=readLocalLearningProgress();
  var labels={brilliant:profileText('profile_category_brilliant','Brillants'),best:profileText('profile_category_best','Meilleurs coups'),'very-good':profileText('profile_category_very_good','Très bons coups'),good:profileText('profile_category_good','Bons coups'),ok:profileText('profile_category_ok','Coups OK'),inaccuracy:profileText('profile_category_inaccuracy','Imprécisions'),mistake:profileText('profile_category_mistake','Erreurs'),blunder:profileText('profile_category_blunder','Gaffes'),unrated:profileText('profile_category_unrated','Non évalués')};
  var weaknesses=Object.keys(local.categoryCounts).filter(function(key){return key==='inaccuracy'||key==='mistake'||key==='blunder';}).sort(function(a,b){return local.categoryCounts[b]-local.categoryCounts[a];});
  var exercisesUrl=local.latest
    ? 'https://jira44.github.io/supachess/index.html?resume-exercises='+encodeURIComponent(local.latest.id)
    : 'https://jira44.github.io/supachess/index.html?open-review=1';
  var mastered=local.completed.length;
  var html='<section class="profile-learning" aria-labelledby="profile-learning-title"><h3 id="profile-learning-title">'+profileText('profile_learning_title','Mon apprentissage')+'</h3>'+
    '<div class="profile-learning-stats"><div><strong>'+mastered+'</strong><span>'+profileText('profile_mastered_lessons','leçon(s) maîtrisée(s)')+'</span></div><div><strong>'+local.moveExercises+'</strong><span>'+profileText('profile_correction_moves','demi-coups à retravailler')+'</span></div></div>'+
    '<div class="profile-learning-actions"><a href="'+exercisesUrl+'">'+profileText('profile_resume_exercises','Reprendre mes exercices')+'</a><a href="https://jira44.github.io/supachess/book-lessons.html?next=1">'+profileText('profile_resume_lessons','Reprendre mes leçons')+'</a></div>';
  if(weaknesses.length){
    html+='<h4>'+profileText('profile_work_on','À retravailler dans tes parties')+'</h4><ul class="profile-learning-list">'+weaknesses.slice(0,3).map(function(key){return '<li>'+escapeProfileText(labels[key]||key)+' : '+local.categoryCounts[key]+'</li>';}).join('')+'</ul>';
  }else if(local.moveExercises){html+='<p class="profile-learning-note">'+profileText('profile_no_recorded_errors','Aucune imprécision, erreur ou gaffe enregistrée dans les exercices disponibles.')+'</p>';}
  var points=local.completed.map(function(item){return item.progress.completedAt?new Date(item.progress.completedAt).getTime():null;}).filter(function(time){return Number.isFinite(time);}).sort(function(a,b){return a-b;});
  if(points.length>1){
    var coords=points.map(function(_time,index){var x=8+index*164/(points.length-1);var y=54-(index+1)*44/points.length;return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    html+='<h4>'+profileText('profile_lesson_progress','Progression des leçons')+'</h4><svg class="profile-learning-chart" viewBox="0 0 180 64" role="img" aria-label="'+profileText('profile_lesson_chart_alt','Progression cumulative des leçons maîtrisées')+'">'<polyline points="'+coords+'" fill="none" stroke="#65d6a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>';
  }else{html+='<p class="profile-learning-note">'+profileText('profile_chart_empty','Termine plusieurs leçons pour voir ton graphique de progression.')+'</p>';}
  return html+'</section>';
}
function renderProfileModal(data){
  var overlay=document.getElementById('profile-modal');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='profile-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;overflow:auto;';
    overlay.innerHTML='<div id="profile-box" style="background:#1a1f2e;border:1px solid #4facfe;border-radius:16px;padding:24px;width:min(680px,100%);max-height:90vh;overflow:auto;position:relative;"><button onclick="document.getElementById(\\'profile-modal\\').remove()" style="position:absolute;top:8px;right:12px;background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;" aria-label="Fermer">×</button><div id="profile-content"></div></div>';
    overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  var box=document.getElementById('profile-content');
  if(!data){ box.innerHTML='<p style="color:#f66">Profil introuvable</p>'; return; }
  var name=escapeProfileText(data.displayName||'Anon'), email=escapeProfileText(data.email||'');
  var photo=escapeProfileText(data.photoURL||'https://ui-avatars.com/api/?name='+encodeURIComponent(data.displayName||'?'));
  var html='<div style="text-align:center"><img src="'+photo+'" alt="" style="width:64px;height:64px;border-radius:50%"><h3 style="margin:8px 0 4px">'+name+'</h3><p style="opacity:.6;font-size:.85em">'+email+'</p></div>';
  html+='<div style="margin-top:16px;display:grid;gap:10px">';
  Object.keys(GAME_TYPES).forEach(function(k){
    var st=data.stats&&data.stats[k]||{rating:1200,wins:0,losses:0,draws:0,played:0};
    html+='<div style="background:rgba(255,255,255,.06);padding:10px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>'+GAME_TYPES[k].icon+' '+escapeProfileText(GAME_TYPES[k].label)+'</span><span><b>'+Number(st.rating||1200)+'</b> ELO · '+Number(st.played||0)+' parties ('+Number(st.wins||0)+'W/'+Number(st.losses||0)+'L/'+Number(st.draws||0)+'D)</span></div>';
  });
  html+='</div>';
  if(auth&&auth.currentUser&&auth.currentUser.uid===data.uid)html+=renderLocalLearningPanel(data);
  box.innerHTML=html;
}
function initSearchBar(){
  var header=document.querySelector('.header');
  if(!header||document.getElementById('user-search-wrap')) return;
  var wrap=document.createElement('div');
  wrap.id='user-search-wrap';
  wrap.style.cssText='max-width:520px;margin:14px auto 0;position:relative;';
  wrap.innerHTML='<input id="user-search" placeholder="🔍 Rechercher un joueur (nom ou email) — cliquer pour voir profil" style="width:100%;padding:10px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#fff;outline:none;"><div id="user-search-results" style="position:absolute;top:100%;left:0;right:0;background:#1a1f2e;border:1px solid #333;border-radius:12px;margin-top:6px;display:none;max-height:240px;overflow-y:auto;z-index:50;"></div>';
  header.appendChild(wrap);
  var inp=document.getElementById('user-search');
  var res=document.getElementById('user-search-results');
  var timer=null;
  inp.addEventListener('input', function(){
    clearTimeout(timer);
    var q=this.value.trim();
    if(!q){ res.style.display='none'; return; }
    timer=setTimeout(function(){
      searchUsers(q,8).then(function(list){
        if(!list.length){ res.innerHTML='<div style="padding:10px;opacity:.6">Aucun joueur trouvé</div>'; res.style.display='block'; return; }
        res.innerHTML=list.map(function(u){
          return '<div class="search-hit" data-uid="'+u.uid+'" style="padding:8px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.06)"><img src="'+(u.photoURL||'https://ui-avatars.com/api/?name='+encodeURIComponent(u.displayName||'?'))+'" style="width:28px;height:28px;border-radius:50%"><span>'+u.displayName+'</span><span style="opacity:.5;font-size:.8em;margin-left:auto">'+u.email+'</span></div>';
        }).join('');
        res.style.display='block';
        res.querySelectorAll('.search-hit').forEach(function(el){
          el.addEventListener('click', function(){ res.style.display='none'; getProfile(el.getAttribute('data-uid')).then(renderProfileModal); });
        });
      });
    }, 280);
  });
  document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) res.style.display='none'; });
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
window.SupaProfiles={init:init, ensureUserProfile:ensureUserProfile, updateStats:updateStats, searchUsers:searchUsers, getTopRanking:getTopRanking, getProfile:getProfile, renderProfileModal:renderProfileModal, readLocalLearningProgress:readLocalLearningProgress, initSearchBar:initSearchBar, initRankingSection:initRankingSection, GAME_TYPES:GAME_TYPES};
})();
